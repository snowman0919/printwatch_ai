#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "$0")/.." && pwd)
build_root=${PRINTWATCH_IMAGE_WORK_DIR:-"$repo_root/.image-work"}
pi_gen="$build_root/pi-gen"
pi_gen_ref=${PI_GEN_REF:-ca8aeed0ae300c2a89f55ce9617d5f96a27e99e5}
ssh_key=${PRINTWATCH_SSH_PUBLIC_KEY:-$(test -f "$HOME/.ssh/id_ed25519.pub" && < "$HOME/.ssh/id_ed25519.pub" || true)}

if [[ -z "$ssh_key" ]]; then
  echo "Set PRINTWATCH_SSH_PUBLIC_KEY or create ~/.ssh/id_ed25519.pub" >&2
  exit 2
fi
command -v docker >/dev/null || { echo "Docker is required" >&2; exit 2; }
mkdir -p "$build_root"
if [[ ! -d "$pi_gen/.git" ]]; then
  git clone https://github.com/RPi-Distro/pi-gen.git "$pi_gen"
fi
git -C "$pi_gen" fetch origin arm64
git -C "$pi_gen" checkout --detach "$pi_gen_ref"

rm -rf "$pi_gen/stage-printwatch"
cp -a "$repo_root/image/stage" "$pi_gen/stage-printwatch"
cp -a "$repo_root/agent" "$pi_gen/stage-printwatch/00-agent/files/agent"
touch "$pi_gen/stage-printwatch/EXPORT_IMAGE" "$pi_gen/stage2/SKIP_IMAGES"
chmod +x "$pi_gen/stage-printwatch/00-agent/00-run.sh" "$pi_gen/stage-printwatch/00-agent/files/printwatch-firstboot"

random_password=$(openssl rand -base64 32)
cat > "$pi_gen/config" <<EOF
IMG_NAME="printwatch-pi4"
PI_GEN_RELEASE="PrintWatch Pi 4"
RELEASE="trixie"
ARCH="arm64"
DEPLOY_COMPRESSION="xz"
LOCALE_DEFAULT="en_US.UTF-8"
TIMEZONE_DEFAULT="Asia/Seoul"
KEYBOARD_KEYMAP="us"
TARGET_HOSTNAME="printwatch"
FIRST_USER_NAME="operator"
FIRST_USER_PASS="$random_password"
DISABLE_FIRST_BOOT_USER_RENAME=1
ENABLE_SSH=1
PUBKEY_ONLY_SSH=1
PUBKEY_SSH_FIRST_USER="$ssh_key"
STAGE_LIST="stage0 stage1 stage2 stage-printwatch"
EOF

if [[ $(uname -m) != arm* && $(uname -m) != aarch64 ]] && ! command -v qemu-aarch64 >/dev/null; then
  docker build -t pi-gen "$pi_gen"
  mkdir -p "$build_root/bin"
  helper_container=$(docker create pi-gen:latest)
  trap 'docker rm -f "$helper_container" >/dev/null 2>&1 || true' EXIT
  docker cp "$helper_container:/usr/bin/qemu-aarch64" "$build_root/bin/qemu-aarch64"
  docker rm "$helper_container" >/dev/null
  trap - EXIT
  chmod 755 "$build_root/bin/qemu-aarch64"
  export PATH="$build_root/bin:$PATH"
  docker run --privileged --rm tonistiigi/binfmt@sha256:400a4873b838d1b89194d982c45e5fb3cda4593fbfd7e08a02e76b03b21166f0 --install arm64 >/dev/null
fi

(cd "$pi_gen" && PRESERVE_CONTAINER=1 ./build-docker.sh)
printf 'Image: %s\n' "$pi_gen/deploy/printwatch-pi4*.img.xz"
