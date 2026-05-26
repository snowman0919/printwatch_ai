from __future__ import annotations

import re
from dataclasses import dataclass

import cv2
import numpy as np


@dataclass(frozen=True)
class OcrResult:
    raw_text: str
    progress_percent: float | None
    elapsed_text: str | None
    remaining_text: str | None
    confidence: float

    def to_dict(self) -> dict[str, object]:
        return {
            "rawText": self.raw_text,
            "progressPercent": self.progress_percent,
            "elapsedText": self.elapsed_text,
            "remainingText": self.remaining_text,
            "confidence": self.confidence,
        }


class OcrEngine:
    def read(self, image: np.ndarray | None) -> OcrResult:
        raise NotImplementedError


class TesseractOcrEngine(OcrEngine):
    def read(self, image: np.ndarray | None) -> OcrResult:
        if image is None:
            return OcrResult("", None, None, None, 0.0)
        try:
            import pytesseract

            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            gray = cv2.resize(gray, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
            _, threshold = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            text = pytesseract.image_to_string(threshold, config="--psm 6")
            data = pytesseract.image_to_data(
                threshold,
                config="--psm 6",
                output_type=pytesseract.Output.DICT,
            )
            confidences = [
                float(value)
                for value in data.get("conf", [])
                if _is_float(value) and float(value) >= 0
            ]
            confidence = sum(confidences) / len(confidences) / 100 if confidences else 0.0
            return OcrResult(
                raw_text=text.strip(),
                progress_percent=parse_progress(text),
                elapsed_text=parse_time(text, ("elapsed", "used", "print")),
                remaining_text=parse_time(text, ("remain", "left")),
                confidence=max(0.0, min(1.0, confidence)),
            )
        except Exception as error:
            return OcrResult(f"OCR_ERROR: {error}", None, None, None, 0.0)


def parse_progress(text: str) -> float | None:
    matches = re.findall(r"(\d{1,3})\s*%", text)
    for match in matches:
        value = float(match)
        if 0 <= value <= 100:
            return value
    return None


def parse_time(text: str, markers: tuple[str, ...]) -> str | None:
    lower = text.lower()
    for marker in markers:
        idx = lower.find(marker)
        if idx >= 0:
            segment = text[idx : idx + 40]
            found = re.search(r"(\d{1,2}:\d{2})", segment)
            if found:
                return found.group(1)
    found = re.search(r"(\d{1,2}:\d{2})", text)
    return found.group(1) if found else None


def _is_float(value: object) -> bool:
    try:
        float(value)
        return True
    except ValueError:
        return False
