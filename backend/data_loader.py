import pandas as pd
from dataclasses import dataclass
from typing import List
import os

@dataclass
class User:
    user_id: str
    name: str

@dataclass
class ActivityEvent:
    user_id: str
    date: pd.Timestamp
    listen_minutes: int
    unique_tracks: int
    playlist_additions: int
    shares: int
    top_genre: str

@dataclass
class Challenge:
    challenge_id: str
    challenge_name: str
    challenge_type: str
    condition: str
    reward_points: int
    priority: int
    is_active: bool

@dataclass
class Badge:
    badge_id: str
    badge_name: str
    condition: str


def load_data():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(base_dir)
    csv_dir = os.path.join(project_dir, 'csv')
    
    users_df = pd.read_csv(os.path.join(csv_dir, 'users.csv'))
    activity_df = pd.read_csv(os.path.join(csv_dir, 'activity_events.csv'))
    challenges_df = pd.read_csv(os.path.join(csv_dir, 'challenges.csv'))
    badges_df = pd.read_csv(os.path.join(csv_dir, 'badges.csv'))

    activity_df['date'] = pd.to_datetime(activity_df['date'])

    users = [User(row['user_id'], row.get('name', 'Unknown')) for _, row in users_df.iterrows()]

    activities = [
        ActivityEvent(
            row['user_id'],
            row['date'],
            row['listen_minutes'],
            row['unique_tracks'],
            row['playlist_additions'],
            row['shares'],
            row['top_genre']
        )
        for _, row in activity_df.iterrows()
    ]

    challenges = [
        Challenge(
            row['challenge_id'],
            row['challenge_name'],
            row['challenge_type'],
            row['condition'],
            int(row['reward_points']),
            int(row['priority']),
            str(row['is_active']).lower() == 'true'
        )
        for _, row in challenges_df.iterrows()
    ]

    badges = [
        Badge(row['badge_id'], row['badge_name'], row['condition'])
        for _, row in badges_df.iterrows()
    ]

    return users, activities, challenges, badges
