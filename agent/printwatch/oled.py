import socket
import threading
import time
from PIL import Image, ImageDraw, ImageFont


class OledStatus:
    def __init__(self, address: int, printer_id: str) -> None:
        self.printer_id = printer_id
        self.state = "BOOTING"
        self.detail = "Starting agent"
        self._stop = threading.Event()
        self._device = None
        try:
            from luma.core.interface.serial import i2c
            from luma.oled.device import ssd1306
            self._device = ssd1306(i2c(port=1, address=address), width=128, height=64)
        except Exception:
            pass

    def update(self, state: str, detail: str = "") -> None:
        self.state, self.detail = state, detail

    def start(self) -> None:
        if self._device:
            threading.Thread(target=self._run, daemon=True).start()

    def close(self) -> None:
        self._stop.set()

    @staticmethod
    def ip() -> str:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
                sock.connect(("1.1.1.1", 80))
                return sock.getsockname()[0]
        except OSError:
            return "NO NETWORK"

    def _run(self) -> None:
        font = ImageFont.load_default()
        while not self._stop.wait(1):
            image = Image.new("1", (128, 64))
            draw = ImageDraw.Draw(image)
            draw.text((0, 0), f"PRINTWATCH {self.printer_id[-1]}", font=font, fill=255)
            draw.line((0, 12, 127, 12), fill=255)
            draw.text((0, 18), self.state[:21], font=font, fill=255)
            draw.text((0, 32), self.detail[:21], font=font, fill=255)
            draw.text((0, 50), self.ip()[:21], font=font, fill=255)
            try:
                self._device.display(image)
            except OSError:
                time.sleep(2)
