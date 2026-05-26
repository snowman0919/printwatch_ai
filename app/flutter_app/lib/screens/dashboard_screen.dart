import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/printwatch_models.dart';
import '../services/auth_service.dart';
import '../services/firestore_service.dart';
import '../widgets/status_widgets.dart';
import 'alert_history_screen.dart';
import 'live_stream_screen.dart';
import 'printer_detail_screen.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final printers = ref.watch(printersProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('PrintWatch AI'),
        actions: [
          IconButton(
            tooltip: '알림 기록',
            onPressed: () =>
                Navigator.pushNamed(context, AlertHistoryScreen.routeName),
            icon: const Icon(Icons.notifications_outlined),
          ),
          IconButton(
            tooltip: '로그아웃',
            onPressed: () => ref.read(authServiceProvider).signOut(),
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: printers.when(
        data: (items) => ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: items.length,
          separatorBuilder: (_, __) => const SizedBox(height: 12),
          itemBuilder: (context, index) => PrinterCard(printer: items[index]),
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(child: Text('대시보드를 불러오지 못했습니다.\n$error')),
      ),
    );
  }
}

class PrinterCard extends ConsumerWidget {
  const PrinterCard({required this.printer, super.key});

  final Printer printer;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return StreamBuilder<PrintJob?>(
      stream: ref.read(firestoreServiceProvider).watchJob(printer.currentJobId),
      builder: (context, snapshot) {
        final job = snapshot.data;
        return Card(
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: () => Navigator.pushNamed(
              context,
              PrinterDetailScreen.routeName,
              arguments: printer.id,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                AspectRatio(
                  aspectRatio: 16 / 9,
                  child: printer.latestThumbnailUrl == null
                      ? const EmptyImage()
                      : CachedNetworkImage(
                          imageUrl: printer.latestThumbnailUrl!,
                          fit: BoxFit.cover,
                          placeholder: (_, __) => const EmptyImage(),
                          errorWidget: (_, __, ___) => const EmptyImage(),
                        ),
                ),
                Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              printer.name,
                              style: Theme.of(context).textTheme.titleLarge
                                  ?.copyWith(fontWeight: FontWeight.w800),
                            ),
                          ),
                          StatusPill(status: printer.status),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(job?.title ?? '작업 없음'),
                      const SizedBox(height: 12),
                      LinearProgressIndicator(
                        value: (job?.displayProgressPercent == null)
                            ? null
                            : (job!.displayProgressPercent!.clamp(0, 100) /
                                  100),
                        minHeight: 8,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 16,
                        runSpacing: 8,
                        children: [
                          _Metric(
                            label: '진행률',
                            value: job?.displayProgressPercent == null
                                ? '-'
                                : '${job!.displayProgressPercent!.round()}%',
                          ),
                          _Metric(
                            label: '남은 시간',
                            value: formatRemaining(job?.remainingMin),
                          ),
                          _Metric(
                            label: '시작',
                            value: formatTime(job?.startedAt),
                          ),
                          _Metric(
                            label: '완료 예상',
                            value: formatTime(job?.estimatedFinishAt),
                          ),
                          _Metric(
                            label: '업데이트',
                            value: formatTime(printer.lastSeenAt),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      OutlinedButton.icon(
                        onPressed: printer.streamAvailable
                            ? () => Navigator.pushNamed(
                                context,
                                LiveStreamScreen.routeName,
                                arguments: printer.id,
                              )
                            : null,
                        icon: const Icon(Icons.videocam_outlined),
                        label: const Text('라이브 보기'),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 118,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: Theme.of(context).textTheme.labelSmall),
          const SizedBox(height: 2),
          Text(value, overflow: TextOverflow.ellipsis),
        ],
      ),
    );
  }
}
