import io
import threading
from picamera2 import Picamera2


class Camera:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._camera = Picamera2()
        config = self._camera.create_video_configuration(
            main={"size": (1280, 720), "format": "RGB888"},
            lores={"size": (640, 480), "format": "RGB888"},
            controls={"FrameRate": 10},
            buffer_count=4,
        )
        self._camera.configure(config)
        self._camera.start()

    def snapshot(self) -> bytes:
        with self._lock:
            stream = io.BytesIO()
            self._camera.capture_file(stream, format="jpeg", name="main")
            return stream.getvalue()

    def live_frame(self) -> bytes:
        with self._lock:
            stream = io.BytesIO()
            self._camera.capture_file(stream, format="jpeg", name="lores")
            return stream.getvalue()

    def close(self) -> None:
        with self._lock:
            self._camera.stop()
