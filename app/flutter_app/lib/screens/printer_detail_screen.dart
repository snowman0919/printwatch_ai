import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/printwatch_models.dart';
import '../services/firestore_service.dart';
import '../widgets/status_widgets.dart';
import 'live_stream_screen.dart';

class PrinterDetailScreen extends ConsumerWidget {
  const PrinterDetailScreen({required this.printerId, super.key});

  static const routeName = '/printer';
  final String printerId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final service = ref.watch(firestoreServiceProvider);
    return StreamBuilder<Printer?>(
      stream: service.watchPrinter(printerId),
      builder: (context, printerSnapshot) {
        final printer = printerSnapshot.data;
        return Scaffold(
          appBar: AppBar(
            title: Text(printer?.name ?? printerId),
            actions: [
              IconButton(
                tooltip: '라이브 보기',
                onPressed: () => Navigator.pushNamed(
                  context,
                  LiveStreamScreen.routeName,
                  arguments: printerId,
                ),
                icon: const Icon(Icons.videocam_outlined),
              ),
            ],
          ),
          body: printer == null
              ? const Center(child: CircularProgressIndicator())
              : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    AspectRatio(
                      aspectRatio: 16 / 9,
                      child: printer.latestOriginalUrl == null
                          ? const EmptyImage()
                          : CachedNetworkImage(
                              imageUrl: printer.latestOriginalUrl!,
                              fit: BoxFit.cover,
                              placeholder: (_, __) => const EmptyImage(),
                              errorWidget: (_, __, ___) => const EmptyImage(),
                            ),
                    ),
                    const SizedBox(height: 16),
                    _SummarySection(printer: printer),
                    const SizedBox(height: 16),
                    _AnalysisSection(printerId: printerId),
                    const SizedBox(height: 16),
                    _SnapshotHistory(printerId: printerId),
                  ],
                ),
        );
      },
    );
  }
}

class _SummarySection extends ConsumerWidget {
  const _SummarySection({required this.printer});

  final Printer printer;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return StreamBuilder<PrintJob?>(
      stream: ref.read(firestoreServiceProvider).watchJob(printer.currentJobId),
      builder: (context, snapshot) {
        final job = snapshot.data;
        return Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        job?.title ?? '작업 없음',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                    ),
                    StatusPill(status: printer.status),
                  ],
                ),
                const SizedBox(height: 16),
                LinearProgressIndicator(
                  value: job?.displayProgressPercent == null
                      ? null
                      : job!.displayProgressPercent!.clamp(0, 100) / 100,
                  minHeight: 8,
                  borderRadius: BorderRadius.circular(8),
                ),
                const SizedBox(height: 16),
                Wrap(
                  spacing: 18,
                  runSpacing: 10,
                  children: [
                    _Info(
                      label: '진행률',
                      value: _percent(job?.displayProgressPercent),
                    ),
                    _Info(
                      label: '남은 시간',
                      value: formatRemaining(job?.remainingMin),
                    ),
                    _Info(label: '시작', value: formatTime(job?.startedAt)),
                    _Info(
                      label: '완료 예상',
                      value: formatTime(job?.estimatedFinishAt),
                    ),
                    _Info(
                      label: '마지막 업데이트',
                      value: formatTime(printer.lastSeenAt),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  String _percent(num? value) => value == null ? '-' : '${value.round()}%';
}

class _AnalysisSection extends ConsumerWidget {
  const _AnalysisSection({required this.printerId});

  final String printerId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final service = ref.read(firestoreServiceProvider);
    return StreamBuilder<AiAnalysis?>(
      stream: service.watchLatestAnalysis(printerId),
      builder: (context, analysisSnapshot) {
        final analysis = analysisSnapshot.data;
        return StreamBuilder<List<SnapshotInfo>>(
          stream: service.watchSnapshots(printerId, limit: 1),
          builder: (context, snapshotSnapshot) {
            final latestItems = snapshotSnapshot.data ?? const <SnapshotInfo>[];
            final latestSnapshot = latestItems.isEmpty
                ? null
                : latestItems.first;
            return Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'AI 분석',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 12),
                    if (analysis == null)
                      const Text('아직 분석 결과가 없습니다.')
                    else ...[
                      Text(analysis.summary),
                      const SizedBox(height: 10),
                      Text(
                        '실패 확률: ${(analysis.failureProbability * 100).round()}%',
                      ),
                      Text(
                        '감지 유형: ${analysis.failureTypes.isEmpty ? '-' : analysis.failureTypes.join(', ')}',
                      ),
                      Text('권장 조치: ${analysis.recommendedAction}'),
                    ],
                    const Divider(height: 28),
                    Text(
                      'OCR 화면 데이터',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      latestSnapshot?.ocrRawText.isEmpty == false
                          ? latestSnapshot!.ocrRawText
                          : 'OCR 데이터 없음',
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'OCR 진행률: ${latestSnapshot?.ocrProgressPercent == null ? '-' : '${latestSnapshot!.ocrProgressPercent!.round()}%'}',
                    ),
                    Text(
                      'OCR 신뢰도: ${latestSnapshot == null ? '-' : latestSnapshot.ocrConfidence.toStringAsFixed(2)}',
                    ),
                    const Divider(height: 28),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _FeedbackButton(
                          label: '정상으로 표시',
                          value: 'normal',
                          printerId: printerId,
                          analysis: analysis,
                          snapshot: latestSnapshot,
                        ),
                        _FeedbackButton(
                          label: '실패로 표시',
                          value: 'failure',
                          printerId: printerId,
                          analysis: analysis,
                          snapshot: latestSnapshot,
                        ),
                        _FeedbackButton(
                          label: '잘 모르겠음',
                          value: 'not_sure',
                          printerId: printerId,
                          analysis: analysis,
                          snapshot: latestSnapshot,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }
}

class _FeedbackButton extends ConsumerWidget {
  const _FeedbackButton({
    required this.label,
    required this.value,
    required this.printerId,
    required this.analysis,
    required this.snapshot,
  });

  final String label;
  final String value;
  final String printerId;
  final AiAnalysis? analysis;
  final SnapshotInfo? snapshot;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return OutlinedButton(
      onPressed: () async {
        await ref
            .read(firestoreServiceProvider)
            .writeFeedback(
              printerId: printerId,
              jobId: snapshot?.jobId,
              analysisId: analysis?.id,
              snapshotId: snapshot?.id,
              userLabel: value,
            );
        if (context.mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(const SnackBar(content: Text('피드백을 저장했습니다.')));
        }
      },
      child: Text(label),
    );
  }
}

class _SnapshotHistory extends ConsumerWidget {
  const _SnapshotHistory({required this.printerId});

  final String printerId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return StreamBuilder<List<SnapshotInfo>>(
      stream: ref.read(firestoreServiceProvider).watchSnapshots(printerId),
      builder: (context, snapshot) {
        final snapshots = snapshot.data ?? const <SnapshotInfo>[];
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('7일 이미지 기록', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 12),
            SizedBox(
              height: 92,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: snapshots.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (context, index) {
                  final item = snapshots[index];
                  return SizedBox(
                    width: 144,
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: item.thumbnailUrl == null
                          ? const EmptyImage()
                          : CachedNetworkImage(
                              imageUrl: item.thumbnailUrl!,
                              fit: BoxFit.cover,
                              errorWidget: (_, __, ___) => const EmptyImage(),
                            ),
                    ),
                  );
                },
              ),
            ),
          ],
        );
      },
    );
  }
}

class _Info extends StatelessWidget {
  const _Info({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 130,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: Theme.of(context).textTheme.labelSmall),
          Text(value, overflow: TextOverflow.ellipsis),
        ],
      ),
    );
  }
}
