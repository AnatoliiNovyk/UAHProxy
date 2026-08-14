import base64
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Union, Any
from cryptography.fernet import Fernet
from passlib.context import CryptContext
from jose import jwt
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def _get_fernet_key() -> bytes:
    # Ensure key is valid 32 url-safe base64 bytes
    raw_key = settings.ENCRYPTION_KEY.encode()
    if len(raw_key) != 44 or not raw_key.endswith(b'='):
        digest = hashlib.sha256(raw_key).digest()
        return base64.urlsafe_b64encode(digest)
    return raw_key

fernet = Fernet(_get_fernet_key())

def encrypt_secret(plain_text: str) -> str:
    """Encrypt sensitive string (e.g. SSH private key, password) for secure DB storage"""
    if not plain_text:
        return ""
    encrypted_bytes = fernet.encrypt(plain_text.encode('utf-8'))
    return encrypted_bytes.decode('utf-8')

def decrypt_secret(encrypted_text: str) -> str:
    """Decrypt sensitive string from DB"""
    if not encrypted_text:
        return ""
    try:
        decrypted_bytes = fernet.decrypt(encrypted_text.encode('utf-8'))
        return decrypted_bytes.decode('utf-8')
    except Exception:
        # Fallback if unencrypted string was present during migration
        return encrypted_text

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt
