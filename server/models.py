from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy_serializer import SerializerMixin
from sqlalchemy.orm import validates

from config import db, bcrypt


class User(db.Model, SerializerMixin):
    __tablename__ = "users"

    # Avoid leaking password hashes or recursively serializing related objects.
    serialize_rules = (
        "-_password_hash",
        "-profile.user",
        "-food_logs.user",
        "-workout_logs.user",
        "-coach_responses.user",
        "-easy_log_items.user",
    )

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String, nullable=False, unique=True)
    email = db.Column(db.String, nullable=False, unique=True)
    _password_hash = db.Column(db.String, nullable=False)

    profile = db.relationship(
        "Profile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )

    food_logs = db.relationship(
        "FoodLog",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    workout_logs = db.relationship(
        "WorkoutLog",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    coach_responses = db.relationship(
        "CoachResponse",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    easy_log_items = db.relationship(
        "EasyLogItem",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    @hybrid_property
    def password_hash(self):
        # Password hashes should only ever be written, never read back.
        raise AttributeError("Password hashes may not be viewed.")

    @password_hash.setter
    def password_hash(self, password):
        if not password or len(password) < 6:
            raise ValueError("Password must be at least 6 characters long.")

        password_hash = bcrypt.generate_password_hash(password.encode("utf-8"))
        self._password_hash = password_hash.decode("utf-8")

    def authenticate(self, password):
        return bcrypt.check_password_hash(self._password_hash, password.encode("utf-8"))

    @validates("username")
    def validate_username(self, key, username):
        if not username or not username.strip():
            raise ValueError("Username is required.")

        return username.strip()

    @validates("email")
    def validate_email(self, key, email):
        if not email or not email.strip():
            raise ValueError("Email is required.")

        if "@" not in email:
            raise ValueError("Email must be valid.")

        return email.strip().lower()

    def __repr__(self):
        return f"<User {self.id}: {self.username}>"


class Profile(db.Model, SerializerMixin):
    __tablename__ = "profiles"

    serialize_rules = ("-user",)

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String)
    gender = db.Column(db.String)
    birth_date = db.Column(db.String)
    age = db.Column(db.Integer)
    height = db.Column(db.String)
    current_weight = db.Column(db.Float)
    weight_unit = db.Column(db.String, default="lb")
    fitness_goal = db.Column(db.String)
    dietary_preferences = db.Column(db.String)
    target_calories = db.Column(db.Integer)
    target_protein = db.Column(db.Integer)
    target_carbs = db.Column(db.Integer)
    target_fat = db.Column(db.Integer)
    coaching_style = db.Column(db.String)

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
        unique=True,
    )

    # Each user owns one profile that stores personal targets and preferences.
    user = db.relationship("User", back_populates="profile")

    @validates("weight_unit")
    def validate_weight_unit(self, key, weight_unit):
        valid_units = ["lb", "kg"]

        if weight_unit and weight_unit not in valid_units:
            raise ValueError("Weight unit must be lb or kg.")

        return weight_unit or "lb"

    def __repr__(self):
        return f"<Profile {self.id}: User {self.user_id}>"


class FoodLog(db.Model, SerializerMixin):
    __tablename__ = "food_logs"

    serialize_rules = ("-user",)

    id = db.Column(db.Integer, primary_key=True)
    food_name = db.Column(db.String, nullable=False)
    calories = db.Column(db.Integer, nullable=False)
    servings = db.Column(db.Float, nullable=False, default=1)
    protein = db.Column(db.Float)
    carbs = db.Column(db.Float)
    fat = db.Column(db.Float)
    fiber = db.Column(db.Float)
    sodium = db.Column(db.Float)
    serving_size = db.Column(db.String)
    logged_date = db.Column(db.String, nullable=False)

    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    # Food logs belong to one user and feed history plus coach calculations.
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

    def __repr__(self):
        return f"<FoodLog {self.id}: {self.food_name}>"


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
    # Workout logs track cardio, weighted sessions, and rest days together.
    user = db.relationship("User", back_populates="workout_logs")

    @validates("workout_type")
    def validate_workout_type(self, key, workout_type):
        valid_types = ["cardio", "weighted", "rest"]

        if workout_type not in valid_types:
            raise ValueError("Workout type must be cardio, weighted, or rest.")

        return workout_type

    @validates("exercise_name")
    def validate_exercise_name(self, key, exercise_name):
        if not exercise_name or not exercise_name.strip():
            raise ValueError("Exercise name is required.")

        return exercise_name.strip()

    def __repr__(self):
        return f"<WorkoutLog {self.id}: {self.exercise_name}>"


class CoachResponse(db.Model, SerializerMixin):
    __tablename__ = "coach_responses"

    serialize_rules = ("-user",)

    id = db.Column(db.Integer, primary_key=True)
    request_type = db.Column(db.String, nullable=False)
    response_text = db.Column(db.String, nullable=False)
    created_at = db.Column(db.String, nullable=False)

    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    # Saved coach responses preserve generated feedback for the history pages.
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

    def __repr__(self):
        return f"<CoachResponse {self.id}: {self.request_type}>"


class EasyLogItem(db.Model, SerializerMixin):
    __tablename__ = "easy_log_items"

    serialize_rules = ("-user",)

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, nullable=False)
    item_type = db.Column(db.String, nullable=False)
    calories = db.Column(db.Integer, nullable=False)
    servings = db.Column(db.Float, nullable=False, default=1)
    protein = db.Column(db.Float)
    carbs = db.Column(db.Float)
    fat = db.Column(db.Float)
    fiber = db.Column(db.Float)
    sodium = db.Column(db.Float)
    serving_size = db.Column(db.String)

    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    # Easy Log items are reusable foods/meals that can prefill daily tracking.
    user = db.relationship("User", back_populates="easy_log_items")

    @validates("name")
    def validate_name(self, key, name):
        if not name or not name.strip():
            raise ValueError("Easy log item name is required.")

        return name.strip()

    @validates("item_type")
    def validate_item_type(self, key, item_type):
        valid_types = ["ingredient", "meal"]

        if item_type not in valid_types:
            raise ValueError("Easy log item type must be ingredient or meal.")

        return item_type

    @validates("calories")
    def validate_easy_log_calories(self, key, calories):
        if calories is None or calories < 0:
            raise ValueError("Calories must be 0 or higher.")

        return calories

    @validates("servings")
    def validate_easy_log_servings(self, key, servings):
        if servings is None or servings <= 0:
            raise ValueError("Servings must be greater than 0.")

        return servings

    def __repr__(self):
        return f"<EasyLogItem {self.id}: {self.name}>"
