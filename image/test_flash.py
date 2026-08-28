#!/usr/bin/env python3
import os
import hashlib
import subprocess
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
FLASH = ROOT / "image" / "flash.sh"


class FlashTest(unittest.TestCase):
    def test_writes_private_boot_configuration_after_confirmed_flash(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            image = root / "image.img.xz"
            image.write_bytes(b"verified image")
            Path(f"{image}.sha256").write_text(f"{hashlib.sha256(image.read_bytes()).hexdigest()}  {image}\n")
            boot = root / "boot"
            boot.mkdir()
            tools = root / "bin"
            tools.mkdir()
            (tools / "rpi-imager").write_text("#!/bin/sh\nexit 0\n")
            (tools / "diskutil").write_text(
                "#!/bin/sh\n"
                "if [ \"$1\" = info ]; then printf 'Mount Point: %s\\n' \"$PRINTWATCH_TEST_BOOT\"; fi\n"
            )
            for tool in tools.iterdir():
                tool.chmod(0o755)
            environment = {
                **os.environ,
                "PATH": f"{tools}:{os.environ['PATH']}",
                "PRINTWATCH_DEVICE_TOKEN": "a" * 24,
                "PRINTWATCH_TEST_BOOT": str(boot),
            }
            result = subprocess.run(
                [FLASH, "printer-2", image, "/dev/disk-test"],
                input="/dev/disk-test\n",
                text=True,
                capture_output=True,
                env=environment,
                check=False,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            config = (boot / "printwatch.env").read_text()
            self.assertIn('PRINTWATCH_PRINTER_ID="printer-2"', config)
            self.assertIn('PRINTWATCH_DEVICE_TOKEN="' + "a" * 24 + '"', config)
            self.assertIn('PRINTWATCH_LIVE_INTERVAL="1"', config)
            self.assertEqual((boot / "printwatch.env").stat().st_mode & 0o777, 0o600)

    def test_rejects_corrupted_image_before_writer_runs(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            image = root / "image.img.xz"
            image.write_bytes(b"original")
            Path(f"{image}.sha256").write_text(f"{hashlib.sha256(image.read_bytes()).hexdigest()}  {image}\n")
            image.write_bytes(b"corrupted")
            marker = root / "writer-ran"
            tools = root / "bin"
            tools.mkdir()
            writer = tools / "rpi-imager"
            writer.write_text(f"#!/bin/sh\ntouch '{marker}'\n")
            writer.chmod(0o755)
            result = subprocess.run(
                [FLASH, "printer-1", image, "/dev/disk-test"],
                text=True,
                capture_output=True,
                env={**os.environ, "PATH": f"{tools}:{os.environ['PATH']}", "PRINTWATCH_DEVICE_TOKEN": "a" * 24},
                check=False,
            )
            self.assertEqual(result.returncode, 1)
            self.assertIn("checksum mismatch", result.stderr)
            self.assertFalse(marker.exists())

    def test_rejects_unsafe_token_before_writer_runs(self):
        with tempfile.TemporaryDirectory() as directory:
            image = Path(directory) / "image.img.xz"
            image.touch()
            result = subprocess.run(
                [FLASH, "printer-1", image, "/dev/disk-test"],
                input="/dev/disk-test\n",
                text=True,
                capture_output=True,
                env={**os.environ, "PRINTWATCH_DEVICE_TOKEN": "a" * 24 + '"\nINJECTED=1'},
                check=False,
            )
            self.assertEqual(result.returncode, 2)
            self.assertIn("URL-safe", result.stderr)


if __name__ == "__main__":
    unittest.main()
