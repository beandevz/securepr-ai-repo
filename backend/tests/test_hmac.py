from app.core.security import compute_hmac_sha256, verify_hmac_sha256

def test_hmac_roundtrip():
    secret = 'abc'
    body = b'hello'
    sig = 'sha256=' + compute_hmac_sha256(secret, body)
    assert verify_hmac_sha256(secret, body, sig)
    assert not verify_hmac_sha256(secret, body, 'sha256=deadbeef')
