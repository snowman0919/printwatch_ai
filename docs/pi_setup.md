# Raspberry Pi Setup

Hardware target:

- Raspberry Pi 3
- Raspberry Pi Camera Module V1
- One Pi per Ender-3 V3 SE

Install:

```bash
cd pi_agent
scripts/install_pi.sh
```

Configure:

1. Copy `config/printer_1.json` for each printer.
2. Set `printer_id` to `Printer-1` through `Printer-5`.
3. Set `device_id` to match `PI_DEVICE_SECRETS_JSON`.
4. Keep `capture_interval_sec` at `300`.
5. Calibrate `lcd_crop` for the printer screen in the camera view.
6. Keep `camera_width` and `camera_height` at `1920` and `1080` for original images.
7. Use `ai_image_width` `512` or `768`.

Run once:

```bash
export PRINTWATCH_DEVICE_SECRET="secret"
python src/main.py --config config/printer_1.json --once
```

Run continuously:

```bash
scripts/run_agent.sh config/printer_1.json
```

Install systemd service:

```bash
sudo mkdir -p /opt/printwatch_ai
sudo cp -R pi_agent /opt/printwatch_ai/
cd /opt/printwatch_ai/pi_agent
scripts/install_pi.sh
scripts/install_service.sh printwatch-agent /opt/printwatch_ai/pi_agent/config/printer_1.json
```

Use a systemd drop-in or environment file for `PRINTWATCH_DEVICE_SECRET`; do not commit real secrets.
