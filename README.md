# Turkcell Fizy Playlist Party League

A lightweight Python/Flask gamification dashboard built for a Turkcell Fizy hackathon. The app reads CSV demo data, calculates engagement metrics, evaluates challenges, creates a points ledger, awards badges, and serves a simple HTML/CSS/vanilla JavaScript dashboard.

## Tech Stack

- Python + Flask
- Pandas for CSV processing
- CSV files as the data source
- HTML, CSS, and vanilla JavaScript
- Chart.js from a CDN for dashboard charts
- Gunicorn for production hosting

No React, database, Docker, TypeScript, or frontend build step is required.

## Project Structure

```text
app.py                 # Local/production Flask entry point
backend/               # Flask routes and gamification business logic
csv/                   # Demo data source
templates/index.html   # Dashboard page
static/                # CSS, JavaScript, and image assets
requirements.txt       # Python dependencies
Procfile               # Render/Gunicorn start command
```

## Run Locally

```bash
pip install -r requirements.txt
python app.py
```

Open:

```text
http://127.0.0.1:5000
```

## API Endpoints

- `GET /api/dashboard` - full dashboard payload
- `GET /api/users` - player rows
- `GET /api/leaderboard` - top leaderboard rows
- `GET /api/stats` - platform KPI cards
- `GET /api/user/<user_id>` - one player detail payload
- `GET /api/user/<user_id>/trend` - one player chart data
- `GET /api/challenges` - challenge awards
- `POST /api/challenges` - mocked challenge creation response for the prototype

## Render Deployment

Create a Render Web Service from this repository and use:

```text
Build Command: pip install -r requirements.txt
Start Command: gunicorn app:app
```

The included `Procfile` contains the same production start command:

```text
web: gunicorn app:app
```

## Core Flow

1. `backend/data_loader.py` loads users, activity events, challenges, and badges from CSV files.
2. `backend/process_system.py` computes user states, challenge awards, points, leaderboard rows, badge awards, and notifications.
3. `backend/dashboard_service.py` formats the engine output for the dashboard API.
4. `backend/app.py` exposes the Flask routes.
5. `static/app.js` renders the dashboard in the browser.
