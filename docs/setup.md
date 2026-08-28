# Production setup

## 1. Clerk

1. Clerk 개인용 production 인스턴스를 만들고 Google social connection을 활성화합니다.
2. 가입을 invite-only로 설정하고 허용할 `@dimigo.hs.kr` 사용자를 초대합니다. 공개 sign-up은 끕니다.
3. production 도메인에 `3dp.kotori9.run`을 등록합니다.
4. publishable key와 secret key를 서버의 `.env`에 넣습니다. 저장소나 채팅에는 넣지 않습니다.

애플리케이션은 초대 정책과 별도로 모든 보호된 서버 경계에서 `@dimigo.hs.kr` primary email과 같은 주소의 검증된 Google 외부 계정 연결을 검사합니다.

## 2. Cloudflare

1. `dev` 호스트의 systemd `cloudflared` connector를 사용합니다.
2. Zero Trust에서 named tunnel의 public hostname `3dp.kotori9.run` service를 `http://127.0.0.1:3300`으로 지정합니다.

별도 Realtime/TURN 구독은 사용하지 않습니다. 각 Pi가 기본 1초마다 최신 JPEG를 기존 HTTPS 터널로 보내고 서버는 프린터별 파일 한 장만 유지합니다.

## 3. 서버 환경 파일

`dev:/home/kotori9/printwatch_ai/.env`를 `.env.example`에서 시작해 작성합니다. 세 장치 token은 각각 24자 이상의 암호학적 난수여야 하며 Pi 카드에 주입하는 값과 정확히 같아야 합니다.

```bash
ssh dev 'install -d -m 700 /home/kotori9/printwatch_ai && install -m 600 /dev/null /home/kotori9/printwatch_ai/.env'
./deploy/deploy.sh
curl -fsS https://3dp.kotori9.run/api/health
```

`deploy.sh`는 값을 출력하지 않고 `.env`의 mode 600, Clerk production 키, 정확히 세 개의 고유 장치 token을 먼저 검사합니다. Tunnel token은 애플리케이션 `.env`에 저장하지 않습니다.

## 4. Clerk 검수

- 초대받지 않은 Google 계정은 가입할 수 없어야 합니다.
- 초대된 `@dimigo.hs.kr` 계정은 대시보드에 들어가야 합니다.
- 다른 도메인의 기존 Clerk 사용자는 `/unauthorized`로 이동해야 합니다.
- 로그아웃 후 `/dashboard`와 `/api/app/dashboard`는 인증을 요구해야 합니다.

## 5. 브랜치와 자동 배포

- `dev`: 개발 작업과 검증을 쌓는 브랜치입니다.
- `main`: production 기준 브랜치입니다. `main`에 push되면 `Deploy production` GitHub Actions가 `dev` 호스트의 `printwatch-deploy` self-hosted runner에서 실행됩니다.
- Actions는 저장소 secret으로 SSH 키를 복제하지 않습니다. `deploy/printwatch-actions-runner.service`가 runner를 `kotori9` 사용자로 유지하며, runner가 `/home/kotori9/printwatch_ai/.env`를 그대로 둔 채 현재 커밋 archive만 배포하고 Docker health와 `https://3dp.kotori9.run/api/health`를 모두 확인합니다.

## 6. 물리 장비 검수

세 대를 한꺼번에 조립하지 말고 [물리 커미셔닝 절차](commissioning.md)로 `printer-1` 한 세트를 먼저 통과시킵니다.
