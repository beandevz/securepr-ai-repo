import hmac
import hashlib

def compute_hmac_sha256(secret: str, raw_body: bytes) -> str:
    return hmac.new(secret.encode('utf-8'), raw_body, hashlib.sha256).hexdigest()

def verify_hmac_sha256(secret: str, raw_body: bytes, signature: str | None) -> bool:
    if not signature or not signature.startswith('sha256='):
        return False
    their = signature.split('sha256=', 1)[1].strip()
    ours = compute_hmac_sha256(secret, raw_body)
    return hmac.compare_digest(ours, their)
