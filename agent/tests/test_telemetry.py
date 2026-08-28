import unittest
import sys
from types import SimpleNamespace
from unittest.mock import patch
from printwatch.telemetry import SerialTelemetry, next_printing_latch, parse_response


class TelemetryTest(unittest.TestCase):
    def test_parses_active_sd_print_and_temperatures(self):
        value = parse_response("SD printing byte 250/1000\nok T:204.8 /210 B:59.6 /60")
        self.assertEqual(value.printerState, "printing")
        self.assertEqual(value.progressPercent, 25)
        self.assertEqual((value.hotendCelsius, value.bedCelsius), (204.8, 59.6))

    def test_idle_after_known_print_means_complete(self):
        self.assertEqual(parse_response("Not SD printing", was_printing=True).printerState, "complete")

    def test_completion_stays_latched_until_the_next_print_or_restart(self):
        latch = next_printing_latch(False, parse_response("SD printing byte 10/100").printerState)
        first = parse_response("Not SD printing", was_printing=latch)
        latch = next_printing_latch(latch, first.printerState)
        second = parse_response("Not SD printing", was_printing=latch)
        self.assertEqual((first.printerState, second.printerState), ("complete", "complete"))

    def test_reuses_serial_connection_instead_of_toggling_control_lines_each_poll(self):
        class Port:
            is_open = True

            def __init__(self):
                self.closed = False

            def reset_input_buffer(self):
                pass

            def write(self, value):
                self.last_write = value

            def read(self, size):
                return b"Not SD printing\nok T:21 /0 B:22 /0"

            def close(self):
                self.closed = True
                self.is_open = False

        port = Port()
        opens = []

        def serial_factory(*args, **kwargs):
            opens.append((args, kwargs))
            return port

        serial_module = SimpleNamespace(Serial=serial_factory, SerialException=OSError)
        telemetry = SerialTelemetry("/dev/test-printer", 115200)
        with patch.dict(sys.modules, {"serial": serial_module}), patch("printwatch.telemetry.time.sleep"):
            self.assertTrue(telemetry.read().serialConnected)
            self.assertTrue(telemetry.read().serialConnected)
        self.assertEqual(len(opens), 1)
        self.assertFalse(port.closed)
        telemetry.close()
        self.assertTrue(port.closed)


if __name__ == "__main__":
    unittest.main()
