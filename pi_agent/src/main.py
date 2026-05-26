from __future__ import annotations

import argparse
import logging
import time
from pathlib import Path

from camera import Camera
from config import load_config
from image_processing import process_frame
from ocr import TesseractOcrEngine
from upload_queue import UploadQueue
from uploader import SnapshotUploader


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True)
    parser.add_argument("--once", action="store_true")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    config = load_config(args.config)
    if not config.device_secret:
        raise RuntimeError("Device secret is empty. Set PRINTWATCH_DEVICE_SECRET or config device_secret.")

    queue = UploadQueue(config.local_buffer_dir / "queue")
    uploader = SnapshotUploader(config)
    ocr_engine = TesseractOcrEngine()
    previous_ai_path: Path | None = None

    with Camera(config.camera_width, config.camera_height) as camera:
        while True:
            try:
                queue.flush(uploader)
            except Exception as error:
                logging.warning("Queue flush failed: %s", error)

            try:
                frame = camera.capture()
                processed = process_frame(
                    frame=frame,
                    output_dir=config.local_buffer_dir / "images",
                    printer_id=config.printer_id,
                    ai_width=config.ai_image_width,
                    thumbnail_width=config.thumbnail_width,
                    lcd_crop=config.lcd_crop,
                    previous_ai_path=previous_ai_path,
                )
                ocr = ocr_engine.read(processed.lcd_crop)
                payload = uploader.build_payload(
                    processed.original_path,
                    processed.thumbnail_path,
                    processed.ai_path,
                    processed.local_signals,
                    ocr,
                )
                try:
                    result = uploader.upload(payload)
                    logging.info("Uploaded snapshot %s", result.get("snapshotId"))
                except Exception as error:
                    queue.enqueue(payload)
                    logging.warning("Upload failed; queued snapshot: %s", error)
                previous_ai_path = processed.ai_path
            except Exception:
                logging.exception("Capture cycle failed")

            if args.once:
                break
            time.sleep(config.capture_interval_sec)


if __name__ == "__main__":
    main()
