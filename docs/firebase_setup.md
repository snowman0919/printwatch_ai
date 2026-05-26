# Firebase Setup

1. Create a Firebase project.
2. Enable Google Authentication.
3. Enable Firestore in production mode.
4. Enable Cloud Storage.
5. Enable Cloud Functions and FCM.
6. Register Android and iOS apps.
7. Replace `app/flutter_app/lib/firebase_options.dart` with real project values, or run FlutterFire CLI.
8. Deploy rules:

```bash
cd firebase
firebase deploy --only firestore:rules,storage
```

9. Deploy Functions:

```bash
cd ../functions
npm install
npm run build
firebase deploy --only functions
```

10. Set environment variables for Functions:

```bash
firebase functions:secrets:set OPENAI_API_KEY
firebase functions:secrets:set PI_DEVICE_SECRETS_JSON
```

For local emulator testing, use `.env` or shell environment variables. `PI_DEVICE_SECRETS_JSON` must map Pi device IDs to long random secrets.

## Initial Printer Documents

Create five printer documents:

- `Printer-1`
- `Printer-2`
- `Printer-3`
- `Printer-4`
- `Printer-5`

Each should include at least `name`, `location`, `status`, `streamAvailable`, and `createdAt`. The upload function also creates missing fields on first snapshot.
