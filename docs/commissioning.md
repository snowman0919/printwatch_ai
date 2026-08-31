# Physical commissioning

세 세트를 만들기 전에 `printer-1` 한 대로 전체 경계를 검증합니다. 아래 항목이 모두 통과한 뒤 같은 절차로 나머지 카드를 굽습니다.

## 1. 조립과 첫 부팅

전원을 끈 상태에서 Pi Camera Module 2의 CSI 리본 케이블을 연결합니다. OLED는 Pi 4의 3.3 V, GND, GPIO2/SDA(pin 3), GPIO3/SCL(pin 5)에 연결하고 Ender-3 V3 SE는 USB로 연결합니다. 마지막으로 유선 Ethernet과 Pi 전원을 연결합니다.

```bash
PRINTWATCH_DEVICE_TOKEN='<printer-1의 서버 token>' \
  ./image/flash.sh printer-1 image_2026-08-28-printwatch-pi4.img.xz /dev/diskN
```

유선 Ethernet 대신 WPA2-Personal Wi-Fi를 사용하려면 `PRINTWATCH_WIFI_SSID`를 함께 넣습니다. 비밀번호는 히든 프롬프트로 입력되며 부팅 파티션의 mode 600 프로파일이 첫 부팅에 NetworkManager로 이동됩니다.

```bash
PRINTWATCH_DEVICE_TOKEN='<printer-1의 서버 token>' PRINTWATCH_WIFI_SSID='<SSID>' \
  ./image/flash.sh printer-1 image_2026-08-28-printwatch-pi4.img.xz /dev/diskN
```

스크립트가 표시한 장치 경로와 실제 SD 카드가 같은지 확인한 뒤 정확한 경로를 다시 입력합니다. 첫 부팅은 설정 이동과 패키지 초기화 때문에 평소보다 오래 걸릴 수 있습니다.

## 2. Pi 로컬 경계

DHCP 임대 목록에서 Pi 주소를 찾은 뒤 이미지에 넣은 SSH 공개키로 접속합니다.

```bash
ssh pwadmin@<pi-address>
systemctl is-enabled printwatch-firstboot.service printwatch-agent.service
systemctl is-active printwatch-agent.service
sudo i2cdetect -y 1
find /dev -maxdepth 1 \( -name 'video*' -o -name 'ttyACM*' -o -name 'ttyUSB*' \) -print
sudo journalctl -u printwatch-agent -b --no-pager -n 100
```

합격 조건:

- firstboot 서비스는 첫 실행 후 `disabled`, agent 서비스는 `enabled`와 `active`입니다.
- I2C 주소 표에 `3c`가 보이고 OLED에 장치 ID와 연결 상태가 표시됩니다.
- 카메라 장치와 Ender USB 직렬 장치가 각각 하나 이상 보입니다.
- journal에 반복 재시작, 카메라 점유, 권한 거부 또는 인증 401이 없습니다.

## 3. 서버까지의 실제 경로

초대된 학교 계정으로 [대시보드](https://3dp.kotori9.run/dashboard)를 열고 `Ender 1`을 선택합니다.

- 장치가 online으로 바뀌고 `SERIAL OK`가 표시됩니다.
- `NEAR LIVE · 1 FPS` 상태에서 손으로 카메라 앞의 물체를 움직이면 약 1~2초 안에 장면이 바뀝니다.
- 노즐·베드 온도는 프린터 화면과 합리적인 오차 범위에서 일치합니다.
- 짧은 테스트 출력을 시작하면 진행률과 경과 시간이 증가하고, 종료 후 완료 상태로 전이합니다.
- AI 판정 근거가 대기 상태에서 실제 분석 결과로 갱신되며, 판정과 관계없이 프린터 중지 명령은 전송되지 않습니다.

## 4. 하우징 시제품

먼저 `pi4_oled_base`, `pi4_oled_lid`, `oled_retainer`, `camera_module_2_pod`, `camera_tilt_arm`, `ender_v3se_fixed_upright_mount`를 한 세트만 출력합니다. 보드와 커넥터를 장착한 뒤 다음을 확인합니다.

- Pi/카메라 나사 구멍이 힘을 주지 않고 정렬되고, 26 × 26 mm OLED가 0.20 mm/면 여유의 레일에 들어갑니다.
- 케이스 바닥과 Ender 장착판의 네 M3 구멍이 정렬되고 장착판의 M3 열압입 인서트에 체결됩니다.
- CSI, USB-C, Ethernet, USB와 OLED 배선이 꺾이거나 눌리지 않습니다.
- 하우징 장착판은 한쪽 고정 Z 기둥의 바깥면에만 체결하고, X/Z 전체 이동 범위에서 카메라, 케이블과 하우징이 베드·X 캐리지·필라멘트 경로에 닿지 않습니다.
- 힌지가 출력 진동으로 내려가지 않으며 카메라가 베드 전체를 담습니다.

한 항목이라도 실패하면 [FreeCAD 생성 스크립트](../hardware/freecad/printwatch_housing.py)의 상단 치수 상수를 실제 측정값으로 조정하고 한 세트만 다시 출력합니다.
