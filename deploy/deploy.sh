#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "$0")/.." && pwd)
host=${PRINTWATCH_DEPLOY_HOST:-dev}
remote_dir=${PRINTWATCH_DEPLOY_DIR:-/home/kotori9/printwatch_ai}

ssh "$host" "mkdir -p '$remote_dir'"
rsync -az --delete \
  --exclude .git --exclude .env --exclude .image-work --exclude node_modules --exclude .next --exclude .data \
  "$repo_root/" "$host:$remote_dir/"
ssh "$host" "cd '$remote_dir' && test -f .env && docker compose up -d --build"
ssh "$host" "cd '$remote_dir' && docker compose ps"
