# Validation evidence

## Product behavior

- A real multipart request traversed `POST /api/device/snapshot`, JPEG normalization, SQLite persistence, Qwythos analysis at `100.90.167.128:11434/v1`, schema adaptation, and dashboard readback.
- The synthetic spaghetti fixture was classified `failed / spaghetti / 0.95`, and the dashboard derived `실패 감지` while the device heartbeat was fresh.
- A fresh production-image regression check found that a 1440 × 900 PNG could exceed the 90-second inference boundary. The real route now keeps the stored snapshot intact but sends a 720px JPEG copy to Qwythos; an isolated production container completed the multipart route in 17 seconds with `analysisError=false` and returned `failed / spaghetti / 0.95`.
- A real device-token request uploaded three distinct frames through `POST /api/device/frame`; an invalid token returned 401, valid uploads returned 200, and only one normalized JPEG remained for the printer. An authenticated Aside browser read `NEAR LIVE · 1 FPS` and changed the displayed media URL on the next one-second poll after a new upload.
- The exact school-domain predicate accepts `student@dimigo.hs.kr` and rejects both a subdomain and an attacker-controlled suffix.
- Clerk production uses custom Google OAuth credentials with only the Clerk callback URI. Cloudflare Domain Connect created five DNS-only CNAME records; Clerk reports application 2/2 verified, email 3/3 verified, and both SSL certificates issued. The public sign-in page rendered the Google button through the Clerk custom domain.
- A production Docker image built on `dev`; an isolated container returned `{"ok":true}` from `/api/health` with `/data` mounted as the unprivileged runtime user.
- The Clerk publishable key crossed the Docker build boundary into the browser bundle while the secret remained runtime-only. Compose rejected a missing public key, and the environment preflight rejected placeholders and invalid three-device token sets without printing values. The deployed topology uses the existing host systemd tunnel connector, avoiding a second token-bearing container.

## StyleSeed code gate

Rule set: `operations-console × product-ui × education × dashboard × enterprise-workbench × cobalt-instrument × technical`

Design score: **92 / 100 (A)**

| Category | Score | Evidence |
| --- | ---: | --- |
| Color discipline | 16/16 | Semantic tokens; cobalt is the only action/selection hue; status colors carry named severity. |
| Hierarchy and typography | 14/16 | Camera and failure probability dominate; compact labels are restricted to operational metadata. |
| Layout and rhythm | 12/12 | One focal camera, aligned fleet rail, then evidence and alert groups. |
| Cards and elevation | 10/10 | Flat tonal surfaces and one-pixel boundaries; no floating card shadows. |
| States and accessibility | 15/18 | Offline, empty, connecting, live, error, disabled and alert states exist; stale polling becomes an offline state rather than a separate banner. |
| Motion and interaction | 6/6 | Only connection spinner and fast color transitions; reduced-motion override is global. |
| Coherence | 10/12 | Consistent rectangular workbench geometry; circular forms are limited to identity and status dots. |
| Distinctiveness | 9/10 | The real camera/evidence workflow is the focal point rather than a generic KPI grid. |

The installed deterministic scanner expects the newer multi-artifact registry and returns `SS000` for this resolver's supported legacy single-artifact manifest. The score above therefore follows the `ss-score` rubric directly against the compiled effective rules and source.

## Pixel gate

Playwright rendered the real `/dashboard` route at 1440 × 900 and 390 × 844, plus a fresh 95% spaghetti-alert state. The screenshots were read back after rendering. The wide layout preserves one visual focal point and the narrow layout reflows by task priority without horizontal overflow. Browser console readback after the final render contained no new errors or warnings.

Local evidence paths (generated, not committed):

- `output/playwright/dashboard-desktop-final.png`
- `output/playwright/dashboard-mobile-final.png`
- `output/playwright/dashboard-failed-state.png`

## Hardware artifacts

### Raspberry Pi OS image

The pinned official `pi-gen` ARM64 path completed on the x86_64 `dev` host through registered QEMU emulation. The resulting Raspberry Pi OS Trixie image passed `xz -t`:

- Image: `image_2026-08-28-printwatch-pi4.img.xz`
- Size: 745,971,420 bytes
- SHA-256: `16c7c6b3216ca21673a1d990a62612b0e6ad32c4ff52e5445eca83c9845e876c`

Inside the built rootfs, the ARM64 Python runtime successfully imported `aiohttp`, `luma.oled`, `serial`, and `picamera2`. Both `printwatch-firstboot.service` and `printwatch-agent.service` were enabled, the agent source was present, and `dtparam=i2c_arm=on` was set. This validates construction and runtime linkage; camera capture, OLED output, Ethernet boot, and printer serial telemetry still require a physical Pi 4 smoke test.

### Printable housing

FreeCAD generated five valid solids and exported each to STL and STEP:

The source was regenerated read-only with FreeCAD 1.1.3 in a clean container. All five volumes and facet counts matched the committed artifacts exactly.

| Part | Solid volume | STL facets |
| --- | ---: | ---: |
| Pi 4 + OLED base | 44,055.7 mm³ | 3,256 |
| Pi 4 + OLED lid | 20,230.0 mm³ | 2,296 |
| Camera Module 2 pod | 4,795.0 mm³ | 1,920 |
| Camera tilt arm | 5,475.8 mm³ | 884 |
| Ender V3 SE mount | 12,987.2 mm³ | 1,492 |

These checks establish valid CAD solids and printable meshes, not physical fit. The actual OLED breakout, camera board, printer clearance and PETG shrinkage must be measured with one prototype before printing three sets.
