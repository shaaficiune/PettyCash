#!/bin/bash
set -e

echo "=========================================="
echo "🚀 INSTALLING & STARTING CLOUDFLARE TUNNEL"
echo "=========================================="

TOKEN="eyJhIjoiZDM5YmNiMzMwNTliMDA2NzU1ZTVlNmNhOWMyZjA5NDMiLCJ0IjoiZTc5MzZlN2UtMDVhOC00ZGYyLWE1MzYtOTY1ZTgzZTllY2RjIiwicyI6Ik5XVXlOV1kyTnpNdE9ESTNNUzAwTUdFMExXSmpOR0V0T1RGa056QTBNRGhrT1dJMCJ9"

# 1. Install cloudflared if not present
if ! command -v cloudflared &> /dev/null; then
    echo "📦 Downloading and installing cloudflared package..."
    curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
    sudo dpkg -i cloudflared.deb
    rm -f cloudflared.deb
fi

# 2. Install and start as a system service
echo "⚡ Installing and starting cloudflared service..."
sudo cloudflared service install "$TOKEN" || true

# 3. Ensure service is enabled and running
sudo systemctl daemon-reload
sudo systemctl enable cloudflared
sudo systemctl restart cloudflared

echo ""
echo "=========================================="
echo "✅ CLOUDFLARE TUNNEL IS RUNNING!"
echo "=========================================="
sudo systemctl status cloudflared --no-pager
