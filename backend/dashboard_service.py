from collections import Counter

from .analytics_service import build_platform_stats, resolve_as_of_date, activities_until
from .data_loader import load_data
from .insights import build_platform_insights
from .metrics import compute_genre_breakdown, compute_user_trend
from .points_ledger import summarize_ledger
from .process_system import process_system


BADGE_TIERS = {
    'b1': ('Bronze', 'bronze'),
    'b2': ('Silver', 'silver'),
    'b3': ('Gold', 'gold'),
    'b4': ('Platinum', 'platinum'),
}


def _run_engine(as_of_date=None):
    data_bundle = load_data()
    users, activities, challenges, badges = data_bundle
    resolved_date = resolve_as_of_date(activities, as_of_date)
    results = process_system(as_of_date=resolved_date, data_bundle=data_bundle)
    return users, activities, challenges, badges, resolved_date, results


def _state_map(results):
    return {state['user_id']: state for state in results['user_states']}


def _rank_map(results):
    return {entry['user_id']: entry for entry in results['leaderboard']}


def _challenge_map(challenges):
    return {challenge.challenge_id: challenge for challenge in challenges}


def _badge_map(badges):
    return {badge.badge_id: badge for badge in badges}


def _total_points_for_user(user_id, results):
    return int(sum(
        entry['points_delta']
        for entry in results['points_ledger']
        if entry['user_id'] == user_id
    ))


def _format_challenge_refs(challenge_ids, challenge_lookup):
    refs = []
    for challenge_id in challenge_ids:
        challenge = challenge_lookup.get(challenge_id)
        refs.append({
            'challenge_id': challenge_id,
            'challenge_name': challenge.challenge_name if challenge else challenge_id,
        })
    return refs


def _format_challenge_award(award, challenge_lookup):
    selected = challenge_lookup.get(award['selected_challenge'])
    triggered = _format_challenge_refs(award.get('triggered_challenges', []), challenge_lookup)
    suppressed = _format_challenge_refs(award.get('suppressed_challenges', []), challenge_lookup)

    return {
        'award_id': award['award_id'],
        'user_id': award['user_id'],
        'as_of_date': str(award['as_of_date'])[:10],
        'selected_challenge_id': award['selected_challenge'],
        'selected_challenge_name': selected.challenge_name if selected else award['selected_challenge'],
        'reward_points': int(award['reward_points']),
        'triggered_challenges': triggered,
        'suppressed_challenges': suppressed,
        'triggered_count': int(len(triggered)),
        'suppressed_count': int(len(suppressed)),
    }


def _format_badge_award(award, badge_lookup):
    badge = badge_lookup.get(award['badge_id'])
    tier, css_class = BADGE_TIERS.get(award['badge_id'], ('Badge', ''))

    return {
        'user_id': award['user_id'],
        'badge_id': award['badge_id'],
        'badge_name': badge.badge_name if badge else award['badge_id'],
        'tier': tier,
        'css_class': css_class,
        'awarded_at': str(award['awarded_at']),
    }


def _format_notification(notification):
    return {
        'notification_id': notification['notification_id'],
        'user_id': notification['user_id'],
        'channel': notification['channel'],
        'message': notification['message'],
        'sent_at': str(notification['sent_at']),
    }


def _build_player_rows(users, results):
    states = _state_map(results)
    rows = []

    for entry in results['leaderboard']:
        state = states.get(entry['user_id'], {})
        rows.append({
            'user_id': entry['user_id'],
            'name': entry['name'],
            'rank': int(entry['rank']),
            'total_points': int(entry['total_points']),
            'weekly_listening_minutes': int(state.get('listen_minutes_7d', 0)),
            'streak_days': int(state.get('listen_streak_days', 0)),
            'is_active': bool(state.get('listen_minutes_7d', 0) > 0),
        })

    known_ids = {row['user_id'] for row in rows}
    for user in users:
        if user.user_id not in known_ids:
            rows.append({
                'user_id': user.user_id,
                'name': user.name,
                'rank': None,
                'total_points': 0,
                'weekly_listening_minutes': 0,
                'streak_days': 0,
                'is_active': False,
            })

    return rows


def build_dashboard(as_of_date=None) -> dict:
    """Return the full dashboard payload consumed by static/app.js."""
    users, activities, challenges, badges, resolved_date, results = _run_engine(as_of_date)

    return {
        'as_of_date': resolved_date.date().isoformat(),
        'stats': build_platform_stats(users, activities, results, resolved_date),
        'leaderboard': results['leaderboard'],
        'players': _build_player_rows(users, results),
        'insights': build_platform_insights(users, activities, results, resolved_date),
    }


def _build_player_insights(user_id, user, activities, results, as_of_date):
    scoped_activities = [
        activity for activity in activities_until(activities, as_of_date)
        if activity.user_id == user_id
    ]
    genre_counts = Counter(activity.top_genre for activity in scoped_activities)
    user_awards = [
        award for award in results['challenge_awards']
        if award['user_id'] == user_id
    ]
    user_badges = [
        award for award in results['badge_awards']
        if award['user_id'] == user_id
    ]

    return {
        'player': user.name,
        'favorite_genre': genre_counts.most_common(1)[0][0] if genre_counts else '-',
        'total_listening_minutes': int(sum(a.listen_minutes for a in scoped_activities)),
        'total_shares': int(sum(a.shares for a in scoped_activities)),
        'challenge_awards': int(len(user_awards)),
        'badges_awarded': int(len(user_badges)),
    }


def build_user_detail(user_id, as_of_date=None) -> dict:
    """Return a display-ready payload for one player detail view."""
    users, activities, challenges, badges, resolved_date, results = _run_engine(as_of_date)
    user = next((candidate for candidate in users if candidate.user_id == user_id), None)
    if user is None:
        raise LookupError(f'User {user_id} was not found.')

    states = _state_map(results)
    ranks = _rank_map(results)
    challenge_lookup = _challenge_map(challenges)
    badge_lookup = _badge_map(badges)

    state = states.get(user_id, {})
    rank_entry = ranks.get(user_id, {})
    total_points = _total_points_for_user(user_id, results)
    challenge_awards = [
        _format_challenge_award(award, challenge_lookup)
        for award in results['challenge_awards']
        if award['user_id'] == user_id
    ]
    badge_awards = [
        _format_badge_award(award, badge_lookup)
        for award in results['badge_awards']
        if award['user_id'] == user_id
    ]
    notifications = [
        _format_notification(notification)
        for notification in results['notifications']
        if notification['user_id'] == user_id
    ]

    ledger_summary = summarize_ledger(
        results['points_ledger'],
        user_id=user_id,
    )
    metrics = dict(state)
    if metrics.get('as_of_date') is not None:
        metrics['as_of_date'] = str(metrics['as_of_date'])[:10]
    metrics['streak_progress_percent'] = min(
        100,
        int(metrics.get('listen_streak_days', 0)) * 20,
    )

    return {
        'profile': {
            'user_id': user.user_id,
            'name': user.name,
            'rank': rank_entry.get('rank'),
            'total_points': total_points,
            'as_of_date': resolved_date.date().isoformat(),
        },
        'metrics': metrics,
        'challenge_awards': challenge_awards,
        'points_ledger_summary': ledger_summary,
        'badges': badge_awards,
        'notifications': notifications,
        'trend': compute_user_trend(user_id, resolved_date, activities),
        'genres': compute_genre_breakdown(user_id, activities, resolved_date),
        'insights': _build_player_insights(user_id, user, activities, results, resolved_date),
    }

