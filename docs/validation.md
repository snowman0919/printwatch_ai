# Validation evidence

## Product behavior

- A real multipart request traversed `POST /api/device/snapshot`, JPEG normalization, SQLite persistence, Qwythos analysis at `100.90.167.128:11434/v1`, schema adaptation, and dashboard readback.
- The synthetic spaghetti fixture was classified `failed / spaghetti / 0.95`, and the dashboard derived `실패 감지` while the device heartbeat was fresh.
- A fresh production-image regression check found that a 1440 × 900 PNG could exceed the 90-second inference boundary. The real route now keeps the stored snapshot intact but sends a 720px JPEG copy to Qwythos; an isolated production container completed the multipart route in 17 seconds with `analysisError=false` and returned `failed / spaghetti / 0.95`.
- A real device-token request uploaded three distinct frames through `POST /api/device/frame`; an invalid token returned 401, valid uploads returned 200, and only one normalized JPEG remained for the printer. An authenticated Aside browser read `NEAR LIVE · 1 FPS` and changed the displayed media URL on the next one-second poll after a new upload.
- The final server authorization predicate accepts only an exact `@dimigo.hs.kr` primary address with a verified Google external account carrying the same address. It rejects a subdomain, attacker-controlled suffix, another OAuth provider, an unverified Google account, and a mismatched Google address.
- Clerk production uses custom Google OAuth credentials with only the Clerk callback URI and is saved as invite-only. Cloudflare Domain Connect created five DNS-only CNAME records; Clerk reports application 2/2 verified, email 3/3 verified, and both SSL certificates issued. The public sign-in page rendered the Google button through the Clerk custom domain.
- Google Auth Platform is external and in production with only OpenID, email, and profile scopes. Its public app, privacy, and terms URLs each returned HTTP 200 before publication. The original failed callback was read from Clerk production as `sign_up_mode_restricted`; the exact school address now exists as an invited Clerk user. Retrying the production Google button selected that school account and reached Google's passkey challenge, so the Clerk restriction screen is no longer the current boundary. Completing the user-controlled passkey and observing the authenticated dashboard remain the final live-login check. GCP's external audience is narrowed by Clerk invite-only and the server-side verified school-Google check.
- A production Docker image built on `dev`; an isolated container returned `{"ok":true}` from `/api/health` with `/data` mounted as the unprivileged runtime user.
- The Clerk publishable key crossed the Docker build boundary into the browser bundle while the secret remained runtime-only. Compose rejected a missing public key, and the environment preflight rejected placeholders and invalid three-device token sets without printing values. The deployed topology uses the existing host systemd tunnel connector, avoiding a second token-bearing container.
- The real production token set passed the URL-safe, unique three-device preflight without printing values. A simulated macOS flash verified the image checksum, traversed confirmation, writer invocation, boot mount, mode-0600 `printwatch.env` creation and unmount; a corrupted image and a quote/newline token were rejected before the writer boundary.
- A serial regression check performed two telemetry polls through one fake port open, then proved explicit shutdown closed it. This protects the hardware boundary from reopening the USB serial device every 15 seconds and repeatedly toggling RTS/DTR.

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
- Checksum: `image_2026-08-28-printwatch-pi4.img.xz.sha256`
- Size: 744,203,912 bytes
- SHA-256: `ae2c709a38b9714c1d1bdf8d728926dcb599d3ea0c0a0a750acfd89211517748`

Inside the rebuilt rootfs, the ARM64 Python runtime successfully imported `aiohttp`, `luma.oled`, `serial`, `picamera2`, `printwatch.config`, and `printwatch.telemetry`. Both `printwatch-firstboot.service` and `printwatch-agent.service` were enabled, the current URL-safe token validation and persistent serial connection were present, application WebRTC imports were absent, and `dtparam=i2c_arm=on` was set. Executing the actual first-boot program against a seven-line configuration containing a shell command rejected the file before installing it and did not execute the command. This validates construction, runtime linkage, and the boot-configuration trust boundary; camera capture, OLED output, Ethernet boot, and printer serial telemetry still require the [physical commissioning procedure](commissioning.md) on a Pi 4.

### Printable housing

FreeCAD generated six valid solids and exported each to STL and STEP:

The source was regenerated with FreeCAD 1.1.3 in a clean container; the resulting six volumes and facet counts are recorded below.

| Part | Solid volume | STL facets |
| --- | ---: | ---: |
| Pi 4 + OLED base | 44,400.6 mm³ | 5,188 |
| Pi 4 + OLED lid | 20,924.6 mm³ | 2,084 |
| OLED retainer | 106.0 mm³ | 728 |
| Camera Module 2 pod | 4,795.0 mm³ | 1,920 |
| Camera tilt arm | 5,475.8 mm³ | 884 |
| Ender V3 SE fixed-upright mount | 28,560.8 mm³ | 1,820 |

The supplied OLED drawing sets the board envelope to 26 × 26 mm and active area to 21.74 × 10.86 mm. The lid uses 0.20 mm clearance on every pocket side, a three-sided capture rail, an open four-pin-header side, and one printed retainer; it no longer assumes an undocumented module hole pattern. The lid rim also uses 0.20 mm per-side clearance and the nominal M3 enclosure holes are 3.20 mm. The enclosure base and Ender plate derive the same 55 × 22 mm four-point pattern from shared coordinates.

The replacement 104 × 56 × 7 mm Ender plate uses two pairs of 13 × 3.2 mm strap slots and four 2 mm standoffs. It mounts the enclosure on the outside face of one fixed Z upright, removing the previous moving-gantry/T-slot assumption. A binary-STL readback found zero non-manifold edges in all six meshes, and the lid, plate, and retainer were visually read back from their actual triangle geometry. These checks establish coherent CAD solids and the intended fixed-frame interface, not physical fit against an unavailable printer. One PETG prototype still has to prove OLED PCB thickness/header orientation, upright strap length, shrinkage, cable bend radius, and full X/Z travel before printing three sets.
