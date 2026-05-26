#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
python3 -m venv .venv
. .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

if command -v sudo >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y tesseract-ocr libatlas-base-dev libcamera-apps
fi
