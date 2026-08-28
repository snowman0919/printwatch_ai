# PrintWatch AI

세 대의 Ender-3 V3 SE를 읽기 전용으로 감시하는 시스템입니다. Raspberry Pi 4가 사진·WebRTC 영상·USB 직렬 텔레메트리를 전송하고, Next.js 서버가 Clerk 접근 제어와 Qwythos 비전 판정, 대시보드를 담당합니다.

## 빠른 경로

1. [운영 설정](docs/setup.md)에 따라 Clerk와 Cloudflare 비밀값을 `dev:/home/kotori9/printwatch_ai/.env`에 넣습니다.
2. `./deploy/deploy.sh`로 `dev` 장비에 Docker 배포합니다.
3. `./image/build-image.sh`로 공통 Raspberry Pi OS 이미지를 한 번 만듭니다.
4. 각 SD 카드에 `PRINTWATCH_DEVICE_TOKEN=... ./image/flash.sh printer-1 image.img.xz /dev/diskN`을 실행합니다.
5. [FreeCAD 출력 안내](hardware/freecad/README.md)에 따라 하우징을 출력합니다.

보안상 웹 서버는 프린터를 제어하지 않습니다. Pi는 상태 질의 명령만 보내며, 전원·히터·모터·출력 중지 명령은 구현하지 않았습니다.

## 검증

```bash
cd web && npm test && npm run typecheck && npm run lint && npm run build
PYTHONPATH=agent python3 -m unittest discover -s agent/tests -v
bash -n image/build-image.sh image/flash.sh deploy/deploy.sh
```

전체 실행 경로와 실패 경계는 [아키텍처](docs/architecture.md)를 참고하세요.
