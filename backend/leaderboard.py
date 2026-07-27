from dataclasses import dataclass
from typing import List

from .points_ledger import get_total_points


@dataclass
class LeaderboardEntry:
    rank: int
    user_id: str
    name: str
    total_points: int
    top_genre: str
    completed_challenges: int


def _points_for_user(user, ledger) -> int:
    community_points = int(getattr(user, 'community_points', 0) or 0)
    if community_points:
        return community_points
    return get_total_points(user.user_id, ledger)


def generate_leaderboard(users: List, ledger: List) -> List[LeaderboardEntry]:
    """Generate leaderboard sorted by total points descending."""
    user_points = []
    for user in users:
        user_points.append({
            'user_id': user.user_id,
            'name': getattr(user, 'name', user.user_id),
            'total_points': _points_for_user(user, ledger),
            'top_genre': getattr(user, 'featured_genre', '') or '-',
            'completed_challenges': int(getattr(user, 'completed_challenges', 0) or 0),
        })

    user_points.sort(key=lambda row: (-row['total_points'], row['user_id']))
    return [
        LeaderboardEntry(
            rank=index + 1,
            user_id=row['user_id'],
            name=row['name'],
            total_points=row['total_points'],
            top_genre=row['top_genre'],
            completed_challenges=row['completed_challenges'],
        )
        for index, row in enumerate(user_points)
    ]
