# Architecture

PrintWatch AI has three runtime layers.

## Raspberry Pi Layer

Each Raspberry Pi 3 owns exactly one Ender-3 V3 SE. The agent captures from Raspberry Pi Camera Module V1 at 1920x1080 every 5 minutes, writes a local original, creates thumbnail and AI-sized JPEGs, crops the LCD region, runs OCR, computes local image signals, and uploads through `uploadSnapshot`.

The Pi does not know the OpenAI API key and does not control the printer.

## Firebase Layer

Firebase is the full backend:

- Auth: Google sign-in, accepted domain `@dimigo.hs.kr`.
- Firestore: live dashboard data, alerts, feedback, WebRTC signaling.
- Storage: original, thumbnail, and AI images.
- Functions: snapshot ingest, AI analysis, notifications, cleanup, offline status.
- FCM: push notifications for suspected or critical failures.

## Flutter Layer

The Flutter app is view-only. It streams Firestore dashboard data, shows current and historical images, registers FCM tokens, writes feedback, and starts WebRTC viewer sessions. Printer cards are sorted by severity: failed, suspected, unknown, offline, normal.

## Data Flow

1. Pi captures image and metadata.
2. Pi signs upload with HMAC and calls `uploadSnapshot`.
3. Function stores images in Storage and creates `snapshots/{snapshotId}`.
4. `onSnapshotUploaded` updates `printers/{printerId}` and job progress.
5. Suspicious local signals trigger immediate AI; otherwise `scheduledAiAnalysis` runs every 30 minutes.
6. AI results are written to `aiAnalyses`; printer status and print job progress are updated.
7. Alerts create FCM notifications with cooldown.
8. Flutter receives Firestore updates in near real time.
