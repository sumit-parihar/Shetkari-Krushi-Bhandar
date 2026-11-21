"""
Shared rate limiter instance.
 
Import `limiter` in any route file and decorate endpoints:
 
    from app.utils.rate_limiter import limiter
 
    @router.post("/login")
    @limiter.limit("10/minute")
    async def login(request: Request, ...):
        ...
 
The limiter uses the client's IP address as the key.
It is attached to app.state.limiter in main.py so slowapi
can handle RateLimitExceeded exceptions automatically.
"""
import os

from slowapi import Limiter
from slowapi.util import get_remote_address


def client_ip(request) -> str:
    """
    The visitor's IP address, used as the rate-limit key.

    On Render every request passes through Cloudflare, which sets
    CF-Connecting-IP to the real visitor IP and overwrites any value a client
    sends, so it can't be faked. (X-Forwarded-For can be: its first entry is
    whatever the client wrote.) Locally there is no Cloudflare, so fall back
    to the direct connection address.
    """
    cf_ip = request.headers.get("cf-connecting-ip", "").strip()
    return cf_ip or get_remote_address(request)


# On by default. The automated test suite sets RATE_LIMIT_ENABLED=false so it
# can log in many times quickly (one dedicated test checks the limiter itself).
limiter = Limiter(
    key_func=client_ip,
    enabled=os.getenv("RATE_LIMIT_ENABLED", "true").strip().lower() != "false",
)
 