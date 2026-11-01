# 🌐 UBUNTU VM — NETWORK DOWN TROUBLESHOOTING GUIDE
**Taariikhda:** 28 October 2026  
**Xaaladda:** VirtualBox Ubuntu VM internet-ka waayay — Cloudflare Tunnel wali shaqaynaysay  
**Server:** pettycash.himilotech.com (Cloudflare Tunnel via VirtualBox NAT)

---

## 🔍 ASTAAMAHA DHIBAATADA (Symptoms)

Haddaad arki karto waxaan ka mid ah, dhibaatadan ayaad leedahay:

- `git pull origin main` → `fatal: unable to access ... Could not resolve host: github.com`
- `ping 8.8.8.8` → `100% packet loss` ama `Temporary failure in name resolution`
- `ping github.com` → `Temporary failure in name resolution`
- **Laakiin** app-ku `pettycash.himilotech.com` wali online wuu yahay ✅

---

## 💡 MAXAA DHACAY? (Root Cause)

| Arrin | Faahfaahin |
|-------|------------|
| **Sabab** | VirtualBox NAT default gateway route-kii tirtirtay |
| **Goorta dhacda** | Windows host-ku shabakaddiisa bedelato (WiFi → Ethernet, router restart, PC hibernate) |
| **Cloudflare Tunnel maxuu wali shaqaynayaa?** | Xiriirkii TCP hore wali furan ayuu yahay — cusub kuma baahna |
| **Ping maxuu guul-darraysanayaa?** | VirtualBox NAT wuu xanibaa ICMP (ping) — caadi weeye! TCP (git, curl) waa u dhaafi karaa |

---

## 🛠️ XALKA SAX AH — TALLAABO TALLAABO

### Tallaabada 1 — Network-ka hubi
```bash
ip addr show
```
Waa inuu muujiyaa `enp0s3` oo `UP` ah iyo IP `10.0.2.15` — haddaan taas jirin waxaas oo keliya dhibaato kale ayaa jirta.

### Tallaabada 2 — Route hubi
```bash
ip route show
```
Hadduu **`default via 10.0.2.2`** aanay ku jirin → taasi waa dhibaatada!

### Tallaabada 3 — Gateway dib u dar (FIX)
```bash
sudo ip route add default via 10.0.2.2
```

### Tallaabada 4 — DNS hubi/saxo
```bash
cat /etc/resolv.conf
```
Hadduu maqan yahay ama khaldan:
```bash
echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf
```
> ⚠️ **TAXADAR:** `nameserver` waa **hal erey** — KHALAD: `name server` (labo erey)

### Tallaabada 5 — Internet test (TCP, ping MAAHA)
```bash
curl -I https://github.com
```
Hadduu `HTTP/2 200` ama `301` muujiyo → internet waa soo celiyay ✅

### Tallaabada 6 — Git pull
```bash
cd ~/app && git pull origin main
```

---

## ⚠️ WAXYAABAHA LAMA SAMAYNIN

| Ficil | Sababta |
|-------|---------|
| `VirtualBox → Settings → Network → Disable` | Cloudflare Tunnel **isla markiiba** go'ayaa → app offline |
| `sudo snap install remote` | Tani waxba kama gaban doonto — `remote` waa git subcommand, app gooni ah ma aha |
| `ping` oo kaliya test ahaan isticmaalid | VirtualBox NAT wuu xanibaa ICMP → `curl` ama `git` ku test |

---

## 🔁 XALKA JOOGTADA AH (Permanent Fix)

Marka aad dib u bilowdo VM-ta, route-ku **mar walba tirtirmayaa**. Si joogta ah loo helo, `/etc/netplan/` ama `rc.local` ku dar:

```bash
# Hubi netplan config-ka
ls /etc/netplan/
cat /etc/netplan/00-installer-config.yaml
```

Ama systemd service ahaan ku dar:
```bash
sudo nano /etc/rc.local
```
Ku dar (kahor `exit 0`):
```bash
ip route add default via 10.0.2.2 2>/dev/null || true
```

---

## 🗄️ HADDUU INTERNET LA'AANTAA DATABASE SOO SAARID RABTID

`pg_dump` internet **looma baahna** — local ayuu ku shaqaynayaa:

```bash
mkdir -p ~/db_exports
pg_dump -U petty_user -h localhost -d petty_cash_db \
  -f ~/db_exports/backup_$(date +%Y%m%d_%H%M).sql
ls -lh ~/db_exports/
```

Ama script buuxa:
```bash
bash ~/app/db-export-local.sh
```

---

## 🔗 GIT REMOTE URL — Khaladka la arkay

Server-ka git URL-kiisu wuxuu lahaa typo: `hithub.com` → `github.com`

**Fix:**
```bash
cd ~/app
git remote set-url origin https://github.com/shaaficiune/PettyCash.git
git remote -v   # Hubi
```

---

## 📊 XAALADDA SERVER — REFERENCE

| Arrin | Qiimaha |
|-------|---------|
| **OS** | Ubuntu (VirtualBox NAT) |
| **Interface** | `enp0s3` |
| **VM IP** | `10.0.2.15` |
| **NAT Gateway** | `10.0.2.2` |
| **DNS** | `8.8.8.8` (Google) |
| **App folder** | `~/app` |
| **Database** | `petty_cash_db` (user: `petty_user`) |
| **Public URL** | `https://pettycash.himilotech.com` |
| **Tunnel** | Cloudflare Tunnel (`cloudflared`) |

---

*Dhibaatadan waxaa la xaliyay: 28 October 2026 — Faahfaahin dheeraad ah: `KNOWLEDGE.md` Section 33*
