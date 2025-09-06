#!/bin/bash
set -e

echo "🔄 Updating system..."
sudo apt update
sudo apt install -y ca-certificates curl wget git lighttpd

echo "📡 Installing readsb (decoder)..."
sudo bash -c "$(wget -nv -O - https://raw.githubusercontent.com/wiedehopf/adsb-scripts/master/readsb-install.sh)"

echo "🗺 Installing tar1090 (map)..."
sudo bash -c "$(wget -nv -O - https://raw.githubusercontent.com/wiedehopf/tar1090/master/install.sh)"

echo "⚙️ Applying RAFAC config..."
sudo cp config/readsb.conf /etc/default/readsb
sudo cp config/tar1090.conf /etc/default/tar1090
sudo cp config/fr24feed.ini /etc/fr24feed.ini || true

# Custom assets
sudo cp assets/custom.css /usr/share/tar1090/html-legacy/custom.css
sudo cp assets/rafac-logo.png /usr/share/tar1090/html-legacy/rafac-logo.png
sudo cp assets/alert.wav /usr/share/tar1090/html-legacy/alert.wav

echo "🚀 Enabling services..."
sudo systemctl enable --now readsb tar1090

IP=$(hostname -I | awk '{print $1}')
echo "✅ RAFAC Radar installed!"
echo "👉 Open: http://$IP/tar1090/"
