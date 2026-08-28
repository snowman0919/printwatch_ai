import os
import unittest
from unittest.mock import patch

from printwatch.config import Config


class ConfigTest(unittest.TestCase):
    def environment(self, interval: str) -> dict[str, str]:
        return {
            "PRINTWATCH_PRINTER_ID": "printer-1",
            "PRINTWATCH_DEVICE_TOKEN": "a" * 24,
            "PRINTWATCH_LIVE_INTERVAL": interval,
        }

    def test_live_interval_preserves_near_live_rate_without_upload_flooding(self):
        with patch.dict(os.environ, self.environment("1"), clear=True):
            self.assertEqual(Config.from_env().live_interval, 1)
        with patch.dict(os.environ, self.environment("0.1"), clear=True):
            with self.assertRaisesRegex(ValueError, "between 0.5 and 10"):
                Config.from_env()


if __name__ == "__main__":
    unittest.main()
