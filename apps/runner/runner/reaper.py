import logging
import time
from typing import List, Optional
import docker
from docker.errors import DockerException

logger = logging.getLogger("codesync.reaper")


def reap_stale_containers(
    max_age_seconds: int = 30,
    client: Optional[docker.DockerClient] = None,
) -> List[str]:
    """
    Finds and forcibly removes any CodeSync sandbox containers that have
    persisted past the maximum allowable lifetime (e.g. if a worker crashed).
    Returns list of removed container IDs.
    """
    if client is None:
        try:
            client = docker.from_env()
        except DockerException as e:
            logger.error("Reaper failed to connect to Docker daemon: %s", e)
            return []

    reaped = []
    now = time.time()

    try:
        containers = client.containers.list(
            all=True,
            filters={"label": "codesync=sandbox"},
        )
    except DockerException as e:
        logger.error("Failed to list sandbox containers: %s", e)
        return []

    for container in containers:
        try:
            created_at_str = container.labels.get("created_at")
            age = None
            if created_at_str:
                try:
                    age = now - float(created_at_str)
                except ValueError:
                    pass

            # Fallback if label is missing: parse container name prefix
            if age is None:
                if container.name.startswith("codesync-sb-"):
                    age = max_age_seconds + 1

            if age is not None and age > max_age_seconds:
                logger.warning(
                    "Reaping stale container %s (%s) with age %.1fs (limit %ds)",
                    container.id[:12],
                    container.name,
                    age,
                    max_age_seconds,
                )
                container.remove(force=True)
                reaped.append(container.id[:12])
        except Exception as e:
            logger.error("Failed to reap container %s: %s", container.id[:12], e)

    return reaped


def run_reaper_daemon(interval_seconds: int = 15, max_age_seconds: int = 30):
    """Continuous daemon loop that sweeps for orphaned containers."""
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    logger.info("Starting CodeSync Stale Container Reaper Daemon (interval=%ds, max_age=%ds)", interval_seconds, max_age_seconds)
    client = docker.from_env()
    while True:
        try:
            reaped = reap_stale_containers(max_age_seconds=max_age_seconds, client=client)
            if reaped:
                logger.info("Successfully reaped %d stale sandbox containers: %s", len(reaped), reaped)
        except Exception as e:
            logger.error("Unexpected error in reaper cycle: %s", e)
        time.sleep(interval_seconds)


if __name__ == "__main__":
    run_reaper_daemon()
