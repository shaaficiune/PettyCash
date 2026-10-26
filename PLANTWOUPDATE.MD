# 📋 PLANTWOUPDATE.MD — QORSHAHA LABAAD EE HORUMARINTA & NABADGELYADA NIDAAMKA

**Mashruuca:** Somtel & Bluekom Petty Cash Management System  
**Nuqulka (Version):** 2.2 — Post-Audit & Separation of Duties Upgrade  
**Taariikhda:** 2026-10-25  
**Ujeeddada Guud:**  
In la hirgeliyo doorka cusub iyo awoodaha gaarka ah ee **Approval Two**, in shaqaalaha loo xaddido warbixinnadooda gaarka ah (**Employee Scoped Reports**), in la casriyeeyo **Payment Voucher-ka** si uu ula mid noqdo *Claude Artifact-ka*, iyadoo la dhowrayo **100% badbaadada xogta ku jirta server-ka online-ka ah** (Zero Data Loss & Zero Breaking Changes).

---

## 🛡️ 1. MABAADI'DA AASAASIGA AH EE BADBAADADA SERVER-KA (ZERO-RISK DEPLOYMENT)

Si koodhka marka lagu riixo GitHub loona qaado server-ka (`bash update-server.sh`) uusan nidaamku marnaba u kharribmin ama database-ku u jabin:

1. **Ma Jiro Wax Database Schema Ah Oo La Bur-burinayo (Zero Destructive Migrations):**
   * Tiirarka (columns), jadwallada (tables), iyo xiriirrada (relations) hadda jira midna lama beddelayo, lamana tirtirayo.
   * `npx prisma db push` waxay ku shaqaynaysaa si nabadgelyo leh iyadoo aan wax xog ah lumin.
2. **Dib-u-la-jaanqaad (100% Backward Compatibility):**
   * Dhammaan codsiyadii hore (DRAFT, PENDING, APPROVED, PAID) waxay u shaqayn doonaan sidoodii hore.
3. **Nabadgelyada Server-ka & Update Script:**
   * Script-ka `update-server.sh` wuxuu u soconayaa si habaysan (`git pull` ➔ `npm install` ➔ `prisma generate` ➔ `init-db.js` ➔ `build` ➔ `pm2 restart`).

---

## 👥 2. QAYBTA 1: XADDIDAADDA WARBIXINNADA SHAQAALAHA (EMPLOYEE SCOPED REPORTS)

### A. Dhibaatada Hadda Jirta:
Hadda marinka `/transactions` (Petty Cash Reports) waxaa u xirnaa shaqaalaha caadiga ah, ama haddii la furo waxay halis ugu jireen inay arkaan kharashyada guud ee shirkadda oo dhan.

### B. Xalka & Qorshaha Hirgelinta:
1. **Furitaanka Marinka `/transactions` & Menu-ga:**
   * Shaqaalaha (`EMPLOYEE`) waxaa loo furayaa marinka **Petty cash reports** ee sidebar menu-ga iyo [App.tsx](file:///d:/Petty%20Cash%20App/frontend/src/App.tsx).
2. **Keliya Xogtiisa Gaarka Ah (Strict User-Level Scoping):**
   * Marka `EMPLOYEE` uu soo galo, backend-ka [reports.service.ts](file:///d:/Petty%20Cash%20App/backend/src/reports/reports.service.ts) iyo frontend-ka [TransactionsPage.tsx](file:///d:/Petty%20Cash%20App/frontend/src/pages/TransactionsPage.tsx) waxay xogta ku shaandheynayaan:
     ```typescript
     where.userId = currentUser.id;
     where.companyId = currentUser.companyId;
     ```
   * Shaqaaluhu ma arki karo kharashyada shaqaalaha kale, lacagaha sanduuqa guud (company float), ama ledger-ka guud. Kaliya wuxuu arkaa codsiyadiisa, inta loo oggolaaday, iyo inta loo bixiyay (`PAID`).
3. **Dashboard-ka Shaqaalaha (Petty Cash Summary Widget):**
   * Qaybta sare ee `EmployeeDashboard` waxaa lagu kordhinayaa widget kooban oo muujinaya:
     * **My Total Requests (Bishan):** Tirada codsiyadiisa.
     * **Disbursed Amount (PAID):** Lacagta caddaanka ah ee uu qaatay.
     * **Pending Settlement:** Rasiidhada weli ku dhiman ee laga sugayo.

---

## ⚖️ 3. QAYBTA 2: DOORKA & AWOODAHA CUSUB EE "APPROVAL TWO" (SEPARATION OF DUTIES)

### A. Dhibaatada Hadda Jirta:
Hore qofka **Approval Two** ah (sida Head of Finance ama Agaasime) waxaa la siin jiray doorka `SUPER_ADMIN`. Taasi waxay keentay:
* Inuu arko dhammaan codsiyada shirkadda oo liiskiisu noqdo mid buux-dhaaf ah (cluttered).
* Inuu arki karay oo riixi karay badhanka **"Record Payment"** (lacag-bixinta caddaanka ah), taas oo liddi ku ah xeerka xisaabaadka (Maker-Checker-Disburser principle).

### B. Xalka & Qorshaha Hirgelinta:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        APPROVAL TWO WORKFLOW                           │
├────────────────────────────────────────────────────────────────────────┤
│ 1. VISIBILITY:                                                         │
│    Aragtida sare ee Dashboard-ka & Reports-ka (Executive View).       │
│                                                                        │
│ 2. REQUESTS LIST:                                                      │
│    KALIYA codsiyada u taagan saxiixiisa (Stage 2 / ACCOUNTANT_REVIEW).│
│                                                                        │
│ 3. ACTION:                                                             │
│    Approve (Stage 2) ama Reject / Return for Correction.               │
│                                                                        │
│ 4. AUTO-EXIT:                                                          │
│    Marka codsiga la oggolaado ee uu aado Payment/PAID,                 │
│    wuxuu si toos ah uga baxayaa liiskiisa Pending-ka.                 │
│                                                                        │
│ 5. NO PAYMENT PRIVILEGE:                                               │
│    MA RIIXI KARO badhanka "Record Payment" / "Mark as Paid".          │
│    Badhankaas waxaa KALIYA riixi kara Cashier/Accountant-ka dhabta ah. │
└────────────────────────────────────────────────────────────────────────┘
```

#### Xeerarka Koodhka:
1. **Shaandheynta Liiska Codsiyada ee Approval Two:**
   * Marka qofka Approval Two ahi uu furo [RequestsListPage.tsx](file:///d:/Petty%20Cash%20App/frontend/src/pages/RequestsListPage.tsx), shaandhada hore (default filter) waxay noqonaysaa codsiyada sugaya saxiixiisa:
     ```typescript
     // Kaliya codsiyada sugaya Stage 2
     status = RequestStatus.ACCOUNTANT_REVIEW;
     ```
   * Codsiyada qabyada ah (DRAFT), kuwa aan weli Stage 1 soo dhaafin (PENDING_APPROVAL), iyo kuwa la bixiyay (PAID) laguma soo qasayo liiskiisa maalinlaha ah.
2. **Reebidda Badhanka Lacag-bixinta (Disbursement Button Guard):**
   * Faylka [RequestDetailPage.tsx](file:///d:/Petty%20Cash%20App/frontend/src/pages/RequestDetailPage.tsx):
     ```typescript
     // Badhanka "Record Payment" waxaa keliya arkaya Accountant-ka bixinaya lacagta
     const canRecordPayment = isAccountantRole && !isApprovalTwoOnly;
     ```
   * Faylka backend-ka [payments.service.ts](file:///d:/Petty%20Cash%20App/backend/src/payments/payments.service.ts):
     * Waxaa lagu darayaa xaqiijin ah in qofka ansixinta bixiyay (Approver) uusan isla markaas noqon karin qofka lacagta caddaanka ah dhiibaya haddii nidaamku yahay Approval Two.

---

## 🧾 4. QAYBTA 3: PAYMENT VOUCHER-KA CUSUB & KALA-SOOCA BUUGGA BILAAHA AH

### A. Rasiidka Lacag-Bixinta ee Codsi Kasta (Single Payment Voucher — `PaymentVoucherModal.tsx`):
Rasiidka daabacaadda ee codsi kasta (Voucher) wuxuu ku koobnaanayaa **2-da Saxiix ee Rasmiga ah (Dual-Signature Block)**:

1. **Initiated By (Accountant / Approval One):**
   * Magaca Accountant-ka diyaariyay/hubiyay codsiga ee **Approval One** (tusaale: *Abshir Qasim* ama accountant-ka ku xusan nidaamka).
   * Doorka: *Accountant / Approval One*.
   * Xariiqda saxiixa & taariikhda.
2. **Approved By (Approval Two / Head of Finance):**
   * Qofka wata doorka **Approval Two** ee ansixiyay codsiga (tusaale: *Madaxa Maaliyadda / DG*).
   * Doorka: *Approval Two / Authorized Approver*.
   * Xariiqda saxiixa & shaambadda rasmiga ah.

> 📌 **Xusuusin Muhiim ah (Received By Payee):**  
> **Looma baahna** qayb saxiix ah oo hoose oo ah *Received by Payee*. Macluumaadka qofka lacagta la siiyay iyo lacag-bixinta (`Paid To / Beneficiary Name`, `Phone Number`, `Amount`, `Budget Head`, iyo `Purpose`) waxay si buuxda oo cad ugu qoran yihiin **qaybta sare ee foomka/jadwalka Voucher-ka**, sidaas darteed wax saxiix ah oo dheeraad ah looma baahna xagga hoose.

---

### B. Buugga Xisaabta ee Bisha (Monthly Final Petty Cash Book):
* **Saxeexyada Hore ee 3-da ah (Prepared By, Verified By, Approved By):**
  * Qaabkii hore ee saxiixyada 3-da ahaa (**Prepared By** - Accountant/Cashier, **Verified By** - Internal Auditor/Supervisor, **Approved By** - DG Telecom / Head of Accounting) wuxuu si gaar ah ugu hadhayaa una noqonayaa **Buugga Final-ka ee Bisha (Monthly Final Petty Cash Book)**.
  * Buuggani waa warbixinta guud ee bishii mar la daabaco oo ay shirkad walba (Somtel ama Bluekom) gaar keeda u leedahay ledger-keeda xisaabeed iyo audit-ka xidhidhka bisha.

---

### C. Magacaabista "Initiators":
* Meelaha shaashadaha qaarkood ay ku qoran tahay *Users*, waxaa loo beddelayaa ama loogu caddaynayaa **Initiators** si ay u waafaqdo eray-bixinta rasmiga ah ee artifact-ka.

---

## 🚀 5. TALLAABOOYINKA HIRGELINTA (STEP-BY-STEP ROLLOUT)

| Tallaabada | Hawsha La Qabanayo | Faylasha Ay Khuseyso |
| :--- | :--- | :--- |
| **Tallaabada 1** | U furitaanka Petty Cash Reports shaqaalaha oo xogtooda ku xaddidan | `App.tsx`, `DashboardLayout.tsx`, `TransactionsPage.tsx`, `reports.service.ts` |
| **Tallaabada 2** | Hirgelinta awoodaha & shaandhada gaarka ah ee **Approval Two** | `RequestsListPage.tsx`, `RequestDetailPage.tsx`, `payments.service.ts` |
| **Tallaabada 3** | Casriyeynta saxiixyada **Payment Voucher Modal** (Kaliya 2 saxiix: Initiated By: A1/Accountant & Approved By: A2; lagana saaro Received By hoose maadaama xogtu kor ku qoran tahay) | `PaymentVoucherModal.tsx`, `Reportplan.md` |
| **Tallaabada 4** | Ku darista Petty Cash Summary widget ee Dashboard-ka Shaqaalaha | `DashboardPage.tsx` |
| **Tallaabada 5** | Tijaabinta dhinaca TypeScript & Production Build (`npm run build`) | Frontend & Backend verification |

---

## 📌 6. XAQIIJINTA UGU DAMBEYSA
Qorshahani wuxuu xaqiijinayaa:
1. Xogta server-ka online-ka ah inay 100% badbaado ahaato.
2. Nidaamka maamulka lacagta caddaanka ahi inuu yeesho kala-sooc xisaabeed oo buuxa (Separation of Duties).
3. In shaqaaluhu helaan warbixinnadooda iyagoon faragelinayn xogta guud ee shirkadda.
4. In rasiidhada daabacaadda (Payment Voucher) ay u ekaato mid heer sare ah oo leh dhammaan saxiixyadii loo baahnaa.
