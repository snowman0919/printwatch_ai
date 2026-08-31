#!/usr/bin/env bash
set -euo pipefail

# Fetches the printer token from the dev server without printing it, then
# runs flash.sh with all arguments passed through, e.g.:
#   ./image/flash-printer1.sh --wifi printer-1 <image.img.xz> /dev/diskN

printer_id=""
for arg in "$@"; do
  if [[ "$arg" =~ ^printer-[1-3]$ ]]; then
    printer_id="$arg"
  fi
done
[[ -n "$printer_id" ]] || { echo "No printer-1/2/3 argument given" >&2; exit 2; }

token=$(ssh dev python3 - <<'PY'
import json, sys
for line in open("/home/kotori9/printwatch_ai/.env"):
    if line.startswith("DEVICE_TOKENS_JSON="):
        sys.stdout.write(json.loads(line.split("=", 1)[1])["printer-1"])
PY
)
[[ "$token" =~ ^[A-Za-z0-9_-]{24,}$ ]] || { echo "Failed to fetch the token for $printer_id" >&2; exit 1; }

export PRINTWATCH_DEVICE_TOKEN="$token"
exec "$(dirname "$0")/flash.sh" "$@"
