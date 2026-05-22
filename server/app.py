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


api.add_resource(Signup, "/signup")
api.add_resource(Login, "/login")
api.add_resource(CheckSession, "/check_session")
api.add_resource(Logout, "/logout")
api.add_resource(ProfileResource, "/profile")

if __name__ == "__main__":
    app.run(port=5555, debug=True)