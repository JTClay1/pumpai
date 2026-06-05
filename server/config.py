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

CORS(app, supports_credentials=True)
