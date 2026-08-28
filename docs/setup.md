# Production setup

## 1. Clerk

1. Clerk 개인용 production 인스턴스를 만들고 Google social connection을 활성화합니다.
2. 가입을 invite-only로 설정하고 허용할 `@dimigo.hs.kr` 사용자를 초대합니다. 공개 sign-up은 끕니다.
3. production 도메인에 `3dp.kotori9.run`을 등록합니다.
4. publishable key와 secret key를 서버의 `.env`에 넣습니다. 저장소나 채팅에는 넣지 않습니다.

애플리케이션은 초대 정책과 별도로 모든 보호된 서버 경계에서 `@dimigo.hs.kr` primary email을 검사합니다.

## 2. Cloudflare

1. Zero Trust에서 named tunnel을 만들고 public hostname `3dp.kotori9.run`의 service를 `http://web:3000`으로 지정합니다.
2. tunnel token을 `.env`의 `CLOUDFLARE_TUNNEL_TOKEN`에 넣습니다.
3. WebRTC TURN key를 만들고 key ID와 API token을 `.env`에 넣습니다. 없으면 STUN만 사용하므로 서로 다른 NAT 환경에서 라이브 연결이 실패할 수 있습니다.

## 3. 서버 환경 파일

`dev:/home/kotori9/printwatch_ai/.env`를 `.env.example`에서 시작해 작성합니다. 세 장치 token은 각각 24자 이상의 암호학적 난수여야 하며 Pi 카드에 주입하는 값과 정확히 같아야 합니다.

```bash
ssh dev 'install -d -m 700 /home/kotori9/printwatch_ai && install -m 600 /dev/null /home/kotori9/printwatch_ai/.env'
./deploy/deploy.sh
curl -fsS https://3dp.kotori9.run/api/health
```

`deploy.sh`는 값을 출력하지 않고 `.env`의 mode 600, Clerk production 키, Tunnel/TURN 설정, 정확히 세 개의 고유 장치 token을 먼저 검사합니다.

## 4. Clerk 검수

- 초대받지 않은 Google 계정은 가입할 수 없어야 합니다.
- 초대된 `@dimigo.hs.kr` 계정은 대시보드에 들어가야 합니다.
- 다른 도메인의 기존 Clerk 사용자는 `/unauthorized`로 이동해야 합니다.
- 로그아웃 후 `/dashboard`와 `/api/app/dashboard`는 인증을 요구해야 합니다.
