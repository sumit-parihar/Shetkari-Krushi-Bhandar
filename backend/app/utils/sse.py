import asyncio
import json

class SubscriberManager:
    def __init__(self):
        self.subscribers = set()

    def add(self, queue):
        self.subscribers.add(queue)

    def remove(self, queue):
        self.subscribers.discard(queue)

    async def broadcast(self, data):
        if not self.subscribers:
            return
        message = f"data: {json.dumps(data)}\n\n"
        disconnected = set()
        for sub in self.subscribers:
            try:
                await sub.put(message)
            except asyncio.CancelledError:
                disconnected.add(sub)
            except Exception:
                disconnected.add(sub)
        for sub in disconnected:
            self.subscribers.discard(sub)

subscribers = SubscriberManager()

async def broadcast_update(event_type: str, data: dict):
    """Broadcast an update to all connected SSE clients"""
    await subscribers.broadcast({
        "type": event_type,
        "data": data
    })
