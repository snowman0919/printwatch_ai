from dataclasses import dataclass
import os


@dataclass(frozen=True)
class Config:
    server_url: str
    printer_id: str
    device_token: str
    snapshot_interval: float
    analysis_interval: float
    oled_address: int
    serial_device: str
    serial_baud: int

    @classmethod
    def from_env(cls) -> "Config":
        printer_id = os.environ.get("PRINTWATCH_PRINTER_ID", "")
        token = os.environ.get("PRINTWATCH_DEVICE_TOKEN", "")
        if printer_id not in {"printer-1", "printer-2", "printer-3"}:
            raise ValueError("PRINTWATCH_PRINTER_ID must be printer-1, printer-2, or printer-3")
        if len(token) < 24:
            raise ValueError("PRINTWATCH_DEVICE_TOKEN must contain at least 24 characters")
        return cls(
            server_url=os.environ.get("PRINTWATCH_SERVER_URL", "https://3dp.kotori9.run").rstrip("/"),
            printer_id=printer_id,
            device_token=token,
            snapshot_interval=float(os.environ.get("PRINTWATCH_SNAPSHOT_INTERVAL", "15")),
            analysis_interval=float(os.environ.get("PRINTWATCH_ANALYSIS_INTERVAL", "60")),
            oled_address=int(os.environ.get("PRINTWATCH_OLED_ADDRESS", "0x3C"), 0),
            serial_device=os.environ.get("PRINTWATCH_SERIAL_DEVICE", "auto"),
            serial_baud=int(os.environ.get("PRINTWATCH_SERIAL_BAUD", "115200")),
        )
