# 💾 DATABASE BACKUP PLAN — Petty Cash App
**Created:** 2026-10-09  
**Strategy:** PostgreSQL → Cloudflare R2 (every 6 hours, automatic)  
**Server:** Ubuntu VM (VMware) → `pettycash.bluekompl.com`

---

## 🎯 Architecture

```
Ubuntu Server (pg_dump)
    ↓ gzip compress
    ↓ rclone upload
Cloudflare R2 Bucket: petty-cash-backups
    ↓ 30-day retention (auto-delete old)
```

**Inta backup-ku qaadanayso:** ~5-15 MB compressed (data size yar)  
**Schedule:** Every 6 hours (00:00, 06:00, 12:00, 18:00)  
**Local copy:** 3-day retention on server (`~/backups/petty-cash/`)  
**Remote copy:** 30-day retention on R2

---

## ✅ Shaqadii Dhammaysan (Completed)

### [DONE] Tallaabo 1 — Cloudflare Account
- Existing account la isticmaalay (tunnel hore u jiray)
- URL: https://dash.cloudflare.com

### [DONE] Tallaabo 2 — R2 Bucket
- **Bucket Name:** `petty-cash-backups`
- **Location:** Automatic
- R2 Object Storage → Create bucket ✅

### [DONE] Tallaabo 3 — API Token (Cloudflare side dhammaatay)
- **Token Name:** `petty-cash-backup`
- **Permissions:** Object Read & Write
- **Scoped to bucket:** `petty-cash-backups`
- ⚠️ **Credentials la kaydsaday** (hal mar ayay muuqdaan — haddaad lumisay regenerate)

---

## ⏳ Shaqadii Hadhay (Next Steps — Server Side)

> Marka Ubuntu server-ka la galo, tallaabooyin soo socda run garee.

### [ ] Tallaabo 4 — rclone Install (Ubuntu Server)
```bash
sudo apt install rclone -y
rclone --version   # verify
```

### [ ] Tallaabo 5 — rclone Configure (Credentials gali)
```bash
rclone config
```
Jawaabaha:
| Su'aal | Jawaab |
|--------|--------|
| New remote name | `r2` |
| Storage type | `s3` (Amazon S3 Compliant) |
| Provider | `Cloudflare R2` |
| Auth method | Enter credentials manually |
| Access Key ID | *(Cloudflare token-ka)* |
| Secret Access Key | *(Cloudflare token-ka)* |
| Region | *(Empty — press Enter)* |
| Endpoint | `https://XXXXXXXX.r2.cloudflarestorage.com` |

**Verify:**
```bash
rclone ls r2:petty-cash-backups
# → empty list = OK ✅
```

### [ ] Tallaabo 6 — Backup Script Deploy
```bash
# Script-ka repo ka soo dhac (haddii lagu daray) ama manual samee:
nano ~/app/backup-to-r2.sh
# → paste script content, CTRL+X → Y → Enter

chmod +x ~/app/backup-to-r2.sh
```

### [ ] Tallaabo 7 — Test Manually
```bash
bash ~/app/backup-to-r2.sh
# Fiiri output:
#   [OK] Dump complete
#   [OK] Upload complete
#   BACKUP SUCCESSFUL ✅
```

**Cloudflare R2 Dashboard-ka hubi:**  
`R2 → petty-cash-backups → Objects → petty_cash_db_YYYY-MM-DD_*.sql.gz`

### [ ] Tallaabo 8 — Crontab (Every 6 Hours)
```bash
crontab -e
```
Ku dar line-kan (bottom of file):
```bash
0 */6 * * * /bin/bash /home/$(whoami)/app/backup-to-r2.sh >> /home/$(whoami)/app/logs/backup.log 2>&1
```

**Verify cron running:**
```bash
crontab -l   # list current crons
# 6 saac kadib:
tail -50 ~/app/logs/backup.log   # check log
```

---

## 🔁 Restore Procedure (Marka backup loo baahdo)

```bash
# 1. List available backups on R2
rclone ls r2:petty-cash-backups

# 2. Download the backup you need
rclone copy r2:petty-cash-backups/petty_cash_db_2026-10-09_06-00-00.sql.gz ~/restore/

# 3. Restore to database
gunzip -c ~/restore/petty_cash_db_*.sql.gz | PGPASSWORD="your_pass" psql -U petty_user -d petty_cash_db

# 4. Restart backend
pm2 restart petty-cash-backend
```

---

## 📁 Files

| File | Location | Purpose |
|------|----------|---------|
| `backup-to-r2.sh` | `~/app/backup-to-r2.sh` | Main backup script (server-side) |
| `logs/backup.log` | `~/app/logs/backup.log` | Cron execution log |
| Backups (local) | `~/backups/petty-cash/` | 3-day local retention |
| Backups (remote) | R2: `petty-cash-backups/` | 30-day cloud retention |

---

## ⚠️ Notes

- Script-ka automatically reads `~/app/backend/.env` — credentials manual ah ma baahno
- Haddii `ACCESS KEY` lumato: Cloudflare → R2 → Manage R2 API Tokens → regenerate
- `database_dump.sql` (repo-ka ku jira) **ma aha backup** — schema sample kaliya
- Production credentials **git** ku ha galinin abid
