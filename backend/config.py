import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from project root or backend
env_path = Path(__file__).resolve().parent.parent / '.env'
if not env_path.exists():
    env_path = Path(__file__).resolve().parent / '.env'
load_dotenv(dotenv_path=env_path)

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "hisabkitab_db")
SECRET_KEY = os.getenv("SECRET_KEY", "hisabkitab_super_secret_production_key_2026")
TOKEN_EXPIRE_HOURS = int(os.getenv("TOKEN_EXPIRE_HOURS", "24"))

# TextBee Android SMS Gateway Defaults
TEXTBEE_API_URL = os.getenv("TEXTBEE_API_URL", "https://api.textbee.dev/api/v1").strip()
TEXTBEE_API_KEY = os.getenv("TEXTBEE_API_KEY", "").strip()
TEXTBEE_DEVICE_ID = os.getenv("TEXTBEE_DEVICE_ID", "").strip()
TEXTBEE_DEMO_MODE = os.getenv("TEXTBEE_DEMO_MODE", "true").lower() in ("true", "1", "yes")

PORT = int(os.getenv("PORT", "8000"))
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
