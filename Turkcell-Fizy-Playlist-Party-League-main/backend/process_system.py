from data_loader import load_data
from metrics import compute_all_user_states
from challenge_engine import process_challenge_awards
from points_ledger import build_ledger_from_awards
from leaderboard import generate_leaderboard
from badges import award_badges
from notifications import generate_notifications
import pandas as pd

def process_system(as_of_date: pd.Timestamp = None) -> dict:

   
    users, activities, challenges, badges = load_data()
    
   
    if as_of_date is None:
        as_of_date = max(a.date for a in activities) if activities else pd.Timestamp.today()
    
    user_states = compute_all_user_states(users, as_of_date, activities)
    
    challenge_awards = process_challenge_awards(user_states, challenges)
    
 
    points_ledger = build_ledger_from_awards(challenge_awards)
    

    leaderboard = generate_leaderboard(users, points_ledger)
    
  
    badge_awards = award_badges(users, badges, points_ledger)
    
    notifications = generate_notifications(challenge_awards)
    
    return {
        'user_states': [state.__dict__ for state in user_states],
        'challenge_awards': [award.__dict__ for award in challenge_awards],
        'points_ledger': [entry.__dict__ for entry in points_ledger],
        'leaderboard': [entry.__dict__ for entry in leaderboard],
        'badge_awards': [award.__dict__ for award in badge_awards],
        'notifications': [notif.__dict__ for notif in notifications]
    }

if __name__ == '__main__':
    results = process_system()
    print("User States:", results['user_states'][:2])
    print("Challenge Awards:", results['challenge_awards'][:2])
    print("Leaderboard Top 5:", results['leaderboard'][:5])
    
