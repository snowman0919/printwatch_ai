#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
. .venv/bin/activate
exec python src/main.py --config "${1:-config/printer_1.json}"
