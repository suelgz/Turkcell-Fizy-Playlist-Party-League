# Turkcell Fizy Playlist Party League

A Python/Flask backend-driven gamification system developed during a Turkcell Fizy hackathon. The system processes music listening activity from CSV data, calculates engagement metrics, evaluates challenge rules, generates a points ledger, awards badges, and exposes dashboard-ready analytics through Flask API endpoints.

The dashboard is intentionally lightweight: HTML/CSS plus a small amount of JavaScript for API calls, tab state, player selection, and Chart.js rendering. Core business logic lives in Python.

## Project Value

This project demonstrates how a music streaming platform can increase engagement by transforming listening activity into rewards, challenges, badges, and competition. It models the backend engine behind a gamified experience: users listen, share, build streaks, complete challenges, earn points, unlock badges, and appear in leaderboard rankings.

## Backend Architecture

- `backend/app.py` - Flask app, routes, clean API error handling
- `backend/data_loader.py` - CSV loading into Python data objects
- `backend/metrics.py` - engagement metric, trend, and genre calculations
- `backend/challenge_engine.py` - challenge rule evaluation and winner selection
- `backend/points_ledger.py` - points ledger generation and summaries
- `backend/badges.py` - badge awarding logic
- `backend/leaderboard.py` - leaderboard ranking generation
- `backend/notifications.py` - gamification notification output
- `backend/process_system.py` - orchestration layer for the gamification engine
- `backend/analytics_service.py` - platform KPI aggregation
- `backend/insights.py` - backend-calculated platform insights
- `backend/dashboard_service.py` - dashboard-ready JSON payloads
- `csv/` - hackathon demo data source
- `templates/` and `static/` - dashboard visualization output

## API Endpoints

### `GET /api/dashboard`

Returns everything the dashboard needs in one backend-prepared payload:

```json
{
  "stats": {
    "total_users": 10,
    "active_users": 10,
    "total_listening_minutes": 12345,
    "total_points_distributed": 850,
    "total_challenges_completed": 12,
    "top_genre": "Pop"
  },
  "leaderboard": [],
  "players": [],
  "insights": {}
}
```

### `GET /api/user/<user_id>`

Returns player detail data ready for display:

```json
{
  "profile": {},
  "metrics": {},
  "challenge_awards": [],
  "points_ledger_summary": {},
  "badges": [],
  "notifications": [],
  "trend": [],
  "genres": [],
  "insights": {}
}
```

## Core Features

- CSV-backed user and listening activity processing
- Backend-generated engagement metrics
- Challenge evaluation using Python rules
- Points ledger creation
- Badge awarding
- Leaderboard generation
- User detail insights
- Platform analytics
- Flask API responses designed for dashboard display
- Minimal JavaScript focused on rendering and charting

## How to Run Locally

1. Install dependencies:

```bash
pip install -r requirements.txt
```

2. Run the Flask application from the project root:

```bash
python app.py
```

3. Open the dashboard:

```text
http://127.0.0.1:5000
```

You can also run the backend module directly:

```bash
python backend/app.py
```

## Deployment

The project stays deployment-light and does not require a frontend build step. A simple Procfile is included:

```text
web: gunicorn app:app
```

## Technology Stack

- Python
- Flask
- Pandas
- CSV data processing
- HTML/CSS
- Chart.js for dashboard charts

No React, database, authentication system, TypeScript, or frontend build tooling is required.

## GitHub Language Stats

The repository keeps JavaScript, CSS, and HTML visible in GitHub language stats because they are part of the dashboard output. The architecture is still backend-driven: Python/Flask contains the gamification engine, while JavaScript, CSS, and HTML visualize backend-prepared data.
