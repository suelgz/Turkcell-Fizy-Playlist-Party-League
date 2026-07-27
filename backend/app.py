import logging
import os
import pandas as pd
from flask import Flask, jsonify, render_template, request


BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(BACKEND_DIR)

from .dashboard_service import build_dashboard, build_user_detail
from .process_system import process_system


app = Flask(
    __name__,
    template_folder=os.path.join(PROJECT_DIR, 'templates'),
    static_folder=os.path.join(PROJECT_DIR, 'static'),
)
app.logger.setLevel(logging.INFO)


def _parse_date(value: str | None):
    if not value:
        return None
    try:
        return pd.Timestamp(value)
    except Exception:
        return None


def _json_error(message: str, status_code: int = 500, exc: Exception | None = None):
    if exc is not None:
        app.logger.exception(message)
    return jsonify({'error': message}), status_code


@app.route('/')
def home():
    return render_template(
        'index.html',
        dashboard_title='Python/Flask Gamification Engine Output',
    )


@app.route('/api/dashboard', methods=['GET'])
def api_dashboard():
    try:
        dashboard = build_dashboard(_parse_date(request.args.get('as_of')))
        return jsonify(dashboard)
    except Exception as exc:
        return _json_error('Failed to load dashboard data.', exc=exc)


@app.route('/api/users', methods=['GET'])
def api_users():
    try:
        dashboard = build_dashboard(_parse_date(request.args.get('as_of')))
        return jsonify(dashboard['players'])
    except Exception as exc:
        return _json_error('Failed to load players.', exc=exc)


@app.route('/api/leaderboard', methods=['GET'])
def api_leaderboard():
    try:
        dashboard = build_dashboard(_parse_date(request.args.get('as_of')))
        return jsonify(dashboard['leaderboard'][:10])
    except Exception as exc:
        return _json_error('Failed to load leaderboard.', exc=exc)


@app.route('/api/stats', methods=['GET'])
def api_stats():
    try:
        dashboard = build_dashboard(_parse_date(request.args.get('as_of')))
        return jsonify(dashboard['stats'])
    except Exception as exc:
        return _json_error('Failed to load platform stats.', exc=exc)


@app.route('/api/user/<user_id>', methods=['GET'])
def api_user_detail(user_id):
    try:
        return jsonify(build_user_detail(user_id, _parse_date(request.args.get('as_of'))))
    except LookupError:
        return _json_error('User not found.', status_code=404)
    except Exception as exc:
        return _json_error('Failed to load player detail data.', exc=exc)


@app.route('/api/user/<user_id>/trend', methods=['GET'])
def api_user_trend(user_id):
    try:
        detail = build_user_detail(user_id, _parse_date(request.args.get('as_of')))
        return jsonify({'trend': detail['trend'], 'genres': detail['genres']})
    except LookupError:
        return _json_error('User not found.', status_code=404)
    except Exception as exc:
        return _json_error('Failed to load player trend data.', exc=exc)


@app.route('/api/challenges', methods=['GET', 'POST'])
def api_challenges():
    if request.method == 'POST':
        return jsonify({
            'message': 'Challenge creation is mocked in this hackathon prototype.',
            'data': request.get_json(silent=True) or {},
        }), 201

    try:
        results = process_system(as_of_date=_parse_date(request.args.get('as_of')))
        return jsonify(results['challenge_awards'])
    except Exception as exc:
        return _json_error('Failed to load challenge awards.', exc=exc)


@app.errorhandler(404)
def handle_not_found(error):
    if request.path.startswith('/api/'):
        return _json_error('Endpoint not found.', status_code=404)
    return render_template('index.html'), 404


@app.errorhandler(500)
def handle_server_error(error):
    if request.path.startswith('/api/'):
        return _json_error('Internal server error.', status_code=500)
    return render_template('index.html'), 500


if __name__ == '__main__':
    app.run(debug=True)


