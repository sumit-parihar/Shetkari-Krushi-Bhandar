"""
Pure-ASGI middlewares (they work for every request, including streaming ones).
"""
import json


def _error_body(message: str) -> bytes:
    return json.dumps({"success": False, "data": None, "message": None, "error": message}).encode()


class BodySizeLimitMiddleware:
    """
    Reject request bodies over `max_bytes` with 413.

    Checks the Content-Length header first, and also counts the bytes actually
    received, so chunked uploads (no Content-Length) can't bypass the limit.
    """

    def __init__(self, app, max_bytes: int):
        self.app = app
        self.max_bytes = max_bytes

    async def _reject(self, send, status: int, message: str):
        body = _error_body(message)
        await send({"type": "http.response.start", "status": status,
                    "headers": [(b"content-type", b"application/json"),
                                (b"content-length", str(len(body)).encode())]})
        await send({"type": "http.response.body", "body": body})

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        headers = dict(scope.get("headers") or [])
        declared = headers.get(b"content-length")
        if declared is not None:
            try:
                if int(declared) > self.max_bytes:
                    return await self._reject(send, 413, "Request body too large (max 1 MB)")
            except ValueError:
                return await self._reject(send, 400, "Invalid Content-Length header")

        received = 0
        too_large = False
        started = False

        async def limited_receive():
            nonlocal received, too_large
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > self.max_bytes:
                    too_large = True
                    # Stop reading; the app sees the client as gone
                    return {"type": "http.disconnect"}
            return message

        async def guarded_send(message):
            nonlocal started
            if too_large:
                if not started:
                    started = True
                    await self._reject(send, 413, "Request body too large (max 1 MB)")
                return            # swallow whatever the app tried to send
            if message["type"] == "http.response.start":
                started = True
            await send(message)

        await self.app(scope, limited_receive, guarded_send)
        if too_large and not started:
            await self._reject(send, 413, "Request body too large (max 1 MB)")


class SecurityHeadersMiddleware:
    """Add standard security headers to every HTTP response."""

    def __init__(self, app, production: bool):
        self.app = app
        self.headers = [
            (b"x-content-type-options", b"nosniff"),
            (b"x-frame-options", b"DENY"),
            (b"referrer-policy", b"no-referrer"),
        ]
        if production:
            # API responses are JSON only, so they may load nothing and be framed nowhere.
            # (Not set in dev, where the Swagger docs page needs scripts and styles.)
            self.headers += [
                (b"content-security-policy", b"default-src 'none'; frame-ancestors 'none'"),
                (b"strict-transport-security", b"max-age=31536000; includeSubDomains"),
            ]

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        async def send_with_headers(message):
            if message["type"] == "http.response.start":
                existing = {k.lower() for k, _ in message.get("headers", [])}
                message.setdefault("headers", [])
                message["headers"] = list(message["headers"]) + [
                    (k, v) for k, v in self.headers if k not in existing
                ]
            await send(message)

        await self.app(scope, receive, send_with_headers)
