import os
import re
from datetime import date, datetime, timedelta

from dotenv import load_dotenv
from flask import make_response, request, session
from flask_restful import Api, Resource
from openai import OpenAI
from sqlalchemy.exc import IntegrityError

from config import app, db
from models import User, Profile, FoodLog, WorkoutLog, CoachResponse, EasyLogItem


api = Api(app)

# Sessions expire after inactivity so stale browser cookies stop granting access.
app.permanent_session_lifetime = timedelta(minutes=15)

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


@app.get("/")
def index():
    return make_response({"message": "PumpAI API running"}, 200)


def calculate_age_from_birth_date(birth_date):
    # Age is derived server-side from birth_date instead of trusting the client.
    if not birth_date:
        return None

    try:
        born = datetime.strptime(birth_date, "%Y-%m-%d").date()
    except ValueError:
        raise ValueError("Birth date must use YYYY-MM-DD format.")

    today = date.today()

    return (
        today.year
        - born.year
        - ((today.month, today.day) < (born.month, born.day))
    )

def format_profile_for_coach(profile):
    # Convert the saved profile into readable prompt context for the coach.
    if not profile:
        return "No profile has been created yet."

    return f"""
Profile:
- Name: {profile.name}
- Gender: {profile.gender}
- Birth Date: {profile.birth_date}
- Age: {profile.age}
- Height: {profile.height}
- Current Weight: {profile.current_weight} {profile.weight_unit}
- Fitness Goal: {profile.fitness_goal}
- Dietary Preferences: {profile.dietary_preferences}
- Target Calories: {profile.target_calories}
- Target Protein: {profile.target_protein}
- Target Carbs: {profile.target_carbs}
- Target Fat: {profile.target_fat}
- Preferred Coaching Style: {profile.coaching_style}
""".strip()


def format_food_logs_for_coach(food_logs):
    if not food_logs:
        return "No food logs available."

    lines = []

    for food in food_logs:
        lines.append(
            f"- {food.logged_date}: {food.food_name} | "
            f"{food.calories} cal, {food.protein or 0}g protein, "
            f"{food.carbs or 0}g carbs, {food.fat or 0}g fat, "
            f"{food.fiber or 0}g fiber, {food.sodium or 0}mg sodium"
        )

    return "\n".join(lines)

def format_food_daily_totals_for_coach(food_logs):
    # Group food logs by date so the coach can reason about daily totals.
    if not food_logs:
        return "No food totals available."

    daily_totals = {}

    for food in food_logs:
        date_key = food.logged_date or "No date"

        if date_key not in daily_totals:
            daily_totals[date_key] = {
                "calories": 0,
                "protein": 0,
                "carbs": 0,
                "fat": 0,
                "fiber": 0,
                "sodium": 0,
            }

        daily_totals[date_key]["calories"] += food.calories or 0
        daily_totals[date_key]["protein"] += food.protein or 0
        daily_totals[date_key]["carbs"] += food.carbs or 0
        daily_totals[date_key]["fat"] += food.fat or 0
        daily_totals[date_key]["fiber"] += food.fiber or 0
        daily_totals[date_key]["sodium"] += food.sodium or 0

    lines = []

    for date_key in sorted(daily_totals.keys(), reverse=True):
        totals = daily_totals[date_key]

        lines.append(
            f"- {date_key}: "
            f"{round(totals['calories'], 1)} calories, "
            f"{round(totals['protein'], 1)}g protein, "
            f"{round(totals['carbs'], 1)}g carbs, "
            f"{round(totals['fat'], 1)}g fat, "
            f"{round(totals['fiber'], 1)}g fiber, "
            f"{round(totals['sodium'], 1)}mg sodium"
        )

    return "\n".join(lines)

def format_daily_target_comparison_for_coach(profile, food_logs):
    # Compare daily macro totals against the user's saved profile targets.
    if not profile:
        return "No profile targets available."

    if not food_logs:
        return "No food logs available for target comparison."

    daily_totals = {}

    for food in food_logs:
        date_key = food.logged_date or "No date"

        if date_key not in daily_totals:
            daily_totals[date_key] = {
                "calories": 0,
                "protein": 0,
                "carbs": 0,
                "fat": 0,
            }

        daily_totals[date_key]["calories"] += food.calories or 0
        daily_totals[date_key]["protein"] += food.protein or 0
        daily_totals[date_key]["carbs"] += food.carbs or 0
        daily_totals[date_key]["fat"] += food.fat or 0

    lines = []

    target_calories = profile.target_calories or 0
    target_protein = profile.target_protein or 0
    target_carbs = profile.target_carbs or 0
    target_fat = profile.target_fat or 0

    for date_key in sorted(daily_totals.keys(), reverse=True):
        totals = daily_totals[date_key]

        calorie_difference = round(totals["calories"] - target_calories, 1)
        protein_difference = round(totals["protein"] - target_protein, 1)
        carbs_difference = round(totals["carbs"] - target_carbs, 1)
        fat_difference = round(totals["fat"] - target_fat, 1)

        calorie_status = "under" if calorie_difference < 0 else "over" if calorie_difference > 0 else "equal to"
        protein_status = "under" if protein_difference < 0 else "over" if protein_difference > 0 else "equal to"
        carbs_status = "under" if carbs_difference < 0 else "over" if carbs_difference > 0 else "equal to"
        fat_status = "under" if fat_difference < 0 else "over" if fat_difference > 0 else "equal to"

        lines.append(
            f"- {date_key}: "
            f"Calories: {round(totals['calories'], 1)} vs {target_calories} target "
            f"({abs(calorie_difference)} {calorie_status} target). "
            f"Protein: {round(totals['protein'], 1)}g vs {target_protein}g target "
            f"({abs(protein_difference)}g {protein_status} target). "
            f"Carbs: {round(totals['carbs'], 1)}g vs {target_carbs}g target "
            f"({abs(carbs_difference)}g {carbs_status} target). "
            f"Fat: {round(totals['fat'], 1)}g vs {target_fat}g target "
            f"({abs(fat_difference)}g {fat_status} target)."
        )

    return "\n".join(lines)

def extract_requested_date(question):
    # Let users ask about a specific day with ISO or slash-formatted dates.
    if not question:
        return None

    iso_match = re.search(r"\b(\d{4})-(\d{1,2})-(\d{1,2})\b", question)

    if iso_match:
        year, month, day = iso_match.groups()
        return f"{int(year):04d}-{int(month):02d}-{int(day):02d}"

    slash_match = re.search(r"\b(\d{1,2})/(\d{1,2})(?:/(\d{2,4}))?\b", question)

    if slash_match:
        month, day, year = slash_match.groups()

        if year:
            year = int(year)
            if year < 100:
                year += 2000
        else:
            year = date.today().year

        return f"{int(year):04d}-{int(month):02d}-{int(day):02d}"

    return None


def build_deterministic_nutrition_summary(profile, food_logs):
    # Calculate nutrition totals in backend code before the AI sees the prompt.
    if not profile:
        return "No profile targets are available."

    if not food_logs:
        return "No food logs are available for the requested day."

    totals = {
        "calories": 0,
        "protein": 0,
        "carbs": 0,
        "fat": 0,
        "fiber": 0,
        "sodium": 0,
    }

    for food in food_logs:
        totals["calories"] += food.calories or 0
        totals["protein"] += food.protein or 0
        totals["carbs"] += food.carbs or 0
        totals["fat"] += food.fat or 0
        totals["fiber"] += food.fiber or 0
        totals["sodium"] += food.sodium or 0

    net_carbs = max(totals["carbs"] - totals["fiber"], 0)

    target_calories = profile.target_calories or 0
    target_protein = profile.target_protein or 0
    target_carbs = profile.target_carbs or 0
    target_fat = profile.target_fat or 0

    calorie_difference = round(totals["calories"] - target_calories, 1)
    protein_difference = round(totals["protein"] - target_protein, 1)
    net_carbs_difference = round(net_carbs - target_carbs, 1)
    fat_difference = round(totals["fat"] - target_fat, 1)

    def format_difference(difference, unit=""):
        if difference > 0:
            return f"{abs(difference)}{unit} over"
        if difference < 0:
            return f"{abs(difference)}{unit} under"
        return "exactly on"

    return f"""
Backend-calculated nutrition summary:
- Calories: {round(totals["calories"], 1)} vs {target_calories} target ({format_difference(calorie_difference)} target)
- Protein: {round(totals["protein"], 1)}g vs {target_protein}g target ({format_difference(protein_difference, "g")} target)
- Total Carbs: {round(totals["carbs"], 1)}g
- Fiber: {round(totals["fiber"], 1)}g
- Net Carbs: {round(net_carbs, 1)}g vs {target_carbs}g target ({format_difference(net_carbs_difference, "g")} target)
- Fat: {round(totals["fat"], 1)}g vs {target_fat}g target ({format_difference(fat_difference, "g")} target)
- Sodium: {round(totals["sodium"], 1)}mg
""".strip()

def build_backend_nutrition_verdict(profile, food_logs):
    # Produce guardrail verdicts the AI must follow when giving advice.
    if not profile or not food_logs:
        return "No nutrition verdict available."

    totals = {
        "calories": 0,
        "protein": 0,
        "carbs": 0,
        "fat": 0,
        "fiber": 0,
        "sodium": 0,
    }

    for food in food_logs:
        totals["calories"] += food.calories or 0
        totals["protein"] += food.protein or 0
        totals["carbs"] += food.carbs or 0
        totals["fat"] += food.fat or 0
        totals["fiber"] += food.fiber or 0
        totals["sodium"] += food.sodium or 0

    net_carbs = max(totals["carbs"] - totals["fiber"], 0)

    calorie_difference = round(totals["calories"] - (profile.target_calories or 0), 1)
    protein_difference = round(totals["protein"] - (profile.target_protein or 0), 1)
    net_carbs_difference = round(net_carbs - (profile.target_carbs or 0), 1)
    fat_difference = round(totals["fat"] - (profile.target_fat or 0), 1)

    verdict_lines = []

    if calorie_difference <= 0:
        verdict_lines.append("Calories were under target. This supports the user's fat-loss goal.")
    else:
        verdict_lines.append("Calories were over target.")

    if protein_difference >= 0:
        verdict_lines.append("Protein was above target. This is a positive outcome for muscle retention and satiety.")
    else:
        verdict_lines.append("Protein was below target.")

    if net_carbs_difference <= 0:
        verdict_lines.append("Net carbs were under target. Do not describe the day as high-carb overall.")
    else:
        verdict_lines.append("Net carbs were over target.")

    if abs(fat_difference) <= 5:
        verdict_lines.append("Fat was close to target.")
    elif fat_difference > 0:
        verdict_lines.append("Fat was over target.")
    else:
        verdict_lines.append("Fat was under target.")

    if totals["fiber"] >= 50:
        verdict_lines.append("Fiber was very high, so digestion comfort is worth monitoring.")

    return "\n".join(f"- {line}" for line in verdict_lines)

def format_food_names_for_coach(food_logs):
    if not food_logs:
        return "No food logs available."

    lines = []

    for food in food_logs:
        lines.append(f"- {food.logged_date}: {food.food_name}")

    return "\n".join(lines)

def format_workout_logs_for_coach(workout_logs):
    if not workout_logs:
        return "No workout logs available."

    lines = []

    for workout in workout_logs:
        if workout.workout_type == "rest":
            details = workout.notes or "Rest day logged."

        elif workout.workout_type == "cardio":
            details = (
                f"{workout.duration_minutes or 0} minutes, "
                f"{workout.distance_miles or 0} miles"
            )

        else:
            details = (
                f"{workout.weight or 0} lb, "
                f"{workout.sets or 0} sets, "
                f"{workout.reps or 0} reps"
            )

        lines.append(
            f"- {workout.logged_date}: {workout.exercise_name} "
            f"({workout.workout_type}) | {details}"
        )

    return "\n".join(lines)


def format_saved_coach_responses_for_coach(coach_responses):
    if not coach_responses:
        return "No previous coach responses available."

    lines = []

    for response in coach_responses:
        lines.append(
            f"- {response.created_at}: {response.request_type} | "
            f"{response.response_text}"
        )

    return "\n".join(lines)


def build_coach_prompt(profile, food_logs, workout_logs, request_type, question):
    # Combine profile/log context with strict instructions against recalculation.
    nutrition_summary = build_deterministic_nutrition_summary(profile, food_logs)
    nutrition_verdict = build_backend_nutrition_verdict(profile, food_logs)

    return f"""
You are PumpAI, a fitness and nutrition coaching assistant.

The backend has already calculated the user's nutrition totals and verdict.
You are not allowed to recalculate or reinterpret calories, carbs, protein, fat, fiber, or sodium.

Your job:
- Give practical coaching advice based on the backend nutrition verdict.
- Keep the response concise.
- Do not state exact calorie, protein, carb, fat, fiber, or sodium totals.
- Do not say calories were high, over target, or poor if the backend verdict says calories were under target.
- Do not say carbs were high, over target, or a problem if the backend verdict says net carbs were under target.
- Do not treat high fiber as the same thing as high sugar or starch.
- Do not contradict the backend verdict.
- Do not provide medical diagnosis or treatment advice.
- If the user asks about pain, injury, medication, eating disorders, or dangerous symptoms, tell them to consult a qualified professional.

Request Type:
{request_type}

User Question:
{question}

Official Backend Nutrition Summary:
{nutrition_summary}

Official Backend Nutrition Verdict:
{nutrition_verdict}

Food Items Logged:
{format_food_names_for_coach(food_logs)}

Workout Logs:
{format_workout_logs_for_coach(workout_logs)}
""".strip()

def get_current_user_id():
    # Central auth helper used by every protected resource.
    user_id = session.get("user_id")

    if not user_id:
        return None

    last_active = session.get("last_active")
    now = datetime.utcnow()

    if last_active:
        try:
            last_active_time = datetime.fromisoformat(last_active)
        except ValueError:
            session.pop("user_id", None)
            session.pop("last_active", None)
            return None

        inactive_time = now - last_active_time

        if inactive_time > timedelta(minutes=15):
            # Clear both keys when the inactivity timeout has passed.
            session.pop("user_id", None)
            session.pop("last_active", None)
            return None

    session["last_active"] = now.isoformat()
    session.permanent = True

    return user_id

class Signup(Resource):
    def post(self):
        data = request.get_json() or {}

        try:
            # Creating a user also hashes the password through the model setter.
            user = User(
                username=data.get("username"),
                email=data.get("email"),
            )

            user.password_hash = data.get("password")

            db.session.add(user)
            db.session.commit()

            session["user_id"] = user.id
            session["last_active"] = datetime.utcnow().isoformat()
            session.permanent = True

            return make_response(user.to_dict(), 201)

        except ValueError as error:
            db.session.rollback()
            return make_response({"error": str(error)}, 422)

        except IntegrityError:
            db.session.rollback()
            return make_response({"error": "Username or email already exists."}, 422)


class Login(Resource):
    def post(self):
        data = request.get_json() or {}

        username = data.get("username")
        password = data.get("password")

        user = User.query.filter_by(username=username).first()

        if user and user.authenticate(password):
            session["user_id"] = user.id
            session["last_active"] = datetime.utcnow().isoformat()
            session.permanent = True
            return make_response(user.to_dict(), 200)

        return make_response({"error": "Invalid username or password."}, 401)


class CheckSession(Resource):
    def get(self):
        user_id = get_current_user_id()

        if not user_id:
            return make_response({"error": "Unauthorized."}, 401)

        user = User.query.filter_by(id=user_id).first()

        if user:
            return make_response(user.to_dict(), 200)

        return make_response({"error": "Unauthorized."}, 401)


class Logout(Resource):
    def delete(self):
        if session.get("user_id"):
            session.pop("user_id", None)
            session.pop("last_active", None)
            return make_response({}, 204)

        return make_response({"error": "Unauthorized."}, 401)
    
class ProfileResource(Resource):
    def get(self):
        user_id = get_current_user_id()

        if not user_id:
            return make_response({"error": "Unauthorized."}, 401)

        profile = Profile.query.filter_by(user_id=user_id).first()

        if not profile:
            return make_response({"error": "Profile not found."}, 404)

        return make_response(profile.to_dict(), 200)

    def post(self):
        user_id = get_current_user_id()

        if not user_id:
            return make_response({"error": "Unauthorized."}, 401)

        existing_profile = Profile.query.filter_by(user_id=user_id).first()

        if existing_profile:
            return make_response({"error": "Profile already exists."}, 422)

        data = request.get_json() or {}

        try:
            # Saved age is recalculated from birth_date to keep it consistent.
            profile = Profile(
                name=data.get("name"),
                gender=data.get("gender"),
                birth_date=data.get("birth_date"),
                age=calculate_age_from_birth_date(data.get("birth_date")),
                height=data.get("height"),
                current_weight=data.get("current_weight"),
                weight_unit=data.get("weight_unit", "lb"),
                fitness_goal=data.get("fitness_goal"),
                dietary_preferences=data.get("dietary_preferences"),
                target_calories=data.get("target_calories"),
                target_protein=data.get("target_protein"),
                target_carbs=data.get("target_carbs"),
                target_fat=data.get("target_fat"),
                coaching_style=data.get("coaching_style"),
                user_id=user_id,
            )

            db.session.add(profile)
            db.session.commit()

            return make_response(profile.to_dict(), 201)

        except ValueError as error:
            db.session.rollback()
            return make_response({"error": str(error)}, 422)

    def patch(self):
        user_id = get_current_user_id()

        if not user_id:
            return make_response({"error": "Unauthorized."}, 401)

        profile = Profile.query.filter_by(user_id=user_id).first()

        if not profile:
            return make_response({"error": "Profile not found."}, 404)

        data = request.get_json() or {}

        # Only mutable profile fields are patched; identifiers and age are protected.
        for attr in data:
            if attr in ["id", "user_id", "age"]:
                continue

            if hasattr(profile, attr):
                setattr(profile, attr, data[attr])

        if "birth_date" in data:
            profile.age = calculate_age_from_birth_date(data.get("birth_date"))
        try:
            db.session.commit()
            return make_response(profile.to_dict(), 200)

        except ValueError as error:
            db.session.rollback()
            return make_response({"error": str(error)}, 422)
        
class AccountResource(Resource):
    def patch(self):
        user_id = get_current_user_id()

        if not user_id:
            return make_response({"error": "Unauthorized."}, 401)

        user = User.query.filter_by(id=user_id).first()

        if not user:
            return make_response({"error": "User not found."}, 404)

        data = request.get_json() or {}
        username = data.get("username")

        if not username or not username.strip():
            return make_response({"error": "Username is required."}, 422)

        user.username = username.strip()

        try:
            db.session.commit()
            return make_response(user.to_dict(), 200)

        except ValueError as error:
            db.session.rollback()
            return make_response({"error": str(error)}, 422)

        except IntegrityError:
            db.session.rollback()
            return make_response({"error": "Username already exists."}, 422)

class FoodLogs(Resource):
    def get(self):
        user_id = get_current_user_id()

        if not user_id:
            return make_response({"error": "Unauthorized."}, 401)

        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 10, type=int)

        # Clamp pagination so the endpoint stays predictable for the client.
        if page < 1:
            page = 1

        if per_page < 1 or per_page > 50:
            per_page = 10

        pagination = FoodLog.query.filter_by(user_id=user_id).order_by(FoodLog.id.desc()).paginate(
            page=page,
            per_page=per_page,
            error_out=False,
        )

        food_logs = [food_log.to_dict() for food_log in pagination.items]

        return make_response({
            "food_logs": food_logs,
            "page": pagination.page,
            "per_page": pagination.per_page,
            "total": pagination.total,
            "pages": pagination.pages,
        }, 200)

    def post(self):
        user_id = get_current_user_id()

        if not user_id:
            return make_response({"error": "Unauthorized."}, 401)

        data = request.get_json() or {}

        try:
            food_log = FoodLog(
                food_name=data.get("food_name"),
                calories=data.get("calories"),
                servings=data.get("servings"),
                protein=data.get("protein"),
                carbs=data.get("carbs"),
                fat=data.get("fat"),
                fiber=data.get("fiber"),
                sodium=data.get("sodium"),
                serving_size=data.get("serving_size"),
                logged_date=data.get("logged_date", date.today().isoformat()),
                user_id=user_id,
            )

            db.session.add(food_log)
            db.session.commit()

            return make_response(food_log.to_dict(), 201)

        except ValueError as error:
            db.session.rollback()
            return make_response({"error": str(error)}, 422)


class FoodLogByID(Resource):
    def patch(self, id):
        user_id = get_current_user_id()

        if not user_id:
            return make_response({"error": "Unauthorized."}, 401)

        food_log = FoodLog.query.filter_by(id=id, user_id=user_id).first()

        if not food_log:
            return make_response({"error": "Food log not found."}, 404)

        data = request.get_json() or {}

        for attr in data:
            if hasattr(food_log, attr) and attr != "id" and attr != "user_id":
                setattr(food_log, attr, data[attr])

        try:
            db.session.commit()
            return make_response(food_log.to_dict(), 200)

        except ValueError as error:
            db.session.rollback()
            return make_response({"error": str(error)}, 422)

    def delete(self, id):
        user_id = get_current_user_id()

        if not user_id:
            return make_response({"error": "Unauthorized."}, 401)

        food_log = FoodLog.query.filter_by(id=id, user_id=user_id).first()

        if not food_log:
            return make_response({"error": "Food log not found."}, 404)

        db.session.delete(food_log)
        db.session.commit()

        return make_response({}, 204)
    
class WorkoutLogs(Resource):
    def get(self):
        user_id = get_current_user_id()

        if not user_id:
            return make_response({"error": "Unauthorized."}, 401)

        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 10, type=int)

        if page < 1:
            page = 1

        if per_page < 1 or per_page > 50:
            per_page = 10

        pagination = WorkoutLog.query.filter_by(user_id=user_id).order_by(WorkoutLog.id.desc()).paginate(
            page=page,
            per_page=per_page,
            error_out=False,
        )

        workout_logs = [workout_log.to_dict() for workout_log in pagination.items]

        return make_response({
            "workout_logs": workout_logs,
            "page": pagination.page,
            "per_page": pagination.per_page,
            "total": pagination.total,
            "pages": pagination.pages,
        }, 200)

    def post(self):
        user_id = get_current_user_id()

        if not user_id:
            return make_response({"error": "Unauthorized."}, 401)

        data = request.get_json() or {}

        try:
            workout_log = WorkoutLog(
                workout_type=data.get("workout_type"),
                exercise_name=data.get("exercise_name"),
                duration_minutes=data.get("duration_minutes"),
                distance_miles=data.get("distance_miles"),
                weight=data.get("weight"),
                sets=data.get("sets"),
                reps=data.get("reps"),
                notes=data.get("notes"),
                logged_date=data.get("logged_date", date.today().isoformat()),
                user_id=user_id,
            )

            db.session.add(workout_log)
            db.session.commit()

            return make_response(workout_log.to_dict(), 201)

        except ValueError as error:
            db.session.rollback()
            return make_response({"error": str(error)}, 422)


class WorkoutLogByID(Resource):
    def patch(self, id):
        user_id = get_current_user_id()

        if not user_id:
            return make_response({"error": "Unauthorized."}, 401)

        workout_log = WorkoutLog.query.filter_by(id=id, user_id=user_id).first()

        if not workout_log:
            return make_response({"error": "Workout log not found."}, 404)

        data = request.get_json() or {}

        for attr in data:
            if hasattr(workout_log, attr) and attr != "id" and attr != "user_id":
                setattr(workout_log, attr, data[attr])

        try:
            db.session.commit()
            return make_response(workout_log.to_dict(), 200)

        except ValueError as error:
            db.session.rollback()
            return make_response({"error": str(error)}, 422)

    def delete(self, id):
        user_id = get_current_user_id()

        if not user_id:
            return make_response({"error": "Unauthorized."}, 401)

        workout_log = WorkoutLog.query.filter_by(id=id, user_id=user_id).first()

        if not workout_log:
            return make_response({"error": "Workout log not found."}, 404)

        db.session.delete(workout_log)
        db.session.commit()

        return make_response({}, 204)
    
class History(Resource):
    def get(self):
        user_id = get_current_user_id()

        if not user_id:
            return make_response({"error": "Unauthorized."}, 401)

        start_date = request.args.get("start_date")
        end_date = request.args.get("end_date")

        profile = Profile.query.filter_by(user_id=user_id).first()

        food_query = FoodLog.query.filter_by(user_id=user_id)
        workout_query = WorkoutLog.query.filter_by(user_id=user_id)
        coach_query = CoachResponse.query.filter_by(user_id=user_id)

        # Optional date filters apply to every history category consistently.
        if start_date:
            food_query = food_query.filter(FoodLog.logged_date >= start_date)
            workout_query = workout_query.filter(WorkoutLog.logged_date >= start_date)
            coach_query = coach_query.filter(CoachResponse.created_at >= start_date)

        if end_date:
            food_query = food_query.filter(FoodLog.logged_date <= end_date)
            workout_query = workout_query.filter(WorkoutLog.logged_date <= end_date)
            coach_query = coach_query.filter(CoachResponse.created_at <= end_date)

        food_logs = food_query.order_by(FoodLog.logged_date.desc(), FoodLog.id.desc()).all()
        workout_logs = workout_query.order_by(
            WorkoutLog.logged_date.desc(),
            WorkoutLog.id.desc()
        ).all()
        coach_responses = coach_query.order_by(
            CoachResponse.created_at.desc(),
            CoachResponse.id.desc()
        ).all()

        return make_response({
            "profile": profile.to_dict() if profile else None,
            "food_logs": [food_log.to_dict() for food_log in food_logs],
            "workout_logs": [workout_log.to_dict() for workout_log in workout_logs],
            "coach_responses": [coach_response.to_dict() for coach_response in coach_responses],
            "totals": {
                "food_logs": food_query.count(),
                "workout_logs": workout_query.count(),
                "coach_responses": coach_query.count(),
            },
            "filters": {
                "start_date": start_date,
                "end_date": end_date,
            },
        }, 200)
    
class CoachResponses(Resource):
    def get(self):
        user_id = get_current_user_id()

        if not user_id:
            return make_response({"error": "Unauthorized."}, 401)

        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 10, type=int)

        if page < 1:
            page = 1

        if per_page < 1 or per_page > 50:
            per_page = 10

        pagination = CoachResponse.query.filter_by(user_id=user_id).order_by(CoachResponse.id.desc()).paginate(
            page=page,
            per_page=per_page,
            error_out=False,
        )

        coach_responses = [
            coach_response.to_dict() for coach_response in pagination.items
        ]

        return make_response({
            "coach_responses": coach_responses,
            "page": pagination.page,
            "per_page": pagination.per_page,
            "total": pagination.total,
            "pages": pagination.pages,
        }, 200)

    def post(self):
        user_id = get_current_user_id()

        if not user_id:
            return make_response({"error": "Unauthorized."}, 401)

        data = request.get_json() or {}

        try:
            coach_response = CoachResponse(
                request_type=data.get("request_type"),
                response_text=data.get("response_text"),
                created_at=data.get("created_at", date.today().isoformat()),
                user_id=user_id,
            )

            db.session.add(coach_response)
            db.session.commit()

            return make_response(coach_response.to_dict(), 201)

        except ValueError as error:
            db.session.rollback()
            return make_response({"error": str(error)}, 422)


class CoachResponseByID(Resource):
    def delete(self, id):
        user_id = get_current_user_id()

        if not user_id:
            return make_response({"error": "Unauthorized."}, 401)

        coach_response = CoachResponse.query.filter_by(id=id, user_id=user_id).first()

        if not coach_response:
            return make_response({"error": "Coach response not found."}, 404)

        db.session.delete(coach_response)
        db.session.commit()

        return make_response({}, 204)

class Coach(Resource):
    def post(self):
        user_id = get_current_user_id()

        if not user_id:
            return make_response({"error": "Unauthorized."}, 401)

        api_key = os.getenv("OPENAI_API_KEY")

        if not api_key:
            return make_response({"error": "OpenAI API key is not configured."}, 500)

        data = request.get_json() or {}

        request_type = data.get("request_type", "custom_question")
        question = data.get("question", "").strip()

        if not question:
            return make_response({"error": "Question is required."}, 422)

        profile = Profile.query.filter_by(user_id=user_id).first()

        requested_date = extract_requested_date(question)

        food_query = FoodLog.query.filter_by(user_id=user_id)
        workout_query = WorkoutLog.query.filter_by(user_id=user_id)

        # Date-specific questions narrow the AI context to that exact day.
        if requested_date:
            food_query = food_query.filter(FoodLog.logged_date == requested_date)
            workout_query = workout_query.filter(WorkoutLog.logged_date == requested_date)
        
        food_logs = food_query.order_by(
            FoodLog.logged_date.desc(),
            FoodLog.id.desc()
        ).limit(30).all()

        workout_logs = workout_query.order_by(
            WorkoutLog.logged_date.desc(),
            WorkoutLog.id.desc()
        ).limit(30).all()

        prompt = build_coach_prompt(
            profile=profile,
            food_logs=food_logs,
            workout_logs=workout_logs,
            request_type=request_type,
            question=question,
        )

        try:
            # The stored response includes deterministic backend context plus AI feedback.
            response = client.responses.create(
                model="gpt-5.4-mini",
                input=prompt,
                temperature=0.2,
            )

            ai_advice = response.output_text
            nutrition_summary = build_deterministic_nutrition_summary(profile, food_logs)
            nutrition_verdict = build_backend_nutrition_verdict(profile, food_logs)

            final_response_text = (
                f"Question: {question}\n\n"
                f"{nutrition_summary}\n\n"
                f"Backend verdict:\n{nutrition_verdict}\n\n"
                f"Coach feedback:\n{ai_advice}"
            )                                                          

            coach_response = CoachResponse(
                request_type=request_type,
                response_text=final_response_text,
                created_at=date.today().isoformat(),
                user_id=user_id,
            )

            db.session.add(coach_response)
            db.session.commit()

            return make_response(coach_response.to_dict(), 201)

        except Exception as error:
            db.session.rollback()
            return make_response({"error": str(error)}, 500)

class EasyLogItems(Resource):
    def get(self):
        user_id = get_current_user_id()

        if not user_id:
            return make_response({"error": "Unauthorized."}, 401)

        easy_log_items = EasyLogItem.query.filter_by(user_id=user_id).order_by(
            EasyLogItem.name.asc()
        ).all()

        return make_response({
            "easy_log_items": [
                easy_log_item.to_dict() for easy_log_item in easy_log_items
            ]
        }, 200)

    def post(self):
        user_id = get_current_user_id()

        if not user_id:
            return make_response({"error": "Unauthorized."}, 401)

        data = request.get_json() or {}

        try:
            # Easy Log records are reusable templates, not daily activity logs.
            easy_log_item = EasyLogItem(
                name=data.get("name"),
                item_type=data.get("item_type"),
                calories=data.get("calories"),
                servings=data.get("servings", 1),
                protein=data.get("protein"),
                carbs=data.get("carbs"),
                fat=data.get("fat"),
                fiber=data.get("fiber"),
                sodium=data.get("sodium"),
                serving_size=data.get("serving_size"),
                user_id=user_id,
            )

            db.session.add(easy_log_item)
            db.session.commit()

            return make_response(easy_log_item.to_dict(), 201)

        except ValueError as error:
            db.session.rollback()
            return make_response({"error": str(error)}, 422)


class EasyLogItemByID(Resource):
    def delete(self, id):
        user_id = get_current_user_id()

        if not user_id:
            return make_response({"error": "Unauthorized."}, 401)

        easy_log_item = EasyLogItem.query.filter_by(id=id, user_id=user_id).first()

        if not easy_log_item:
            return make_response({"error": "Easy log item not found."}, 404)

        db.session.delete(easy_log_item)
        db.session.commit()

        return make_response({}, 204)

api.add_resource(Signup, "/signup")
api.add_resource(Login, "/login")
api.add_resource(CheckSession, "/check_session")
api.add_resource(Logout, "/logout")
api.add_resource(ProfileResource, "/profile")
api.add_resource(AccountResource, "/account")
api.add_resource(FoodLogs, "/food_logs")
api.add_resource(FoodLogByID, "/food_logs/<int:id>")
api.add_resource(WorkoutLogs, "/workout_logs")
api.add_resource(WorkoutLogByID, "/workout_logs/<int:id>")
api.add_resource(History, "/history")
api.add_resource(CoachResponses, "/coach_responses")
api.add_resource(CoachResponseByID, "/coach_responses/<int:id>")
api.add_resource(Coach, "/coach")
api.add_resource(EasyLogItems, "/easy_log_items")
api.add_resource(EasyLogItemByID, "/easy_log_items/<int:id>")

if __name__ == "__main__":
    app.run(port=5555, debug=True)
