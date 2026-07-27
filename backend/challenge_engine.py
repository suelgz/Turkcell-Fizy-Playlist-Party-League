from dataclasses import dataclass
from typing import List, Dict, Any
import datetime
import uuid

@dataclass
class TriggeredChallenge:
    challenge_id: str
    challenge_name: str
    reward_points: int
    priority: int

@dataclass
class ChallengeAward:
    award_id: str
    user_id: str
    as_of_date: str
    triggered_challenges: List[str]
    selected_challenge: str
    reward_points: int
    suppressed_challenges: List[str]
    timestamp: datetime.datetime

def safe_eval_condition(condition: str, context: Dict[str, Any]) -> bool:
    """Safely evaluate a condition string (simple parser for demo; use ast in production)."""
    try:
        key, op, val = condition.split()
        val = int(val)
        if op == '>=':
            return context.get(key, 0) >= val
        elif op == '==':
            return context.get(key, 0) == val
        return False
    except:
        return False

def evaluate_challenges(user_state: Dict[str, Any], challenges: List) -> List[TriggeredChallenge]:
    """Evaluate which challenges are triggered for a user state."""
    triggered = []
    for ch in challenges:
        if ch.is_active and safe_eval_condition(ch.condition, user_state):
            triggered.append(TriggeredChallenge(ch.challenge_id, ch.challenge_name, 
                                                ch.reward_points, ch.priority))
    return triggered

def select_challenge(triggered: List[TriggeredChallenge]):
    """Select the highest priority challenge and return suppressed ones."""
    if not triggered:
        return None, [], []
    sorted_triggered = sorted(triggered, key=lambda x: (x.priority, x.challenge_id))
    
    selected = sorted_triggered[0]
    all_ids = [t.challenge_id for t in triggered]
    suppressed_ids = [t.challenge_id for t in sorted_triggered[1:]]
    return selected, all_ids, suppressed_ids

def process_challenge_awards(user_states: List, challenges: List) -> List[ChallengeAward]:
    """Process awards for all users."""
    awards = []
    for state in user_states:
        state_dict = {k: v for k, v in state.__dict__.items()}
        triggered = evaluate_challenges(state_dict, challenges)
        selected, all_triggered, suppressed = select_challenge(triggered)
        if selected:
            award = ChallengeAward(str(uuid.uuid4()), state.user_id, str(state.as_of_date), 
                                   all_triggered, selected.challenge_id, selected.reward_points, 
                                   suppressed, datetime.datetime.now())
            awards.append(award)
    return awards
