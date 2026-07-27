from collections import Counter

import pandas as pd


def resolve_as_of_date(activities, requested_date=None) -> pd.Timestamp:
    """Use the requested date, capped to the last available CSV activity date."""
    if activities:
        max_date = max(pd.Timestamp(a.date).normalize() for a in activities)
    else:
        max_date = pd.Timestamp.today().normalize()

    if requested_date is None:
        return max_date

    requested = pd.Timestamp(requested_date).normalize()
    return min(requested, max_date)


def activities_until(activities, as_of_date):
    as_of_date = pd.Timestamp(as_of_date).normalize()
    return [
        activity for activity in activities
        if pd.Timestamp(activity.date).normalize() <= as_of_date
    ]


def _sum_user_field(users, field_name):
    return sum(int(getattr(user, field_name, 0) or 0) for user in users)


def build_platform_stats(users, activities, results, as_of_date) -> dict:
    """Prepare top-level KPI cards from backend engine outputs."""
    scoped_activities = activities_until(activities, as_of_date)
    genre_counts = Counter(a.top_genre for a in scoped_activities)
    user_points = _sum_user_field(users, 'community_points')
    completed_challenges = _sum_user_field(users, 'completed_challenges')

    if not user_points:
        user_points = sum(entry['points_delta'] for entry in results['points_ledger'])
    if not completed_challenges:
        completed_challenges = len(results['challenge_awards'])

    return {
        'total_users': int(len(users)),
        'active_users': int(len(set(a.user_id for a in scoped_activities))),
        'total_listening_minutes': int(sum(a.listen_minutes for a in scoped_activities)),
        'total_points_distributed': int(user_points),
        'total_challenges_completed': int(completed_challenges),
        'top_genre': genre_counts.most_common(1)[0][0] if genre_counts else '-',
    }
