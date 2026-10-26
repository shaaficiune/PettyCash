# 🚀 PETTY CASH MANAGEMENT SYSTEM — STRATEGIC FUTURE PLAN & ROADMAP
> **Document Status:** Strategic Architecture & Future Expansion Plan  
> **Target Platform:** Somtel & Bluekom Enterprise Petty Cash Management  
> **Last Updated:** 2026-10-26  

---

## 📌 Executive Summary
Nidaamka Petty Cash-ka ee Somtel & Bluekom wuxuu xilligan taagan yahay heer aad u sarreeya oo buuxiyey dhammaan shuruudihii maamulka maaliyadda:
* **Workflow:** Maker-Checker-Disburser (Employee → Approval 1 → Approval 2 → Cashier).
* **Isolation:** Kala soocnaanta xogta Somtel iyo Bluekom ee gobollada iyo waaxyaha.
* **Accounting:** Diiwaanka lacagaha (Ledger), Payment Vouchers (A5 continuous layout), iyo Buug-xisaabeedka Bisha (Monthly Book Excel with embedded logos & dynamic formulas).
* **Security:** Real Client Public IP resolution, Audit Trail, Cloudflare Tunnel, iyo DoS rate-limiting.

Dokumentigan wuxuu qeexayaa **7-da Qodob ee Istiraatiijiga ah** ee nidaamka u gudbinaya heer **Enterprise Tier-1 (Global Standard)** marka la doonayo in shaqada la sii ballaariyo.

---

## 1. 📲 Direct eDahab & Mobile Money API Payout (Lacag-bixin Toos ah)

### Xaaladda Hadda
Khasnajigu (Cashier) marka codsi loo soo ansixiyo, lacagta wuxuu kaga diraa taleefankiisa gacanta ama portal-ka eDahab, kadibna Transaction ID-ga ama Invoice Number ayuu nidaamka gacanta kaga dhex qoraa.

### Qorshaha Mustaqbalka
* **Direct Integration:** Ku xiridda nidaamka **eDahab B2C API** (ama Somtel Merchant Payout Gateway).
* **One-Click Payout:** Batoon toos ah oo ah `"Disburse via eDahab"` marka uu khasnajigu riixo:
  1. Nidaamku wuxuu API request u dirayaa eDahab Server isagoo wata Phone-ka qaataha iyo Cadadka lacagta.
  2. eDahab waxay soo celinaysaa `Transaction Reference ID` iyo xaqiijin guul ah (`SUCCESS`).
  3. Nidaamku si toos ah ayuu xogtaas ugu qorayaa Database-ka (`Payment` & `PettyCashLedger`).
* **Faa'iidada Ganacsiga:** 
  - Meesha waxay ka saaraysaa qaladaadka lambarka telefoonka ama cadadka lacagta la dirayo.
  - Waxay baabi'inaysaa daaha ku yimaada bixinta lacagaha degdegga ah.

---

## 2. 🔔 Real-Time SMS & WhatsApp Alerts (Wargelin Degdeg ah)

### Xaaladda Hadda
Wargelintu waxay ka dhex shaqaysaa gudaha web-ka oo kaliya (In-App Notification Bell). Haddii uusan maamuluhu ama shaqaaluhu system-ka furin, ma ogaanayo codsiga yaalla.

### Qorshaha Mustaqbalka
* **SMS Gateway Integration:** Ku xiridda Somtel SMS API / Infobip / Twilio.
* **Farriimaha Tooska ah (Automated Triggers):**
  - **Codsi Cusub:** Marka shaqaaluhu codsi soo gudbiyo → SMS degdeg ah ha gaadho Accountant-ka (Approval 1).
  - **Stage 2 Review:** Marka Accountant-ku ansixiyo → SMS ha u dhaco Head of Finance (Approval 2).
  - **Lacag Bixin:** Marka la bixiyo → SMS ha helo shaqaalaha oo leh:
    > *“Codsigaagii #PC-20261026-0012 ee $45 waa la ansixiyey, fadlan khasnadda kala xiriir ama hubi akoonkaaga eDahab.”*
  - **Xisaab-xidhka (Settlement Reminder):** 48 saac kadib bixinta lacagta, haddii uusan shaqaaluhu rasiidhada soo gelin, nidaamku si toos ah ha ugu diro fariin xusuusin ah.

---

## 3. 📷 OCR / AI Smart Receipt Scanner (Akhrinta Sawirka Rasiidhada)

### Xaaladda Hadda
Shaqaaluhu marka uu rasiidhada kharashka soo geliyo (Expense Settlement), sawirka rasiidka ayuu attach ku soo daraa, laakiin qiimaha lacagta iyo magaca ganacsadaha gacanta ayuu ku qoraa.

### Qorshaha Mustaqbalka
* **AI Computer Vision (OCR):** Isku-xirka adeegyada akhriska sawirka (Google Cloud Vision API ama Tesseract OCR).
* **Habka Shaqada:**
  1. Shaqaaluhu rasiidka ayuu sawir ka qaadayaa taleefankiisa.
  2. Nidaamku wuxuu sawirka ka soo dhex saarayaa:
     - **Cadadka dhabta ah (Total Amount)**
     - **Taariikhda Rasiidka (Receipt Date)**
     - **Magaca Ganacsadaha / Kaalinta / Hoteelka (Vendor Name)**
  3. Shaqaalaha waxaa loogu soo bandhigayaa foomka isagoo buuxa si uu u xaqiijiyo oo kaliya.
* **Faa'iidada Ganacsiga:**
  - Ka hortagga been-abuurka rasiidhada iyo qaladaadka xisaabta ee shaqaalaha.
  - Dedajinta hubinta hantidhawrka (Auditing clearance).

---

## 4. 📊 Dynamic Budget Thresholds & Overspending Caps (Xakamaynta Miisaaniyadda)

### Xaaladda Hadda
Gobol kasta wuxuu leeyahay Float la wareejiyo (Top-Up), laakiin ma jiro xad cad (Budget Ceiling) oo bil kasta u cayiman waax kasta.

### Qorshaha Mustaqbalka
* **Monthly Budget Allocation:** In gobol kasta iyo waax kasta (tusaale: *Fleet Mudug, IT Maintenance Nugaal*) loo dejiyo miisaaniyad bil ah (Monthly Budget Limit).
* **Digniinaha Caqliga leh (Smart Warning Indicators):**
  - **80% Gaadhis:** Nidaamku wuxuu muujinayaa digniin jaalle ah (`Soft Warning`) oo u sheegaysa maamulaha in miisaaniyadii gabaabsi tahay.
  - **100% Dhaafis:** Nidaamku wuxuu si ku-meel-gaar ah u xannibayaa (`Hard Cap`) codsiyo cusub illaa Maamulaha Sare (Head of Finance / CFO) uu oggolaansho gaar ah bixiyo (Budget Override).
* **Faa'iidada Ganacsiga:** Ka hortagga kharash-dhaafka lama filaanka ah ee gobollada.

---

## 5. 📱 PWA & Offline Support for Regional Engineers (Shaqaalaha Baadiyaha)

### Xaaladda Hadda
Nidaamku wuxuu ku tiirsan yahay in qofku markasta haysto xiriir internet oo deggan oo browser-ka ka furan.

### Qorshaha Mustaqbalka
* **Progressive Web App (PWA):**
  - App-ka waxa lagu shuban karaa taleefanka gacanta (Android & iOS) sida Native App oo kale iyadoon Google Play Store loo baahnayn.
* **Offline Draft Mode:**
  - Injineerrada shirkadda ee taga buuraha ama meelaha shabakaddu ku liidato waxay diyaarsan karaan codsiyada (Draft Request) iyo sawirrada rasiidhada iyagoon internet haysan.
  - Isla marka taleefanku shabakad helo (Online sync), xogtu waxay si toos ah ugu dhacaysaa Server-ka.

---

## 6. 🏢 Vendor & Supplier Master Directory (Diiwaanka Ganacsatada)

### Xaaladda Hadda
Magacyada ganacsatada (Kaalmaha shidaalka, garaashyada, hoteellada) waxa lagu qoraa meelaha sharraxaadda (Purpose/Description).

### Qorshaha Mustaqbalka
* **Vendor Management Module:**
  - Diiwaan gooni ah oo ay ku qoran yihiin ganacsatada rasmiga ah ee Somtel & Bluekom heshiiska kula jiraan.
  - Taariikh xisaabeed (Vendor Statement): In hal batoon lagu arki karo: *“Sanadkan kaalinta heblaayo intee lacag ah ayaa shidaal kaga soo baxday guud ahaan Somtel ama Bluekom?”*
* **Faa'iidada Ganacsiga:** Gorgortanka qiimaha shirkadaha wax bixiya iyo xisaab-xidh hufan.

---

## 7. 🗄️ One-Click Fiscal Year Closing & Audit Archive (Xidhitaanka Sanad-xisaabeedka)

### Xaaladda Hadda
Warbixinnada waxa lagala soo bixi karaa bil-bil Excel iyo PDF ahaan.

### Qorshaha Mustaqbalka
* **Annual Audit Archive Generator:**
  - 31-ka December ee sanad kasta, batoon ah `"Close Fiscal Year & Generate Audit Bundle"`:
  - Wuxuu si toos ah u soo saarayaa hal fayl oo Zip ah oo ay ku dhex habeysan yihiin:
    1. Dhammaan Payment Vouchers-ka sanadka oo wata saxiixyadooda (PDF).
    2. Dhammaan rasiidhadoodii la xiriiray (Attachments/Receipts).
    3. Buug-xisaabeedkii bil kasta (Monthly Books in Excel).
    4. Diiwaanka Hantidhawrka (Audit Trail CSV).
* **Faa'iidada Ganacsiga:** Diyaargarow 100% ah oo loogu talagalay Hantidhawrayaasha Guud (External Audit) iyadoo aan hal maalin lagu daalin ururinta waraaqo.

---

## 🗓️ Talo ku Saabsan Qaabka Hirgelinta (Phased Implementation)

| Wajiga (Phase) | Mudada | Mudnaanta (Priority) | Waxyaabaha Lagu Qabanayo |
|----------------|--------|----------------------|--------------------------|
| **Phase 1** | Q1 | 🔴 Sare (High) | SMS Notifications + PWA Mobile Optimization |
| **Phase 2** | Q2 | 🟠 Dhexe (Medium) | Dynamic Budget Limits + Vendor Directory |
| **Phase 3** | Q3 | 🟡 Muhiim (Strategic) | Direct eDahab API Payout + OCR Receipt Scanner |
| **Phase 4** | Q4 | 🟢 Dhamaystir (Annual) | Fiscal Year Audit Archiving Bundle |

---
*Dokumentigani waa qorshe hage ah (Strategic Guide) oo loogu talagalay horumarinta mustaqbalka, mana waxyeellaynayo koodhka iyo database-ka hadda shaqaynaya ee server-ka saaran.*
