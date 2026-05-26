from __future__ import annotations

import cv2
import numpy as np


class Camera:
    def __init__(self, width: int, height: int) -> None:
        self.width = width
        self.height = height
        self._picam = None
        self._cap = None

    def __enter__(self) -> "Camera":
        try:
            from picamera2 import Picamera2

            self._picam = Picamera2()
            config = self._picam.create_still_configuration(
                main={"size": (self.width, self.height)}
            )
            self._picam.configure(config)
            self._picam.start()
        except Exception:
            self._cap = cv2.VideoCapture(0)
            self._cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
            self._cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
        return self

    def __exit__(self, *_: object) -> None:
        if self._picam is not None:
            self._picam.stop()
        if self._cap is not None:
            self._cap.release()

    def capture(self) -> np.ndarray:
        if self._picam is not None:
            frame = self._picam.capture_array()
            return cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
        if self._cap is None:
            raise RuntimeError("Camera is not initialized")
        ok, frame = self._cap.read()
        if not ok:
            raise RuntimeError("OpenCV camera capture failed")
        return frame
