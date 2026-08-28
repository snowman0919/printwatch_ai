from datetime import datetime, timezone
import json

import aiohttp
from .config import Config


class ServerApi:
    def __init__(self, config: Config) -> None:
        self.config = config
        self.session = aiohttp.ClientSession(headers={"Authorization": f"Bearer {config.device_token}"})

    async def close(self) -> None:
        await self.session.close()

    async def upload(self, image: bytes, telemetry: dict, analyze: bool) -> dict:
        form = aiohttp.FormData()
        form.add_field("printerId", self.config.printer_id)
        form.add_field("capturedAt", datetime.now(timezone.utc).isoformat())
        form.add_field("telemetry", json.dumps(telemetry))
        form.add_field("requestAnalysis", "true" if analyze else "false")
        form.add_field("image", image, filename="snapshot.jpg", content_type="image/jpeg")
        async with self.session.post(f"{self.config.server_url}/api/device/snapshot", data=form, timeout=aiohttp.ClientTimeout(total=110)) as response:
            response.raise_for_status()
            return await response.json()

    async def upload_live_frame(self, image: bytes) -> None:
        form = aiohttp.FormData()
        form.add_field("printerId", self.config.printer_id)
        form.add_field("capturedAt", datetime.now(timezone.utc).isoformat())
        form.add_field("image", image, filename="live.jpg", content_type="image/jpeg")
        async with self.session.post(f"{self.config.server_url}/api/device/frame", data=form, timeout=aiohttp.ClientTimeout(total=10)) as response:
            response.raise_for_status()
