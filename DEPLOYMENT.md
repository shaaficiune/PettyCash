# 🚀 Petty Cash Management System – Production Deployment Guide
### (VMware Ubuntu + PM2 + Nginx + Cloudflare Tunnel)

Hadafka tusalahan waa in uu kuusoo saaro habka ugu habboon uguna fudud ee aad **Petty Cash App** ugu shubi lahayd server Ubuntu Linux ah oo ku dhex jira **VMware Workstation**, adigoo isticmaalaya **Domain Name** iyo **Cloudflare Tunnel** (iyada oo aan loo baahnayn Public IP ama Port Forwarding router-ka!).

---

## 🏗 System Architecture Diagram

```
🌐 Internet User (https://yourdomain.com)
       │
       ▼
☁️ Cloudflare Global Edge Network (SSL / HTTPS)
       │
       ▼ (Encrypted Cloudflare Tunnel - Outbound Connection)
💻 VMware Ubuntu Linux Server (VMware Workstation)
       │
       ├─► 🛡️ cloudflared Daemon (Cloudflare Tunnel Client)
       │         │
       │         ▼
       ├─► 🌐 Nginx Reverse Proxy (Port 80)
       │         ├── 🎨 Frontend (React Static Build: /var/www/petty-cash/frontend/dist)
       │         └── 🔌 Backend API (/api -> Port 3000)
       │
       ├─► ⚡ PM2 Process Manager (NestJS Backend Service: Port 3000)
       │
       └─► 🗄️ PostgreSQL Database (Port 5432: petty_cash_db)
```

---

## 📋 Tallaabada 1-aad: Diyaarinta Ubuntu VM ee VMware Workstation

1. **Abuur Ubuntu VM Nidaam ah**:
   - **OS**: Ubuntu Server 22.04 LTS ama 24.04 LTS (64-bit).
   - **RAM**: 4 GB (ama ka badan).
   - **CPU**: 2 vCPUs.
   - **Storage**: 20 GB+.
   - **Network Adapter**: U dooro **Bridged** ama **NAT**.

2. **Cusboonaysii Server-ka**:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

---

## 📦 Tallaabada 2-aad: Shubidda Software-ada Loo Baahan Yahay

1. **Shub Node.js 20 LTS, Git, Nginx, iyo PostgreSQL**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs git nginx postgresql postgresql-contrib
   ```

2. **Shub PM2 Globally**:
   ```bash
   sudo npm install -g pm2
   ```

---

## 🗄️ Tallaabada 3-aad: Habaynta Database-ka (PostgreSQL)

1. **U badal Password-ka postgres user-ka ah & Abuur Database**:
   ```bash
   sudo -u postgres psql
   ```
   Gudaha PostgreSQL (`psql`), ka dhex curi amarradan:
   ```sql
   ALTER USER postgres PASSWORD 'Somtel@PL';
   CREATE DATABASE petty_cash_db;
   \q
   ```

2. **Hadii aad hayso Data hore (`database_dump.sql`), Ku shub Database-ka**:
   ```bash
   sudo -u postgres psql petty_cash_db < /path/to/database_dump.sql
   ```

---

## 📁 Tallaabada 4-aad: Cloning Project-ka & Ordaynta Deploy Script

1. **Abuur Folder-ka Server-ka oo ka soo clone garay Repo-ga**:
   ```bash
   sudo mkdir -p /var/www/petty-cash
   sudo chown -R $USER:$USER /var/www/petty-cash

   cd /var/www/petty-cash
   git clone https://github.com/shaaficiune/PettyCash.git .
   ```

2. **Hubi Environment Files (`.env`)**:
   Faylashan horay ayaa loogu diyaariyay production (`localhost` DB URL & `/api` frontend path).
   - Backend `.env`: `backend/.env`
   - Frontend `.env`: `frontend/.env`
   - Root `.env`: `.env`

3. **Kexeey Script-ka Otomaatigga ah ee Deploy-ga**:
   ```bash
   chmod +x deploy-ubuntu.sh
   ./deploy-ubuntu.sh
   ```

4. **Khabaynta Nginx Server Proxy**:
   ```bash
   sudo cp nginx-ubuntu.conf /etc/nginx/sites-available/petty-cash
   sudo ln -sf /etc/nginx/sites-available/petty-cash /etc/nginx/sites-enabled/default
   sudo nginx -t
   sudo systemctl reload nginx
   ```

5. **U dir PM2 inuu la kaco Nginx marka Server-ku Reboot noqdo**:
   ```bash
   pm2 startup
   # Nuuxi oo paste garee amarka uu pm2 kuu soo saaro (wuxuu ku bilaabmaa 'sudo env PATH=...')
   pm2 save
   ```

---

## 🌐 Tallaabada 5-aad: Xidhitanka Cloudflare Tunnel (Domain Online Access)

Cloudflare Tunnel wuxuu kuu oggolaanayaa in nidaamkaaga lagu soo gaadho online **iyada oo aan loo baahnayn Public IP ama Port Forwarding**.

1. **Iibso Domain Name** (e.g. GoDaddy, Namecheap, ama Cloudflare Registrar) oo magaciisa Ku dar **Cloudflare Dashboard** (`dash.cloudflare.com`).

2. **Shub `cloudflared` on Ubuntu VM**:
   ```bash
   sudo mkdir -p /etc/apt/keyrings
   curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /etc/apt/keyrings/cloudflare-main.gpg >/dev/null
   echo "deb [signed-by=/etc/apt/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared focal main" | sudo tee /etc/apt/sources.list.d/cloudflared.list
   sudo apt update && sudo apt install cloudflared -y
   ```

3. **Login ku samee Cloudflare**:
   ```bash
   cloudflared tunnel login
   ```
   *(Link ayaa kuu soo baxaya, nuuxi oo browser ka aadh si aad u dooratid domain-kaaga)*.

4. **Abuur Tunnel**:
   ```bash
   cloudflared tunnel create pettycash-tunnel
   ```
   *(Nuuxi Tunnel ID-ga kuu soo baxa)*.

5. **U xidh Domain-kaaga (Route DNS)**:
   ```bash
   # Beddel pettycash.yourdomain.com magaca domain-kaaga rasmiga ah
   cloudflared tunnel route dns pettycash-tunnel pettycash.yourdomain.com
   ```

6. **Abuur Config File-ka Cloudflare Tunnel**:
   ```bash
   sudo mkdir -p /etc/cloudflared
   sudo nano /etc/cloudflared/config.yml
   ```
   Gudaha ku shub:
   ```yaml
   tunnel: PETTYCASH_TUNNEL_ID_HERE
   credentials-file: /root/.cloudflared/PETTYCASH_TUNNEL_ID_HERE.json

   ingress:
     - hostname: pettycash.yourdomain.com
       service: http://localhost:80
     - service: http_status:404
   ```

7. **U roge Service-ka ku kaco Booting-ka Server-ka**:
   ```bash
   sudo cloudflared service install
   sudo systemctl start cloudflared
   sudo systemctl enable cloudflared
   ```

🎉 **Uur-xidhkii waa dhammaystiran yahay! Nidaamkaagu wuxuu si toos ah uga shaqaynayaa `https://pettycash.yourdomain.com`**

---

## 🛠 Operational & Monitoring Commands

| Shaqada | Amarka |
| :--- | :--- |
| **PM2 Status** | `pm2 status` |
| **PM2 Logs Live** | `pm2 logs petty-cash-backend` |
| **PM2 Restart Backend** | `pm2 restart petty-cash-backend` |
| **Nginx Status** | `sudo systemctl status nginx` |
| **Nginx Reload** | `sudo systemctl reload nginx` |
| **Cloudflare Tunnel Status** | `sudo systemctl status cloudflared` |
| **Cloudflare Tunnel Restart** | `sudo systemctl restart cloudflared` |
