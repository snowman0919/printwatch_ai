import asyncio
import logging
import signal
import time
from .api import ServerApi
from .camera import Camera
from .config import Config
from .oled import OledStatus
from .telemetry import SerialTelemetry


async def run() -> None:
    config = Config.from_env()
    oled = OledStatus(config.oled_address, config.printer_id)
    oled.start()
    camera = Camera()
    telemetry = SerialTelemetry(config.serial_device, config.serial_baud)
    api = ServerApi(config)
    stop = asyncio.Event()
    for name in (signal.SIGINT, signal.SIGTERM):
        asyncio.get_running_loop().add_signal_handler(name, stop.set)

    async def uploader() -> None:
        last_analysis = 0.0
        while not stop.is_set():
            started = time.monotonic()
            try:
                state = await asyncio.to_thread(telemetry.read)
                analyze = started - last_analysis >= config.analysis_interval
                result = await api.upload(await asyncio.to_thread(camera.snapshot), state.json(), analyze)
                if analyze:
                    last_analysis = started
                verdict = (result.get("analysis") or {}).get("verdict", state.printerState).upper()
                oled.update("CONNECTED", f"STATE {verdict}")
            except Exception as error:
                logging.warning("upload failed: %s", error)
                oled.update("RETRYING", type(error).__name__)
            try:
                await asyncio.wait_for(stop.wait(), timeout=max(1, config.snapshot_interval - (time.monotonic() - started)))
            except asyncio.TimeoutError:
                pass

    async def live_uploader() -> None:
        while not stop.is_set():
            started = time.monotonic()
            try:
                await api.upload_live_frame(await asyncio.to_thread(camera.live_frame))
            except Exception as error:
                logging.debug("live frame upload failed: %s", error)
            try:
                await asyncio.wait_for(stop.wait(), timeout=max(0.1, config.live_interval - (time.monotonic() - started)))
            except asyncio.TimeoutError:
                pass

    try:
        await asyncio.gather(uploader(), live_uploader())
    finally:
        oled.close()
        await api.close()
        telemetry.close()
        camera.close()


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    asyncio.run(run())


if __name__ == "__main__":
    main()
