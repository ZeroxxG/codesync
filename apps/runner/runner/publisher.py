import json
import logging
from typing import Optional
import redis
from . import config as cfg

logger = logging.getLogger(__name__)


class RedisPublisher:
    """
    Publishes real-time execution events and chunks to Redis channels.
    Channels are partitioned per room: room:<slug>:runs
    """

    def __init__(self, client: Optional[redis.Redis] = None):
        self._client = client

    @property
    def client(self) -> redis.Redis:
        if self._client is None:
            self._client = redis.from_url(cfg.REDIS_URL, decode_responses=True)
        return self._client

    def _channel_name(self, room_slug: str) -> str:
        return f"room:{room_slug}:runs"

    def publish_run_started(self, room_slug: str, run_id: str) -> None:
        payload = {
            "type": "run_start",
            "run_id": run_id,
            "room_slug": room_slug,
        }
        self._publish(room_slug, payload)

    def publish_output_chunk(self, room_slug: str, run_id: str, chunk: str) -> None:
        payload = {
            "type": "run_output",
            "run_id": run_id,
            "room_slug": room_slug,
            "chunk": chunk,
        }
        self._publish(room_slug, payload)

    def publish_run_completed(
        self,
        room_slug: str,
        run_id: str,
        status: str,
        exit_code: int,
        duration_ms: int,
        output: str,
    ) -> None:
        payload = {
            "type": "run_complete",
            "run_id": run_id,
            "room_slug": room_slug,
            "status": status,
            "exit_code": exit_code,
            "duration_ms": duration_ms,
            "output": output,
        }
        self._publish(room_slug, payload)

    def _publish(self, room_slug: str, payload: dict) -> None:
        try:
            channel = self._channel_name(room_slug)
            self.client.publish(channel, json.dumps(payload))
        except Exception as e:
            logger.warning("Failed to publish message to Redis channel: %s", e)
