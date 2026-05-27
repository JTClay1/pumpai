from datetime import date, datetime

from flask import make_response, request, session
from flask_restful import Api, Resource
from sqlalchemy.exc import IntegrityError

from config import app, db
from models import User, Profile, FoodLog, WorkoutLog, CoachResponse


api = Api(app)


@app.get("/")
def index():
    return make_response({"message": "PumpAI API running"}, 200)


def calculate_age_from_birth_date(birth_date):
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


class Signup(Resource):
    def post(self):
        data = request.get_json() or {}

        try:
            user = User(
                username=data.get("username"),
                email=data.get("email"),
            )

            user.password_hash = data.get("password")

            db.session.add(user)
            db.session.commit()

            session["user_id"] = user.id

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
            return make_response(user.to_dict(), 200)

        return make_response({"error": "Invalid username or password."}, 401)


class CheckSession(Resource):
    def get(self):
        user_id = session.get("user_id")

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
            return make_response({}, 204)

        return make_response({"error": "Unauthorized."}, 401)
    
class ProfileResource(Resource):
    def get(self):
        user_id = session.get("user_id")

        if not user_id:
            return make_response({"error": "Unauthorized."}, 401)

        profile = Profile.query.filter_by(user_id=user_id).first()

        if not profile:
            return make_response({"error": "Profile not found."}, 404)

        return make_response(profile.to_dict(), 200)

    def post(self):
        user_id = session.get("user_id")

        if not user_id:
            return make_response({"error": "Unauthorized."}, 401)

        existing_profile = Profile.query.filter_by(user_id=user_id).first()

        if existing_profile:
            return make_response({"error": "Profile already exists."}, 422)

        data = request.get_json() or {}

        try:
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
        user_id = session.get("user_id")

        if not user_id:
            return make_response({"error": "Unauthorized."}, 401)

        profile = Profile.query.filter_by(user_id=user_id).first()

        if not profile:
            return make_response({"error": "Profile not found."}, 404)

        data = request.get_json() or {}

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

class FoodLogs(Resource):
    def get(self):
        user_id = session.get("user_id")

        if not user_id:
            return make_response({"error": "Unauthorized."}, 401)

        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 10, type=int)

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
        user_id = session.get("user_id")

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
        user_id = session.get("user_id")

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
        user_id = session.get("user_id")

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
        user_id = session.get("user_id")

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
        user_id = session.get("user_id")

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
        user_id = session.get("user_id")

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
        user_id = session.get("user_id")

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
        user_id = session.get("user_id")

        if not user_id:
            return make_response({"error": "Unauthorized."}, 401)

        food_limit = request.args.get("food_limit", 10, type=int)
        workout_limit = request.args.get("workout_limit", 10, type=int)
        coach_limit = request.args.get("coach_limit", 5, type=int)

        if food_limit < 1 or food_limit > 50:
            food_limit = 10

        if workout_limit < 1 or workout_limit > 50:
            workout_limit = 10

        if coach_limit < 1 or coach_limit > 25:
            coach_limit = 5

        profile = Profile.query.filter_by(user_id=user_id).first()

        food_query = FoodLog.query.filter_by(user_id=user_id)
        workout_query = WorkoutLog.query.filter_by(user_id=user_id)
        coach_query = CoachResponse.query.filter_by(user_id=user_id)

        food_logs = food_query.order_by(FoodLog.id.desc()).limit(food_limit).all()
        workout_logs = workout_query.order_by(WorkoutLog.id.desc()).limit(workout_limit).all()
        coach_responses = coach_query.order_by(CoachResponse.id.desc()).limit(coach_limit).all()

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
        }, 200)
    
class CoachResponses(Resource):
    def get(self):
        user_id = session.get("user_id")

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
        user_id = session.get("user_id")

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
        user_id = session.get("user_id")

        if not user_id:
            return make_response({"error": "Unauthorized."}, 401)

        coach_response = CoachResponse.query.filter_by(id=id, user_id=user_id).first()

        if not coach_response:
            return make_response({"error": "Coach response not found."}, 404)

        db.session.delete(coach_response)
        db.session.commit()

        return make_response({}, 204)

api.add_resource(Signup, "/signup")
api.add_resource(Login, "/login")
api.add_resource(CheckSession, "/check_session")
api.add_resource(Logout, "/logout")
api.add_resource(ProfileResource, "/profile")
api.add_resource(FoodLogs, "/food_logs")
api.add_resource(FoodLogByID, "/food_logs/<int:id>")
api.add_resource(WorkoutLogs, "/workout_logs")
api.add_resource(WorkoutLogByID, "/workout_logs/<int:id>")
api.add_resource(History, "/history")
api.add_resource(CoachResponses, "/coach_responses")
api.add_resource(CoachResponseByID, "/coach_responses/<int:id>")

if __name__ == "__main__":
    app.run(port=5555, debug=True)