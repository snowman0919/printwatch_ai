import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';

class ViewerSession {
  ViewerSession({
    required this.sessionId,
    required this.renderer,
    required this.close,
  });

  final String sessionId;
  final RTCVideoRenderer renderer;
  final Future<void> Function() close;
}

class WebRtcViewerService {
  WebRtcViewerService(this._db);

  final FirebaseFirestore _db;
  final Map<String, StreamSubscription<dynamic>> _subscriptions = {};

  Future<ViewerSession> start(String printerId) async {
    final uid = FirebaseAuth.instance.currentUser!.uid;
    final sessionRef = _db.collection('webrtcSessions').doc();
    final pc = await createPeerConnection({
      'iceServers': [
        {'urls': 'stun:stun.l.google.com:19302'},
      ],
    });
    final renderer = RTCVideoRenderer();
    await renderer.initialize();

    pc.onTrack = (event) {
      if (event.streams.isNotEmpty) {
        renderer.srcObject = event.streams.first;
      }
    };
    pc.onIceCandidate = (candidate) {
      sessionRef.collection('callerCandidates').add({
        'candidate': candidate.candidate,
        'sdpMid': candidate.sdpMid,
        'sdpMLineIndex': candidate.sdpMLineIndex,
        'createdAt': FieldValue.serverTimestamp(),
      });
    };

    await sessionRef.set({
      'printerId': printerId,
      'viewerUid': uid,
      'status': 'created',
      'offer': null,
      'answer': null,
      'createdAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    });

    final offer = await pc.createOffer({
      'offerToReceiveVideo': true,
      'offerToReceiveAudio': false,
    });
    await pc.setLocalDescription(offer);
    await sessionRef.update({
      'status': 'offered',
      'offer': offer.toMap(),
      'updatedAt': FieldValue.serverTimestamp(),
    });

    _subscriptions['answer-${sessionRef.id}'] = sessionRef.snapshots().listen((
      doc,
    ) async {
      final data = doc.data();
      final answer = data?['answer'] as Map<String, dynamic>?;
      if (answer == null) {
        return;
      }
      final remote = await pc.getRemoteDescription();
      if (remote != null) {
        return;
      }
      await pc.setRemoteDescription(
        RTCSessionDescription(
          answer['sdp'] as String?,
          answer['type'] as String?,
        ),
      );
    });

    _subscriptions['candidates-${sessionRef.id}'] = sessionRef
        .collection('calleeCandidates')
        .snapshots()
        .listen((snapshot) async {
          for (final change in snapshot.docChanges) {
            if (change.type != DocumentChangeType.added) {
              continue;
            }
            final data = change.doc.data()!;
            await pc.addCandidate(
              RTCIceCandidate(
                data['candidate'] as String?,
                data['sdpMid'] as String?,
                data['sdpMLineIndex'] as int?,
              ),
            );
          }
        });

    return ViewerSession(
      sessionId: sessionRef.id,
      renderer: renderer,
      close: () async {
        for (final subscription in _subscriptions.values) {
          await subscription.cancel();
        }
        _subscriptions.clear();
        await sessionRef.update({
          'status': 'closed',
          'updatedAt': FieldValue.serverTimestamp(),
        });
        await pc.close();
        await renderer.dispose();
      },
    );
  }
}
