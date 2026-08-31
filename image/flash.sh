#!/usr/bin/env bash
set -euo pipefail

usage() { echo "Usage: PRINTWATCH_DEVICE_TOKEN=... $0 [--wifi] [--config-only] <printer-1|printer-2|printer-3> [image.img.xz] [device]" >&2; echo "  --config-only writes the boot configuration to an already-flashed card." >&2; echo "  Omit device to pick from connected storage." >&2; exit 2; }
config_only=0
wifi_requested=0
while [[ "${1:-}" == --* ]]; do
  case "$1" in
    --wifi) wifi_requested=1 ;;
    --config-only) config_only=1 ;;
    *) usage ;;
  esac
  shift
done
[[ $# -ge 1 && $# -le 3 ]] || usage
printer_id=$1
if [[ "$config_only" -eq 1 ]]; then
  image=${2:-}
  device=${3:-}
else
  [[ $# -ge 2 ]] || usage
  image=$2
  device=${3:-}
fi
token=${PRINTWATCH_DEVICE_TOKEN:-}
[[ "$printer_id" =~ ^printer-[1-3]$ ]] || usage
[[ "$token" =~ ^[A-Za-z0-9_-]{24,}$ ]] || { echo "PRINTWATCH_DEVICE_TOKEN must be at least 24 URL-safe characters" >&2; exit 2; }
if [[ "$config_only" -eq 0 ]]; then
  [[ -n "$image" && -f "$image" ]] || { echo "Image not found: $image" >&2; exit 2; }
fi

select_device() {
  local -a nodes=() names=() sizes=()
  if command -v diskutil >/dev/null; then
    local d info protocol internal removable name bytes
    while IFS= read -r d; do
      info=$(diskutil info "$d" 2>/dev/null) || continue
      protocol=$(sed -n 's/^[[:space:]]*Protocol: *//p' <<< "$info")
      internal=$(sed -n 's/^[[:space:]]*Device Location: *//p' <<< "$info")
      removable=$(sed -n 's/^[[:space:]]*Removable Media: *//p' <<< "$info")
      [[ "$protocol" == "Disk Image" ]] && continue
      [[ "$internal" == "Internal" && "$removable" != Removable* ]] && continue
      name=$(sed -n 's/^[[:space:]]*Device \/ Media Name: *//p' <<< "$info")
      bytes=$(sed -n 's/^[[:space:]]*Disk Size: [^(]*(\([0-9][0-9]*\) [Bb]ytes.*/\1/p' <<< "$info")
      [[ -n "$bytes" ]] || continue
      nodes+=("$d"); names+=("$name"); sizes+=("$bytes")
    done < <(diskutil list | sed -n 's#^\(/dev/disk[0-9]*\) (.*#\1#p')
  else
    local node rm bytes
    while IFS=' ' read -r node rm bytes; do
      [[ "$rm" == "1" ]] || continue
      nodes+=("/dev/$node"); names+=("$node"); sizes+=("$bytes")
    done < <(lsblk -dnr -b -o NAME,RM,SIZE 2>/dev/null)
  fi
  [[ ${#nodes[@]} -gt 0 ]] || { echo "No writable storage device found. Insert the SD card and try again." >&2; exit 1; }
  echo "Connected storage devices:"
  local i
  for i in "${!nodes[@]}"; do
    local gb marker=""
    gb=$(awk -v b="${sizes[$i]}" 'BEGIN { printf "%.1f", b / 1000000000 }')
    if (( ${sizes[$i]} >= 200000000000 )); then
      marker="  WARNING: >= 200 GB - confirm this is the right device"
    fi
    printf '  [%d] %-12s %-24s %8s GB%s\n' "$((i + 1))" "${nodes[$i]}" "${names[$i]}" "$gb" "$marker"
  done
  local pick
  read -r -p "Select the target device number [1-${#nodes[@]}]: " pick
  [[ "$pick" =~ ^[0-9]+$ && "$pick" -ge 1 && "$pick" -le ${#nodes[@]} ]] || { echo "Invalid selection" >&2; exit 1; }
  device=${nodes[$((pick - 1))]}
}

if [[ -z "$device" ]]; then
  select_device
fi
[[ "$device" != "/" && "$device" != "/dev" && "$device" == /dev/* ]] || { echo "Refusing unsafe device path" >&2; exit 2; }
if [[ "$config_only" -eq 0 ]]; then
  checksum_file="$image.sha256"
  [[ -f "$checksum_file" ]] || { echo "Checksum not found: $checksum_file" >&2; exit 2; }
  command -v openssl >/dev/null || { echo "OpenSSL is required" >&2; exit 2; }
  expected_checksum=$(awk 'NR == 1 { print $1 }' "$checksum_file")
  actual_checksum=$(openssl dgst -sha256 -r "$image" | awk '{ print $1 }')
  [[ "$expected_checksum" =~ ^[0-9a-fA-F]{64}$ && "$actual_checksum" == "$expected_checksum" ]] || { echo "Image checksum mismatch" >&2; exit 1; }
fi

wifi_ssid=${PRINTWATCH_WIFI_SSID:-}
wifi_psk=${PRINTWATCH_WIFI_PSK:-}
if [[ "$wifi_requested" -eq 1 ]]; then
  if [[ -z "$wifi_ssid" ]]; then
    read -r -p "Wi-Fi SSID: " wifi_ssid
  fi
fi
if [[ -n "$wifi_ssid" ]]; then
  [[ ${#wifi_ssid} -le 32 && "$wifi_ssid" != *[[:cntrl:]]* && "$wifi_ssid" != *'"'* && "$wifi_ssid" != *'\'* ]] || { echo "PRINTWATCH_WIFI_SSID must be 1-32 characters without quotes, backslashes or control characters" >&2; exit 2; }
  if [[ -z "$wifi_psk" ]]; then
    read -r -s -p "Wi-Fi password (input hidden): " wifi_psk
    echo
  fi
  [[ ${#wifi_psk} -ge 8 && ${#wifi_psk} -le 63 && "$wifi_psk" != *[[:cntrl:]]* && "$wifi_psk" != *'"'* ]] || { echo "PRINTWATCH_WIFI_PSK must be 8-63 characters without quotes or control characters" >&2; exit 2; }
fi

if [[ "$config_only" -eq 1 ]]; then
  echo "This will write the PrintWatch boot configuration to $device for $printer_id."
else
  echo "This will overwrite $device with $image for $printer_id."
fi
read -r -p "Type the exact device path to continue: " confirmation
[[ "$confirmation" == "$device" ]] || { echo "Cancelled"; exit 1; }
if [[ "$config_only" -eq 0 ]]; then
  command -v rpi-imager >/dev/null || { echo "Install Raspberry Pi Imager CLI first" >&2; exit 2; }
  rpi-imager --cli "$image" "$device"
fi

mount_point_from_info() {
  diskutil info "$1" 2>/dev/null | awk -F: '/Mount Point/{sub(/^ +/,"",$2); print $2}'
}
if command -v diskutil >/dev/null; then
  boot_device="${device}s1"
  mount_point=""
  for attempt in 1 2 3 4 5 6; do
    mount_point=$(mount_point_from_info "$boot_device")
    [[ -d "$mount_point" ]] && break
    diskutil mount "$boot_device" >/dev/null 2>&1 || true
    mount_point=$(mount_point_from_info "$boot_device")
    [[ -d "$mount_point" ]] && break
    diskutil mountDisk "$device" >/dev/null 2>&1 || true
    sleep 3
  done
else
  boot_device="${device}1"
  mount_point=""
  for attempt in 1 2 3 4 5 6; do
    mount_point=$(udisksctl mount -b "$boot_device" 2>/dev/null | sed -E 's/.* at (.*)\.$/\1/') || true
    [[ -d "$mount_point" ]] && break
    mount_point=$(lsblk -nr -o MOUNTPOINT "$boot_device" 2>/dev/null | head -1)
    [[ -d "$mount_point" ]] && break
    sleep 3
  done
fi
[[ -d "$mount_point" ]] || { echo "Could not mount boot partition" >&2; exit 1; }
umask 077
printf 'PRINTWATCH_SERVER_URL="https://3dp.kotori9.run"\nPRINTWATCH_PRINTER_ID="%s"\nPRINTWATCH_DEVICE_TOKEN="%s"\nPRINTWATCH_LIVE_INTERVAL="1"\nPRINTWATCH_OLED_ADDRESS="0x3C"\nPRINTWATCH_SERIAL_DEVICE="auto"\n' "$printer_id" "$token" > "$mount_point/printwatch.env"
if [[ -n "$wifi_ssid" ]]; then
  printf '[connection]\nid=printwatch\ntype=wifi\n\n[wifi]\nmode=infrastructure\nssid=%s\n\n[wifi-security]\nkey-mgmt=wpa-psk\npsk=%s\n\n[ipv4]\nmethod=auto\n\n[ipv6]\nmethod=auto\n' "$wifi_ssid" "$wifi_psk" > "$mount_point/printwatch-wifi.nmconnection"
  chmod 600 "$mount_point/printwatch-wifi.nmconnection"
fi
sync
if command -v diskutil >/dev/null; then diskutil unmountDisk "$device" >/dev/null; else udisksctl unmount -b "$boot_device" >/dev/null; fi
echo "Ready: insert the card, connect camera/OLED/Ethernet, then power on."
