# Architecture

## 실행 경로

```text
Ender-3 V3 SE --USB serial--> Raspberry Pi 4 --HTTPS snapshot/telemetry--> Next.js --OpenAI-compatible HTTP--> Ollama/Qwythos
                               |                                    |
Picamera2 ---------------------+--HTTPS JPEG frame every second----+--Clerk session--> browser
SSD1306 OLED <---local status--+
```

`agent/printwatch/main.py`가 Pi 프로세스의 진입점입니다. `SerialTelemetry`는 `M27`, `M105`, `M31` 응답만 읽고 에이전트 수명 동안 직렬 포트 하나를 유지합니다. 분리나 I/O 오류가 있을 때만 닫고 다음 주기에 재연결하므로 [포트를 열 때 발생할 수 있는 RTS/DTR 전환](https://pyserial.readthedocs.io/en/latest/pyserial_api.html#serial.Serial.open)을 매 폴링마다 반복하지 않습니다. `Camera`는 Picamera2의 고해상도 AI 스냅샷과 640 × 480 준실시간 JPEG를 공유합니다. `ServerApi`는 장치별 bearer token으로 두 종류의 파일을 업로드합니다.

Next.js의 장치 경계는 `web/src/app/api/device`, 사용자 경계는 `web/src/app/api/app`입니다. 두 경로는 각각 장치 token과 Clerk 세션을 검증합니다. `auth.ts`는 유료 도메인 제한 기능에 의존하지 않고 모든 서버 사용자 경계에서 primary email이 정확히 `@dimigo.hs.kr`인지, 같은 주소의 검증 완료된 Google 외부 계정이 연결됐는지 다시 검사합니다. Clerk invite-only 설정은 신규 계정 생성 범위를 줄이는 1차 정책이고, 서버 검사는 이메일 코드 등 다른 Clerk 인증 경로의 우회를 막는 최종 정책입니다.

스냅샷 업로드는 JPEG·크기·텔레메트리 스키마를 검증하고 `sharp`로 정규화한 뒤 SQLite와 `/data`에 기록합니다. 각 프린터의 최근 480장만 유지합니다. 15초 주기 기준 약 2시간이며, 더 긴 이력이 필요해지면 이 숫자를 운영 요구에 맞게 바꾸면 됩니다.

`analysis.ts`는 저장된 원본과 별개로 현재/이전 프레임의 720px JPEG 복사본을 만들어 텔레메트리와 함께 Qwythos에 전달합니다. 이 경계는 대시보드 화질을 낮추지 않으면서 90초 요청 제한 안에 비전 추론을 유지합니다. 단일 의심은 `suspected`, 같은 유형의 연속 의심 또는 0.85 이상의 실패 확률은 `failed`입니다. 텔레메트리 완료는 비전이 정상일 때 완료 근거가 됩니다. AI는 관찰 근거이며 자동 중지 권한이 없습니다.

## 핵심 불변식

- `printer-1`부터 `printer-3`까지의 token은 서로 달라야 합니다.
- Clerk 로그인 여부만으로는 충분하지 않으며 서버에서 학교 도메인과 검증된 Google 계정 연결을 함께 검사해야 합니다.
- 준실시간 프레임은 프린터별 단일 파일에 원자적으로 덮어씁니다. 브라우저는 다음 프레임을 미리 받은 뒤 1초마다 교체하므로 부분 파일이나 빈 화면을 표시하지 않습니다.
- Pi 이미지에는 공통 장치 token을 넣지 않습니다. `flash.sh`가 카드마다 고유 설정을 부팅 파티션에 기록하고 첫 부팅 때 형식과 허용값을 검사한 뒤 root 전용 파일로 이동합니다. 첫 부팅 프로세스는 이 파일을 셸 코드로 실행하지 않습니다.
- 프린터 직렬 경로는 읽기 전용 질의로 제한됩니다.

## 배포 경계

`compose.yaml`은 `web` 컨테이너만 실행하고 JSON 로그를 10 MB 파일 세 개로 회전합니다. `deploy/deploy.sh`는 작업 디렉터리가 아니라 현재 Git 커밋의 archive만 전송하므로 로컬 미추적 파일을 배포하거나 원격 `.env`를 덮어쓰지 않습니다. 공개 정보인 Clerk publishable key는 브라우저 번들 생성 시 Docker build argument로 전달하고, Clerk secret과 장치 token은 런타임 `.env`에만 둡니다. `deploy/check_env.py`는 값을 실행하거나 출력하지 않고 production 키, 세 장치의 고유 token과 파일 권한을 배포 전에 확인합니다. `dev` 호스트의 systemd `cloudflared`가 loopback의 `http://127.0.0.1:3300`을 외부에 공개하므로 Tunnel token은 애플리케이션 환경에 복제하지 않습니다. SQLite, 분석 스냅샷과 최신 준실시간 프레임은 Docker named volume에 남습니다. Ollama는 `dev`에서 Tailscale 주소 `100.90.167.128:11434`로 접근합니다.
