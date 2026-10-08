import os
import datetime
import logging
from typing import Optional, Dict, Any, List
import bcrypt
from jose import JWTError, jwt
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("surya.auth")

PRIMARY_SECRET_KEY = os.getenv("SECRET_KEY", "77195425c31ee934beb41847fea72610c5c6f94ff173cc896ae81871e7115837")
SECRET_KEY = PRIMARY_SECRET_KEY
LEGACY_SECRET_KEY = "surya_family_restaurant_jwt_key_kadiri_2026"

# Candidate keys for decoding to ensure smooth key rotation & zero 401 disruptions
CANDIDATE_KEYS: List[str] = [PRIMARY_SECRET_KEY]
if LEGACY_SECRET_KEY != PRIMARY_SECRET_KEY:
    CANDIDATE_KEYS.append(LEGACY_SECRET_KEY)

ALGORITHM = os.getenv("ALGORITHM", "HS256")
# Default to 7 days (10080 mins) for restaurant kitchen / POS tablets so sessions don't expire mid-shift
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a stored bcrypt hash."""
    if not plain_password or not hashed_password:
        return False
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """Generate bcrypt password hash."""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def create_access_token(data: Dict[str, Any], expires_delta: Optional[datetime.timedelta] = None) -> str:
    """Create a signed JWT access token with timezone-aware expiration."""
    to_encode = data.copy()
    now_utc = datetime.datetime.now(datetime.timezone.utc)
    if expires_delta:
        expire = now_utc + expires_delta
    else:
        expire = now_utc + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, PRIMARY_SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate a JWT access token supporting multi-key rotation."""
    if not token or not isinstance(token, str):
        return None

    # Strip any Bearer prefix if mistakenly included
    clean_token = token.replace("Bearer ", "").strip()

    for key in CANDIDATE_KEYS:
        try:
            payload = jwt.decode(clean_token, key, algorithms=[ALGORITHM])
            return payload
        except JWTError:
            continue
    return None
