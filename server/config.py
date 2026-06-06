import os

from flask import Flask
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)

# Prefer an external database URL, but default to local SQLite for development.
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
    "DATABASE_URI",
    "sqlite:///pumpai.db"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-secret-key")

app.json.compact = False

db = SQLAlchemy()
migrate = Migrate()
bcrypt = Bcrypt()

# Extensions are initialized here and imported by app.py/models.py as shared services.
db.init_app(app)
migrate.init_app(app, db)
bcrypt.init_app(app)

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://127.0.0.1:5173")

CORS(
    app,
    origins=[
        FRONTEND_URL,
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ],
    supports_credentials=True,
)

is_render = os.environ.get("RENDER") == "true"

app.config["SESSION_COOKIE_SAMESITE"] = "None" if is_render else "Lax"
app.config["SESSION_COOKIE_SECURE"] = is_render
app.config["SESSION_COOKIE_HTTPONLY"] = True
