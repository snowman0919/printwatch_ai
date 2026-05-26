import 'package:cached_network_image/cached_network_image.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';

import '../models/printwatch_models.dart';
import '../services/firestore_service.dart';
import '../services/webrtc_service.dart';
import '../widgets/status_widgets.dart';

class LiveStreamScreen extends ConsumerStatefulWidget {
  const LiveStreamScreen({required this.printerId, super.key});

  static const routeName = '/live';
  final String printerId;

  @override
  ConsumerState<LiveStreamScreen> createState() => _LiveStreamScreenState();
}

class _LiveStreamScreenState extends ConsumerState<LiveStreamScreen> {
  ViewerSession? _session;
  bool _mockMode = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _start();
  }

  @override
  void dispose() {
    _session?.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('${widget.printerId} 라이브'),
        actions: [
          IconButton(
            tooltip: _mockMode ? 'WebRTC 모드' : 'Mock 모드',
            onPressed: () => setState(() => _mockMode = !_mockMode),
            icon: Icon(
              _mockMode ? Icons.videocam_outlined : Icons.image_outlined,
            ),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            AspectRatio(
              aspectRatio: 4 / 3,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: _mockMode
                    ? _MockStream(printerId: widget.printerId)
                    : _video(),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              _mockMode
                  ? 'Mock 스트림: 최신 스냅샷을 주기적으로 표시합니다.'
                  : 'WebRTC P2P 연결: Firestore signaling을 사용합니다.',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(
                _error!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ],
            if (_session != null) ...[
              const SizedBox(height: 8),
              SelectableText('sessionId: ${_session!.sessionId}'),
            ],
          ],
        ),
      ),
    );
  }

  Widget _video() {
    if (_session == null) {
      return const ColoredBox(
        color: Colors.black,
        child: Center(child: CircularProgressIndicator()),
      );
    }
    return RTCVideoView(
      _session!.renderer,
      objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitContain,
    );
  }

  Future<void> _start() async {
    try {
      final db = ref.read(firestoreServiceProvider).webrtcSessions.firestore;
      final service = WebRtcViewerService(db);
      final session = await service.start(widget.printerId);
      if (mounted) {
        setState(() => _session = session);
      }
    } on FirebaseException catch (error) {
      setState(() {
        _error = 'WebRTC signaling을 시작하지 못했습니다: ${error.message}';
        _mockMode = true;
      });
    } catch (error) {
      setState(() {
        _error = 'WebRTC 연결을 시작하지 못했습니다. Mock 모드로 확인하세요.';
        _mockMode = true;
      });
    }
  }
}

class _MockStream extends ConsumerWidget {
  const _MockStream({required this.printerId});

  final String printerId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return StreamBuilder<List<SnapshotInfo>>(
      stream: ref
          .read(firestoreServiceProvider)
          .watchSnapshots(printerId, limit: 1),
      builder: (context, snapshot) {
        final latest = snapshot.data?.isNotEmpty == true
            ? snapshot.data!.first
            : null;
        if (latest?.thumbnailUrl == null) {
          return const EmptyImage();
        }
        return CachedNetworkImage(
          imageUrl: latest!.thumbnailUrl!,
          fit: BoxFit.contain,
          placeholder: (_, __) => const EmptyImage(),
          errorWidget: (_, __, ___) => const EmptyImage(),
        );
      },
    );
  }
}
