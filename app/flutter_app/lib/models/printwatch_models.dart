import 'package:cloud_firestore/cloud_firestore.dart';

DateTime? _time(dynamic value) {
  if (value is Timestamp) {
    return value.toDate();
  }
  return null;
}

num? _num(dynamic value) => value is num ? value : null;

class PrinterStatus {
  static const failed = 'failed';
  static const suspected = 'suspected';
  static const unknown = 'unknown';
  static const offline = 'offline';
  static const normal = 'normal';

  static int severity(String status) {
    switch (status) {
      case failed:
        return 0;
      case suspected:
        return 1;
      case unknown:
        return 2;
      case offline:
        return 3;
      case normal:
        return 4;
      default:
        return 2;
    }
  }
}

class Printer {
  Printer({
    required this.id,
    required this.name,
    required this.location,
    required this.status,
    required this.currentJobId,
    required this.latestSnapshotId,
    required this.latestThumbnailUrl,
    required this.latestOriginalUrl,
    required this.lastSeenAt,
    required this.streamAvailable,
  });

  final String id;
  final String name;
  final String location;
  final String status;
  final String? currentJobId;
  final String? latestSnapshotId;
  final String? latestThumbnailUrl;
  final String? latestOriginalUrl;
  final DateTime? lastSeenAt;
  final bool streamAvailable;

  factory Printer.fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data() ?? {};
    return Printer(
      id: doc.id,
      name: data['name'] as String? ?? doc.id,
      location: data['location'] as String? ?? '',
      status: data['status'] as String? ?? PrinterStatus.unknown,
      currentJobId: data['currentJobId'] as String?,
      latestSnapshotId: data['latestSnapshotId'] as String?,
      latestThumbnailUrl: data['latestThumbnailUrl'] as String?,
      latestOriginalUrl: data['latestOriginalUrl'] as String?,
      lastSeenAt: _time(data['lastSeenAt']),
      streamAvailable: data['streamAvailable'] as bool? ?? false,
    );
  }
}

class PrintJob {
  PrintJob({
    required this.id,
    required this.title,
    required this.startedAt,
    required this.estimatedFinishAt,
    required this.displayProgressPercent,
    required this.remainingMin,
    required this.status,
  });

  final String id;
  final String title;
  final DateTime? startedAt;
  final DateTime? estimatedFinishAt;
  final num? displayProgressPercent;
  final num? remainingMin;
  final String status;

  factory PrintJob.fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data() ?? {};
    return PrintJob(
      id: doc.id,
      title: data['title'] as String? ?? '작업명 없음',
      startedAt: _time(data['startedAt']),
      estimatedFinishAt: _time(data['estimatedFinishAt']),
      displayProgressPercent: _num(data['displayProgressPercent']),
      remainingMin: _num(data['remainingMin']),
      status: data['status'] as String? ?? 'unknown',
    );
  }
}

class SnapshotInfo {
  SnapshotInfo({
    required this.id,
    required this.printerId,
    required this.jobId,
    required this.originalUrl,
    required this.thumbnailUrl,
    required this.aiImageUrl,
    required this.capturedAt,
    required this.ocrRawText,
    required this.ocrProgressPercent,
    required this.ocrConfidence,
  });

  final String id;
  final String printerId;
  final String? jobId;
  final String? originalUrl;
  final String? thumbnailUrl;
  final String? aiImageUrl;
  final DateTime? capturedAt;
  final String ocrRawText;
  final num? ocrProgressPercent;
  final num ocrConfidence;

  factory SnapshotInfo.fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data() ?? {};
    final ocr = data['ocr'] as Map<String, dynamic>? ?? {};
    return SnapshotInfo(
      id: doc.id,
      printerId: data['printerId'] as String? ?? '',
      jobId: data['jobId'] as String?,
      originalUrl: data['originalUrl'] as String?,
      thumbnailUrl: data['thumbnailUrl'] as String?,
      aiImageUrl: data['aiImageUrl'] as String?,
      capturedAt: _time(data['capturedAt']),
      ocrRawText: ocr['rawText'] as String? ?? '',
      ocrProgressPercent: _num(ocr['progressPercent']),
      ocrConfidence: _num(ocr['confidence']) ?? 0,
    );
  }
}

class AiAnalysis {
  AiAnalysis({
    required this.id,
    required this.status,
    required this.failureTypes,
    required this.failureProbability,
    required this.visualProgressPercent,
    required this.progressConfidence,
    required this.summary,
    required this.recommendedAction,
    required this.notifyLevel,
    required this.createdAt,
  });

  final String id;
  final String status;
  final List<String> failureTypes;
  final num failureProbability;
  final num? visualProgressPercent;
  final num progressConfidence;
  final String summary;
  final String recommendedAction;
  final String notifyLevel;
  final DateTime? createdAt;

  factory AiAnalysis.fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data() ?? {};
    return AiAnalysis(
      id: doc.id,
      status: data['status'] as String? ?? PrinterStatus.unknown,
      failureTypes: (data['failureTypes'] as List? ?? const [])
          .map((item) => item.toString())
          .toList(),
      failureProbability: _num(data['failureProbability']) ?? 0,
      visualProgressPercent: _num(data['visualProgressPercent']),
      progressConfidence: _num(data['progressConfidence']) ?? 0,
      summary: data['summary'] as String? ?? '',
      recommendedAction: data['recommendedAction'] as String? ?? '',
      notifyLevel: data['notifyLevel'] as String? ?? 'none',
      createdAt: _time(data['createdAt']),
    );
  }
}

class AlertInfo {
  AlertInfo({
    required this.id,
    required this.printerId,
    required this.level,
    required this.title,
    required this.body,
    required this.createdAt,
    required this.acknowledgedBy,
  });

  final String id;
  final String printerId;
  final String level;
  final String title;
  final String body;
  final DateTime? createdAt;
  final String? acknowledgedBy;

  factory AlertInfo.fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data() ?? {};
    return AlertInfo(
      id: doc.id,
      printerId: data['printerId'] as String? ?? '',
      level: data['level'] as String? ?? 'info',
      title: data['title'] as String? ?? '',
      body: data['body'] as String? ?? '',
      createdAt: _time(data['createdAt']),
      acknowledgedBy: data['acknowledgedBy'] as String?,
    );
  }
}
