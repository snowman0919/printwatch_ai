#!/bin/bash -e

install -d -m 0755 "${ROOTFS_DIR}/opt/printwatch-agent"
cp -a files/agent/. "${ROOTFS_DIR}/opt/printwatch-agent/"
install -m 0644 files/agent/printwatch-agent.service "${ROOTFS_DIR}/etc/systemd/system/printwatch-agent.service"
install -m 0644 files/printwatch-firstboot.service "${ROOTFS_DIR}/etc/systemd/system/printwatch-firstboot.service"
install -m 0644 files/printwatch-wifi.service "${ROOTFS_DIR}/etc/systemd/system/printwatch-wifi.service"
install -m 0755 files/printwatch-firstboot "${ROOTFS_DIR}/usr/local/sbin/printwatch-firstboot"
install -m 0755 files/printwatch-wifi "${ROOTFS_DIR}/usr/local/sbin/printwatch-wifi"

on_chroot <<'EOF'
id printwatch >/dev/null 2>&1 || useradd --system --home /var/lib/printwatch --create-home --shell /usr/sbin/nologin printwatch
python3 -m venv --system-site-packages /opt/printwatch-agent/.venv
/opt/printwatch-agent/.venv/bin/pip install --no-cache-dir -r /opt/printwatch-agent/requirements.txt
usermod -a -G video,render,i2c,dialout printwatch
systemctl enable printwatch-firstboot.service printwatch-wifi.service printwatch-agent.service
EOF

grep -q '^dtparam=i2c_arm=on' "${ROOTFS_DIR}/boot/firmware/config.txt" || echo 'dtparam=i2c_arm=on' >> "${ROOTFS_DIR}/boot/firmware/config.txt"
