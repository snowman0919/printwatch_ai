#!/usr/bin/env bash
set -euo pipefail

usage() { echo "Usage: PRINTWATCH_DEVICE_TOKEN=... $0 <printer-1|printer-2|printer-3> <image.img.xz> <device>" >&2; exit 2; }
[[ $# -eq 3 ]] || usage
printer_id=$1
image=$2
device=$3
token=${PRINTWATCH_DEVICE_TOKEN:-}
[[ "$printer_id" =~ ^printer-[1-3]$ ]] || usage
[[ -f "$image" ]] || { echo "Image not found: $image" >&2; exit 2; }
[[ "$token" =~ ^[A-Za-z0-9_-]{24,}$ ]] || { echo "PRINTWATCH_DEVICE_TOKEN must be at least 24 URL-safe characters" >&2; exit 2; }
[[ "$device" != "/" && "$device" != "/dev" && "$device" == /dev/* ]] || { echo "Refusing unsafe device path" >&2; exit 2; }
checksum_file="$image.sha256"
[[ -f "$checksum_file" ]] || { echo "Checksum not found: $checksum_file" >&2; exit 2; }
command -v openssl >/dev/null || { echo "OpenSSL is required" >&2; exit 2; }
expected_checksum=$(awk 'NR == 1 { print $1 }' "$checksum_file")
actual_checksum=$(openssl dgst -sha256 -r "$image" | awk '{ print $1 }')
[[ "$expected_checksum" =~ ^[0-9a-fA-F]{64}$ && "$actual_checksum" == "$expected_checksum" ]] || { echo "Image checksum mismatch" >&2; exit 1; }

echo "This will overwrite $device with $image for $printer_id."
read -r -p "Type the exact device path to continue: " confirmation
[[ "$confirmation" == "$device" ]] || { echo "Cancelled"; exit 1; }
command -v rpi-imager >/dev/null || { echo "Install Raspberry Pi Imager CLI first" >&2; exit 2; }
rpi-imager --cli "$image" "$device"

if command -v diskutil >/dev/null; then
  boot_device="${device}s1"
  diskutil mount "$boot_device" >/dev/null
  mount_point=$(diskutil info "$boot_device" | awk -F: '/Mount Point/{sub(/^ +/,"",$2); print $2}')
else
  boot_device="${device}1"
  mount_point=$(udisksctl mount -b "$boot_device" | sed -E 's/.* at (.*)\.$/\1/')
fi
[[ -d "$mount_point" ]] || { echo "Could not mount boot partition" >&2; exit 1; }
umask 077
printf 'PRINTWATCH_SERVER_URL="https://3dp.kotori9.run"\nPRINTWATCH_PRINTER_ID="%s"\nPRINTWATCH_DEVICE_TOKEN="%s"\nPRINTWATCH_LIVE_INTERVAL="1"\nPRINTWATCH_OLED_ADDRESS="0x3C"\nPRINTWATCH_SERIAL_DEVICE="auto"\n' "$printer_id" "$token" > "$mount_point/printwatch.env"
sync
if command -v diskutil >/dev/null; then diskutil unmountDisk "$device" >/dev/null; else udisksctl unmount -b "$boot_device" >/dev/null; fi
echo "Ready: insert the card, connect camera/OLED/Ethernet, then power on."
