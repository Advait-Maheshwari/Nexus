from __future__ import annotations

import asyncio
from collections import defaultdict, deque
from time import monotonic

from starlette.types import ASGIApp, Receive, Scope, Send


class SlidingWindowLimiter:
    def __init__(self) -> None:
        self._events: dict[str, deque[float]] = defaultdict(deque)
        self._lock = asyncio.Lock()
        self._checks = 0

    async def allow(self, key: str, limit: int, window_seconds: int) -> tuple[bool, int]:
        now = monotonic()
        cutoff = now - window_seconds
        async with self._lock:
            events = self._events[key]
            while events and events[0] <= cutoff:
                events.popleft()
            if len(events) >= limit:
                retry_after = max(1, int(window_seconds - (now - events[0])) + 1)
                return False, retry_after
            events.append(now)
            self._checks += 1
            if self._checks % 256 == 0:
                self._events = defaultdict(
                    deque,
                    {name: values for name, values in self._events.items() if values and values[-1] > cutoff},
                )
            return True, 0


class RateLimitMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app
        self.limiter = SlidingWindowLimiter()

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or not scope.get("path", "").startswith("/api/v1"):
            await self.app(scope, receive, send)
            return

        path = str(scope.get("path", ""))
        client = scope.get("client")
        address = str(client[0]) if client else "unknown"
        auth_route = path.startswith("/api/v1/auth/")
        bucket = "auth" if auth_route else "api"
        limit = 12 if auth_route else 180
        allowed, retry_after = await self.limiter.allow(
            f"{address}:{bucket}",
            limit=limit,
            window_seconds=60,
        )
        if not allowed:
            await send(
                {
                    "type": "http.response.start",
                    "status": 429,
                    "headers": [
                        (b"content-type", b"application/json"),
                        (b"retry-after", str(retry_after).encode()),
                        (b"cache-control", b"no-store"),
                    ],
                }
            )
            await send(
                {
                    "type": "http.response.body",
                    "body": b'{"detail":"Too many requests"}',
                }
            )
            return
        await self.app(scope, receive, send)
