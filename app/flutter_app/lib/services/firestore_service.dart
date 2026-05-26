import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/printwatch_models.dart';

final firestoreServiceProvider = Provider<FirestoreService>(
  (ref) => FirestoreService(),
);

final printersProvider = StreamProvider<List<Printer>>((ref) {
  return ref.watch(firestoreServiceProvider).watchPrinters();
});

class FirestoreService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  Stream<List<Printer>> watchPrinters() {
    return _db.collection('printers').snapshots().map((snapshot) {
      final printers = snapshot.docs.map(Printer.fromDoc).toList();
      printers.sort((a, b) {
        final severity = PrinterStatus.severity(
          a.status,
        ).compareTo(PrinterStatus.severity(b.status));
        if (severity != 0) {
          return severity;
        }
        return a.id.compareTo(b.id);
      });
      return printers;
    });
  }

  Stream<Printer?> watchPrinter(String printerId) {
    return _db.collection('printers').doc(printerId).snapshots().map((doc) {
      if (!doc.exists) {
        return null;
      }
      return Printer.fromDoc(doc);
    });
  }

  Stream<PrintJob?> watchJob(String? jobId) {
    if (jobId == null) {
      return Stream.value(null);
    }
    return _db.collection('printJobs').doc(jobId).snapshots().map((doc) {
      if (!doc.exists) {
        return null;
      }
      return PrintJob.fromDoc(doc);
    });
  }

  Stream<List<SnapshotInfo>> watchSnapshots(
    String printerId, {
    int limit = 30,
  }) {
    return _db
        .collection('snapshots')
        .where('printerId', isEqualTo: printerId)
        .orderBy('capturedAt', descending: true)
        .limit(limit)
        .snapshots()
        .map((snapshot) => snapshot.docs.map(SnapshotInfo.fromDoc).toList());
  }

  Stream<AiAnalysis?> watchLatestAnalysis(String printerId) {
    return _db
        .collection('aiAnalyses')
        .where('printerId', isEqualTo: printerId)
        .orderBy('createdAt', descending: true)
        .limit(1)
        .snapshots()
        .map((snapshot) {
          if (snapshot.docs.isEmpty) {
            return null;
          }
          return AiAnalysis.fromDoc(snapshot.docs.first);
        });
  }

  Stream<List<AlertInfo>> watchAlerts({String? printerId, int limit = 50}) {
    Query<Map<String, dynamic>> query = _db.collection('alerts');
    if (printerId != null) {
      query = query.where('printerId', isEqualTo: printerId);
    }
    return query
        .orderBy('createdAt', descending: true)
        .limit(limit)
        .snapshots()
        .map((snapshot) => snapshot.docs.map(AlertInfo.fromDoc).toList());
  }

  Future<void> writeFeedback({
    required String printerId,
    required String? jobId,
    required String? analysisId,
    required String? snapshotId,
    required String userLabel,
    String? comment,
  }) {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      throw StateError('Not signed in');
    }
    return _db.collection('feedback').add({
      'printerId': printerId,
      'jobId': jobId,
      'analysisId': analysisId,
      'snapshotId': snapshotId,
      'userId': user.uid,
      'userLabel': userLabel,
      'comment': comment,
      'createdAt': FieldValue.serverTimestamp(),
    });
  }

  CollectionReference<Map<String, dynamic>> get webrtcSessions =>
      _db.collection('webrtcSessions');
}
