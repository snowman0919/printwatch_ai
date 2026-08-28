# Validation evidence

## Product behavior

- A real multipart request traversed `POST /api/device/snapshot`, JPEG normalization, SQLite persistence, Qwythos analysis at `100.90.167.128:11434/v1`, schema adaptation, and dashboard readback.
- The synthetic spaghetti fixture was classified `failed / spaghetti / 0.95`, and the dashboard derived `실패 감지` while the device heartbeat was fresh.
- A browser offer traversed the user route, appeared in the authenticated device queue, accepted a device answer, and returned that answer only to the creating viewer.
- The exact school-domain predicate accepts `student@dimigo.hs.kr` and rejects both a subdomain and an attacker-controlled suffix.
- A production Docker image built on `dev`; an isolated container returned `{"ok":true}` from `/api/health` with `/data` mounted as the unprivileged runtime user.

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

FreeCAD generated five valid solids and exported each to STL and STEP:

| Part | Solid volume | STL facets |
| --- | ---: | ---: |
| Pi 4 + OLED base | 44,055.7 mm³ | 3,256 |
| Pi 4 + OLED lid | 20,230.0 mm³ | 2,296 |
| Camera Module 2 pod | 4,795.0 mm³ | 1,920 |
| Camera tilt arm | 5,475.8 mm³ | 884 |
| Ender V3 SE mount | 12,987.2 mm³ | 1,492 |

These checks establish valid CAD solids and printable meshes, not physical fit. The actual OLED breakout, camera board, printer clearance and PETG shrinkage must be measured with one prototype before printing three sets.
