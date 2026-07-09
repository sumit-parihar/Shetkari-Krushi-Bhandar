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
from slowapi import Limiter
from slowapi.util import get_remote_address
 
limiter = Limiter(key_func=get_remote_address)
 