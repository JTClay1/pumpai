from flask import make_response

from config import app, db
from models import User, Profile, FoodLog, WorkoutLog, CoachResponse


@app.get("/")
def index():
    return make_response({"message": "PumpAI API running"}, 200)


if __name__ == "__main__":
    app.run(port=5555, debug=True)