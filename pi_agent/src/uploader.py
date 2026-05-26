from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from pathlib import Path
from typing import Any

import requests

from config import AgentConfig
from ocr import OcrResult


class SnapshotUploader:
    def __init__(self, config: AgentConfig) -> None:
        self.config = config

    def build_payload(
        self,
        original_path: Path,
        thumbnail_path: Path,
        ai_path: Path,
        local_signals: dict[str, object],
        ocr: OcrResult,
        job_id: str | None = None,
    ) -> dict[str, Any]:
        return {
            "printerId": self.config.printer_id,
            "jobId": job_id,
            "capturedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "originalImageBase64": _b64(original_path),
            "thumbnailImageBase64": _b64(thumbnail_path),
            "aiImageBase64": _b64(ai_path),
            "localSignals": local_signals,
            "ocr": ocr.to_dict(),
        }

    def upload(self, payload: dict[str, Any]) -> dict[str, Any]:
        body = json.dumps(payload, separators=(",", ":"), ensure_ascii=True).encode()
        timestamp = str(int(time.time() * 1000))
        signature = hmac.new(
            self.config.device_secret.encode(),
            timestamp.encode() + b"." + body,
            hashlib.sha256,
        ).hexdigest()
        response = requests.post(
            self.config.firebase_upload_url_or_storage_target,
            data=body,
            headers={
                "Content-Type": "application/json",
                "X-Device-Id": self.config.device_id,
                "X-Timestamp": timestamp,
                "X-Signature": signature,
            },
            timeout=60,
        )
        response.raise_for_status()
        return response.json()


def _b64(path: Path) -> str:
    return base64.b64encode(path.read_bytes()).decode("ascii")
