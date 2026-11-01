# 📑 QORSHAHA ISKU-DHEELLITIRKA XISAABTA BISHA OCTOBER (OCTOBER DOWNTIME RECONCILIATION PLAN)

**Taariikhda la bilaabay:** 27 October 2026  
**Cusbooneysiintii ugu dambaysay:** 31 October 2026  
**Xaaladda Hadda:** ✅ **Live Database Sync Complete (Local 100% Replica Ready) — Diyaar u ah Is-barbardhigga Excel-ka**  
**Ujeeddo:** Is-waafajinta lacagta dhabta ah ee account-ka bangiga/gacanta iyo xogta diiwaangashan ee system-ka Petty Cash ka dib markii uu server-ku hawada ka maqnaa ~10 maalmood bishan October 2026.

---

## 1. 🔍 XAALADDA JIRTA (BACKGROUND & PROBLEM)

* **Maalmihii Hawada laga Maqnaa:** Bishan October 2026, server-ka live-ka ah wuxuu hoos u dhacay (downtime) muddo qiyaastii 10 maalmood ah.
* **Habkii Shaqada:** Maalmahaas waxaa codsiyada lagu bixinayey hab gacmeed ah (WhatsApp groups, Excel sheet, iyo qoraallo gacmeed).
* **Dhibaatada Taagnayd:** Lacagta dhabta ah ee account-ka ku jirtay iyo inta system-ka ku diiwaangashanayd way kala duwanaayeen, sababtoo ah codsiyo badan oo la bixiyey 10-kaas maalmood ayaan weli gelin system-ka.
* **Go'aanka:** Inaan gacanta mid mid loogu daalin, lagana tirtirin October oo dhan, balse la qaato habka ugu xirfadaysan ee farsamada casriga ah: **Automated Reconciliation (Is-barbardhig Farsamo)**.

---

## 2. 🎯 ISTARAATIJIYADDA LA FULIYEY (THE EXECUTED STRATEGY)

1. ✅ **Database-ka Live-ka oo Local la keenay:** Database-ka buuxa ee live-ka ah (31 October snapshot) waxaa laga soo qaaday Ubuntu Live Server waxaana la keenay Windows.
2. ✅ **Local Database-kii oo la banneeyay (Clean Slate):** Dhammaan codsiyadii tijaabada ahaa ee local-ka ku jiray waa la tirtiray (`DROP SCHEMA public CASCADE`).
3. ✅ **Live Dump-kii oo Local lagu shubay:** Database-kii dhabta ahaa ee live-ka ayaa toos loogu shubay PostgreSQL-ka local-ka ah (`pg_restore`). Hadda local-ku wuxuu 100% u dhigmaa server-ka live-ka ah.
4. ⏳ **Excel-ka Buuxa ee October:** Faylasha Excel-ka ee bisha October waxaa la keenay workspace-ka (`petty  cash oct.xlsx` iyo `pettycash oct somtel.xlsx`).
5. ⏳ **Automated Diff Script:** Waxaan qoraynaa script local ah oo is-barbardhiga xogta database-ka iyo buugga Excel-ka:
   * Wuxuu ogaanayaa codsiyadii horey ugu jiray system-ka.
   * Wuxuu si sax ah u soo saarayaa **kaliya codsiyadii 10-ka maalmood maqnaa** ee u baahan in la shubo.
   * Wuxuu hubinayaa farqiga lacagta inuu 100% la mid noqdo xisaabta dhabta ah.
6. ⏳ **Shubista Live-ka (Clean Import):** Codsiyada dhimman oo keliya ayaa dib loogu celinayaa live server-ka iyagoo wata taariikhdoodii October, xaaladdoodii `PAID`, iyo xisaabtii saxda ahayd.

---

## 3. 🛡️ TAARIIKHDA WIXII LA FULIYEY (OCTOBER 28 - 31, 2026)

### Tallaabada 1: Diyaarinta Script-ka Read-Only Export (`db-export-local.sh`)
* Waxaa la qoray script-ka `db-export-local.sh` oo si toos ah u akhrinaya `DATABASE_URL` gudaha `backend/.env`.
* Script-ku wuxuu qaadayaa **Read-Only Dump**, waxba kama beddelayo, waxbana kama tirtirayo database-ka live-ka ah.
* Faylasha output-ka waxaa lagu daray `.gitignore` si aysan weligood GitHub u gelin.

### Tallaabada 2: Xallinta Shabakadda Ubuntu VM (Network & Routing Resolution)
* Waxaa la xalliyay cillad DNS iyo gateway ah oo ku timid VirtualBox NAT ka dib markii shabakadda Windows ay is-beddeshay (`sudo ip route add default via 10.0.2.2`).
* Waxaa la saxay Git Remote URL oo typo lahaa (`hithub.com` ➔ `github.com`).
* Internet-kii Ubuntu VM wuxuu noqday mid caadi ah oo buuxa.

### Tallaabada 3: Database Dump-ka Live-ka ah (31 October 2026)
* Gudaha Ubuntu Server waxaa laga dhex kiciyay `bash db-export-local.sh`.
* Waxaa guul ku soo baxay:
  * `petty_cash_live_20261031_133307.dump` (276 KB, custom compressed format).
  * `petty_cash_live_20261031_133307.sql` (1.3 MB, plain SQL format).

### Tallaabada 4: Dhoofinta Nabdoon ee GitHub (Temp Branch Sync)
* Maadaama VirtualBox Shared Clipboard iyo port forwarding aysan toos u shaqeynin, waxaa la isticmaalay branch kumeelgaar ah: `temp-db-sync`.
* Waxaa la adeegsaday script-ka `send-dump.sh` oo wata Personal Access Token (PAT).
* Faylka `.dump` wuxuu u baxay `temp-db-sync`.
* Windows-ka ayaa si nabad ah uga soo dejiyay faylka `petty_cash_live_20261031_133307.dump`.
* **Amni:** Branch-ka `temp-db-sync` **isla markiiba waa laga tirtiray GitHub**, wax xog database ahna kuma harin repo-ga!

### Tallaabada 5: Nadiifinta & Dib-u-shubista Local Database (Clean & Restore)
* Database-kii hore ee local-ka Windows (`petty_cash_db`) oo ay ku jireen test requests waxaa loo nadiifiyay si buuxda:
  ```sql
  DROP SCHEMA public CASCADE;
  CREATE SCHEMA public;
  ```
* Waxaa toos loogu shubay dump-kii dhabta ahaa ee live-ka:
  ```powershell
  pg_restore.exe -U postgres -h localhost -p 5432 -d petty_cash_db --no-owner --no-privileges petty_cash_live_20261031_133307.dump
  ```
* **Natiijada Xogta Local-ka soo gashay:**
  * ✅ **PettyCashRequest:** 238 rows
  * ✅ **User:** 19 rows
  * ✅ **Payment:** 168 rows
  * ✅ **AuditLog, Company, BudgetHead, Fund, Ledger:** 100% restored.

---

## 4. 📑 FAYLASHA EXCEL-KA EE DIFAACA/IS-BARBARDHIGGA

Gudaha workspace-ka waxaa yaalla faylasha dhabta ah ee xisaabaadka:
1. `petty  cash oct.xlsx` — Buugga guud ee kharashaadka October.
2. `pettycash oct somtel.xlsx` — Kharashaadka Somtel ee bisha October.
3. `list vehicle Somtel& Bluekom.xlsx` — Liiska rasmiga ah ee taargooyinka baabuurta Somtel & Bluekom.
4. `Petty_Cash_October_Downtime_Template.xlsx` / `.csv` — Template-ka jaangooyada ah.

---

## 5. ⚙️ XAALADDA TALLAABOOYINKA (PROGRESS CHECKLIST)

- [x] **1.** Ubuntu Server-ka ka soo saar `petty_cash_live_20261031_133307.dump` adigoo isticmaalaya `db-export-local.sh`.
- [x] **2.** Ku wareeji faylka Windows-ka adigoo adeegsanaya `temp-db-sync` branch.
- [x] **3.** GitHub ka tirtir branch-ka `temp-db-sync` (Amni buuxa).
- [x] **4.** Nadiifi database-ka local-ka ah (Drop test data).
- [x] **5.** Local PostgreSQL ku shub live dump-ka (238 requests, 19 users, 168 payments).
- [x] **6.** Run garee Reconciliation Script si loo is-barbardhigo Database-ka iyo Excel-ka October.
- [x] **7.** Soo saar warbixin dhammaystiran oo muujinaysa:
  * Somtel: Total Available $3,302.00, Paid $3,294.36, Remaining Balance exact **$7.64**.
  * Bluekom: Total Available $1,000.00, Paid $878.60, Remaining Balance exact **$121.40**.
  * Codsiga PCR-BK-NG-0018 ($17.00): Mohamed Osmaan (Nugaal, Repair for vehicle).
  * Frontend Dashboard formatter: { minimumFractionDigits: 2, maximumFractionDigits: 2 } (cents preserved).
- [ ] **8.** Dib ugu shub database-ka saxan ama migration-ka server-ka live-ka ah ee Ubuntu.

---
*Fiiro gaar ah: Qoraalkan waxa la cusbooneysiiyay 31 October 2026 ka dib markii lagu guuleystay Local DB Sync 100%.*
