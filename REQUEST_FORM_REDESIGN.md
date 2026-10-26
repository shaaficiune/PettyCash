# 📋 NEW REQUEST FORM — REDESIGN SPEC
**Source:** Claude Artifact screenshots (2026-10-23) + code analysis  
**File:** `frontend/src/pages/RequestFormPage.tsx`  
**Status:** ✅ IMPLEMENTED — 2026-10-23 (Phase A: Frontend complete. Phase B: DB migration pending)  

---

## 🔍 GAP ANALYSIS: Hadda jira vs. Artifact

| Qaybta | Hadda (Current) | Artifact (Target) | Farqi? |
|---|---|---|---|
| Budget Head input | `<Select>` dropdown | **Pill/chip toggle buttons** | ✅ Bedel |
| Order of fields | Purpose → Amount → Desc → Priority → Date → Budget Head | **Budget Head FIRST** (step 1) → Company → Region → Date → Amount → [Conditional] → Recipient | ✅ Bedel |
| Purpose field | Free-text input | **Auto-generated** from conditional sub-fields | ✅ Bedel |
| Vehicle plate | ❌ Jirto | **Dropdown** filtered by company + region | ✅ Ku dar |
| Transportations fields | ❌ Jirto | "What was transported?" + From/To route | ✅ Ku dar |
| Generator fields | ❌ Jirto | "Generator site" + "Work done or parts bought" | ✅ Ku dar |
| Receipt toggle | ❌ Jirto | **Receipt / No receipt** pill toggle | ✅ Ku dar |
| Description preview | ❌ Jirto | **"DESCRIPTION THAT WILL BE SAVED"** amber box | ✅ Ku dar |
| Receipt/invoice # | `invoiceNumber` field | "Receipt / invoice number" (optional) | ✅ Ku dar |
| Priority field | Jiraa | **❌ La saari** (artifact-ku ma lahan) | ✅ Saari |
| Project field | Jiraa | **❌ La saari** (artifact-ku ma lahan) | ✅ Saari |
| Amount limit UI text | "Max: $50.00" | "Single-request limit: $1,000.00" | Keep $50 backend, update UI hint |
| Buttons | "Save Draft" + "Submit Request" | **"Clear"** + **"Submit for approval"** | ✅ Bedel text |

---

## 🎨 DESIGN SYSTEM (Artifact-ka sawirka ku salaysan)

- **Background:** Dark navy (dark theme)
- **Selected pill (Budget Head):** Gold #F5B700 with dark text, bold
- **Unselected pill:** Outlined dark border, dim text
- **Company badge:** Gold #F5B700 background (Bluekom), dark text — read-only
- **"DESCRIPTION THAT WILL BE SAVED" box:** Amber/gold tinted background, UPPERCASE label, preview text
- **Submit button:** Gold #F5B700 filled, bold
- **Clear button:** Outlined, transparent fill
- **Receipt toggle:** Receipt (gold filled) | No receipt (outlined)

---

## 📐 QAAB-DHISMEEDKA CUSUB (New Layout Order)

```
Fields marked * are required. Approval One is notified when you submit.

1. Budget head * · choose this first
[ Transportations ] [ Repair of Vehicles ]
[ Repair of Buildings ] [ Repair of Generators ]
[ Refreshments ] [ Miscellaneous Exp. ] [ Tasliix ]
[ General Expenses ]

Company *
[ Bluekom ]  ← auto badge, read-only

Region *
[ Bari & Karkaar ▾ ]  ← locked from user profile
"Set by your user profile"

Request date *
[ 23 / 10 / 2026 📅 ]

Amount (USD) *
[ 0.00 ]
"Single-request limit: $50.00"

Details *  ← dynamic label/hint per budget head

══════════ CONDITIONAL FIELDS ══════════
(changes based on selected budget head)

┌─────────────────────────────────────┐
│ DESCRIPTION THAT WILL BE SAVED      │
│ [auto-preview from sub-fields]      │
└─────────────────────────────────────┘

Recipient name *
[ ]

Recipient phone *
[ +252 90 xxx xxxx ]

Receipt *
[ Receipt ] [ No receipt ]  ← pill toggle

Receipt / invoice number
[ Optional ]

[ Clear ]  [ Submit for approval ]
```

---

## 🔧 CONDITIONAL FIELDS PER BUDGET HEAD

### 1. 🚗 Repair of Vehicles
- **Details hint:** "Choose the vehicle, then say what was repaired or bought."
- Fields:
  - `Vehicle plate no. *` → `<Select>` dropdown
    - Filtered by: user.companyId + user.regionId
    - Hint: "Bluekom vehicles in Bari & Karkaar" (dynamic)
    - Placeholder: "Choose the vehicle"
  - `Work done or parts bought *` → text input ("e.g. Oil change and filter")
  - `Garage or mechanic` → text input (Optional)
  - `Extra detail` → text input (Optional)
- **Auto-description:** "[Plate] — [Work done]. [Garage]. [Extra]"

### 2. ⚡ Repair of Generators
- **Details hint:** "Name the site, then say what was done to the generator."
- Fields:
  - `Generator site *` → text input ("e.g. Carmo site")
  - `Work done or parts bought *` → text input ("e.g. Battery acid and filter")
  - `Extra detail` → text input (Optional)
- **Auto-description:** "[Site] — [Work done]. [Extra]"

### 3. 🚛 Transportations
- **Details hint:** "Say what was transported and the route."
- Fields:
  - `What was transported? *` → text area ("e.g. Fiber cable, simcards, Eng. Mohamed")
  - `From *` → text input (origin)
  - `To *` → text input (destination)
- **Auto-description:** "Transported: [what]. From [from] to [to]."

### 4. 🏗️ Repair of Buildings
- **Details hint:** "Name the location and describe what was repaired."
- Fields:
  - `Building / location *` → text input
  - `Work done or parts bought *` → text input
  - `Extra detail` → text input (Optional)
- **Auto-description:** "[Location] — [Work done]. [Extra]"

### 5. ☕ Refreshments / Miscellaneous Exp. / Tasliix / General Expenses
- **Details hint:** "Describe what was bought or the occasion."
- Fields:
  - `Description *` → text area (free text, required)
- **Auto-description:** Same as description input

---

## 🚗 VEHICLE FLEET — IMPLEMENTATION OPTIONS

### Option A: CompanyVehicle DB table (Full solution)
Add to `schema.prisma`:
```prisma
model CompanyVehicle {
  id          String   @id @default(uuid())
  plateNumber String   // "JI119"
  model       String?  // "Toyota Noah"
  companyId   String
  regionId    String?
  status      String   @default("ACTIVE")
  createdAt   DateTime @default(now())
  company     Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  region      Region?  @relation(fields: [regionId], references: [id], onDelete: SetNull)
}
```
Add to `Company` model: `vehicles CompanyVehicle[]`
Add to `Region` model: `vehicles CompanyVehicle[]`

API: `GET /companies/vehicles?companyId=X&regionId=Y`

Seed vehicles per region+company (JI119, XH174, GM461, QK466, etc.)

### Option B: Frontend hardcode (Quick interim)
Keep a JSON lookup in frontend, grouped by company name + region name.
No migration needed. Replace with DB later.

---

## 📦 SCHEMA CHANGES NEEDED (PettyCashRequest)

Add optional fields:
```prisma
vehiclePlate    String?   // e.g. "JI119"
hasReceipt      Boolean   @default(true)
transportFrom   String?   // Transportations origin
transportTo     String?   // Transportations destination  
generatorSite   String?   // Repair of Generators site
```

DTO changes: Add the above fields to `CreateRequestDto` and `UpdateRequestDto`.

---

## 💾 FIELD MAPPING: Artifact → Current DB

| Artifact Field | DB Field | Status |
|---|---|---|
| Budget head chip | `budgetHeadId` | Already exists |
| Company badge | `companyId` (from user) | Already exists |
| Region | `regionId` (from user) | Already exists |
| Request date | `requiredDate` | Already exists |
| Amount | `requestedAmount` | Already exists |
| Vehicle plate no. | `vehiclePlate` | ❌ ADD |
| Work done / description | `purpose` (auto-built) | Map to purpose |
| Generator site | `generatorSite` | ❌ ADD or embed in description |
| From / To | `transportFrom`, `transportTo` | ❌ ADD or embed in description |
| Auto-description | `description` | Already exists |
| Recipient name | `receiverName` | Already exists |
| Recipient phone | `receiverPhone` | Already exists |
| Receipt toggle | `hasReceipt` | ❌ ADD |
| Receipt / invoice # | `invoiceNumber` | Already exists |

---

## ⚠️ IMPORTANT NOTES

1. **Amount limit:** Artifact shows "$1,000.00" but our backend enforces **$50 max**. UI should show "Single-request limit: $50.00".

2. **Region:** Artifact shows it as a dropdown — but since it's set from user profile, keep it **read-only** (locked) as is. Show "Set by your user profile" hint.

3. **Budget head name mismatches (Artifact vs DB):**
   - Artifact "Transportations" → DB "Transportation" (ends without 's')
   - Artifact "Refreshments" → DB "Refreshment"
   - Artifact "Miscellaneous Exp." → DB "Miscellaneous expenses"
   - Artifact "General Expenses" → ❌ NOT in DB — may need to add to seed

4. **"Approval One is notified when you submit"** — Show this as subtitle/note at top of form.

5. **Remove from UI:** Priority field, Project field (keep sending defaults in payload, just hide from user).

6. **Purpose field:** Becomes auto-generated. The `purpose` DB field will be set to the auto-built description string.

7. **Clear button:** Should reset all form fields to default (blank/empty), not navigate away.

---

## 📅 TAARIIKHDA QAYBTA
- **Taariikhda qorista:** 2026-10-23
- **Sawirrada Artifact-ka:** ✅ 5 screenshots (Repair of Vehicles, Transportations, Repair of Generators x2, bottom of form)
- **Koodhka waa la baray:** ✅ RequestFormPage.tsx (544 lines), schema.prisma, seed.ts
- **Fulinta:** ✅ Dhameystiran (Completed) — Backend endpoint `/companies/vehicles` & Frontend UI connected
