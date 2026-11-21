"""
Server-Sent Events: per-user subscriptions with role-based filtering.

Admins receive every event. Customers receive only events about their own
orders, delivery boys only events about orders assigned to them.
"""
import asyncio
import json
import logging

from anyio.from_thread import run as run_from_thread

logger = logging.getLogger(__name__)

MAX_CONNECTIONS_PER_USER = 5


class Subscriber:
    __slots__ = ("user_id", "role", "queue")

    def __init__(self, user_id: int, role: str):
        self.user_id = user_id
        self.role    = role
        self.queue: asyncio.Queue = asyncio.Queue(maxsize=100)


class SubscriberManager:
    def __init__(self):
        self.subscribers: set[Subscriber] = set()

    def count_for(self, user_id: int) -> int:
        return sum(1 for s in self.subscribers if s.user_id == user_id)

    def add(self, sub: Subscriber):
        self.subscribers.add(sub)

    def remove(self, sub: Subscriber):
        self.subscribers.discard(sub)

    @staticmethod
    def _allowed(sub: Subscriber, audience: dict) -> bool:
        if sub.role == "admin":
            return True
        if sub.role == "customer":
            return audience.get("user_id") == sub.user_id
        if sub.role == "delivery_boy":
            return audience.get("delivery_boy_id") == sub.user_id
        return False

    async def broadcast(self, data: dict, audience: dict):
        message = f"data: {json.dumps(data, default=str)}\n\n"
        for sub in list(self.subscribers):
            if not self._allowed(sub, audience):
                continue
            try:
                sub.queue.put_nowait(message)
            except asyncio.QueueFull:
                # Client isn't reading; drop it rather than grow memory forever
                self.subscribers.discard(sub)


subscribers = SubscriberManager()


async def broadcast_update(event_type: str, data: dict, user_id=None, delivery_boy_id=None):
    """Send an event to admins + the order's customer + its delivery boy."""
    await subscribers.broadcast(
        {"type": event_type, "data": data},
        {"user_id": user_id, "delivery_boy_id": delivery_boy_id},
    )


def notify(event_type: str, data: dict, user_id=None, delivery_boy_id=None) -> None:
    """
    Call from a sync route handler (runs in a worker thread).
    Never raises: a failed live update must not fail the request.
    """
    try:
        run_from_thread(broadcast_update, event_type, data, user_id, delivery_boy_id)
    except Exception:
        logger.exception("SSE notify failed for event %s", event_type)
