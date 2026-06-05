from app import app
from config import db
from models import User, Profile, FoodLog, WorkoutLog, CoachResponse, EasyLogItem


with app.app_context():
    # Seed starts from a clean slate so demo data stays predictable.
    print("Clearing database...")

    CoachResponse.query.delete()
    WorkoutLog.query.delete()
    FoodLog.query.delete()
    Profile.query.delete()
    User.query.delete()
    EasyLogItem.query.delete()

    print("Creating demo user...")

    user = User(
        username="testuser",
        email="test@example.com",
    )
    user.password_hash = "password123"

    db.session.add(user)
    db.session.commit()

    print("Creating profile...")

    # The profile gives the demo account targets for history and coach flows.
    profile = Profile(
        name="Josh",
        gender="male",
        birth_date="1995-05-24",
        age=30,
        height="6 ft 2 in",
        current_weight=229.8,
        weight_unit="lb",
        fitness_goal="Lose fat and build muscle",
        dietary_preferences="high protein flexible dieting",
        target_calories=2400,
        target_protein=200,
        target_carbs=200,
        target_fat=70,
        coaching_style="Direct but encouraging",
        user_id=user.id,

    )

    db.session.add(profile)

    print("Creating food logs...")

    # Food logs demonstrate daily nutrition totals and coach summaries.
    food_logs = [
        FoodLog(
            food_name="Chicken rice bowl",
            calories=650,
            servings=1,
            protein=55,
            carbs=60,
            fat=18,
            fiber=6,
            sodium=900,
            serving_size="1 bowl",
            logged_date="2026-05-24",
            user_id=user.id,
        ),
        FoodLog(
            food_name="Greek yogurt protein bowl",
            calories=420,
            servings=1,
            protein=45,
            carbs=38,
            fat=8,
            fiber=4,
            sodium=250,
            serving_size="1 bowl",
            logged_date="2026-05-24",
            user_id=user.id,
        ),
        FoodLog(
            food_name="Protein bar",
            calories=200,
            servings=1,
            protein=20,
            carbs=22,
            fat=7,
            fiber=3,
            sodium=180,
            serving_size="1 bar",
            logged_date="2026-05-24",
            user_id=user.id,
        ),
    ]

    db.session.add_all(food_logs)

    print("Creating workout logs...")

    # Mixed workout types exercise cardio, weighted, and rest-day displays.
    workout_logs = [
        WorkoutLog(
            workout_type="cardio",
            exercise_name="Treadmill walk",
            duration_minutes=60,
            distance_miles=4.1,
            notes="Steady pace walk",
            logged_date="2026-05-24",
            user_id=user.id,
        ),
        WorkoutLog(
            workout_type="weighted",
            exercise_name="Dumbbell bench press",
            weight=75,
            sets=3,
            reps=6,
            notes="Strong top sets",
            logged_date="2026-05-24",
            user_id=user.id,
        ),
        WorkoutLog(
            workout_type="weighted",
            exercise_name="Lat pulldown",
            weight=150,
            sets=3,
            reps=8,
            notes="Controlled reps",
            logged_date="2026-05-24",
            user_id=user.id,
        ),
        WorkoutLog(
            workout_type="rest",
            exercise_name="Rest Day",
            notes="Recovery day with light walking and mobility.",
            logged_date="2026-05-25",
            user_id=user.id,
        ),
    ]

    db.session.add_all(workout_logs)

    print("Creating saved coach responses...")

    # Saved responses make the history and coach pages useful immediately.
    coach_responses = [
        CoachResponse(
            request_type="daily_review",
            response_text=(
                "Great work today. Protein is strong, training is consistent, "
                "and the next move is keeping calories controlled without letting hunger spiral."
            ),
            created_at="2026-05-24",
            user_id=user.id,
        ),
        CoachResponse(
            request_type="weekly_review",
            response_text=(
                "Weekly review test response. Keep protein high, keep workouts consistent, "
                "and monitor recovery."
            ),
            created_at="2026-05-24",
            user_id=user.id,
        ),
    ]

    db.session.add_all(coach_responses)

    print("Creating easy log items...")

    # Easy Log examples can be reused from the Daily Input page.
    easy_log_items = [
        EasyLogItem(
            name="Chicken rice bowl",
            item_type="meal",
            calories=650,
            servings=1,
            protein=55,
            carbs=60,
            fat=18,
            fiber=6,
            sodium=900,
            serving_size="1 bowl",
            user_id=user.id,
        ),
        EasyLogItem(
            name="Greek yogurt protein bowl",
            item_type="meal",
            calories=420,
            servings=1,
            protein=45,
            carbs=38,
            fat=8,
            fiber=4,
            sodium=250,
            serving_size="1 bowl",
            user_id=user.id,
        ),
        EasyLogItem(
            name="Cheddar cheese",
            item_type="ingredient",
            calories=110,
            servings=1,
            protein=7,
            carbs=1,
            fat=9,
            fiber=0,
            sodium=180,
            serving_size="1 serving",
            user_id=user.id,
        ),
    ]

    db.session.add_all(easy_log_items)

    db.session.commit()

    print("Database seeded successfully!")
    print("Demo login:")
    print("username: testuser")
    print("password: password123")
