from datetime import date

from flask import make_response, request, session
from flask_restful import Api, Resource
from sqlalchemy.exc import IntegrityError

from config import app, db
from models import User, Profile, FoodLog, WorkoutLog, CoachResponse


api = Api(app)


@app.get("/")
def index():
    return make_response({"message": "PumpAI API running"}, 200)


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
                age=data.get("age"),
                height=data.get("height"),
                current_weight=data.get("current_weight"),
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
            if hasattr(profile, attr) and attr != "id" and attr != "user_id":
                setattr(profile, attr, data[attr])

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

api.add_resource(Signup, "/signup")
api.add_resource(Login, "/login")
api.add_resource(CheckSession, "/check_session")
api.add_resource(Logout, "/logout")
api.add_resource(ProfileResource, "/profile")
api.add_resource(FoodLogs, "/food_logs")
api.add_resource(FoodLogByID, "/food_logs/<int:id>")
api.add_resource(WorkoutLogs, "/workout_logs")
api.add_resource(WorkoutLogByID, "/workout_logs/<int:id>")

if __name__ == "__main__":
    app.run(port=5555, debug=True)