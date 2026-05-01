from dataclasses import dataclass
from typing import List
import datetime
import uuid

@dataclass
class LedgerEntry:
    ledger_id: str
    user_id: str
    points_delta: int
    source: str
    source_ref: str
    created_at: datetime.datetime

def add_points_to_ledger(user_id: str, points: int, source: str, source_ref: str) -> LedgerEntry:
   
    return LedgerEntry(str(uuid.uuid4()), user_id, points, source, source_ref, datetime.datetime.now())

def get_total_points(user_id: str, ledger: List[LedgerEntry]) -> int:
    
    return sum(entry.points_delta for entry in ledger if entry.user_id == user_id)

def build_ledger_from_awards(awards: List) -> List[LedgerEntry]:
    
    ledger = []
    for award in awards:
        entry = add_points_to_ledger(award.user_id, award.reward_points, 'CHALLENGE_REWARD', award.award_id)
        ledger.append(entry)
    return ledger

