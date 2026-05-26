#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="${1:-printwatch-agent}"
CONFIG_PATH="${2:-/opt/printwatch_ai/pi_agent/config/printer_1.json}"
INSTALL_DIR="/opt/printwatch_ai/pi_agent"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

sudo mkdir -p "$INSTALL_DIR"
sudo cp -R "${PROJECT_DIR}/src" "${PROJECT_DIR}/config" "${PROJECT_DIR}/requirements.txt" "${PROJECT_DIR}/scripts" "$INSTALL_DIR/"
sudo cp "${PROJECT_DIR}/config/printwatch-agent.service" "/etc/systemd/system/${SERVICE_NAME}.service"
sudo sed -i "s#CONFIG_PATH_PLACEHOLDER#${CONFIG_PATH}#g" "/etc/systemd/system/${SERVICE_NAME}.service"
sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE_NAME"
sudo systemctl restart "$SERVICE_NAME"
