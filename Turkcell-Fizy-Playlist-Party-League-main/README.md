
# 🎵 Turkcell Fizy Playlist Party League System

A gamified music engagement system built with Python and Flask.
This project simulates a competitive league environment where users earn points, complete challenges, and unlock badges based on their music activity.

##  Project Purpose

The system is designed to:

* Track user listening activity
* Calculate engagement metrics
* Assign points dynamically
* Evaluate challenges
* Award badges
* Generate a leaderboard
* Display results via a Flask-based dashboard

It simulates how a music platform like Fizy could implement gamification to increase user engagement.

---

##  Project Architecture

The backend is modular and structured as follows:

* `app.py` → Main Flask application
* `data_loader.py` → Loads CSV data into structured objects
* `metrics.py` → Calculates user engagement metrics
* `challenge_engine.py` → Evaluates active challenges
* `badges.py` → Badge awarding logic
* `leaderboard.py` → Ranking and scoring system
* `templates/` → HTML dashboard files
* `static/` → CSS and frontend assets
* `csv/` → Data source files

---

## Data Sources

The system currently loads data from CSV files.


##  Technologies Used

* Python
* Flask
* Pandas
* HTML / CSS
* Modular backend architecture

---

##  Core Features

* Engagement metric calculation 
* Dynamic challenge evaluation
* Badge condition parsing
* Points ledger tracking
* Leaderboard ranking system
* Dashboard visualization

---

##  How to Run

1. Install dependencies:

```
pip install flask pandas
```

2. Run the application:

```
python app.py
```

3. Open in browser:

```
http://127.0.0.1:5000
```

---

##  Project Context

This project was developed for Turkcell Fizy, aiming to design and implement a scalable gamification system for a digital music streaming platform.


