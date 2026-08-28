import unittest
from printwatch.telemetry import next_printing_latch, parse_response


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


if __name__ == "__main__":
    unittest.main()
