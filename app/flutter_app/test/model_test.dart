import 'package:flutter_test/flutter_test.dart';
import 'package:printwatch_ai/models/printwatch_models.dart';

void main() {
  test('printer status severity sorts failure before normal', () {
    final statuses =
        [
          PrinterStatus.normal,
          PrinterStatus.failed,
          PrinterStatus.offline,
          PrinterStatus.suspected,
          PrinterStatus.unknown,
        ]..sort(
          (a, b) =>
              PrinterStatus.severity(a).compareTo(PrinterStatus.severity(b)),
        );

    expect(statuses, [
      PrinterStatus.failed,
      PrinterStatus.suspected,
      PrinterStatus.unknown,
      PrinterStatus.offline,
      PrinterStatus.normal,
    ]);
  });
}
