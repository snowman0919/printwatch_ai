# Architecture

## 실행 경로

```text
Ender-3 V3 SE --USB serial--> Raspberry Pi 4 --HTTPS snapshot/telemetry--> Next.js --OpenAI-compatible HTTP--> Ollama/Qwythos
                               |                                    |
Picamera2 ---------------------+--WebRTC video via Cloudflare TURN--+--Clerk session--> browser
SSD1306 OLED <---local status--+
```

`agent/printwatch/main.py`가 Pi 프로세스의 진입점입니다. `SerialTelemetry`는 `M27`, `M105`, `M31` 응답만 읽고, `Camera`는 Picamera2의 고해상도 스냅샷과 저해상도 영상 프레임을 공유합니다. `ServerApi`는 장치별 bearer token으로 업로드하고 브라우저가 만든 WebRTC offer에 답합니다.

Next.js의 장치 경계는 `web/src/app/api/device`, 사용자 경계는 `web/src/app/api/app`입니다. 두 경로는 각각 장치 token과 Clerk 세션을 검증합니다. `auth.ts`는 유료 도메인 제한 기능에 의존하지 않고 모든 서버 사용자 경계에서 primary email이 `@dimigo.hs.kr`인지 다시 검사합니다. Clerk invite-only 설정은 신규 계정 생성 범위를 줄이는 1차 정책이고, 서버 검사는 우회 방지용 최종 정책입니다.

스냅샷 업로드는 JPEG·크기·텔레메트리 스키마를 검증하고 `sharp`로 정규화한 뒤 SQLite와 `/data`에 기록합니다. 각 프린터의 최근 480장만 유지합니다. 15초 주기 기준 약 2시간이며, 더 긴 이력이 필요해지면 이 숫자를 운영 요구에 맞게 바꾸면 됩니다.

`analysis.ts`는 저장된 원본과 별개로 현재/이전 프레임의 720px JPEG 복사본을 만들어 텔레메트리와 함께 Qwythos에 전달합니다. 이 경계는 대시보드 화질을 낮추지 않으면서 90초 요청 제한 안에 비전 추론을 유지합니다. 단일 의심은 `suspected`, 같은 유형의 연속 의심 또는 0.85 이상의 실패 확률은 `failed`입니다. 텔레메트리 완료는 비전이 정상일 때 완료 근거가 됩니다. AI는 관찰 근거이며 자동 중지 권한이 없습니다.

## 핵심 불변식

- `printer-1`부터 `printer-3`까지의 token은 서로 달라야 합니다.
- Clerk 로그인 여부만으로는 충분하지 않으며 서버에서 학교 도메인을 검사해야 합니다.
- 라이브 영상은 Next.js를 통과하지 않습니다. 서버는 offer/answer와 짧은 TURN 자격 증명만 중계합니다.
- Pi 이미지에는 공통 장치 token을 넣지 않습니다. `flash.sh`가 카드마다 고유 설정을 부팅 파티션에 기록하고 첫 부팅 때 root 전용 파일로 이동합니다.
- 프린터 직렬 경로는 읽기 전용 질의로 제한됩니다.

## 배포 경계

`compose.yaml`은 `web` 컨테이너만 실행합니다. 공개 정보인 Clerk publishable key는 브라우저 번들 생성 시 Docker build argument로 전달하고, Clerk secret과 장치 token은 런타임 `.env`에만 둡니다. `deploy/check_env.py`는 값을 실행하거나 출력하지 않고 production 키, 세 장치의 고유 token, TURN 설정과 파일 권한을 배포 전에 확인합니다. `dev` 호스트의 systemd `cloudflared`가 loopback의 `http://127.0.0.1:3300`을 외부에 공개하므로 Tunnel token은 애플리케이션 환경에 복제하지 않습니다. SQLite와 스냅샷은 Docker named volume에 남습니다. Ollama는 `dev`에서 Tailscale 주소 `100.90.167.128:11434`로 접근합니다.
