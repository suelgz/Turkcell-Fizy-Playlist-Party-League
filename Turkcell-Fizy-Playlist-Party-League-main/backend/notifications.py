from dataclasses import dataclass
from typing import List
import datetime
import uuid

@dataclass
class Notification:
    notification_id: str
    user_id: str
    channel: str
    message: str
    sent_at: datetime.datetime

def generate_notifications(awards: List) -> List[Notification]:
    """Generate mock notifications for awards."""
    notifications = []
    for award in awards:
        message = f"Congratulations! You earned {award.reward_points} points for challenge {award.selected_challenge}."
        notifications.append(Notification(str(uuid.uuid4()), award.user_id, 'BiP', message, datetime.datetime.now()))
    return notifications