from collections import Counter, defaultdict

from .analytics_service import activities_until


def _user_payload(user_id, user_map, value_key, value):
    if user_id is None:
        return None
    return {
        'user_id': user_id,
        'name': user_map.get(user_id, user_id),
        value_key: int(value),
    }


def build_platform_insights(users, activities, results, as_of_date) -> dict:
    """Calculate platform-level gamification insights from CSV-backed data."""
    user_map = {u.user_id: u.name for u in users}
    scoped_activities = activities_until(activities, as_of_date)
    states = results.get('user_states', [])

    listening_by_user = defaultdict(int)
    shares_by_user = defaultdict(int)
    genre_counts = Counter()

    for activity in scoped_activities:
        listening_by_user[activity.user_id] += int(activity.listen_minutes)
        shares_by_user[activity.user_id] += int(activity.shares)
        genre_counts[activity.top_genre] += 1

    active_users = len(listening_by_user)
    total_listening = sum(listening_by_user.values())
    total_points = sum(int(getattr(user, 'community_points', 0) or 0) for user in users)
    if not total_points:
        total_points = sum(entry['points_delta'] for entry in results.get('points_ledger', []))

    most_active_id, most_active_minutes = (None, 0)
    if listening_by_user:
        most_active_id, most_active_minutes = max(
            listening_by_user.items(),
            key=lambda item: (item[1], item[0]),
        )

    most_shared_id, most_shares = (None, 0)
    if shares_by_user:
        most_shared_id, most_shares = max(
            shares_by_user.items(),
            key=lambda item: (item[1], item[0]),
        )

    highest_streak_state = max(
        states,
        key=lambda s: (s.get('listen_streak_days', 0), s.get('user_id', '')),
        default=None,
    )
    top_weekly_state = max(
        states,
        key=lambda s: (s.get('listen_minutes_7d', 0), s.get('user_id', '')),
        default=None,
    )

    return {
        'most_active_user': _user_payload(
            most_active_id,
            user_map,
            'listening_minutes',
            most_active_minutes,
        ),
        'top_genre': genre_counts.most_common(1)[0][0] if genre_counts else '-',
        'average_listening_minutes_per_active_user': (
            round(total_listening / active_users, 1) if active_users else 0
        ),
        'total_points_distributed': int(total_points),
        'total_badges_awarded': int(len(results.get('badge_awards', []))),
        'total_challenge_awards': int(len(results.get('challenge_awards', []))),
        'highest_streak_user': _user_payload(
            highest_streak_state.get('user_id') if highest_streak_state else None,
            user_map,
            'streak_days',
            highest_streak_state.get('listen_streak_days', 0) if highest_streak_state else 0,
        ),
        'most_shared_user': _user_payload(
            most_shared_id,
            user_map,
            'shares',
            most_shares,
        ),
        'top_listener_by_weekly_minutes': _user_payload(
            top_weekly_state.get('user_id') if top_weekly_state else None,
            user_map,
            'weekly_minutes',
            top_weekly_state.get('listen_minutes_7d', 0) if top_weekly_state else 0,
        ),
    }


