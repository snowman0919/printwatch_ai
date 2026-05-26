from __future__ import annotations

import time
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np

from config import Crop


@dataclass(frozen=True)
class ProcessedImages:
    original_path: Path
    thumbnail_path: Path
    ai_path: Path
    lcd_crop: np.ndarray | None
    local_signals: dict[str, object]


def process_frame(
    frame: np.ndarray,
    output_dir: Path,
    printer_id: str,
    ai_width: int,
    thumbnail_width: int,
    lcd_crop: Crop | None,
    previous_ai_path: Path | None,
) -> ProcessedImages:
    output_dir.mkdir(parents=True, exist_ok=True)
    stamp = int(time.time())
    base = output_dir / f"{printer_id}_{stamp}"
    original_path = base.with_name(f"{base.name}_original.jpg")
    thumbnail_path = base.with_name(f"{base.name}_thumb.jpg")
    ai_path = base.with_name(f"{base.name}_ai.jpg")

    cv2.imwrite(str(original_path), frame, [int(cv2.IMWRITE_JPEG_QUALITY), 92])
    thumbnail = resize_width(frame, thumbnail_width)
    ai_image = resize_width(frame, ai_width)
    cv2.imwrite(str(thumbnail_path), thumbnail, [int(cv2.IMWRITE_JPEG_QUALITY), 82])
    cv2.imwrite(str(ai_path), ai_image, [int(cv2.IMWRITE_JPEG_QUALITY), 82])

    crop_image = crop(frame, lcd_crop)
    signals = compute_signals(ai_image, previous_ai_path)
    return ProcessedImages(original_path, thumbnail_path, ai_path, crop_image, signals)


def resize_width(image: np.ndarray, width: int) -> np.ndarray:
    height = int(image.shape[0] * width / image.shape[1])
    return cv2.resize(image, (width, height), interpolation=cv2.INTER_AREA)


def crop(image: np.ndarray, area: Crop | None) -> np.ndarray | None:
    if area is None:
        return None
    x1 = max(0, area.x)
    y1 = max(0, area.y)
    x2 = min(image.shape[1], x1 + area.width)
    y2 = min(image.shape[0], y1 + area.height)
    if x2 <= x1 or y2 <= y1:
        return None
    return image[y1:y2, x1:x2]


def compute_signals(image: np.ndarray, previous_ai_path: Path | None) -> dict[str, object]:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    brightness = float(np.mean(gray))
    blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    image_changed_score = 100.0
    if previous_ai_path and previous_ai_path.exists():
        previous = cv2.imread(str(previous_ai_path))
        if previous is not None:
            previous = cv2.resize(previous, (image.shape[1], image.shape[0]))
            diff = cv2.absdiff(image, previous)
            image_changed_score = float(np.mean(diff))
    edges = cv2.Canny(gray, 80, 160)
    edge_density = float(np.count_nonzero(edges)) / float(edges.size)
    return {
        "imageChangedScore": image_changed_score,
        "brightness": brightness,
        "blurScore": blur_score,
        "cameraBlocked": brightness < 12 or brightness > 245 or blur_score < 8,
        "possibleStopped": image_changed_score < 1.2,
        "possibleSpaghetti": edge_density > 0.18 and image_changed_score > 3,
    }
