from dataclasses import dataclass
from typing import List
import datetime
import uuid
from collections import Counter

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


def summarize_ledger(ledger: List[LedgerEntry], user_id: str = None) -> dict:
    """Create a JSON-friendly points ledger summary."""
    def get_value(entry, field):
        if isinstance(entry, dict):
            return entry[field]
        return getattr(entry, field)

    entries = [
        entry for entry in ledger
        if user_id is None or get_value(entry, 'user_id') == user_id
    ]
    source_counts = Counter(get_value(entry, 'source') for entry in entries)

    return {
        'entries': int(len(entries)),
        'total_points': int(sum(get_value(entry, 'points_delta') for entry in entries)),
        'sources': dict(source_counts),
    }
