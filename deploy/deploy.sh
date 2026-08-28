#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "$0")/.." && pwd)
host=${PRINTWATCH_DEPLOY_HOST:-dev}
remote_dir=${PRINTWATCH_DEPLOY_DIR:-/home/kotori9/printwatch_ai}

git -C "$repo_root" diff --quiet && git -C "$repo_root" diff --cached --quiet || {
  echo "Commit tracked changes before deployment" >&2
  exit 2
}

if [[ "$host" == "local" ]]; then
  mkdir -p "$remote_dir"
  git -C "$repo_root" archive HEAD | tar -x -C "$remote_dir"
  cd "$remote_dir"
  python3 deploy/check_env.py .env
  docker compose up -d --build --wait
  docker compose ps
  curl -fsS http://127.0.0.1:3300/api/health
else
  git -C "$repo_root" archive HEAD | ssh "$host" "mkdir -p '$remote_dir' && tar -x -C '$remote_dir'"
  ssh "$host" "cd '$remote_dir' && python3 deploy/check_env.py .env && docker compose up -d --build --wait && docker compose ps && curl -fsS http://127.0.0.1:3300/api/health"
fi
curl -fsS https://3dp.kotori9.run/api/health
