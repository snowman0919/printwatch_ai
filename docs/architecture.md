# Architecture

PrintWatch AI has three runtime layers.

## Raspberry Pi layer

Each Raspberry Pi 4 owns exactly one Ender-3 V3 SE. The agent captures from a Raspberry Pi Camera Module 2, writes a local original snapshot every 15 seconds, and uploads a near-live JPEG every second (configurable 0.5–10 s). A 0.96-inch I2C OLED at address `0x3C` shows the device ID and connection state. Printer state (progress, temperatures, serial connection) is polled over USB serial; the port is opened once and kept for the agent's lifetime, reconnecting only after an I/O error so RTS/DTR transitions never reset the printer board.

The agent authenticates with a Bearer device token, knows nothing about Clerk or the vision model, and never sends control commands to the printer.

## Server layer

The Next.js server runs in Docker Compose on the `dev` host, published only on `127.0.0.1:3300` behind the existing host systemd `cloudflared` tunnel (`https://3dp.kotori9.run` → `http://127.0.0.1:3300`).

- Device APIs: `POST /api/device/snapshot` (original + telemetry + optional analysis request) and `POST /api/device/frame` (1 FPS live JPEG, one stored per printer), both authenticated by `DEVICE_TOKENS_JSON`.
- App APIs: dashboard state, latest media, and live media polling, authenticated through Clerk.
- Persistence: SQLite under the `/data` volume, running as an unprivileged container user.
- Vision analysis: the stored snapshot is kept intact while a normalized 720 px JPEG copy is sent to Ollama (`Qwythos-v2-9B:Q4`). The JSON verdict (`normal` / `suspected` / `failed` / `unknown`) is schema-adapted from observed model behavior and inference is bounded to 90 seconds; snapshot uploads always return 200 even when analysis fails.
- Access control: Clerk production is invite-only with custom Google OAuth credentials on `clerk.kotori9.run`. The server additionally requires an exact `@dimigo.hs.kr` primary email and a verified `oauth_google` external account carrying that same address.

## Dashboard layer

The dashboard is a dark, flat operations console. It renders one focal camera per printer, the fleet rail, AI verdicts with failure probability, and telemetry. Live video is the `NEAR LIVE · 1 FPS` latest-JPEG poll — there is no WebRTC/aiortc path and no Cloudflare Realtime/TURN dependency. Stale polling degrades into an offline state rather than a separate banner. The UI is view-only; no printer control path exists anywhere.

## Data flow

1. The Pi agent uploads a near-live frame every second and an original snapshot with telemetry every 15 seconds.
2. The server validates the device token, stores the image, and updates printer state.
3. When analysis is requested, the server normalizes the snapshot, sends a 720 px copy to Qwythos, and adapts the JSON verdict to the dashboard schema.
4. Invited `@dimigo.hs.kr` users open the dashboard, which reads per-printer state, verdicts, and the latest live JPEG over the Cloudflare tunnel.
5. `main` pushes trigger the `Deploy production` GitHub Actions workflow on the `printwatch-deploy` self-hosted runner, which deploys the committed archive only and verifies both container and public health.

## Legacy reference

The discarded Firebase/Flutter MVP (Firestore, Cloud Functions, HMAC `uploadSnapshot`, FCM, Flutter apps) is kept under `app/`, `functions/`, `firebase/`, and `pi_agent/` for reference only. The current system does not use any of it.
