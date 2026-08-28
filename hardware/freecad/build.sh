#!/usr/bin/env bash
set -euo pipefail
script_dir=$(cd "$(dirname "$0")" && pwd)
output=${1:-"$script_dir/out"}
mkdir -p "$output"
output=$(cd "$output" && pwd)

if command -v FreeCADCmd >/dev/null; then
  PRINTWATCH_CAD_OUT="$output" FreeCADCmd "$script_dir/printwatch_housing.py"
elif command -v docker >/dev/null; then
  image=${PRINTWATCH_FREECAD_IMAGE:-lscr.io/linuxserver/freecad@sha256:ab73d57e46265959d3f9409b10cf0e03641ed50f0af9ce20c399c1ca1eb6b11d}
  docker run --rm --user "$(id -u):$(id -g)" -e HOME=/tmp -e QT_QPA_PLATFORM=offscreen -e PRINTWATCH_CAD_OUT=/out -v "$script_dir:/work:ro" -v "$output:/out" --entrypoint /opt/freecad/usr/bin/freecadcmd "$image" /work/printwatch_housing.py
else
  echo "FreeCADCmd or Docker is required" >&2
  exit 2
fi
