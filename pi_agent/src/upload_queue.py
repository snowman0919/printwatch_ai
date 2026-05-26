from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any

from uploader import SnapshotUploader


class UploadQueue:
    def __init__(self, queue_dir: Path) -> None:
        self.queue_dir = queue_dir
        self.queue_dir.mkdir(parents=True, exist_ok=True)

    def enqueue(self, payload: dict[str, Any]) -> Path:
        path = self.queue_dir / f"queued_{int(time.time() * 1000)}.json"
        path.write_text(json.dumps(payload, ensure_ascii=True))
        return path

    def flush(self, uploader: SnapshotUploader, limit: int = 10) -> None:
        for path in sorted(self.queue_dir.glob("queued_*.json"))[:limit]:
            payload = json.loads(path.read_text())
            uploader.upload(payload)
            path.unlink()
