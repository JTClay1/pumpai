from sqlalchemy_serializer import SerializerMixin
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import validates

from config import db, bcrypt


class User(db.Model, SerializerMixin):
    __tablename__ = "users"

    serialize_rules = (
        "-_password_hash",
        "-profile.user",
        "-food_logs.user",
        "-workout_logs.user",
        "-coach_responses.user",
    )

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String, nullable=False, unique=True)
    email = db.Column(db.String, nullable=False, unique=True)
    _password_hash = db.Column(db.String, nullable=False)

    profile = db.relationship("Profile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    food_logs = db.relationship("FoodLog", back_populates="user", cascade="all, delete-orphan")
    workout_logs = db.relationship("WorkoutLog", back_populates="user", cascade="all, delete-orphan")
    coach_responses = db.relationship("CoachResponse", back_populates="user", cascade="all, delete-orphan")

    @hybrid_property
    def password_hash(self):
        raise AttributeError("Password hashes may not be viewed.")

    @password_hash.setter
    def password_hash(self, password):
        if not password or len(password) < 6:
            raise ValueError("Password must be at least 6 characters long.")

        self._password_hash = bcrypt.generate_password_hash(password).decode("utf-8")

    def authenticate(self, password):
        return bcrypt.check_password_hash(self._password_hash, password)

    @validates("username")
    def validate_username(self, key, username):
        if not username or len(username.strip()) < 3:
            raise ValueError("Username must be at least 3 characters long.")
        return username.strip()

    @validates("email")
    def validate_email(self, key, email):
        if not email or "@" not in email:
            raise ValueError("A valid email is required.")
        return email.strip().lower()


class Profile(db.Model, SerializerMixin):
    __tablename__ = "profiles"

    serialize_rules = ("-user",)

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String)
    gender = db.Column(db.String)
    age = db.Column(db.Integer)
    height = db.Column(db.String)
    current_weight = db.Column(db.Float)
    fitness_goal = db.Column(db.String)
    dietary_preferences = db.Column(db.String)
    target_calories = db.Column(db.Integer)
    target_protein = db.Column(db.Integer)
    target_carbs = db.Column(db.Integer)
    target_fat = db.Column(db.Integer)
    coaching_style = db.Column(db.String)

    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, unique=True)
    user = db.relationship("User", back_populates="profile")


class FoodLog(db.Model, SerializerMixin):
    __tablename__ = "food_logs"

    serialize_rules = ("-user",)

    id = db.Column(db.Integer, primary_key=True)
    food_name = db.Column(db.String, nullable=False)
    calories = db.Column(db.Integer, nullable=False)
    servings = db.Column(db.Float, nullable=False)
    protein = db.Column(db.Float)
    carbs = db.Column(db.Float)
    fat = db.Column(db.Float)
    fiber = db.Column(db.Float)
    sodium = db.Column(db.Float)
    serving_size = db.Column(db.String)
    logged_date = db.Column(db.String, nullable=False)

    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    user = db.relationship("User", back_populates="food_logs")

    @validates("food_name")
    def validate_food_name(self, key, food_name):
        if not food_name or not food_name.strip():
            raise ValueError("Food name is required.")
        return food_name.strip()

    @validates("calories")
    def validate_calories(self, key, calories):
        if calories is None or calories < 0:
            raise ValueError("Calories must be 0 or higher.")
        return calories

    @validates("servings")
    def validate_servings(self, key, servings):
        if servings is None or servings <= 0:
            raise ValueError("Servings must be greater than 0.")
        return servings


class WorkoutLog(db.Model, SerializerMixin):
    __tablename__ = "workout_logs"

    serialize_rules = ("-user",)

    id = db.Column(db.Integer, primary_key=True)
    workout_type = db.Column(db.String, nullable=False)
    exercise_name = db.Column(db.String, nullable=False)
    duration_minutes = db.Column(db.Integer)
    distance_miles = db.Column(db.Float)
    weight = db.Column(db.Float)
    sets = db.Column(db.Integer)
    reps = db.Column(db.Integer)
    notes = db.Column(db.String)
    logged_date = db.Column(db.String, nullable=False)

    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    user = db.relationship("User", back_populates="workout_logs")

    @validates("workout_type")
    def validate_workout_type(self, key, workout_type):
        valid_types = ["cardio", "weighted"]
        if workout_type not in valid_types:
            raise ValueError("Workout type must be cardio or weighted.")
        return workout_type

    @validates("exercise_name")
    def validate_exercise_name(self, key, exercise_name):
        if not exercise_name or not exercise_name.strip():
            raise ValueError("Exercise name is required.")
        return exercise_name.strip()


class CoachResponse(db.Model, SerializerMixin):
    __tablename__ = "coach_responses"

    serialize_rules = ("-user",)

    id = db.Column(db.Integer, primary_key=True)
    request_type = db.Column(db.String, nullable=False)
    response_text = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.String, nullable=False)

    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    user = db.relationship("User", back_populates="coach_responses")

    @validates("request_type")
    def validate_request_type(self, key, request_type):
        if not request_type or not request_type.strip():
            raise ValueError("Request type is required.")
        return request_type.strip()

    @validates("response_text")
    def validate_response_text(self, key, response_text):
        if not response_text or not response_text.strip():
            raise ValueError("Response text is required.")
        return response_text.strip()