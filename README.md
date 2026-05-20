# PumpAI

PumpAI is a full-stack fitness and nutrition tracking application built with React, Flask, and SQLAlchemy. The app helps users log profile details, food intake, cardio, weight training, and saved coaching feedback in one place.

The main goal of PumpAI is to give users a simple loop:

Create a profile -> log food and workouts -> review history -> request AI-powered feedback -> make better fitness decisions.

## Current Project Status

PumpAI is currently being built for Project 2: Productivity Full-Stack Application.

This README is an early placeholder and will be updated as the project grows.

## Planned Core Features

- User signup, login, logout, and session-based authentication
- User-owned records so users can only view, update, or delete their own data
- Profile creation and editing
- Food logging
- Workout logging
- Log / History page for reviewing saved entries
- Coach's Corner for AI-powered fitness and nutrition feedback
- Saved coach responses
- Pagination for relevant GET requests

## Tech Stack

### Frontend

- React
- React Router
- JavaScript
- CSS

### Backend

- Python
- Flask
- Flask-RESTful
- Flask-SQLAlchemy
- Flask-Migrate
- Flask-Bcrypt

### Database

- SQLite for development
- SQLAlchemy ORM

### AI Integration

- OpenAI Responses API
- Backend-secured API requests
- Environment variables for API key protection

## Planned Models

- User
- Profile
- FoodLog
- WorkoutLog
- CoachResponse

## Basic User Flow

1. A user signs up or logs in.
2. The user creates or updates their profile.
3. The user logs food and workouts.
4. The user reviews saved entries in the history page.
5. The user requests feedback from Coach's Corner.
6. PumpAI generates and saves coaching feedback based on the user's saved data.

## Setup Instructions

Setup instructions will be added as the frontend, backend, database, and environment variables are finalized.

## Future Enhancements

- Progress charts
- Weekly trend reports
- Barcode scanning
- Nutrition database integration
- Wearable syncing
- Mobile app version

## Disclaimer

PumpAI is intended for general fitness and nutrition tracking support. It does not provide medical advice, injury diagnosis, clinical nutrition guidance, or treatment plans.

## Author

Josh Clay

GitHub: JTClay1