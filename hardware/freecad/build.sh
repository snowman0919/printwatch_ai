#!/usr/bin/env bash
set -euo pipefail
script_dir=$(cd "$(dirname "$0")" && pwd)
output=${1:-"$script_dir/out"}
mkdir -p "$output"
PRINTWATCH_CAD_OUT="$output" FreeCADCmd "$script_dir/printwatch_housing.py"
