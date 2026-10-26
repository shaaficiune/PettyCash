# 🚨 CILAD-BIXINTA SERVER-KA ONLINE-KA AH (ONLINESERVERPROBLEM.MD)
**Domain:** `https://pettycash.himilotech.com`  
**Server User & Path:** `shaafici@PettyCashApp:~/app/app` (ama `~/app`)  
**Taariikhda:** 2026-10-22  

---

## 🔍 1. SABABAHA KEENAY CILADDA (ROOT CAUSE ANALYSIS)

Markii aad maanta server-ka ka dhex dirtay `bash update-server.sh`, laba ama saddex arrimood oo is biirsaday ayaa keenay qaladka **500 Internal Server Error** iyo **Content Security Policy (CSP)**:

### Sababta 1-aad: Waddada Nginx Root Path-ka oo Qaldantay (`500 / 404 Error`)
- Faylka `update-server.sh` wuxuu si toos ah faylka `nginx-ubuntu.conf` ugu koobiyeeyay `/etc/nginx/sites-available/petty-cash`.
- Faylka `nginx-ubuntu.conf` ee repo-ga ku jiray waxaa ku qornaa:
  ```nginx
  root /var/www/petty-cash/frontend/dist;
  ```
- **Halka Dhibtu Ka Timid:** Server-kaaga dhabta ah, mashruucu kuma jiro `/var/www/petty-cash/`, wuxuu ku jiraa gurigaaga (`/home/shaafici/app/app` ama `/home/shaafici/app`).
- Markii Nginx uu raadiyay faylalkii frontend-ka (`index.html`) oo uu waayay folder-kaas, wuxuu toos u soo saaray **500 Internal Server Error**.

### Sababta 2-aad: Cloudflare Insights oo uu Xannibay CSP (Content Security Policy)
- Browser-ka wuxuu soo qoray:
  ```
  Loading the script 'https://static.cloudflareinsights.com/beacon.min.js/...' violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inline'"
  ```
- Cloudflare Tunnel-kaaga (`himilotech.com`) wuxuu si toos ah bogagga ugu duraa (injects) script-ka xisaabinta booqashada (Cloudflare Analytics Beacon).
- Nginx header-ka CSP wuxuu ogolaa kaliya `'self'`, markaasuu browser-ku diiday script-kaas Cloudflare.

### Sababta 3-aad: Domain-ka Cusub (`pettycash.himilotech.com`) & CORS
- Backend-ka `.env` ee server-ka ku jira waxaa horey loogu qoray:
  ```env
  ALLOWED_ORIGINS=https://pettycash.bluekompl.com
  ```
- Haddii domain-ka aad hadda furayso uu yahay `https://pettycash.himilotech.com`, backend CORS wuxuu u arkaa Origin aan la ogolayn, wuxuuna NestJS soo tuuraa Exception keenaya **HTTP 500**.

---

## 🛠️ 2. XALKA TOOSKA AH EE SERVER-KA (OROD KU SAMEE SERVER-KA)

> **OGSOONOW:** Uma baahnid inaad wax koodh ah oo cusub Git kaga soo dirtid Windows-kaaga. 50-ka fayl ee local-ka ku jira waxba kama beddelayno, waxna looma dirayo Git. Wax walba waxaad toos uga toosinaysaa terminal-ka Ubuntu ee aad hadda joogto (`shaafici@PettyCashApp:~/app/app$`):

### Tallaabada 1-aad: Xaqiiji halka uu ku yaal `frontend/dist`
Geli amarkan terminal-ka server-kaaga si aad u ogaato path-ka saxda ah:
```bash
pwd
ls -ld $(pwd)/frontend/dist
```
*(Wuxuu ku tusi doonaa path-ka dhabta ah, tusaale: `/home/shaafici/app/app/frontend/dist` ama `/home/shaafici/app/frontend/dist`)*.

---

### Tallaabada 2-aad: Hagaaji Nginx Configuration-ka
Fur faylka Nginx ee server-ka:
```bash
sudo nano /etc/nginx/sites-available/petty-cash
```

Gudaha faylkaas ka eeg labadan meelood:

#### A) Hagaaji `root` (U beddel path-kaaga saxda ah):
Haddii aad aragto `root /var/www/petty-cash/frontend/dist;`, u beddel path-kaaga saxda ah ee aad tallaabadii 1-aad ku aragtay:
```nginx
    # U beddel path-ka dhabta ah ee server-kaaga:
    root /home/shaafici/app/app/frontend/dist;
    index index.html;
```
*(Haddii aad ku jirto `/home/shaafici/app` oo aysan laba app ahayn, ka dhig `/home/shaafici/app/frontend/dist`)*.

#### B) Ku dar Cloudflare Insights CSP-ga:
Ka hel xariiqda `Content-Security-Policy` oo ka dhig sidan:
```nginx
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https://cloudflareinsights.com; frame-ancestors 'none';" always;
```

Guji `CTRL + O` kadib `Enter` si aad u kaydiso, kadib `CTRL + X` si aad uga baxdo nano.

---

### Tallaabada 3-aad: Ku dar Domain-ka Cusub Backend `.env`
Fur faylka `.env` ee backend-ka server-kaaga:
```bash
nano backend/.env
```
Ka hel xariiqda `ALLOWED_ORIGINS` oo ku dar `https://pettycash.himilotech.com`:
```env
ALLOWED_ORIGINS=https://pettycash.himilotech.com,https://pettycash.bluekompl.com,http://localhost:5173,http://localhost:3000
```
Guji `CTRL + O` kadib `Enter` si aad u kaydiso, kadib `CTRL + X`.

---

### Tallaabada 4-aad: Dib u bilow Services-ka (PM2 & Nginx)
Hadda tijaabi Nginx oo dib u bilow:
```bash
# 1. Tijaabi Nginx
sudo nginx -t

# 2. Dib u bilow Nginx
sudo systemctl reload nginx

# 3. Dib u bilow Backend-ka PM2
pm2 restart petty-cash-backend --update-env
```

---

### Tallaabada 5-aad: Xaqiiji Logs-ka Server-ka
Haddii aad rabto inaad aragto in backend-ku caadi u shaqeynayo:
```bash
pm2 logs petty-cash-backend --lines 20
```
Iyo Nginx error logs:
```bash
sudo tail -n 20 /var/log/nginx/error.log
```

---

## 🚀 3. NATIIJADA
Marka aad 4-taas tallaabo ee kor ku xusan ku dhex marto terminal-ka Ubuntu:
1. Nginx wuxuu si toos ah u heli doonaa `index.html` ee ku dhex jira `frontend/dist`.
2. Cloudflare Analytics script-kiisu ma xannibmi doono maadaama CSP loo fasaxay.
3. Backend-ku wuxuu aqbali doonaa `https://pettycash.himilotech.com` iyadoo uusan wax CORS qalad ah soo tuurin.
4. **50-kii isbeddel ee local-ka kuu yaallayna** siday ahaayeen ayay u taagnaan doonaan oo waxba looma dirayo Git ilaa server-ka online-ka ahi si buuxda u shaqeeyo.
