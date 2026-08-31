# PrintWatch AI

PrintWatch AI monitors three stock Ender-3 V3 SE printers for a school club. It is view-only: the Pi agents send status queries, but the system never sends G-code, pause, stop, cancel, or any other printer control command.

## Architecture

- Three Raspberry Pi 4 devices each monitor exactly one Ender-3 V3 SE with a Raspberry Pi Camera Module 2, a 0.96-inch I2C OLED, and a USB serial link to the printer.
- The Python Pi agent captures an original snapshot every 15 seconds, uploads a near-live JPEG every 1 second, streams OLED status over I2C (`0x3C`), and polls printer telemetry over a persistent serial connection that reconnects only after an error (avoiding repeated RTS/DTR resets).
- The Next.js server runs in Docker on the `dev` host at `127.0.0.1:3300`. It stores originals and per-printer live JPEGs in SQLite-backed volumes, checks Bearer device tokens from `DEVICE_TOKENS_JSON`, and exposes the dashboard APIs.
- Clerk production provides Google sign-in. Access is invite-only, and the server additionally requires an exact `@dimigo.hs.kr` primary email backed by a verified Google external account (`oauth_google`) with the same address.
- Vision analysis runs through Ollama (`Qwythos-v2-9B:Q4` at `http://100.90.167.128:11434/v1`). The stored snapshot is never modified; a 720 px JPEG copy is sent to the model, and inference is bounded to 90 seconds so uploads always succeed even when analysis fails.
- The public endpoint is `https://3dp.kotori9.run`, served by the existing host-level systemd `cloudflared` tunnel with origin `http://127.0.0.1:3300`. There is no WebRTC/aiortc path and no Cloudflare Realtime/TURN subscription; near-live video is the 1 FPS latest-JPEG poll.

## Repository

- `web`: Next.js dashboard, Clerk integration, device APIs, and Qwythos analysis.
- `agent`: Python Pi agent (camera, OLED, serial telemetry, uploader) and its tests.
- `image`: official `pi-gen` ARM64 image build and SD-card flash scripts.
- `hardware/freecad`: FreeCAD script and generated STL/STEP for the printable housing (six parts).
- `deploy`: environment preflight, deploy script, and the self-hosted Actions runner service.
- `docs`: production setup, architecture, commissioning, and validation evidence.

The discarded Firebase/Flutter MVP remains only as reference under `app/`, `functions/`, `firebase/`, and `pi_agent/`. Nothing in the current system depends on it.

## Quick paths

1. Configure Clerk and Cloudflare secrets in `dev:/home/kotori9/printwatch_ai/.env` per [docs/setup.md](docs/setup.md).
2. Deploy to `dev` with `./deploy/deploy.sh`, or push to `main` to trigger the `Deploy production` GitHub Actions workflow on the `printwatch-deploy` self-hosted runner.
3. Build the common Raspberry Pi OS image once with `./image/build-image.sh`; it writes the image plus a `.sha256` sidecar.
4. Flash each SD card with `PRINTWATCH_DEVICE_TOKEN=... ./image/flash.sh printer-1 image_2026-08-28-printwatch-pi4.img.xz /dev/diskN` (the script verifies the checksum before writing).
5. Print the housing per [hardware/freecad/README.md](hardware/freecad/README.md).
6. Commission the first set per [docs/commissioning.md](docs/commissioning.md), then replicate for the remaining two printers.

## Security model

- Users sign in with Google through Clerk production, which is invite-only; unsolicited sign-ups are rejected.
- Beyond Clerk, every protected server boundary requires an exact `@dimigo.hs.kr` primary email plus a verified `oauth_google` external account carrying the same address.
- Pi devices authenticate with unique URL-safe device tokens (24+ characters) injected at flash time and validated by the server preflight; tokens are never printed or logged.
- Clerk publishable keys cross the Docker build boundary into the browser bundle; the secret key, device tokens, and any tunnel credentials stay runtime-only in the mode-600 `.env`.
- Printers are never controlled: the agent only reads status, and the web server exposes no command path.

## Cost and operations control

- AI analysis sends a 720 px JPEG copy, not the 1920x1080 original, to bound inference latency.
- Only one live JPEG per printer is stored; older frames are replaced on the next 1-second upload.
- Docker logs rotate at 10 MB × 3 files, and the container runs as an unprivileged user with a healthcheck.
- Deployment ships only committed sources; untracked files and the remote `.env` are preserved.
