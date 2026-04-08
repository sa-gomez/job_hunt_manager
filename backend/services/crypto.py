import base64

from cryptography.fernet import Fernet

from backend.config import settings


def _get_fernet() -> Fernet:
    key = settings.encryption_key
    if not key:
        raise RuntimeError(
            "ENCRYPTION_KEY is not set. "
            "Generate one with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
        )
    return Fernet(key.encode() if isinstance(key, str) else key)


def encrypt(plaintext: str) -> str:
    """Encrypt a plaintext string and return a base64-encoded Fernet token."""
    f = _get_fernet()
    token = f.encrypt(plaintext.encode("utf-8"))
    return base64.urlsafe_b64encode(token).decode("ascii")


def decrypt(token: str) -> str:
    """Decrypt a Fernet token (base64-encoded) and return the plaintext string."""
    f = _get_fernet()
    raw = base64.urlsafe_b64decode(token.encode("ascii"))
    return f.decrypt(raw).decode("utf-8")
