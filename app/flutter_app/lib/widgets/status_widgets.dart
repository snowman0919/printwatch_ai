import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../models/printwatch_models.dart';

final _timeFormat = DateFormat('MM/dd HH:mm');

String formatTime(DateTime? value) =>
    value == null ? '-' : _timeFormat.format(value);

String formatRemaining(num? minutes) {
  if (minutes == null) {
    return '-';
  }
  final whole = minutes.round();
  final hours = whole ~/ 60;
  final mins = whole % 60;
  if (hours > 0) {
    return '$hours시간 $mins분';
  }
  return '$mins분';
}

String statusLabel(String status) {
  switch (status) {
    case PrinterStatus.normal:
      return '정상';
    case PrinterStatus.suspected:
      return '의심';
    case PrinterStatus.failed:
      return '실패';
    case PrinterStatus.offline:
      return '오프라인';
    default:
      return '알 수 없음';
  }
}

Color statusColor(BuildContext context, String status) {
  switch (status) {
    case PrinterStatus.normal:
      return const Color(0xFF226C63);
    case PrinterStatus.suspected:
      return const Color(0xFFB7791F);
    case PrinterStatus.failed:
      return const Color(0xFFC53030);
    case PrinterStatus.offline:
      return Colors.blueGrey;
    default:
      return Theme.of(context).colorScheme.outline;
  }
}

class StatusPill extends StatelessWidget {
  const StatusPill({required this.status, super.key});

  final String status;

  @override
  Widget build(BuildContext context) {
    final color = statusColor(context, status);
    return DecoratedBox(
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        child: Text(
          statusLabel(status),
          style: TextStyle(color: color, fontWeight: FontWeight.w700),
        ),
      ),
    );
  }
}

class EmptyImage extends StatelessWidget {
  const EmptyImage({super.key});

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
      child: Center(
        child: Icon(
          Icons.image_not_supported_outlined,
          color: Theme.of(context).colorScheme.outline,
        ),
      ),
    );
  }
}
