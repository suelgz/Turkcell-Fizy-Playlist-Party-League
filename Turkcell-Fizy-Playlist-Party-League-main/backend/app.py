from flask import Flask, render_template, jsonify, request
from process_system import process_system
import datetime
import pandas as pd
import json

app = Flask(__name__)


# ── Custom JSON encoder: handles datetime / Timestamp / numpy ints ──────────
class AppEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (datetime.datetime, datetime.date)):
            return obj.isoformat()
        if isinstance(obj, pd.Timestamp):
            return obj.isoformat()
        # numpy integers / floats (from pandas)
        try:
            import numpy as np
            if isinstance(obj, (np.integer,)):
                return int(obj)
            if isinstance(obj, (np.floating,)):
                return float(obj)
        except ImportError:
            pass
        return super().default(obj)

app.json_encoder = AppEncoder


# ── Helper: parse date from query string or default to None ─────────────────
def _parse_date(val: str | None):
    if not val:
        return None
    try:
        return pd.Timestamp(val)
    except Exception:
        return None


# ── Routes ──────────────────────────────────────────────────────────────────
@app.route('/')
def home():
    return render_template("index.html")


@app.route('/api/users', methods=['GET'])
def api_users():
    try:
        as_of = _parse_date(request.args.get('as_of'))
        results = process_system(as_of_date=as_of)

        from data_loader import load_data
        users, _, _, _ = load_data()
        user_map = {u.user_id: u.name for u in users}

        user_list = []
        for state in results['user_states']:
            user_id = state['user_id']
            total_points = sum(
                e['points_delta'] for e in results['points_ledger']
                if e['user_id'] == user_id
            )
            user_list.append({
                'user_id': user_id,
                'name': user_map.get(user_id, user_id),
                'total_points': total_points,
            })

        # sort by points descending
        user_list.sort(key=lambda x: -x['total_points'])
        return jsonify(user_list)
    except Exception as e:
        import traceback
        return jsonify({'error': str(e), 'trace': traceback.format_exc()}), 500


@app.route('/api/leaderboard', methods=['GET'])
def api_leaderboard():
    try:
        as_of = _parse_date(request.args.get('as_of'))
        results = process_system(as_of_date=as_of)
        return jsonify(results['leaderboard'][:10])
    except Exception as e:
        import traceback
        return jsonify({'error': str(e), 'trace': traceback.format_exc()}), 500


@app.route('/api/user/<user_id>', methods=['GET'])
def api_user_detail(user_id):
    try:
        as_of = _parse_date(request.args.get('as_of'))
        results = process_system(as_of_date=as_of)
        state  = next((s for s in results['user_states']  if s['user_id'] == user_id), None)
        awards = [a for a in results['challenge_awards']  if a['user_id'] == user_id]
        badges = [b for b in results['badge_awards']      if b['user_id'] == user_id]
        notifs = [n for n in results['notifications']     if n['user_id'] == user_id]
        return jsonify({'state': state, 'awards': awards, 'badges': badges, 'notifs': notifs})
    except Exception as e:
        import traceback
        return jsonify({'error': str(e), 'trace': traceback.format_exc()}), 500


@app.route('/api/challenges', methods=['GET', 'POST'])
def api_challenges():
    if request.method == 'GET':
        try:
            as_of = _parse_date(request.args.get('as_of'))
            results = process_system(as_of_date=as_of)
            return jsonify(results['challenge_awards'])
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    elif request.method == 'POST':
        data = request.json
        return jsonify({'message': 'Challenge added (mock)', 'data': data}), 201


@app.route('/api/stats', methods=['GET'])
def api_stats():
    """Platform-wide KPI summary for hero counters."""
    try:
        from data_loader import load_data
        from collections import Counter
        users, activities, _, _ = load_data()
        as_of = _parse_date(request.args.get('as_of'))
        max_date = max(a.date for a in activities) if activities else pd.Timestamp.today()
        if as_of is None or as_of > max_date:
            as_of = max_date

        results = process_system(as_of_date=as_of)
        total_points = sum(e['points_delta'] for e in results['points_ledger'])
        total_challenges = len(results['challenge_awards'])
        total_listening = sum(a.listen_minutes for a in activities)
        active_users = len(set(a.user_id for a in activities))
        genre_counts = Counter(a.top_genre for a in activities)
        top_genre = genre_counts.most_common(1)[0][0] if genre_counts else '-'

        return jsonify({
            'total_users': len(users),
            'active_users': active_users,
            'total_listening_minutes': total_listening,
            'total_points_distributed': total_points,
            'total_challenges_completed': total_challenges,
            'top_genre': top_genre,
        })
    except Exception as e:
        import traceback
        return jsonify({'error': str(e), 'trace': traceback.format_exc()}), 500


@app.route('/api/user/<user_id>/trend', methods=['GET'])
def api_user_trend(user_id):
    """7-day listening trend + genre breakdown for Chart.js."""
    try:
        from data_loader import load_data
        from collections import Counter
        _, activities, _, _ = load_data()
        as_of = _parse_date(request.args.get('as_of'))
        max_date = max(a.date for a in activities) if activities else pd.Timestamp.today()
        if as_of is None or as_of > max_date:
            as_of = max_date

        trend = []
        for i in range(6, -1, -1):
            day = as_of - pd.Timedelta(days=i)
            day_acts = [a for a in activities if a.user_id == user_id and a.date == day]
            trend.append({
                'date': day.strftime('%b %d'),
                'minutes': sum(a.listen_minutes for a in day_acts),
                'tracks': sum(a.unique_tracks for a in day_acts),
            })

        user_acts = [a for a in activities if a.user_id == user_id]
        genre_counts = Counter(a.top_genre for a in user_acts)
        genres = [{'genre': g, 'count': c} for g, c in genre_counts.most_common(5)]

        return jsonify({'trend': trend, 'genres': genres})
    except Exception as e:
        import traceback
        return jsonify({'error': str(e), 'trace': traceback.format_exc()}), 500


if __name__ == '__main__':
    app.run(debug=True)
