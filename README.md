# PrintWatch AI

PrintWatch AI is an MVP monitoring system for a school club running five stock Ender-3 V3 SE printers. It is view-only: it does not send G-code, pause, stop, cancel, or otherwise control printers.

## Architecture

- Five Raspberry Pi 3 devices each monitor exactly one printer with a Raspberry Pi Camera Module V1.
- The Pi agent captures a 1920x1080 original snapshot every 5 minutes, creates a thumbnail and a 512-768px AI image, runs LCD OCR, computes local suspicion signals, and uploads through a HMAC-authenticated Cloud Function.
- Firebase is the full server backend: Firebase Auth, Firestore, Cloud Storage, Cloud Functions, and FCM.
- Cloud Functions update printer state, run GPT-5-nano vision analysis every 30 minutes or sooner when local signals are suspicious, create alerts, send FCM notifications, clean 7-day images, and mark stale printers offline after 10 minutes.
- Flutter targets Android and iOS for APK and TestFlight internal testing.
- Live streaming is a separate WebRTC P2P screen using Firestore signaling. The Pi aiortc path is included as a skeleton; the app also has a mock stream mode.

## Repository

- `app/flutter_app`: Flutter app.
- `functions`: Firebase Cloud Functions TypeScript project.
- `pi_agent`: Python Raspberry Pi capture/upload agent and aiortc peer skeleton.
- `firebase`: Firestore, Storage, and Firebase config files.
- `docs`: setup, architecture, OpenAI, WebRTC, and MVP test plan.

## Setup Summary

1. Create a Firebase project and enable Auth, Firestore, Storage, Functions, and FCM.
2. Enable Google Sign-In and restrict operational access to `@dimigo.hs.kr` through app logic, Functions validation, and rules.
3. Replace `app/flutter_app/lib/firebase_options.dart` placeholders or run FlutterFire CLI.
4. Deploy rules from `firebase/` and functions from `functions/`.
5. Set Function env vars:
   - `OPENAI_API_KEY`
   - `PI_DEVICE_SECRETS_JSON`, for example `{"pi-printer-1":"long-random-secret"}`
6. Install the Pi agent on each Raspberry Pi and set a unique config/device secret.
7. Run the Flutter app on Android or iOS.

## Flutter

```bash
cd app/flutter_app
flutter pub get
flutter run
```

For Android APK:

```bash
flutter build apk --release
```

For TestFlight, open the generated iOS project in Xcode after Firebase iOS setup and archive with the club Apple developer account.

## Firebase Functions

```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

The Pi upload path is `uploadSnapshot`. Flutter never receives the OpenAI key, and Pi devices never receive it.

## Raspberry Pi

```bash
cd pi_agent
scripts/install_pi.sh
export PRINTWATCH_DEVICE_SECRET="secret-from-functions-env"
scripts/run_agent.sh config/printer_1.json
```

Each Pi uses one config file and one printer ID: `Printer-1` through `Printer-5`.

## Firestore Schema

The MVP implements the requested top-level collections:

- `users/{uid}`
- `printers/{printerId}`
- `printJobs/{jobId}`
- `snapshots/{snapshotId}`
- `aiAnalyses/{analysisId}`
- `alerts/{alertId}`
- `feedback/{feedbackId}`
- `deviceTokens/{tokenId}`
- `webrtcSessions/{sessionId}` with caller/callee candidate subcollections

## Security Model

- Flutter users must be authenticated with a `@dimigo.hs.kr` Google account.
- Users can read only printers in `allowedPrinters`, unless their role is `admin`.
- Flutter can write feedback, its own FCM token, and its own WebRTC caller signaling.
- Flutter cannot write snapshots, AI analyses, alerts, printer state, or print jobs.
- Pi devices upload only through the HMAC Cloud Function endpoint.
- Cloud Functions perform privileged state changes.

## Cost Control

- Dashboard images update every 5 minutes, but AI analysis runs every 30 minutes by default.
- Local OpenCV heuristics trigger earlier AI only when suspicious.
- OpenAI receives smaller AI images, preferably 512px or 768px wide, not 1920x1080 originals.
- GPT-5-nano is used for low-cost vision analysis.
- Images and snapshot docs are cleaned after 7 days.
- Alert notifications have a 30-minute cooldown for the same printer and failure type.

## MVP Limitations

- Firebase config placeholders must be replaced before running against a real project.
- Pi WebRTC on Raspberry Pi 3 may require tuning and native package work; default target is 640x480 at 2 fps.
- OCR accuracy depends on LCD crop calibration and lighting.
- The app is intentionally view-only and does not integrate with OctoPrint, Klipper, or printer firmware APIs.
