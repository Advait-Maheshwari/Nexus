import pytest

from app.core.rate_limit import SlidingWindowLimiter


@pytest.mark.asyncio
async def test_sliding_window_limiter_blocks_after_limit() -> None:
    limiter = SlidingWindowLimiter()
    assert await limiter.allow("client:auth", limit=2, window_seconds=60) == (True, 0)
    assert await limiter.allow("client:auth", limit=2, window_seconds=60) == (True, 0)
    allowed, retry_after = await limiter.allow("client:auth", limit=2, window_seconds=60)
    assert allowed is False
    assert retry_after > 0


@pytest.mark.asyncio
async def test_sliding_window_limiter_separates_clients() -> None:
    limiter = SlidingWindowLimiter()
    await limiter.allow("client-a:auth", limit=1, window_seconds=60)
    assert await limiter.allow("client-b:auth", limit=1, window_seconds=60) == (True, 0)
