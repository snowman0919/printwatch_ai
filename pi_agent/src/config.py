import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class Crop:
    x: int
    y: int
    width: int
    height: int


@dataclass(frozen=True)
class AgentConfig:
    printer_id: str
    capture_interval_sec: int
    firebase_upload_url_or_storage_target: str
    device_id: str
    device_secret: str
    camera_width: int
    camera_height: int
    ai_image_width: int
    thumbnail_width: int
    local_buffer_dir: Path
    lcd_crop: Crop | None


def load_config(path: str) -> AgentConfig:
    raw = json.loads(Path(path).read_text())
    crop = raw.get("lcd_crop")
    return AgentConfig(
        printer_id=raw["printer_id"],
        capture_interval_sec=int(raw.get("capture_interval_sec", 300)),
        firebase_upload_url_or_storage_target=raw["firebase_upload_url_or_storage_target"],
        device_id=raw["device_id"],
        device_secret=_expand(raw["device_secret"]),
        camera_width=int(raw.get("camera_width", 1920)),
        camera_height=int(raw.get("camera_height", 1080)),
        ai_image_width=int(raw.get("ai_image_width", 768)),
        thumbnail_width=int(raw.get("thumbnail_width", 480)),
        local_buffer_dir=Path(raw.get("local_buffer_dir", "./buffer")),
        lcd_crop=Crop(**crop) if crop else None,
    )


def _expand(value: str) -> str:
    if value.startswith("${") and value.endswith("}"):
        return os.environ.get(value[2:-1], "")
    return value


def as_upload_metadata(config: AgentConfig) -> dict[str, Any]:
    return {
        "printerId": config.printer_id,
        "deviceId": config.device_id,
    }
