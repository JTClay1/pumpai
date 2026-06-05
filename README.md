# PumpAI

PumpAI is a full-stack fitness tracking and AI coaching app built for my Phase 5 capstone project. The app helps users track their fitness profile, daily meals, workouts, rest days, saved food items, and coaching feedback in one connected workflow.

The core idea behind PumpAI is simple:

Profile -> Log -> Reuse -> Review -> Ask Coach -> Improve

Users can create an account, build a fitness profile, log food and workouts, save repeat foods to an Easy Log, review their history by day, and ask Coach's Corner for AI-powered feedback based on their saved app data.

---

## Project Overview

PumpAI is designed for people who want more than a basic food/workout tracker. Instead of only storing logs, PumpAI turns structured user data into useful feedback.

The app includes:

- User authentication
- Fitness profile creation and editing
- Username editing from the profile page
- Daily food logging
- Multi-ingredient meal builder
- Easy Log saved meals and ingredients
- Workout logging
- Rest day logging
- History page grouped by date
- Saved coach responses
- AI-powered Coach's Corner
- Tutorial overlay for new users
- Session inactivity timeout
- Branded responsive UI

---

## Why I Built This

I wanted to build something that reflected a real daily-use product loop. PumpAI is based around the idea that fitness progress is easier to manage when food logs, training logs, recovery days, and coaching feedback all live in the same place.

A standard tracking app stores data. PumpAI stores data and then uses that data to generate feedback.

The most important design goal was to make the app feel like a real product, not just a collection of CRUD routes. Each major feature supports the loop:

1. Create a profile
2. Log meals and workouts
3. Save repeat foods
4. Review history
5. Ask for coaching feedback
6. Use that feedback to improve future choices

---

## Tech Stack

### Frontend

- React
- Vite
- React Router
- JavaScript
- CSS

### Backend

- Python
- Flask
- Flask-RESTful
- Flask-SQLAlchemy
- Flask-Migrate / Alembic
- Flask-Bcrypt password hashing
- OpenAI API

### Database

- SQLite local database

For local development, PumpAI defaults to a SQLite database. The database file is stored locally in the Flask instance folder and is not committed to GitHub. SQLite was a good fit for the capstone because it allowed fast local development, simple setup, and easy seeding of demo data.

The backend reads `DATABASE_URI` from the environment, so the database can be swapped for another SQL database in a deployed environment without changing application code.

### AI

- OpenAI Responses API
- RAG-lite style backend context retrieval

---

## Current Database Setup

PumpAI currently uses a local SQLite database.

Expected local database path:

```txt
server/instance/pumpai.db
```

The `instance/` folder is ignored by Git, so the database file is not pushed to GitHub.

To create and populate the local database, run the included seed file from the server folder:

```bash
cd server
pipenv run python seed.py
```

The seed file creates demo data for testing the app locally.

---

## Main Features

### Authentication

Users can sign up, log in, check their current session, and log out.

Passwords are not stored directly. The app uses Flask-Bcrypt password hashing so raw passwords are never saved in the database.

The app also includes a 15-minute inactivity timeout. If a logged-in user's session is stale for more than 15 minutes, the backend clears the session and protected routes return an unauthorized response.

---

### Profile

The profile page stores the user's fitness baseline.

Users can save:

- Name
- Username
- Gender
- Date of birth
- Auto-calculated age
- Height
- Current weight
- Weight unit
- Fitness goal
- Dietary preferences
- Calorie target
- Protein target
- Carb target
- Fat target
- Preferred coaching style

Age is calculated from date of birth and is not directly editable. This keeps the data consistent and prevents users from accidentally creating conflicting profile values.

The username can also be edited from the Profile page through a protected account update route.

---

### Daily Input

The Daily Input page lets users log food and workouts for the day.

Food logs include:

- Food name
- Calories
- Servings
- Protein
- Carbs
- Fat
- Fiber
- Sodium
- Serving size
- Logged date

Workout logs include:

- Workout type
- Exercise name
- Duration
- Distance
- Weight
- Sets
- Reps
- Notes
- Logged date

The Daily Input page also supports rest days, so recovery can be tracked as part of the user's training history.

---

### Meal Builder

The meal builder allows users to create one food log from multiple ingredients.

Instead of forcing users to manually calculate a combined meal, the app lets them add ingredients and automatically totals the nutrition values into one saved food log.

Example use case:

A user builds a meal with:

- Beef
- Rice
- Cheese
- Vegetables
- Sauce

PumpAI totals the ingredients and saves the meal as one log instead of cluttering the history page with several separate entries.

---

### Easy Log

Easy Log lets users save frequent meals and ingredients.

If a user eats the same food often, they can save it to Easy Log and reuse it later without re-entering the nutrition label every time.

Easy Log items can be:

- Used as a single food log
- Added as an ingredient in the meal builder
- Deleted when no longer needed

This feature makes the app faster and more realistic for daily use.

---

### History

The History page groups saved activity by date.

Users can review:

- Food logs
- Workout logs
- Rest days
- Saved coach responses
- Daily totals

Food and workout entries are grouped into expandable daily cards so users can quickly scan their history without being overwhelmed by long lists.

This makes it possible for users to go back and review past days, compare patterns, and see how their habits are trending over time.

---

### Coach's Corner

Coach's Corner is the AI feedback section of PumpAI.

Users can choose a feedback type, ask a specific question, and generate a saved coach response.

Supported feedback types include:

- Daily Review
- Weekly Review
- Nutrition Question
- Training Question
- Custom Question

Coach's Corner retrieves relevant saved user data before generating feedback. The AI does not answer in isolation. It uses the user's profile, food logs, workout logs, and backend-calculated nutrition summary as context.

---

## AI Coaching Design

PumpAI uses a RAG-lite style approach.

Instead of sending a generic user question directly to the AI, the backend first retrieves saved app data from the database. The backend then builds a structured prompt that includes relevant context.

The flow is:

1. User asks a question in Coach's Corner
2. Backend confirms the user is logged in
3. Backend retrieves the user's profile
4. Backend retrieves relevant food logs
5. Backend retrieves relevant workout logs
6. Backend calculates nutrition totals and target comparisons
7. Backend builds a structured prompt
8. OpenAI generates coaching feedback
9. The response is saved to the database
10. The frontend displays the saved response

This gives PumpAI a more specific coaching experience than a generic chatbot.

---

## Backend-Calculated Nutrition Logic

One important design decision was to keep nutrition math in Flask instead of relying on the AI model to calculate it.

The backend calculates:

- Calories
- Protein
- Total carbs
- Fiber
- Net carbs
- Fat
- Sodium
- Comparison to user targets

This prevents the AI from misreading or miscalculating nutrition totals. The AI is used for coaching language, not as the source of truth for arithmetic.

For example, if total carbs are high because fiber is high, the backend calculates net carbs and provides the correct interpretation. The model is instructed to follow the backend summary and avoid contradicting it.

This creates a cleaner separation of responsibilities:

```txt
Flask = math and truth layer
AI model = coaching language layer
```

---

## Tutorial Overlay

PumpAI includes a tutorial overlay to help users understand the app flow.

The tutorial automatically launches after a new user creates an account. Returning users can also reopen it from the navbar with a Tutorial button.

The tutorial explains:

- Profile setup
- Daily Input
- Easy Log
- History
- Coach's Corner

This helps new users understand how the app is meant to be used without needing to explore every page manually.

---

## Data Models

### User

Represents an authenticated user.

Relationships:

- Has one Profile
- Has many FoodLogs
- Has many WorkoutLogs
- Has many CoachResponses
- Has many EasyLogItems

Important fields:

- username
- email
- password_hash

---

### Profile

Stores the user's fitness baseline and coaching preferences.

Important fields:

- name
- gender
- birth_date
- age
- height
- current_weight
- weight_unit
- fitness_goal
- dietary_preferences
- target_calories
- target_protein
- target_carbs
- target_fat
- coaching_style
- user_id

---

### FoodLog

Stores food entries.

Important fields:

- food_name
- calories
- servings
- protein
- carbs
- fat
- fiber
- sodium
- serving_size
- logged_date
- user_id

---

### WorkoutLog

Stores workout and rest day entries.

Important fields:

- workout_type
- exercise_name
- duration_minutes
- distance_miles
- weight
- sets
- reps
- notes
- logged_date
- user_id

---

### CoachResponse

Stores saved AI coaching responses.

Important fields:

- request_type
- response_text
- created_at
- user_id

---

### EasyLogItem

Stores reusable meals and ingredients.

Important fields:

- name
- item_type
- calories
- servings
- protein
- carbs
- fat
- fiber
- sodium
- serving_size
- user_id

---

## Main Backend Routes

### Auth Routes

```txt
POST /signup
POST /login
GET /check_session
DELETE /logout
```

### Profile and Account Routes

```txt
GET /profile
POST /profile
PATCH /profile
PATCH /account
```

### Food Log Routes

```txt
GET /food_logs
POST /food_logs
PATCH /food_logs/<id>
DELETE /food_logs/<id>
```

### Workout Log Routes

```txt
GET /workout_logs
POST /workout_logs
PATCH /workout_logs/<id>
DELETE /workout_logs/<id>
```

### History Route

```txt
GET /history
```

### Coach Response Routes

```txt
GET /coach_responses
POST /coach_responses
DELETE /coach_responses/<id>
```

### AI Coach Route

```txt
POST /coach
```

### Easy Log Routes

```txt
GET /easy_log_items
POST /easy_log_items
DELETE /easy_log_items/<id>
```

---

## Frontend Pages

### Home

Landing page that introduces the app and highlights major features.

### Auth

Combined login and signup page.

### Profile

Allows the user to edit account and fitness profile details.

### Daily Input

Allows the user to log food, build meals, log workouts, log rest days, and reuse Easy Log items.

### History

Displays saved food logs, workouts, rest days, and coach responses grouped by date.

### Coach's Corner

Allows the user to ask questions and generate saved AI coaching feedback.

### Not Found

Fallback route for invalid URLs.

---

## Local Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/JTClay1/pumpai.git
cd pumpai
```

---

### 2. Backend setup

```bash
cd server
pipenv install
```

Create a `.env` file in the `server/` folder:

```txt
OPENAI_API_KEY=your_openai_api_key_here
SECRET_KEY=your_flask_secret_key_here
# Optional: defaults to sqlite:///pumpai.db when omitted
DATABASE_URI=sqlite:///pumpai.db
```

The `.env` file should not be committed to GitHub.

Run database migrations if needed:

```bash
pipenv run flask db upgrade
```

Seed the local SQLite database:

```bash
pipenv run python seed.py
```

Start the backend server:

```bash
export FLASK_APP=app.py
pipenv run flask run -p 5555
```

The backend runs at:

```txt
http://127.0.0.1:5555
```

---

### 3. Frontend setup

Open a second terminal:

```bash
cd client
npm install
npm run dev
```

The frontend runs at:

```txt
http://127.0.0.1:5173
```

---

## Testing

Backend tests are written with pytest and live in `server/tests/`.

From the `server/` folder, run:

```bash
pipenv run pytest
```

The tests use a temporary SQLite database through `DATABASE_URI`, create a fresh schema for each test, and set a dummy OpenAI API key. They cover authentication, protected routes, profile age calculation, ownership-based access control, pagination, food and workout CRUD, Easy Log behavior, history filtering, username updates, validation errors, and the Coach's Corner configuration guard.

---

## Demo Login

After running the seed file, the app includes a demo user:

```txt
username: testuser
password: password123
```

This account includes sample profile data, food logs, workout logs, rest day logs, saved coach responses, and Easy Log items.

---

## Environment Variables

The backend requires an OpenAI API key for Coach's Corner. `SECRET_KEY` is recommended for session security. `DATABASE_URI` is optional for local development because the app falls back to SQLite.

Create:

```txt
server/.env
```

Add:

```txt
OPENAI_API_KEY=your_openai_api_key_here
SECRET_KEY=your_flask_secret_key_here
DATABASE_URI=sqlite:///pumpai.db
```

The app will return an error from the AI coach route if this key is missing.

---

## Security and User Data

PumpAI includes several basic security patterns:

- Passwords are hashed before storage
- Password hashing uses Flask-Bcrypt
- Protected routes check the current session
- User-owned records are filtered by `user_id`
- Users cannot access another user's logs through protected routes
- Sessions expire after 15 minutes of inactivity
- The OpenAI API key is stored in `.env` and not committed to GitHub

---

## Known Limitations

PumpAI is currently a local capstone project and has a few intentional limitations:

- Uses a local SQLite database instead of a production database
- PostgreSQL deployment is supported conceptually through `DATABASE_URI`, but local setup currently documents SQLite only
- Does not currently include deployed production hosting
- Does not include password reset
- Does not include email verification
- Does not include charts or long-term analytics yet
- AI feedback depends on a valid OpenAI API key
- Nutrition feedback is informational and not medical advice

---

## Future Improvements

Possible future features include:

- Deploy backend and frontend
- Move from SQLite to PostgreSQL for production
- Add charts for calories, macros, weight, and workouts over time
- Add weekly and monthly trend analysis
- Add more advanced RAG with vector search
- Add profile photos or avatar support
- Add password reset and email verification
- Add mobile-first UI refinements
- Add custom saved meal templates
- Add bodyweight tracking
- Add progress photos
- Add exercise library support
- Add coach response formatting with action steps

---

## Medical and Nutrition Disclaimer

PumpAI is a fitness tracking and coaching feedback app. It is not a medical device and does not provide medical diagnosis or treatment.

AI-generated feedback should be treated as general fitness and nutrition guidance only. Users should consult a qualified medical professional, registered dietitian, or certified trainer for medical concerns, eating disorder concerns, injuries, medication questions, or personalized clinical advice.

---

## Project Status

PumpAI is feature-complete for the capstone MVP.

Completed core features:

- Authentication
- Profile management
- Username editing
- Food logging
- Multi-ingredient meal builder
- Easy Log
- Workout logging
- Rest day logging
- History grouping
- AI Coach's Corner
- Tutorial overlay
- Session timeout
- Branded UI polish

Remaining final project work:

- Inline code comments
- README finalization
- Final demo rehearsal
- Final bug pass

---

## Author

Built by Josh Clay as a full-stack software engineering capstone project.
