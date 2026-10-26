# 🌐 DOMAIN SETUP — TODO (Xasuus)

**Taariikhda:** 2026-10-11  
**Xaalada:** ⏳ Domain lacag la'aanta sugaya — shaqada halkan ka wad marka aad domain iibsatid

---

## 📋 Xaaladda Hadda

| Qodob | Xaalad |
|-------|--------|
| **Domain hore** | `pettycash.bluekompl.com` — la waayay (email bedel) |
| **DuckDNS** | `somtel.duckdns.org` — public IP ma lahan, ma shaqeyso |
| **Cloudflare Account** | ✅ Jirta (account hore) |
| **Tunnel (cloudflared)** | ✅ Server Ubuntu ku installed |
| **Domain cusub rabta** | `somtelpettycash.com` |
| **Server** | Ubuntu VirtualBox — NO public IP |

---

## 🛒 Tallaabo 1 — Domain Iibso

### Meeshii ugu fiican: Cloudflare Registrar
- 🔗 **URL:** https://dash.cloudflare.com → "Domain Registration" → "Register Domains"
- 🔍 **Ku qor:** `somtelpettycash.com`
- 💰 **Qiimaha:** ~$9–10/year (at-cost, markup ma lahan)
- ✅ **Faa'idada:** Account-kaaga Cloudflare hore ayuu si toos ah ugu jiri doonaa

> Haddii Cloudflare lagu heli waayo, Namecheap.com ku iibso (~$9-14/year)

---

## 🔧 Tallaabo 2 — Ubuntu Server: Tunnel Cusub

**Domain iibsatay kadib**, Ubuntu server-kaaga terminal fur oo run kee:

```bash
# 1. Cloudflare account-kaaga login
cloudflared tunnel login

# 2. Tunnel cusub samee
cloudflared tunnel create petty-tunnel

# 3. Subdomain u samee domain-ka cusub
cloudflared tunnel route dns petty-tunnel pettycash.somtelpettycash.com

# 4. Config file samee
mkdir -p ~/.cloudflared
nano ~/.cloudflared/config.yml
```

**Config content-ka** (copy-paste):
```yaml
tunnel: petty-tunnel
credentials-file: /home/youruser/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: pettycash.somtelpettycash.com
    service: http://localhost:80
  - service: http_status:404
```

> ⚠️ `<TUNNEL_ID>` — `cloudflared tunnel list` ku hel

```bash
# 5. Bilow tunnel
cloudflared tunnel run petty-tunnel
```

---

## 🔧 Tallaabo 3 — Auto-Start (Systemd)

Tunnel-ku server restart ka dib si toos ah u bilowdo:

```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
sudo systemctl status cloudflared
```

---

## ⚙️ Tallaabo 4 — Backend .env Update

```bash
nano ~/app/backend/.env
```

**Beddel qiyamahan:**
```env
ALLOWED_ORIGINS=https://pettycash.somtelpettycash.com
FRONTEND_URL=https://pettycash.somtelpettycash.com
```

---

## 🚀 Tallaabo 5 — Deploy

```bash
cd ~/app
bash update-server.sh
```

---

## 📝 Tallaabo 6 — KNOWLEDGE.md Update

`KNOWLEDGE.md` Section 2 & 10 waxaa ku bedeli doona:
```
Production Domain: https://pettycash.somtelpettycash.com (Cloudflare Tunnel)
```

Sidoo kale Section 6 Security table-ka:
```
Production domain: https://pettycash.somtelpettycash.com
```

---

## ✅ Checklist (Marka Lacagta Heshid)

- [ ] `somtelpettycash.com` iibso (Cloudflare Registrar ~$10)
- [ ] Ubuntu server: `cloudflared tunnel login`
- [ ] Ubuntu server: tunnel cusub samee + route dns
- [ ] Ubuntu server: config.yml samee
- [ ] Ubuntu server: systemd service install (auto-start)
- [ ] `~/app/backend/.env` — ALLOWED_ORIGINS bedel
- [ ] `bash update-server.sh` run kee
- [ ] Browser ku test: `https://pettycash.somtelpettycash.com`
- [ ] `KNOWLEDGE.md` domain cusub ku update garee

---

## 💡 Xasuusnow

- Server-ka VirtualBox Ubuntu **public IP ma lahan** — Port forwarding ma shaqeyso
- **Cloudflare Tunnel kaliya** ayaa xal ah (server naftii buu uga baxaa internet-ka)
- `somtel.duckdns.org` — dhig, ma shaqeyso (public IP u baahan)
- Cloudflare account hore waa jirta ✅

---

*📅 Halkan ka wad shaqada marka domain-ka aad iibsatid*
