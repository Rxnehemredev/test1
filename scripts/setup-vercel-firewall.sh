#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════
# Vercel Firewall — gerçek WAF kurallarını CLI üzerinden, dashboard'a hiç
# girmeden oluşturur. Hobby (ücretsiz) planda "deny" ve "challenge" aksiyonlu
# custom rule'lar tamamen ücretsizdir (3 adede kadar). Bu script tam olarak
# 3 ücretsiz kural oluşturur; en alttaki "rate_limit" bölümü İSTEĞE BAĞLIDIR
# ve küçük kullanım ücretine tabi olabilir (yorum satırı halinde bırakıldı).
#
# middleware.js zaten kod seviyesinde deny + rate-limit yapıyor. Bu script
# middleware.js'in YAPAMADIĞI tek şeyi ekliyor: gerçek, Vercel altyapılı
# "Challenge" (insan/JS doğrulama) ekranı.
#
# KULLANIM:
#   1) npm i -g vercel          (bir kere)
#   2) vercel login             (bir kere)
#   3) cd proje-klasoru && vercel link   (projeyi bu repo ile eşleştirir)
#   4) bash scripts/setup-vercel-firewall.sh
#
# NOT: Vercel CLI'nin `firewall rules add` komutu ve flag isimleri zaman
# içinde değişebilir. Bir komut hata verirse `vercel firewall rules add --help`
# ile güncel flag adlarını kontrol et, ya da aynı kuralı Dashboard → Firewall
# → Custom Rules → Add New üzerinden (Hobby'de de ücretsiz) manuel oluştur.
# ══════════════════════════════════════════════════════════════════════════
set -e

echo "→ Vercel'e bağlı olduğun kontrol ediliyor..."
vercel whoami || { echo "Önce 'vercel login' çalıştır."; exit 1; }

echo ""
echo "══════════════════════════════════════════════════════════"
echo "Kural 1/3 — Zararlı path taramalarını engelle (deny, ücretsiz)"
echo "══════════════════════════════════════════════════════════"
vercel firewall rules add "Block malicious path scans" \
  --condition '{"type":"path","op":"sub","value":".env"}' \
  --or \
  --condition '{"type":"path","op":"sub","value":".git"}' \
  --or \
  --condition '{"type":"path","op":"sub","value":"wp-admin"}' \
  --or \
  --condition '{"type":"path","op":"sub","value":"phpmyadmin"}' \
  --or \
  --condition '{"type":"path","op":"sub","value":"xmlrpc.php"}' \
  --action deny \
  --yes

echo ""
echo "══════════════════════════════════════════════════════════"
echo "Kural 2/3 — Admin panele gerçek 'Challenge' (insan doğrulama) ekranı"
echo "══════════════════════════════════════════════════════════"
vercel firewall rules add "Challenge admin panel" \
  --condition '{"type":"path","op":"pre","value":"/admin-panel"}' \
  --or \
  --condition '{"type":"path","op":"pre","value":"/api/admin"}' \
  --action challenge \
  --yes
# Not: Kalıcı (persistent) 60dk bloklama isteğe bağlı bir alan; CLI sürümüne
# göre `--action-duration 60m` flag'i eklenebiliyor. Desteklenmiyorsa aynı
# kuralı Dashboard'dan açıp "Persistent action" alanına 60dk yazabilirsin
# (Hobby'de bu ekran da ücretsiz erişilebilir).

echo ""
echo "══════════════════════════════════════════════════════════"
echo "Kural 3/3 — Bilinen scraper/bot User-Agent'larına challenge"
echo "══════════════════════════════════════════════════════════"
vercel firewall rules add "Challenge known scraper user agents" \
  --condition '{"type":"user_agent","op":"sub","value":"python-requests"}' \
  --or \
  --condition '{"type":"user_agent","op":"sub","value":"scrapy"}' \
  --or \
  --condition '{"type":"user_agent","op":"sub","value":"curl"}' \
  --or \
  --condition '{"type":"user_agent","op":"sub","value":"wget"}' \
  --or \
  --condition '{"type":"user_agent","op":"sub","value":"node-fetch"}' \
  --action challenge \
  --yes

echo ""
echo "✅ 3 ücretsiz kural oluşturuldu (taslak). Şimdi yayınlamak için:"
echo "   vercel firewall rules list     # taslakları gözden geçir"
echo "   Ardından Dashboard → Firewall → Review Changes → Publish"
echo "   (Publish adımı CLI'de de mevcutsa 'vercel firewall deploy' dene)"
echo ""
echo "──────────────────────────────────────────────────────────"
echo "İSTEĞE BAĞLI (ücretli olabilir): Login/Register ve katalog"
echo "uçlarına gerçek WAF rate-limit eklemek istersen aşağıdaki"
echo "satırların başındaki # işaretini kaldırıp tekrar çalıştır."
echo "Bu 4. ve 5. kural olacağından Hobby'nin 3 ücretsiz kural"
echo "sınırını aşabilir — Pro'ya geçmen ya da mevcut 3 kuraldan"
echo "birini silmen gerekebilir. middleware.js zaten bu limitleri"
echo "koduyla ücretsiz uyguladığı için bunlar tamamen opsiyoneldir."
echo "──────────────────────────────────────────────────────────"

# vercel firewall rules add "Rate limit login/register" \
#   --condition '{"type":"path","op":"eq","value":"/api/auth/login"}' \
#   --or \
#   --condition '{"type":"path","op":"eq","value":"/api/auth/register"}' \
#   --action rate_limit \
#   --rate-limit-window 60 \
#   --rate-limit-requests 10 \
#   --rate-limit-keys ip \
#   --rate-limit-action deny \
#   --yes

# vercel firewall rules add "Rate limit chapters/series API" \
#   --condition '{"type":"path","op":"pre","value":"/api/chapters"}' \
#   --or \
#   --condition '{"type":"path","op":"pre","value":"/api/series"}' \
#   --action rate_limit \
#   --rate-limit-window 60 \
#   --rate-limit-requests 30 \
#   --rate-limit-keys ip \
#   --rate-limit-action challenge \
#   --yes
