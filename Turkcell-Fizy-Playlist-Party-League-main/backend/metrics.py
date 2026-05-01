from dataclasses import dataclass
from typing import List
import pandas as pd

@dataclass
class UserState:
    user_id: str
    as_of_date: pd.Timestamp
    listen_minutes_today: int
    unique_tracks_today: int
    playlist_additions_today: int
    shares_today: int
    listen_minutes_7d: int
    shares_7d: int
    unique_tracks_7d: int
    listen_streak_days: int

def compute_user_state(user_id: str, as_of_date: pd.Timestamp, activities: List) -> UserState:
    
    user_activities = [a for a in activities if a.user_id == user_id]
    
    # Today metrics
    today_acts = [a for a in user_activities if a.date == as_of_date]
    listen_minutes_today = sum(a.listen_minutes for a in today_acts)
    unique_tracks_today = sum(a.unique_tracks for a in today_acts)
    playlist_additions_today = sum(a.playlist_additions for a in today_acts)
    shares_today = sum(a.shares for a in today_acts)
    
    # last 7 days
    start_date = as_of_date - pd.Timedelta(days=6)
    week_acts = [a for a in user_activities if start_date <= a.date <= as_of_date]
    listen_minutes_7d = sum(a.listen_minutes for a in week_acts)
    shares_7d = sum(a.shares for a in week_acts)
    unique_tracks_7d = sum(a.unique_tracks for a in week_acts)
    
    # streak
    listen_streak_days = 0
    current_date = as_of_date
    while True:
        day_acts = [a for a in user_activities if a.date == current_date]
        if not day_acts or sum(a.listen_minutes for a in day_acts) < 20:
            break
        listen_streak_days += 1
        current_date -= pd.Timedelta(days=1)
    
    return UserState(user_id, as_of_date, listen_minutes_today, unique_tracks_today, 
                     playlist_additions_today, shares_today, listen_minutes_7d, 
                     shares_7d, unique_tracks_7d, listen_streak_days)

def compute_all_user_states(users: List, as_of_date: pd.Timestamp, activities: List) -> List[UserState]:

    return [compute_user_state(u.user_id, as_of_date, activities) for u in users]
