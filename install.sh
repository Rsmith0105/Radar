#!/usr/bin/env bash
set -euo pipefail

# --- CONFIG ---
REPO_URL="${1:-https://github.com/<your-username>/rafac-radar.git}"
WEB_ROOT="/var/www/html"
APP_DIR="/opt/rafac-radar"
SITE_PATH="$WEB_ROOT/rafac-radar"

echo "🔄 Updating & installing packages..."
sudo apt-get update
sudo apt-get install -y ca-certificates curl wget git lighttpd

# ---- 1) Decoder + Map (readsb + tar1090) ----
echo "📡 Installing readsb (decoder)..."
sudo bash -c "$(wget -nv -O - https://raw.githubusercontent.com/wiedehopf/adsb-scripts/master/readsb-install.sh)"

echo "🗺 Installing tar1090 (map UI)..."
sudo bash -c "$(wget -nv -O - https://raw.githubusercontent.com/wiedehopf/tar1090/master/install.sh)"

echo "🚀 Enabling services..."
sudo systemctl enable --now readsb tar1090

# ---- 2) RAFAC Radar (your ATC-style UI) ----
echo "📦 Installing rafac-radar from: $REPO_URL"
if [ -d "$APP_DIR/.git" ]; then
  sudo git -C "$APP_DIR" pull --ff-only
else
  sudo rm -rf "$APP_DIR"
  sudo git clone "$REPO_URL" "$APP_DIR"
fi

sudo rm -rf "$SITE_PATH"
sudo ln -s "$APP_DIR" "$SITE_PATH"

# ---- 3) Proxy /rafac-radar/data -> local dump1090/tar1090 data ----
echo "🔀 Configuring lighttpd proxy..."
SNIP='/etc/lighttpd/conf-available/99-rafac-radar-proxy.conf'
sudo bash -c "cat > '$SNIP' <<'CONF'
server.modules += ( "mod_proxy" )
$HTTP["url"] =~ "^/rafac-radar/data/" {
    proxy.server = ( "" => ( ( "host" => "127.0.0.1", "port" => 8080 ) ) )
}
CONF"
sudo ln -sf "$SNIP" /etc/lighttpd/conf-enabled/99-rafac-radar-proxy.conf

echo "🔁 Restarting web server..."
sudo systemctl restart lighttpd

IP=$(hostname -I | awk '{print $1}')
echo
echo "✅ Install complete!"
echo "👉 tar1090 map:     http://$IP/tar1090/"
echo "👉 RAFAC radar UI: http://$IP/rafac-radar/"
echo
echo "⚙️  Next steps:"
echo "   - Edit $APP_DIR/config.js"
echo "     • HOME = your lat/lon"
echo "     • DUMP1090_URL = '/rafac-radar/data/aircraft.json'"