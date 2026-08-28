import asyncio
import io
import threading
from fractions import Fraction
from av import VideoFrame
from aiortc import VideoStreamTrack
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

    def frame(self):
        with self._lock:
            return self._camera.capture_array("lores")

    def close(self) -> None:
        with self._lock:
            self._camera.stop()


class CameraTrack(VideoStreamTrack):
    kind = "video"

    def __init__(self, camera: Camera, fps: float = 2.0) -> None:
        super().__init__()
        self.camera = camera
        self.delay = 1.0 / fps
        self.pts = 0

    async def recv(self) -> VideoFrame:
        await asyncio.sleep(self.delay)
        array = await asyncio.to_thread(self.camera.frame)
        frame = VideoFrame.from_ndarray(array, format="bgr24")
        self.pts += round(90_000 * self.delay)
        frame.pts = self.pts
        frame.time_base = Fraction(1, 90_000)
        return frame
