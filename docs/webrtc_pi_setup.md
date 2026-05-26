# WebRTC Pi Setup

The Flutter app creates a WebRTC offer in `webrtcSessions/{sessionId}` and writes ICE candidates to `callerCandidates`. The Pi peer reads sessions for its `printer_id`, creates an answer, streams camera frames, writes the answer, and writes callee ICE candidates.

Raspberry Pi 3 limitations:

- CPU encoding budget is low.
- Default target is 640x480 at 2 fps.
- Do not stream 1920x1080 live.
- Increase to 5 fps only after testing heat, latency, and network stability.

Install optional WebRTC dependencies:

```bash
cd pi_agent
. .venv/bin/activate
pip install aiortc av google-cloud-firestore
```

Authenticate the Pi for Firestore signaling with a service account or Application Default Credentials that can read and update only relevant WebRTC signaling documents. The production MVP should narrow IAM and can move Pi signaling through a Function if direct Firestore service credentials are not acceptable.

Run:

```bash
python src/webrtc_peer.py --config config/printer_1.json
```

During app development, use the live stream screen Mock mode. It shows the latest snapshot instead of a true WebRTC camera stream.
