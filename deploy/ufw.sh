#!/usr/bin/env bash
# Güvenlik duvarı: yalnızca SSH (hız sınırlı), HTTP, HTTPS. Uygulama portu (3000) dışarıya KAPALI.
# Kullanım: sudo bash deploy/ufw.sh [SSH_PORT]
set -euo pipefail
SSH_PORT="${1:-22}"

ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw limit "${SSH_PORT}/tcp" comment 'ssh (hız sınırlı)'
ufw allow 80/tcp  comment 'http (->https)'
ufw allow 443/tcp comment 'https'
# Docker, ufw kurallarını atlatabilir; bu yüzden compose dosyası 127.0.0.1'e bağlar. Yine de açıkça reddet:
ufw deny 3000/tcp comment 'uygulama portu: sadece loopback'
ufw logging low
ufw --force enable
ufw status verbose

# ── Cloudflare arkasındaysan (EN GÜVENLİSİ): 443'ü yalnızca Cloudflare aralıklarına aç ──
# for r in $(curl -s https://www.cloudflare.com/ips-v4) $(curl -s https://www.cloudflare.com/ips-v6); do
#   ufw allow from "$r" to any port 443 proto tcp
# done
# ufw delete allow 443/tcp
