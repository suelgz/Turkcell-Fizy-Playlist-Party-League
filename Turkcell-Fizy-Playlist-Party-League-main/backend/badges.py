from dataclasses import dataclass
from typing import List
import datetime

@dataclass
class BadgeAward:
    user_id: str
    badge_id: str
    awarded_at: datetime.datetime

def award_badges(users: List, badges: List, ledger: List) -> List[BadgeAward]:
    """Award badges based on total points."""
    from challenge_engine import safe_eval_condition
    from points_ledger import get_total_points
    
    awards = []

    import re
    def get_threshold(badge):
        match = re.search(r'>=\s*(\d+)', badge.condition)
        return int(match.group(1)) if match else 0
    
    badges_sorted = sorted(badges, key=get_threshold, reverse=True)
    
    for user in users:
        total_points = get_total_points(user.user_id, ledger)
        context = {'total_points': total_points}
        
        for badge in badges_sorted:
            if safe_eval_condition(badge.condition, context):
                awards.append(BadgeAward(user.user_id, badge.badge_id, datetime.datetime.now()))
             
    
    return awards
