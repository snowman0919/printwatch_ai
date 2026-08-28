from dataclasses import dataclass, asdict
from glob import glob
import re
import time
from typing import Any


@dataclass
class Telemetry:
    printerState: str = "unknown"
    progressPercent: float | None = None
    elapsedSeconds: int | None = None
    hotendCelsius: float | None = None
    bedCelsius: float | None = None
    serialConnected: bool = False

    def json(self) -> dict:
        return asdict(self)


def parse_response(text: str, was_printing: bool = False) -> Telemetry:
    result = Telemetry(serialConnected=True)
    progress = re.search(r"SD printing byte\s+(\d+)/(\d+)", text, re.I)
    if progress and int(progress.group(2)) > 0:
        current, total = map(int, progress.groups())
        result.progressPercent = min(100.0, current * 100.0 / total)
        result.printerState = "printing" if current < total else "complete"
    elif re.search(r"Not SD printing", text, re.I):
        result.printerState = "complete" if was_printing else "idle"
    temperatures = re.search(r"T:([-\d.]+).*?B:([-\d.]+)", text)
    if temperatures:
        result.hotendCelsius, result.bedCelsius = map(float, temperatures.groups())
    elapsed = re.search(r"Print time:\s*(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?", text, re.I)
    if elapsed:
        hours, minutes, seconds = (int(value or 0) for value in elapsed.groups())
        result.elapsedSeconds = hours * 3600 + minutes * 60 + seconds
    return result


def next_printing_latch(was_printing: bool, state: str) -> bool:
    return state in {"printing", "complete"} or (was_printing and state == "unknown")


class SerialTelemetry:
    def __init__(self, device: str, baud: int) -> None:
        self.device = device
        self.baud = baud
        self.was_printing = False
        self._port: Any | None = None

    def _path(self) -> str | None:
        if self.device != "auto":
            return self.device
        matches = glob("/dev/serial/by-id/*") + glob("/dev/ttyACM*") + glob("/dev/ttyUSB*")
        return matches[0] if matches else None

    def read(self) -> Telemetry:
        import serial
        path = self._path()
        if not path:
            self.close()
            return Telemetry()
        try:
            if self._port is None or not self._port.is_open:
                self._port = serial.Serial(path, self.baud, timeout=1.0, write_timeout=1.0)
                time.sleep(1)
            self._port.reset_input_buffer()
            self._port.write(b"M27\nM105\nM31\n")
            text = self._port.read(4096).decode("utf-8", errors="replace")
            result = parse_response(text, self.was_printing)
            self.was_printing = next_printing_latch(self.was_printing, result.printerState)
            return result
        except (OSError, serial.SerialException):
            self.close()
            return Telemetry()

    def close(self) -> None:
        if self._port is not None:
            try:
                self._port.close()
            except OSError:
                pass
            finally:
                self._port = None
