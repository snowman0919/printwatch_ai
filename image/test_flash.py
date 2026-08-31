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

    def test_writes_wifi_profile_when_ssid_provided(self):
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
            psk = "correct horse battery"
            environment = {
                **os.environ,
                "PATH": f"{tools}:{os.environ['PATH']}",
                "PRINTWATCH_DEVICE_TOKEN": "a" * 24,
                "PRINTWATCH_TEST_BOOT": str(boot),
                "PRINTWATCH_WIFI_SSID": "DIMIGO-FAB",
                "PRINTWATCH_WIFI_PSK": psk,
            }
            result = subprocess.run(
                [FLASH, "printer-1", image, "/dev/disk-test"],
                input="/dev/disk-test\n",
                text=True,
                capture_output=True,
                env=environment,
                check=False,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            profile = (boot / "printwatch-wifi.nmconnection").read_text()
            self.assertIn("ssid=DIMIGO-FAB", profile)
            self.assertIn("key-mgmt=wpa-psk", profile)
            self.assertIn("psk=" + psk, profile)
            self.assertEqual((boot / "printwatch-wifi.nmconnection").stat().st_mode & 0o777, 0o600)
            self.assertNotIn(psk, result.stdout)
            self.assertNotIn(psk, result.stderr)

    def test_omits_wifi_profile_without_ssid(self):
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
            result = subprocess.run(
                [FLASH, "printer-1", image, "/dev/disk-test"],
                input="/dev/disk-test\n",
                text=True,
                capture_output=True,
                env={**os.environ, "PATH": f"{tools}:{os.environ['PATH']}", "PRINTWATCH_DEVICE_TOKEN": "a" * 24, "PRINTWATCH_TEST_BOOT": str(boot)},
                check=False,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertFalse((boot / "printwatch-wifi.nmconnection").exists())

    def test_prompts_for_ssid_with_wifi_flag(self):
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
            psk = "correct horse battery"
            result = subprocess.run(
                [FLASH, "--wifi", "printer-3", image, "/dev/disk-test"],
                input="DIMIGO-FAB\n/dev/disk-test\n",
                text=True,
                capture_output=True,
                env={
                    **os.environ,
                    "PATH": f"{tools}:{os.environ['PATH']}",
                    "PRINTWATCH_DEVICE_TOKEN": "a" * 24,
                    "PRINTWATCH_TEST_BOOT": str(boot),
                    "PRINTWATCH_WIFI_PSK": psk,
                },
                check=False,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            profile = (boot / "printwatch-wifi.nmconnection").read_text()
            self.assertIn("ssid=DIMIGO-FAB", profile)
            self.assertIn("psk=" + psk, profile)
            config = (boot / "printwatch.env").read_text()
            self.assertIn('PRINTWATCH_PRINTER_ID="printer-3"', config)

    def test_selects_device_from_connected_storage_list(self):
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
                'if [ "$1" = list ]; then printf "/dev/disk9 (external, physical):\\n"; exit 0; fi\n'
                'if [ "$2" = /dev/disk9 ]; then\n'
                "  printf '   Device / Media Name: SD/MMC\\n'\n"
                "  printf '   Disk Size: 31.9 GB (31914983424 bytes)\\n'\n"
                "  printf '   Protocol: Secure Digital\\n'\n"
                "  printf '   Internal: Yes\\n'\n"
                "  printf '   Removable Media: Removable\\n'\n"
                "  exit 0\n"
                "fi\n"
                'if [ "$2" = /dev/disk9s1 ]; then printf "Mount Point: %s\\n" "$PRINTWATCH_TEST_BOOT"; fi\n'
                'if [ "$1" = mount ]; then exit 0; fi\n'
                'if [ "$1" = mountDisk ]; then exit 0; fi\n'
                'if [ "$1" = unmountDisk ]; then exit 0; fi\n'
                'if [ "$1" = info ]; then exit 0; fi\n'
                "exit 1\n"
            )
            for tool in tools.iterdir():
                tool.chmod(0o755)
            result = subprocess.run(
                [FLASH, "printer-1", image],
                input="1\n/dev/disk9\n",
                text=True,
                capture_output=True,
                env={
                    **os.environ,
                    "PATH": f"{tools}:{os.environ['PATH']}",
                    "PRINTWATCH_DEVICE_TOKEN": "a" * 24,
                    "PRINTWATCH_TEST_BOOT": str(boot),
                },
                check=False,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("[1] /dev/disk9", result.stdout)
            self.assertIn("SD/MMC", result.stdout)
            self.assertIn("31.9 GB", result.stdout)
            config = (boot / "printwatch.env").read_text()
            self.assertIn('PRINTWATCH_PRINTER_ID="printer-1"', config)

    def test_rejects_short_wifi_psk_before_writer_runs(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            image = root / "image.img.xz"
            image.write_bytes(b"verified image")
            Path(f"{image}.sha256").write_text(f"{hashlib.sha256(image.read_bytes()).hexdigest()}  {image}\n")
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
                env={
                    **os.environ,
                    "PATH": f"{tools}:{os.environ['PATH']}",
                    "PRINTWATCH_DEVICE_TOKEN": "a" * 24,
                    "PRINTWATCH_WIFI_SSID": "DIMIGO-FAB",
                    "PRINTWATCH_WIFI_PSK": "short",
                },
                check=False,
            )
            self.assertEqual(result.returncode, 2)
            self.assertIn("8-63", result.stderr)
            self.assertFalse(marker.exists())


if __name__ == "__main__":
    unittest.main()
