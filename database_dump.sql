--
-- PostgreSQL database dump
--

\restrict plT55B1d4WMM6oxw6tZLpClEhrnGgWu8Nd2RZbcvl9jZWSNBajBqaGFtkA7kIOO

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- Name: PaymentMethod; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."PaymentMethod" AS ENUM (
    'CASH',
    'BANK_TRANSFER',
    'EVC_PLUS',
    'EDAHAB',
    'ZAAD',
    'OTHER'
);


ALTER TYPE public."PaymentMethod" OWNER TO postgres;

--
-- Name: Priority; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."Priority" AS ENUM (
    'LOW',
    'NORMAL',
    'MEDIUM',
    'HIGH',
    'URGENT'
);


ALTER TYPE public."Priority" OWNER TO postgres;

--
-- Name: RequestStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."RequestStatus" AS ENUM (
    'DRAFT',
    'PENDING_APPROVAL',
    'ACCOUNTANT_REVIEW',
    'APPROVED',
    'REJECTED',
    'CORRECTION_REQUIRED',
    'PAYMENT_PROCESSING',
    'PAID',
    'COMPLETED'
);


ALTER TYPE public."RequestStatus" OWNER TO postgres;

--
-- Name: RequestType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."RequestType" AS ENUM (
    'CASH_ADVANCE',
    'CASH_SALES',
    'INVOICE_PAYMENT',
    'OFFICE_EXPENSE',
    'FUEL',
    'TRANSPORT',
    'MAINTENANCE',
    'UTILITIES',
    'PURCHASE',
    'EMERGENCY_EXPENSE',
    'OTHER'
);


ALTER TYPE public."RequestType" OWNER TO postgres;

--
-- Name: RoleName; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."RoleName" AS ENUM (
    'SUPER_ADMIN',
    'ACCOUNTANT',
    'EMPLOYEE'
);


ALTER TYPE public."RoleName" OWNER TO postgres;

--
-- Name: SettlementStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."SettlementStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


ALTER TYPE public."SettlementStatus" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: AuditLog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AuditLog" (
    id text NOT NULL,
    "userId" text,
    action text NOT NULL,
    details text,
    "ipAddress" text,
    "userAgent" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."AuditLog" OWNER TO postgres;

--
-- Name: BudgetHead; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."BudgetHead" (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    "companyId" text NOT NULL,
    "monthlyLimit" numeric(12,2) DEFAULT 0,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."BudgetHead" OWNER TO postgres;

--
-- Name: Company; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Company" (
    id text NOT NULL,
    name text NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Company" OWNER TO postgres;

--
-- Name: Department; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Department" (
    id text NOT NULL,
    name text NOT NULL,
    "companyId" text NOT NULL,
    "monthlyBudget" numeric(12,2) DEFAULT 0,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Department" OWNER TO postgres;

--
-- Name: ExpenseSettlement; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ExpenseSettlement" (
    id text NOT NULL,
    "requestId" text NOT NULL,
    "companyId" text NOT NULL,
    "actualExpenseAmount" numeric(12,2) NOT NULL,
    "remainingBalance" numeric(12,2) NOT NULL,
    notes text,
    status public."SettlementStatus" DEFAULT 'PENDING'::public."SettlementStatus" NOT NULL,
    "approvedById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ExpenseSettlement" OWNER TO postgres;

--
-- Name: Notification; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Notification" (
    id text NOT NULL,
    "userId" text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    "isRead" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Notification" OWNER TO postgres;

--
-- Name: Payment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Payment" (
    id text NOT NULL,
    "requestId" text NOT NULL,
    "companyId" text NOT NULL,
    "paymentDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "amountPaid" numeric(12,2) NOT NULL,
    "paymentMethod" public."PaymentMethod" NOT NULL,
    "transactionId" text,
    "referenceNumber" text,
    "paidById" text NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Payment" OWNER TO postgres;

--
-- Name: Permission; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Permission" (
    id text NOT NULL,
    action text NOT NULL,
    subject text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Permission" OWNER TO postgres;

--
-- Name: PettyCashAttachment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."PettyCashAttachment" (
    id text NOT NULL,
    "requestId" text NOT NULL,
    "fileName" text NOT NULL,
    "fileUrl" text NOT NULL,
    "fileType" text NOT NULL,
    "fileSize" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."PettyCashAttachment" OWNER TO postgres;

--
-- Name: PettyCashFund; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."PettyCashFund" (
    id text NOT NULL,
    "companyId" text NOT NULL,
    month integer NOT NULL,
    year integer NOT NULL,
    "openingBalance" numeric(12,2) NOT NULL,
    "additionalFunding" numeric(12,2) NOT NULL,
    "totalAvailable" numeric(12,2) NOT NULL,
    "approvedAmount" numeric(12,2) DEFAULT 0 NOT NULL,
    "paidAmount" numeric(12,2) DEFAULT 0 NOT NULL,
    "remainingBalance" numeric(12,2) NOT NULL,
    "closingBalance" numeric(12,2),
    status text DEFAULT 'OPEN'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."PettyCashFund" OWNER TO postgres;

--
-- Name: PettyCashLedger; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."PettyCashLedger" (
    id text NOT NULL,
    "fundId" text,
    "companyId" text NOT NULL,
    date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "referenceNumber" text,
    "transactionType" text NOT NULL,
    "employeeId" text,
    "requestId" text,
    description text NOT NULL,
    debit numeric(12,2),
    credit numeric(12,2),
    "balanceAfter" numeric(12,2) NOT NULL,
    remarks text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."PettyCashLedger" OWNER TO postgres;

--
-- Name: PettyCashRequest; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."PettyCashRequest" (
    id text NOT NULL,
    "requestNumber" text NOT NULL,
    "requestDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "userId" text NOT NULL,
    "companyId" text NOT NULL,
    "departmentId" text NOT NULL,
    "projectId" text,
    "regionId" text,
    "budgetHeadId" text,
    "costCenter" text,
    "requestType" public."RequestType" DEFAULT 'OTHER'::public."RequestType" NOT NULL,
    "vendorName" text,
    "invoiceNumber" text,
    "invoiceDate" timestamp(3) without time zone,
    remarks text,
    purpose text NOT NULL,
    description text,
    "requestedAmount" numeric(12,2) NOT NULL,
    "approvedAmount" numeric(12,2),
    currency text DEFAULT 'USD'::text NOT NULL,
    priority public."Priority" DEFAULT 'NORMAL'::public."Priority" NOT NULL,
    status public."RequestStatus" DEFAULT 'DRAFT'::public."RequestStatus" NOT NULL,
    "requiredDate" timestamp(3) without time zone NOT NULL,
    "correctionNotes" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."PettyCashRequest" OWNER TO postgres;

--
-- Name: Project; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Project" (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    "companyId" text NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Project" OWNER TO postgres;

--
-- Name: RefreshToken; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."RefreshToken" (
    id text NOT NULL,
    token text NOT NULL,
    "userId" text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."RefreshToken" OWNER TO postgres;

--
-- Name: Region; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Region" (
    id text NOT NULL,
    name text NOT NULL,
    "companyId" text NOT NULL,
    "monthlyBudget" numeric(12,2) DEFAULT 0,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Region" OWNER TO postgres;

--
-- Name: Role; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Role" (
    id text NOT NULL,
    name public."RoleName" NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Role" OWNER TO postgres;

--
-- Name: RolePermission; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."RolePermission" (
    "roleId" text NOT NULL,
    "permissionId" text NOT NULL
);


ALTER TABLE public."RolePermission" OWNER TO postgres;

--
-- Name: SystemSetting; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SystemSetting" (
    id text NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    description text,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."SystemSetting" OWNER TO postgres;

--
-- Name: User; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."User" (
    id text NOT NULL,
    "fullName" text NOT NULL,
    username text NOT NULL,
    "passwordHash" text NOT NULL,
    email text,
    phone text,
    "companyId" text NOT NULL,
    "departmentId" text NOT NULL,
    "regionId" text,
    "roleId" text NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "resetPasswordRequired" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "jobTitle" text
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Data for Name: AuditLog; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."AuditLog" (id, "userId", action, details, "ipAddress", "userAgent", "createdAt") FROM stdin;
b621a144-47c3-4d1b-a291-87b22cacfe6b	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"admin","password":"********"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 15:57:59.99
b5bd2ee7-824a-4639-a254-31e51c9336ad	8c727565-7321-4dc8-9667-5820fc2f1a19	LOGOUT	{"url":"/api/auth/logout","method":"POST","body":{"refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4YzcyNzU2NS03MzIxLTRkYzgtOTY2Ny01ODIwZmMyZjFhMTkiLCJpYXQiOjE3ODU2ODYzOTEsImV4cCI6MTc4NjI5MTE5MX0.70MR4HbqPgNK8qevNH_I9HMgVLvR4xdpq9tHtxTKdBQ"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 15:59:57.447
9315057a-ae9a-4ab7-9ba2-7ac266ebacfe	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"admin","password":"********"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 16:02:43.107
6d65cc07-84ba-43e4-aeba-f26beab947b9	8c727565-7321-4dc8-9667-5820fc2f1a19	UPDATE_USER	{"url":"/api/users/db733035-1b92-436e-888b-c3103f4d55d2","method":"PUT","body":{"status":"DISABLED"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 16:10:49.012
d19a05c2-6e91-4765-9915-e5c520e17d0c	8c727565-7321-4dc8-9667-5820fc2f1a19	UPDATE_USER	{"url":"/api/users/e465e06f-0aad-434c-908a-6be000310d2b","method":"PUT","body":{"status":"DISABLED"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 16:10:53.495
5e2dbca9-1e55-4133-9402-cd6b8e121f62	8c727565-7321-4dc8-9667-5820fc2f1a19	UPDATE_USER	{"url":"/api/users/7715ad44-9402-4a07-b6a2-9fb6e12b3bab","method":"PUT","body":{"status":"DISABLED"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 16:10:54.575
0a0173b6-0e56-4457-a9eb-ccd800bc5401	8c727565-7321-4dc8-9667-5820fc2f1a19	UPDATE_USER	{"url":"/api/users/db733035-1b92-436e-888b-c3103f4d55d2","method":"PUT","body":{"status":"ACTIVE"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 16:13:03.042
19994fc5-ea53-4163-9b2d-0fb5a884a134	8c727565-7321-4dc8-9667-5820fc2f1a19	UPDATE_USER	{"url":"/api/users/db733035-1b92-436e-888b-c3103f4d55d2","method":"PUT","body":{"status":"DISABLED"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 16:13:04.221
73c5867e-6981-4fec-95f3-c0aa2d4aacfa	8c727565-7321-4dc8-9667-5820fc2f1a19	DISABLE_USER	{"url":"/api/users/db733035-1b92-436e-888b-c3103f4d55d2","method":"DELETE","body":null,"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 16:15:35.291
d087e6b1-6ad7-4cfe-9363-7ed1a797a4c0	8c727565-7321-4dc8-9667-5820fc2f1a19	DISABLE_USER	{"url":"/api/users/e465e06f-0aad-434c-908a-6be000310d2b","method":"DELETE","body":null,"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 16:15:38.714
50620919-3437-41fa-8ae4-6f524396f6c6	8c727565-7321-4dc8-9667-5820fc2f1a19	UPDATE_USER	{"url":"/api/users/7715ad44-9402-4a07-b6a2-9fb6e12b3bab","method":"PUT","body":{"status":"ACTIVE"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 16:15:40.258
3de2c915-67ab-4960-b29f-cccee597deac	8c727565-7321-4dc8-9667-5820fc2f1a19	UPDATE_USER	{"url":"/api/users/7715ad44-9402-4a07-b6a2-9fb6e12b3bab","method":"PUT","body":{"status":"DISABLED"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 16:17:01.98
048aa973-e2c3-4619-992a-13128d10cbdc	8c727565-7321-4dc8-9667-5820fc2f1a19	DISABLE_USER	{"url":"/api/users/7715ad44-9402-4a07-b6a2-9fb6e12b3bab","method":"DELETE","body":null,"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 16:17:04.733
8da12589-f2bc-42e9-a35e-f781c59f17ca	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"admin","password":"********"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 16:17:54.323
1e79e3ad-74c0-4026-be84-b2d383689727	8c727565-7321-4dc8-9667-5820fc2f1a19	CREATE_USER	{"url":"/api/users","method":"POST","body":{"fullName":"Shaafici Diiriye","username":"shaafici","email":"shaaficidiiriye6@gmail.com","phone":"660000548","employeeNumber":"BLKM-001","companyId":"4911f01d-6c14-43f3-902d-c9e8f063f1b6","departmentId":"51ea7d31-d79e-4487-ad91-a0189ec9c141","regionId":"6600517b-6a8e-4245-9371-aacbb8ab73de","role":"EMPLOYEE"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 16:18:36.296
3cc809af-b03c-4816-bbff-9501d61ba65f	8c727565-7321-4dc8-9667-5820fc2f1a19	LOGOUT	{"url":"/api/auth/logout","method":"POST","body":{"refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4YzcyNzU2NS03MzIxLTRkYzgtOTY2Ny01ODIwZmMyZjFhMTkiLCJpYXQiOjE3ODU2ODc0NzQsImV4cCI6MTc4NjI5MjI3NH0.5d13s_gJvebYbyPDjO9HDcASPowO-KZhzulDgJ6ts_A"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 16:18:53.812
4f7dca08-f8c4-4236-ab64-e9bfc3289e45	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"shaafici","password":"********"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 16:19:03.784
b7903544-39d7-49ac-a569-7cea7e8161e5	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"admin","password":"********"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 16:21:10.187
fd8c6e27-fc30-4fb9-b240-dbf8ad2b4d9a	8c727565-7321-4dc8-9667-5820fc2f1a19	LOGOUT	{"url":"/api/auth/logout","method":"POST","body":{"refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4YzcyNzU2NS03MzIxLTRkYzgtOTY2Ny01ODIwZmMyZjFhMTkiLCJpYXQiOjE3ODU2ODc2NzAsImV4cCI6MTc4NjI5MjQ3MH0.z51iwMembW41NZad-A3dZPFPN131QVlmfPiNv2yziIc"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 16:24:01.082
490f7a35-343f-4eef-8f08-ec9b8c27a520	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"shaafici","password":"********"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 16:24:06.938
bdd0f560-4aa3-4092-ac29-4479db5cb9fb	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"admin","password":"********"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 16:25:06.932
e48e01b9-aca8-44ba-bae1-9efe44735bce	8c727565-7321-4dc8-9667-5820fc2f1a19	CREATE_REQUEST	{"url":"/api/requests/c052ac59-0a29-4e62-ae9d-31fc52f1b9ed/review","method":"POST","body":{"status":"APPROVED","comments":"","approvedAmount":20},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 16:25:13.242
09345e98-2366-4ab0-b4e4-238206349f8a	8c727565-7321-4dc8-9667-5820fc2f1a19	RECORD_PAYMENT	{"url":"/api/payments","method":"POST","body":{"requestId":"c052ac59-0a29-4e62-ae9d-31fc52f1b9ed","amountPaid":20,"paymentMethod":"EDAHAB","notes":""},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 16:31:12.709
a5ebce68-d37f-487a-bb5b-94b71ef77045	8c727565-7321-4dc8-9667-5820fc2f1a19	LOGOUT	{"url":"/api/auth/logout","method":"POST","body":{"refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4YzcyNzU2NS03MzIxLTRkYzgtOTY2Ny01ODIwZmMyZjFhMTkiLCJpYXQiOjE3ODU2ODk3MzQsImV4cCI6MTc4NjI5NDUzNH0.qKhPRH1B4GSA24j2dli0-bnrKqos2gI1ZzD2c-VFqzo"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 16:58:37.065
a5e77c01-516e-4064-aa79-6642edab873c	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"shaafici","password":"********"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 16:58:45.522
e0d10dd2-0058-4624-9362-d1a47668bd5c	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"admin","password":"********"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 16:59:15.634
804af297-f5f4-47d8-ae4e-04fb5727b7fd	8c727565-7321-4dc8-9667-5820fc2f1a19	CREATE_REQUEST	{"url":"/api/requests/0bf06374-ac9a-49a9-9df8-d1863c02adfe/review","method":"POST","body":{"status":"APPROVED","comments":"","approvedAmount":20},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 16:59:19.915
d60d5dee-b02a-471f-80f2-16e8e8cd5a25	8c727565-7321-4dc8-9667-5820fc2f1a19	RECORD_PAYMENT	{"url":"/api/payments","method":"POST","body":{"requestId":"0bf06374-ac9a-49a9-9df8-d1863c02adfe","amountPaid":20,"paymentMethod":"EDAHAB","notes":""},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 16:59:29.293
3ed617dd-42c0-4edc-a043-7f767602aaea	8c727565-7321-4dc8-9667-5820fc2f1a19	LOGOUT	{"url":"/api/auth/logout","method":"POST","body":{"refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4YzcyNzU2NS03MzIxLTRkYzgtOTY2Ny01ODIwZmMyZjFhMTkiLCJpYXQiOjE3ODU2ODk5NTUsImV4cCI6MTc4NjI5NDc1NX0.AhrpjIcVDGZcyjnfR0vubrLid7EkZEchx-UMGFme-pU"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 17:12:11.905
17bcbfe3-d61b-4b18-85a2-c5c175fefa36	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"shaafici","password":"********"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 17:12:17.496
f0379846-988d-44ee-ae01-240a908a5c34	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"admin","password":"********"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 17:16:30.375
dca28ac7-7e72-429e-bb7f-e11f8c361ea3	8c727565-7321-4dc8-9667-5820fc2f1a19	LOGOUT	{"url":"/api/auth/logout","method":"POST","body":{"refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4YzcyNzU2NS03MzIxLTRkYzgtOTY2Ny01ODIwZmMyZjFhMTkiLCJpYXQiOjE3ODU2OTE4OTMsImV4cCI6MTc4NjI5NjY5M30.YFiGLlxCZkBvtVr4LfMLiz8qjEalDeOpMfiEESsHh3Y"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 17:46:20.712
93e4b45a-1ff9-4a91-a483-1c81bc3a33cf	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"shaafici","password":"********"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 17:46:25.265
6f118fdb-9feb-43d3-aea6-40de20ee9a64	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"admin","password":"********"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 17:46:50.515
1b6d9b91-e748-4a4b-92f5-d5cd916d4455	8c727565-7321-4dc8-9667-5820fc2f1a19	CREATE_REQUEST	{"url":"/api/requests/83901e6b-9266-4ee1-b3f4-b1231a0abd56/review","method":"POST","body":{"status":"APPROVED","comments":"","approvedAmount":200},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 17:46:57.013
853fd637-2fe8-4c7e-80fb-e281d590cf7b	8c727565-7321-4dc8-9667-5820fc2f1a19	RECORD_PAYMENT	{"url":"/api/payments","method":"POST","body":{"requestId":"83901e6b-9266-4ee1-b3f4-b1231a0abd56","amountPaid":200,"paymentMethod":"EDAHAB","notes":""},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 17:47:00.15
f29dcbba-56ef-43c5-9ba2-5ae73f3f6769	8c727565-7321-4dc8-9667-5820fc2f1a19	LOGOUT	{"url":"/api/auth/logout","method":"POST","body":{"refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4YzcyNzU2NS03MzIxLTRkYzgtOTY2Ny01ODIwZmMyZjFhMTkiLCJpYXQiOjE3ODU2OTI4MTAsImV4cCI6MTc4NjI5NzYxMH0.PbBXLJ7irLSDbDzrToSMV9G3wlDqLzj4bHJ_3TcmWpw"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 17:47:05.923
e3f97850-bc87-44ef-a5f6-9e7b9848553f	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"admin","password":"********"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 17:47:07.843
faf0eeea-d38e-4355-ad94-873432741fb8	8c727565-7321-4dc8-9667-5820fc2f1a19	LOGOUT	{"url":"/api/auth/logout","method":"POST","body":{"refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4YzcyNzU2NS03MzIxLTRkYzgtOTY2Ny01ODIwZmMyZjFhMTkiLCJpYXQiOjE3ODU2OTI4MjcsImV4cCI6MTc4NjI5NzYyN30.mHWvnWXe4ehsh_InwGzhwjgz8Xr3hVZ3oxgFClpLSok"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 17:47:10.669
52cd941b-a59b-4aec-aeb8-b44b432221d1	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"shaafici","password":"********"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 17:47:14.314
c1880c9c-5620-45a8-85ed-c530eb991919	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"admin","password":"********"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 17:47:25.882
bb0a2984-93d1-4352-bfd1-1b413f322eb7	8c727565-7321-4dc8-9667-5820fc2f1a19	LOGOUT	{"url":"/api/auth/logout","method":"POST","body":{"refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4YzcyNzU2NS03MzIxLTRkYzgtOTY2Ny01ODIwZmMyZjFhMTkiLCJpYXQiOjE3ODU2OTI4NDUsImV4cCI6MTc4NjI5NzY0NX0.xtGs74tB9n6wCGSPfBGBnY8CJylimHvHuadOgvN_buw"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 17:47:48.898
2fc53608-2728-432e-9b20-a94e834a8eee	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"shaafici","password":"********"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 17:47:52.627
ecb11f87-c512-4eb6-87b4-3e90707d8bdf	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"admin","password":"********"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 17:49:18.195
c9e3be35-34ae-4d39-b5df-0b4a290c8e29	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"admin","password":"********"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-03 07:28:49.728
fc0971ae-b85e-485d-a404-8b8fda124b20	8c727565-7321-4dc8-9667-5820fc2f1a19	LOGOUT	{"url":"/api/auth/logout","method":"POST","body":{"refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4YzcyNzU2NS03MzIxLTRkYzgtOTY2Ny01ODIwZmMyZjFhMTkiLCJpYXQiOjE3ODU3NDIxMjksImV4cCI6MTc4NjM0NjkyOX0.iR2kpNb6qm0k3gQpv-i56RshYYV1VTXrBpIqlAo3PWk"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-03 07:32:18.039
0d7a58e2-25f2-4e45-bdbb-5f7e9f86cfc9	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"shaafici","password":"********"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-03 07:32:25.916
c539312f-5a5e-4d77-b7be-6b5ba087ee5a	8c727565-7321-4dc8-9667-5820fc2f1a19	CREATE_REQUEST	{"url":"/api/requests/858d11df-0c20-41c1-a3e3-d64a94d9e795/review","method":"POST","body":{"status":"APPROVED","comments":"","approvedAmount":18},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-03 07:40:56.459
ecc97fab-79d6-4b60-8eff-a84918a9e644	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"admin","password":"********"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-03 07:33:57.969
aea023f9-d15c-4128-ae9f-645f431881fa	8c727565-7321-4dc8-9667-5820fc2f1a19	LOGOUT	{"url":"/api/auth/logout","method":"POST","body":{"refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4YzcyNzU2NS03MzIxLTRkYzgtOTY2Ny01ODIwZmMyZjFhMTkiLCJpYXQiOjE3ODU3NDI0MzcsImV4cCI6MTc4NjM0NzIzN30.FSWhriFCXZYzcnZGmNwYoQgSefUtajIqZ-0wntvVIRc"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-03 07:35:27.911
5141622c-3f46-47b5-96f9-a836371915f4	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"admin","password":"********"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-03 07:35:31.435
b968306c-2fe4-4e18-8df2-c762a6506240	8c727565-7321-4dc8-9667-5820fc2f1a19	CREATE_USER	{"url":"/api/users","method":"POST","body":{"fullName":"Bashir Abdikarim","username":"bashiir","employeeNumber":"somtle001","companyId":"1d625f68-7207-4e5f-af81-c6d708fba6e8","departmentId":"7bd04125-854a-4d67-bc6a-0c31f9dc1f79","regionId":"524e00bb-793d-4ea7-9fcb-53ff443438cb","role":"EMPLOYEE"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-03 07:36:14.158
b6510d4f-b99b-4532-bf8c-859feeeaba07	8c727565-7321-4dc8-9667-5820fc2f1a19	LOGOUT	{"url":"/api/auth/logout","method":"POST","body":{"refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4YzcyNzU2NS03MzIxLTRkYzgtOTY2Ny01ODIwZmMyZjFhMTkiLCJpYXQiOjE3ODU3NDI1MzEsImV4cCI6MTc4NjM0NzMzMX0.4baaKV76vK24uhLnNOExBlwVqnAABGvKI9h7ajurEvg"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-03 07:36:19.223
ab5b381e-95b9-465e-a4f1-d2bbde1fa738	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"bashiir","password":"********"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-03 07:36:36.886
e64c5073-1971-4842-9d62-8ac9f83627a8	30ed88b5-bd12-4d55-9c23-975b8c9e0244	CREATE_REQUEST	{"url":"/api/requests","method":"POST","body":{"regionId":"524e00bb-793d-4ea7-9fcb-53ff443438cb","budgetHeadId":"18e70a8f-2beb-4ffb-8491-663039a1e326","purpose":"Laptop Battery","description":"laptop battery bashir IT","requestedAmount":25,"currency":"USD","priority":"URGENT","requiredDate":"2026-08-03","attachments":[],"status":"PENDING_APPROVAL"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-03 07:38:15.477
24adde1b-cdec-442c-a64d-dd7e0c95e3d8	30ed88b5-bd12-4d55-9c23-975b8c9e0244	LOGOUT	{"url":"/api/auth/logout","method":"POST","body":{"refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzMGVkODhiNS1iZDEyLTRkNTUtOWMyMy05NzViOGM5ZTAyNDQiLCJpYXQiOjE3ODU3NDI2MDcsImV4cCI6MTc4NjM0NzQwN30.Z7Ui2C05Opy7Rin-CANzsaGYuZ9oIaes20LhLNA4ZRc"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-03 07:38:20.458
a87ac44b-94fe-45b4-82dd-a79531053288	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"admin","password":"********"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-03 07:38:22.673
884b60ff-5322-4c52-b93b-2fc9443cc7a3	8c727565-7321-4dc8-9667-5820fc2f1a19	CREATE_REQUEST	{"url":"/api/requests/6cd66702-da77-459f-a89d-d21e4ab25c97/review","method":"POST","body":{"status":"REJECTED","comments":""},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-03 07:39:22.675
3b543371-3a41-47f0-b8ac-c52ecebb5864	8c727565-7321-4dc8-9667-5820fc2f1a19	LOGOUT	{"url":"/api/auth/logout","method":"POST","body":{"refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4YzcyNzU2NS03MzIxLTRkYzgtOTY2Ny01ODIwZmMyZjFhMTkiLCJpYXQiOjE3ODU3NDI3MDIsImV4cCI6MTc4NjM0NzUwMn0.igBZm6YEQ1oqlwgBkYwN8J3PYNOJPT34zQE0rn5ZU2g"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-03 07:39:28.808
8fd7e0f0-b861-443f-a51a-1b18d8a96740	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"admin","password":"********"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-03 07:39:31.083
474eaa35-bdaa-43a6-ba8d-36e4e4fba462	8c727565-7321-4dc8-9667-5820fc2f1a19	LOGOUT	{"url":"/api/auth/logout","method":"POST","body":{"refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4YzcyNzU2NS03MzIxLTRkYzgtOTY2Ny01ODIwZmMyZjFhMTkiLCJpYXQiOjE3ODU3NDI3NzEsImV4cCI6MTc4NjM0NzU3MX0.YCKoidUA0D2LN79G6HXlqON5KFpaj8TCCSceEfNXWwI"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-03 07:39:32.74
e46c5ddf-657b-4b00-bb45-869e72260975	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"bashiir","password":"********"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-03 07:39:36.388
f2972803-2de9-4247-9314-cc94b859e934	30ed88b5-bd12-4d55-9c23-975b8c9e0244	CREATE_REQUEST	{"url":"/api/requests","method":"POST","body":{"regionId":"524e00bb-793d-4ea7-9fcb-53ff443438cb","budgetHeadId":"18e70a8f-2beb-4ffb-8491-663039a1e326","purpose":"RJ-MAKER","description":"CLIMBER TOOL FOR CAT 6 CABLE","requestedAmount":18,"currency":"USD","priority":"HIGH","requiredDate":"2026-08-03","attachments":[],"status":"PENDING_APPROVAL"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-03 07:40:23.926
3ab8b781-bc67-4edc-bcd3-8fcbb60920c3	30ed88b5-bd12-4d55-9c23-975b8c9e0244	LOGOUT	{"url":"/api/auth/logout","method":"POST","body":{"refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzMGVkODhiNS1iZDEyLTRkNTUtOWMyMy05NzViOGM5ZTAyNDQiLCJpYXQiOjE3ODU3NDI3NzYsImV4cCI6MTc4NjM0NzU3Nn0.j1bz9hmYTym7OCM6GBCfubxM8JHgFKfg50xGIEAaUQk"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-03 07:40:26.05
67992048-c1ac-4c41-862f-9cd4e8d312fa	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"admin","password":"********"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-03 07:40:27.946
c7d12878-b952-490b-891e-ad775efbb363	8c727565-7321-4dc8-9667-5820fc2f1a19	RECORD_PAYMENT	{"url":"/api/payments","method":"POST","body":{"requestId":"858d11df-0c20-41c1-a3e3-d64a94d9e795","amountPaid":18,"paymentMethod":"EDAHAB","notes":""},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-03 07:41:58.358
63c0dd28-27da-48e6-b036-5564392c6def	8c727565-7321-4dc8-9667-5820fc2f1a19	LOGOUT	{"url":"/api/auth/logout","method":"POST","body":{"refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4YzcyNzU2NS03MzIxLTRkYzgtOTY2Ny01ODIwZmMyZjFhMTkiLCJpYXQiOjE3ODU3NDI4MjcsImV4cCI6MTc4NjM0NzYyN30.y1qUW3ITsadBqaN3gKOc0itkFb2LcmoWtv-04vWUIcw"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-03 07:42:17.324
33ad569a-9701-47fd-9ecd-59812ad0c94c	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"bashiir","password":"********"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-03 07:42:23.767
db711d8b-b19c-4932-a416-8a109a610741	30ed88b5-bd12-4d55-9c23-975b8c9e0244	LOGOUT	{"url":"/api/auth/logout","method":"POST","body":{"refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzMGVkODhiNS1iZDEyLTRkNTUtOWMyMy05NzViOGM5ZTAyNDQiLCJpYXQiOjE3ODU3NDI5NDMsImV4cCI6MTc4NjM0Nzc0M30.KkVHWDkbhE2yJ_JD4UmGnQa3zzrFIJjCBMcwD2-6Jhg"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-03 07:44:15.168
ad2e7b61-222b-42df-a7b9-d1fa597e2f8e	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"admin","password":"********"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-03 07:44:17.64
44e61fc0-bf40-4b19-a8e0-bacfcc450759	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"admin","password":"********"},"responseStatus":"SUCCESS"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-24 15:42:57.083
b0c6efe0-ae0a-45d0-8645-fb261222ea68	8c727565-7321-4dc8-9667-5820fc2f1a19	LOGOUT	{"url":"/api/auth/logout","method":"POST","body":{"refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4YzcyNzU2NS03MzIxLTRkYzgtOTY2Ny01ODIwZmMyZjFhMTkiLCJpYXQiOjE3OTAyNjQ1NzcsImV4cCI6MTc5MDg2OTM3N30.fh5E5NhKEWUkDyDfCf2f_xlI5TWS_ol7nmzDk5u_Jq8"},"responseStatus":"SUCCESS"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-24 15:43:14.639
ee1c5528-2e70-45e1-9872-6841fecaaa50	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"admin","password":"********"},"responseStatus":"SUCCESS"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-24 15:44:38.085
139e2498-12ce-4e8a-9e48-0ff0bc116a9a	8c727565-7321-4dc8-9667-5820fc2f1a19	LOGOUT	{"url":"/api/auth/logout","method":"POST","body":{"refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4YzcyNzU2NS03MzIxLTRkYzgtOTY2Ny01ODIwZmMyZjFhMTkiLCJpYXQiOjE3OTAyNjQ2NzgsImV4cCI6MTc5MDg2OTQ3OH0.ZhG2hjP1h7NzK3zLAH0gWeY9Xzs6i1VXGY5ta0SLULY"},"responseStatus":"SUCCESS"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-24 15:44:41.107
dfbdf854-bf75-469b-9e7c-bb221de95e08	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"admin","password":"********"},"responseStatus":"SUCCESS"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-24 16:03:09.041
e50dbfdf-a671-4d94-bc1b-ceb3cd8bf0ff	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"admin","password":"********"},"responseStatus":"SUCCESS"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-24 16:04:29.667
35aeb851-78ae-424a-9bc3-25201a8ac8fd	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"admin","password":"********"},"responseStatus":"SUCCESS"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-24 16:41:48.746
bd2a4417-9af6-413c-9f3f-b2b6da6acb01	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"admin","password":"********"},"responseStatus":"SUCCESS"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-24 17:58:48.455
09e29367-ef5e-40a5-a95a-3d74dc5e0165	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"admin","password":"********"},"responseStatus":"SUCCESS"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-24 18:09:00.571
d89146e1-16ce-4b41-825a-d67b08a702f6	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"admin","password":"********"},"responseStatus":"SUCCESS"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-24 18:14:47.943
f316f70f-8f77-45c3-b3ec-0d413368282d	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"admin","password":"********"},"responseStatus":"SUCCESS"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-24 18:15:03.599
65f3c785-6389-4df1-bcd5-8080c4387d8c	8c727565-7321-4dc8-9667-5820fc2f1a19	CREATE_USER	{"url":"/api/users/30ed88b5-bd12-4d55-9c23-975b8c9e0244/reset-password","method":"POST","body":null,"responseStatus":"SUCCESS"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-24 18:23:03.599
2853c877-13df-42f8-9dc8-aa1d96e15516	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"bashiir","password":"********"},"responseStatus":"SUCCESS"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-24 18:23:16.569
b9082f25-7d64-46ce-8615-b2b9902ea04c	30ed88b5-bd12-4d55-9c23-975b8c9e0244	CREATE_REQUEST	{"url":"/api/requests","method":"POST","body":{"regionId":"524e00bb-793d-4ea7-9fcb-53ff443438cb","budgetHeadId":"161b30d9-b075-4012-94d8-51135b8ca1f9","purpose":"CAT6","description":"ALAABTAAS DEGDEG HANALOOGU DALBO","requestedAmount":20,"currency":"USD","priority":"NORMAL","requiredDate":"2026-09-24","attachments":[],"status":"PENDING_APPROVAL"},"responseStatus":"SUCCESS"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-24 18:24:13.039
0c60b051-ba8f-44d3-8e94-1c93b2dac476	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"admin","password":"********"},"responseStatus":"SUCCESS"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-24 18:24:30.172
4f07ab3f-9268-4761-a24d-69cd65dad61f	8c727565-7321-4dc8-9667-5820fc2f1a19	CREATE_REQUEST	{"url":"/api/requests/3b039e16-ec7f-4c39-96fc-daa3ad93899a/review","method":"POST","body":{"status":"APPROVED","comments":"","approvedAmount":20},"responseStatus":"SUCCESS"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-24 18:24:41.299
ce2ca0dd-3ccc-4820-9c13-49f243464da8	8c727565-7321-4dc8-9667-5820fc2f1a19	RECORD_PAYMENT	{"url":"/api/payments","method":"POST","body":{"requestId":"3b039e16-ec7f-4c39-96fc-daa3ad93899a","amountPaid":20,"paymentMethod":"EDAHAB","notes":""},"responseStatus":"SUCCESS"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-24 18:24:50.924
99bf066f-faa1-4592-aed9-cfe870093337	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"admin","password":"********"},"responseStatus":"SUCCESS"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-25 06:47:45.643
a267d8f4-7705-4291-a219-4b1240a81232	8c727565-7321-4dc8-9667-5820fc2f1a19	UPDATE_USER	{"url":"/api/users/703c4a81-d279-4de7-9d19-15ef005211dc","method":"PUT","body":{"status":"DISABLED"},"responseStatus":"SUCCESS"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-25 09:21:30.038
c2ee76df-c163-4401-986e-56406e433d45	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"bashiir","password":"********"},"responseStatus":"SUCCESS"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-25 09:21:52.56
6837301e-6d7e-4d5d-b79f-a31f3fa719e1	30ed88b5-bd12-4d55-9c23-975b8c9e0244	CREATE_REQUEST	{"url":"/api/requests","method":"POST","body":{"regionId":"524e00bb-793d-4ea7-9fcb-53ff443438cb","budgetHeadId":"161b30d9-b075-4012-94d8-51135b8ca1f9","purpose":"Laptop Battery","description":"Hp laptop battery for Bashir Abdikarim","requestedAmount":40,"currency":"USD","priority":"NORMAL","requiredDate":"2026-09-25","attachments":[],"status":"DRAFT"},"responseStatus":"SUCCESS"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-25 09:24:30.403
0016ddda-70fe-4d9b-a260-8153b381ae48	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"admin","password":"********"},"responseStatus":"SUCCESS"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-25 13:41:18.767
747ff7e8-5c26-427d-8111-626d0b027524	8c727565-7321-4dc8-9667-5820fc2f1a19	CREATE_USER	{"url":"/api/users","method":"POST","body":{"fullName":"Shafi Abdirahman Dirie","username":"shaaficiune","email":"shafici.abdirahman@somtelnetwork.net","phone":"660000557","jobTitle":"Accountant","companyId":"4911f01d-6c14-43f3-902d-c9e8f063f1b6","departmentId":"51ea7d31-d79e-4487-ad91-a0189ec9c141","role":"SUPER_ADMIN"},"responseStatus":"SUCCESS"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-25 13:43:01.882
714f327d-41ab-4f31-a6bb-cc4797868173	8c727565-7321-4dc8-9667-5820fc2f1a19	UPDATE_USER	{"url":"/api/users/703c4a81-d279-4de7-9d19-15ef005211dc","method":"PUT","body":{"status":"ACTIVE"},"responseStatus":"SUCCESS"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-25 13:43:16.035
64324c4a-4296-4e56-abb0-315f3c614cb0	8c727565-7321-4dc8-9667-5820fc2f1a19	UPDATE_USER	{"url":"/api/users/703c4a81-d279-4de7-9d19-15ef005211dc","method":"PUT","body":{"status":"DISABLED"},"responseStatus":"SUCCESS"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-25 13:43:17.11
657191c1-c902-45f9-800a-8ec372294da5	8c727565-7321-4dc8-9667-5820fc2f1a19	UPDATE_USER	{"url":"/api/users/30ed88b5-bd12-4d55-9c23-975b8c9e0244","method":"PUT","body":{"status":"DISABLED"},"responseStatus":"SUCCESS"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-25 13:43:20.142
628aa06b-f23a-46ad-b201-95a17ed9fa15	8c727565-7321-4dc8-9667-5820fc2f1a19	UPDATE_USER	{"url":"/api/users/f86d9ba0-c6f1-4c30-97fc-ceaabca602a0","method":"PUT","body":{"status":"DISABLED"},"responseStatus":"SUCCESS"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-25 13:43:21.164
0f3efe4f-3749-489f-835d-ec4785948996	8c727565-7321-4dc8-9667-5820fc2f1a19	DISABLE_USER	{"url":"/api/users/f86d9ba0-c6f1-4c30-97fc-ceaabca602a0","method":"DELETE","body":null,"responseStatus":"SUCCESS"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-25 13:43:23.371
06c32ec9-4815-491c-bc13-3ddf3ea84978	\N	LOGOUT	{"url":"/api/auth/logout","method":"POST","body":{"refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3MDNjNGE4MS1kMjc5LTRkZTctOWQxOS0xNWVmMDA1MjExZGMiLCJpYXQiOjE3ODU2ODc1NTAsImV4cCI6MTc4NjI5MjM1MH0.KM9KoiKKyoOh81bY5E9Avbf3w-os_I8_EUqTNO0O8W4"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 16:21:05.686
07e1658f-589b-4106-8d5b-f95b33c5bde8	\N	CREATE_REQUEST	{"url":"/api/requests","method":"POST","body":{"projectId":"959d6eed-c5c9-45d7-97c7-780ee60bc7ce","regionId":"6600517b-6a8e-4245-9371-aacbb8ab73de","budgetHeadId":"8c61786e-bcaa-4565-baa8-d98fb727cd65","purpose":"Item iib","description":"dkdkkjfdjdjjdfjd","requestedAmount":20,"currency":"USD","priority":"NORMAL","requiredDate":"2026-08-02","attachments":[],"status":"PENDING_APPROVAL"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 16:24:46.148
d01430f4-3cf5-4694-8ffa-f607e255241e	\N	LOGOUT	{"url":"/api/auth/logout","method":"POST","body":{"refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3MDNjNGE4MS1kMjc5LTRkZTctOWQxOS0xNWVmMDA1MjExZGMiLCJpYXQiOjE3ODU2ODc4NDYsImV4cCI6MTc4NjI5MjY0Nn0.2A3l3Of_uyc3EO9NvfMklIjlfT4-5ReGXHwHY2VZlbw"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 16:25:04.32
5db4fa70-b9e9-41e9-8030-630a468feb5d	\N	CREATE_REQUEST	{"url":"/api/requests","method":"POST","body":{"regionId":"6600517b-6a8e-4245-9371-aacbb8ab73de","budgetHeadId":"607c77ba-53dd-4306-874c-0a1ff41cd902","purpose":"test","description":"done","requestedAmount":20,"currency":"USD","priority":"NORMAL","requiredDate":"2026-08-02","attachments":[],"status":"PENDING_APPROVAL"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 16:59:09.562
71978282-69ce-4f3d-b505-8bad982759cf	\N	LOGOUT	{"url":"/api/auth/logout","method":"POST","body":{"refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3MDNjNGE4MS1kMjc5LTRkZTctOWQxOS0xNWVmMDA1MjExZGMiLCJpYXQiOjE3ODU2ODk5MjUsImV4cCI6MTc4NjI5NDcyNX0.oN7QoJ1XVJSly7EXpf6_NQ4MyrmcBcQhdrIvMRe90Uo"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 16:59:13.48
e9e99f07-c131-4b37-8a8a-4afcdcadf62e	\N	LOGOUT	{"url":"/api/auth/logout","method":"POST","body":{"refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3MDNjNGE4MS1kMjc5LTRkZTctOWQxOS0xNWVmMDA1MjExZGMiLCJpYXQiOjE3ODU2OTA3MzcsImV4cCI6MTc4NjI5NTUzN30.hL-6Qg0ppN-rH4oRMvfZ353TP43LUPHjNZd0s5j4NIU"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 17:16:28.335
475d473f-2149-49cf-ba0c-c4d12490eb06	\N	CREATE_REQUEST	{"url":"/api/requests","method":"POST","body":{"regionId":"6600517b-6a8e-4245-9371-aacbb8ab73de","budgetHeadId":"ec67bfb1-05ba-4a5d-8f7c-7169f00a4261","purpose":"laptop","description":"dlkdkdfkf","requestedAmount":200,"currency":"USD","priority":"URGENT","requiredDate":"2026-08-02","attachments":[],"status":"PENDING_APPROVAL"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 17:46:43.656
b4f10f0c-ce32-4ac6-9cf0-59a1ca79e091	\N	LOGOUT	{"url":"/api/auth/logout","method":"POST","body":{"refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3MDNjNGE4MS1kMjc5LTRkZTctOWQxOS0xNWVmMDA1MjExZGMiLCJpYXQiOjE3ODU2OTI3ODUsImV4cCI6MTc4NjI5NzU4NX0.ugB0BkmDQplwx345wq5N-ZAGKe6Yvi-B-hE1npNgZvI"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 17:46:48.096
89a329b5-07d9-485e-b66c-07b40b3f2e4f	\N	LOGOUT	{"url":"/api/auth/logout","method":"POST","body":{"refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3MDNjNGE4MS1kMjc5LTRkZTctOWQxOS0xNWVmMDA1MjExZGMiLCJpYXQiOjE3ODU2OTI4MzQsImV4cCI6MTc4NjI5NzYzNH0.H7TkeQCr6zbywgf40JvJFu-WfGy_Py5YDpB2lTsaZK8"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 17:47:24.112
89752520-cd6c-4a03-b1e9-3779aef00ec4	\N	LOGOUT	{"url":"/api/auth/logout","method":"POST","body":{"refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3MDNjNGE4MS1kMjc5LTRkZTctOWQxOS0xNWVmMDA1MjExZGMiLCJpYXQiOjE3ODU2OTI4NzIsImV4cCI6MTc4NjI5NzY3Mn0.8DLNw8q_kBEUmONdep5_W8ZG66mc9LTVuKqSFA-gxxg"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 17:49:10.701
fae09bcc-aa2b-4ddc-80be-3929f16aac1a	\N	LOGOUT	{"url":"/api/auth/logout","method":"POST","body":{"refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3MDNjNGE4MS1kMjc5LTRkZTctOWQxOS0xNWVmMDA1MjExZGMiLCJpYXQiOjE3ODU3NDIzNDUsImV4cCI6MTc4NjM0NzE0NX0.eGZfpmHt0G4ccWvKGoy3CnDV2KD3puvWaC0CQqge3Yo"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-03 07:33:55.841
53e34011-6036-43f4-9586-080e6e52a6a3	8c727565-7321-4dc8-9667-5820fc2f1a19	DISABLE_USER	{"url":"/api/users/703c4a81-d279-4de7-9d19-15ef005211dc","method":"DELETE","body":null,"responseStatus":"SUCCESS"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-25 13:43:32.416
7ce45b49-cedb-4509-8b47-df251cb85c9f	8c727565-7321-4dc8-9667-5820fc2f1a19	UPDATE_USER	{"url":"/api/users/8c727565-7321-4dc8-9667-5820fc2f1a19","method":"PUT","body":{"status":"DISABLED"},"responseStatus":"SUCCESS"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-25 13:49:40.387
a2bc30b3-249f-423f-8f1a-a1909432a0c6	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"admin","password":"********"},"responseStatus":"SUCCESS"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-25 14:12:34.683
ee1eb05e-9254-42b7-9c3d-a76990f59b5d	8c727565-7321-4dc8-9667-5820fc2f1a19	UPDATE_USER	{"url":"/api/users/8c727565-7321-4dc8-9667-5820fc2f1a19","method":"PUT","body":{"fullName":"System Administrator","email":"admin@somtel.com","phone":"+252660000548","role":"SUPER_ADMIN"},"responseStatus":"SUCCESS"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-25 14:14:59.613
72fd3d64-bf96-4453-9f14-a07ac2d92c40	8c727565-7321-4dc8-9667-5820fc2f1a19	CREATE_USER	{"url":"/api/users","method":"POST","body":{"fullName":"Mustafe Abdi Shir","username":"mustafe","email":"mustafe@gmail.com","phone":"66005959","companyId":"4911f01d-6c14-43f3-902d-c9e8f063f1b6","role":"EMPLOYEE"},"responseStatus":"SUCCESS"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-25 14:17:34.442
994f68a3-1bd7-43ea-be12-37cbf795b2f0	8c727565-7321-4dc8-9667-5820fc2f1a19	UPDATE_USER	{"url":"/api/users/c82c1850-e604-4361-908b-162dbbc862d0","method":"PUT","body":{"fullName":"Mustafe Abdi Shir","email":"mustafe@gmail.com","phone":"66005959","role":"ACCOUNTANT"},"responseStatus":"SUCCESS"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-25 14:17:40.937
f12a013e-97b7-4425-b697-811416e9edf9	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"mustafe","password":"********"},"responseStatus":"SUCCESS"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36	2026-09-25 14:17:56.415
\.


--
-- Data for Name: BudgetHead; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."BudgetHead" (id, code, name, description, "companyId", "monthlyLimit", status, "createdAt", "updatedAt") FROM stdin;
161b30d9-b075-4012-94d8-51135b8ca1f9	BH-101	Tasliix	Tasliix expenses	1d625f68-7207-4e5f-af81-c6d708fba6e8	5000.00	ACTIVE	2026-08-02 15:56:25.85	2026-08-02 15:56:25.85
1669b4b0-c95b-4d77-a706-4c918b7f7aa2	BH-102	Transportation	Local transportation and travel	1d625f68-7207-4e5f-af81-c6d708fba6e8	5000.00	ACTIVE	2026-08-02 15:56:25.863	2026-08-02 15:56:25.863
2940f222-02fd-4495-a28f-8720eb9d727c	BH-103	Repair of Vehicles	Vehicle maintenance and repairs	1d625f68-7207-4e5f-af81-c6d708fba6e8	5000.00	ACTIVE	2026-08-02 15:56:25.866	2026-08-02 15:56:25.866
816a0cd6-89da-4917-9f92-b6e570b710d4	BH-104	Repair of Buildings	Building and facility maintenance	1d625f68-7207-4e5f-af81-c6d708fba6e8	5000.00	ACTIVE	2026-08-02 15:56:25.868	2026-08-02 15:56:25.868
d7a3aaa1-e282-4127-a8c9-c295728eb7c4	BH-105	Repair of Generators	Generator maintenance and repairs	1d625f68-7207-4e5f-af81-c6d708fba6e8	5000.00	ACTIVE	2026-08-02 15:56:25.871	2026-08-02 15:56:25.871
9787b1ef-2033-42fb-a552-ef615f73383b	BH-106	Refreshment	Refreshments, meetings and hospitality	1d625f68-7207-4e5f-af81-c6d708fba6e8	3000.00	ACTIVE	2026-08-02 15:56:25.873	2026-08-02 15:56:25.873
18e70a8f-2beb-4ffb-8491-663039a1e326	BH-107	Miscellaneous expenses	Other general and miscellaneous expenses	1d625f68-7207-4e5f-af81-c6d708fba6e8	3000.00	ACTIVE	2026-08-02 15:56:25.876	2026-08-02 15:56:25.876
8c61786e-bcaa-4565-baa8-d98fb727cd65	BH-201	Tasliix	Tasliix expenses	4911f01d-6c14-43f3-902d-c9e8f063f1b6	5000.00	ACTIVE	2026-08-02 15:56:25.879	2026-08-02 15:56:25.879
64c51c73-5d57-45a5-a12c-9827f023ece8	BH-202	Transportation	Local transportation and travel	4911f01d-6c14-43f3-902d-c9e8f063f1b6	5000.00	ACTIVE	2026-08-02 15:56:25.881	2026-08-02 15:56:25.881
56219b27-2bef-47b4-b153-37a9d62b3e3d	BH-203	Repair of Vehicles	Vehicle maintenance and repairs	4911f01d-6c14-43f3-902d-c9e8f063f1b6	5000.00	ACTIVE	2026-08-02 15:56:25.884	2026-08-02 15:56:25.884
53f80f09-fe38-459d-8ec9-33e741c8ff1b	BH-204	Repair of Buildings	Building and facility maintenance	4911f01d-6c14-43f3-902d-c9e8f063f1b6	5000.00	ACTIVE	2026-08-02 15:56:25.886	2026-08-02 15:56:25.886
ec67bfb1-05ba-4a5d-8f7c-7169f00a4261	BH-205	Repair of Generators	Generator maintenance and repairs	4911f01d-6c14-43f3-902d-c9e8f063f1b6	5000.00	ACTIVE	2026-08-02 15:56:25.888	2026-08-02 15:56:25.888
607c77ba-53dd-4306-874c-0a1ff41cd902	BH-206	Refreshment	Refreshments, meetings and hospitality	4911f01d-6c14-43f3-902d-c9e8f063f1b6	3000.00	ACTIVE	2026-08-02 15:56:25.891	2026-08-02 15:56:25.891
019973ef-325c-4c12-86c8-e0b163819aa2	BH-207	Miscellaneous expenses	Other general and miscellaneous expenses	4911f01d-6c14-43f3-902d-c9e8f063f1b6	3000.00	ACTIVE	2026-08-02 15:56:25.893	2026-08-02 15:56:25.893
\.


--
-- Data for Name: Company; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Company" (id, name, status, "createdAt", "updatedAt") FROM stdin;
4911f01d-6c14-43f3-902d-c9e8f063f1b6	Bluekom	ACTIVE	2026-08-02 15:56:25.55	2026-08-02 15:56:25.55
1d625f68-7207-4e5f-af81-c6d708fba6e8	Somtel	ACTIVE	2026-08-02 15:56:25.638	2026-08-02 15:56:25.638
\.


--
-- Data for Name: Department; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Department" (id, name, "companyId", "monthlyBudget", "createdAt", "updatedAt") FROM stdin;
bcb54c84-0251-4702-aa22-d2a411a56434	Finance	1d625f68-7207-4e5f-af81-c6d708fba6e8	0.00	2026-08-02 15:56:25.771	2026-08-02 15:56:25.771
7bd04125-854a-4d67-bc6a-0c31f9dc1f79	Network Operations	1d625f68-7207-4e5f-af81-c6d708fba6e8	0.00	2026-08-02 15:56:25.787	2026-08-02 15:56:25.787
81a50da1-faec-41cb-bcef-82c72ebd11a2	Finance	4911f01d-6c14-43f3-902d-c9e8f063f1b6	0.00	2026-08-02 15:56:25.793	2026-08-02 15:56:25.793
51ea7d31-d79e-4487-ad91-a0189ec9c141	Engineering	4911f01d-6c14-43f3-902d-c9e8f063f1b6	0.00	2026-08-02 15:56:25.798	2026-08-02 15:56:25.798
\.


--
-- Data for Name: ExpenseSettlement; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ExpenseSettlement" (id, "requestId", "companyId", "actualExpenseAmount", "remainingBalance", notes, status, "approvedById", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Notification; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Notification" (id, "userId", title, message, "isRead", "createdAt") FROM stdin;
\.


--
-- Data for Name: Payment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Payment" (id, "requestId", "companyId", "paymentDate", "amountPaid", "paymentMethod", "transactionId", "referenceNumber", "paidById", notes, "createdAt") FROM stdin;
\.


--
-- Data for Name: Permission; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Permission" (id, action, subject, "createdAt") FROM stdin;
e6af67ad-78fb-422f-b853-36fcefb9e477	manage	all	2026-08-02 15:56:25.671
a2c32d63-4da5-4d0c-b2c0-78277cfb6f2c	read	request	2026-08-02 15:56:25.675
0104f8b2-44b0-4cad-91ab-c999021b5c47	create	request	2026-08-02 15:56:25.678
ed904352-9a14-448d-a3ec-26547f37018e	update	request	2026-08-02 15:56:25.681
0b1d1700-0d3e-4ee2-b43c-ef0343347e36	approve	request	2026-08-02 15:56:25.683
695b261c-fe7a-42ae-8d42-d68417479044	pay	request	2026-08-02 15:56:25.685
7bc144fe-a721-4a7a-8c64-d999051e7aed	settle	request	2026-08-02 15:56:25.689
95e9fd1c-310a-4c2e-9e9e-623661643331	read	report	2026-08-02 15:56:25.692
c13737c2-9b20-4e8a-ab1a-94901f038d68	manage	user	2026-08-02 15:56:25.694
\.


--
-- Data for Name: PettyCashAttachment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."PettyCashAttachment" (id, "requestId", "fileName", "fileUrl", "fileType", "fileSize", "createdAt") FROM stdin;
\.


--
-- Data for Name: PettyCashFund; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."PettyCashFund" (id, "companyId", month, year, "openingBalance", "additionalFunding", "totalAvailable", "approvedAmount", "paidAmount", "remainingBalance", "closingBalance", status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: PettyCashLedger; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."PettyCashLedger" (id, "fundId", "companyId", date, "referenceNumber", "transactionType", "employeeId", "requestId", description, debit, credit, "balanceAfter", remarks, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: PettyCashRequest; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."PettyCashRequest" (id, "requestNumber", "requestDate", "userId", "companyId", "departmentId", "projectId", "regionId", "budgetHeadId", "costCenter", "requestType", "vendorName", "invoiceNumber", "invoiceDate", remarks, purpose, description, "requestedAmount", "approvedAmount", currency, priority, status, "requiredDate", "correctionNotes", "createdAt", "updatedAt") FROM stdin;
6c2e4d67-f26d-45fb-b081-225f83df5141	PC-20260925-0001	2026-09-25 09:24:30.325	30ed88b5-bd12-4d55-9c23-975b8c9e0244	1d625f68-7207-4e5f-af81-c6d708fba6e8	7bd04125-854a-4d67-bc6a-0c31f9dc1f79	\N	524e00bb-793d-4ea7-9fcb-53ff443438cb	161b30d9-b075-4012-94d8-51135b8ca1f9	\N	OTHER	\N	\N	\N	\N	Laptop Battery	Hp laptop battery for Bashir Abdikarim	40.00	\N	USD	NORMAL	DRAFT	2026-09-25 00:00:00	\N	2026-09-25 09:24:30.325	2026-09-25 09:24:30.325
\.


--
-- Data for Name: Project; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Project" (id, name, description, "companyId", status, "createdAt", "updatedAt") FROM stdin;
77849afa-abde-4c28-b096-3c123e386ca5	Somtel 5G Rollout	Expansion of 5G cellular coverage nationwide	1d625f68-7207-4e5f-af81-c6d708fba6e8	ACTIVE	2026-08-02 15:56:25.803	2026-08-02 15:56:25.803
959d6eed-c5c9-45d7-97c7-780ee60bc7ce	Fiber Expansion Project	Laying down metropolitan fiber lines	4911f01d-6c14-43f3-902d-c9e8f063f1b6	ACTIVE	2026-08-02 15:56:25.816	2026-08-02 15:56:25.816
\.


--
-- Data for Name: RefreshToken; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."RefreshToken" (id, token, "userId", "expiresAt", "createdAt") FROM stdin;
f3d61b19-edfb-4199-8b3a-b4f0e6e4885f	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4YzcyNzU2NS03MzIxLTRkYzgtOTY2Ny01ODIwZmMyZjFhMTkiLCJpYXQiOjE3ODU2ODYyNzksImV4cCI6MTc4NjI5MTA3OX0.u_4VGEL9i-ReBpRC0VTdT2nagcc13JXcfNfH-g7nZzM	8c727565-7321-4dc8-9667-5820fc2f1a19	2026-08-09 15:57:59.975	2026-08-02 15:57:59.979
43bd46c6-3bf8-4f85-8394-cee006633f08	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4YzcyNzU2NS03MzIxLTRkYzgtOTY2Ny01ODIwZmMyZjFhMTkiLCJpYXQiOjE3ODU2ODc0NzEsImV4cCI6MTc4NjI5MjI3MX0.5xqfZtAboX5uLViS2RzQ3MS3dpk4mT5FKFgK7Ld4ukY	8c727565-7321-4dc8-9667-5820fc2f1a19	2026-08-09 16:17:51.678	2026-08-02 16:17:51.679
077f8691-221b-41c3-931f-6dca71c52db3	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzMGVkODhiNS1iZDEyLTRkNTUtOWMyMy05NzViOGM5ZTAyNDQiLCJpYXQiOjE3OTAzMjk5NjEsImV4cCI6MTc5MDkzNDc2MX0.PMHrnVjoaBLb9HIetA6BKgRz3Kd1FDDCWUaMGeNGNBs	30ed88b5-bd12-4d55-9c23-975b8c9e0244	2026-10-02 09:52:41.622	2026-09-25 09:52:41.624
088a5e1f-ea1c-4657-8179-4b1b7a02751f	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4YzcyNzU2NS03MzIxLTRkYzgtOTY2Ny01ODIwZmMyZjFhMTkiLCJpYXQiOjE3OTAzNDQxOTAsImV4cCI6MTc5MDk0ODk5MH0.1mVTY5-KHwAxRMJMQ1jT66QJn21NKTRDXXK1emf-v1Q	8c727565-7321-4dc8-9667-5820fc2f1a19	2026-10-02 13:49:50.459	2026-09-25 13:49:50.46
ec9fbec5-2409-49e4-9717-2ab03b3798be	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4YzcyNzU2NS03MzIxLTRkYzgtOTY2Ny01ODIwZmMyZjFhMTkiLCJpYXQiOjE3OTAzNDU1NTQsImV4cCI6MTc5MDk1MDM1NH0.wkRBbQd3kUKGyNyO_p0CR-lPV4VWcxnAhyzAiXcgyaU	8c727565-7321-4dc8-9667-5820fc2f1a19	2026-10-02 14:12:34.665	2026-09-25 14:12:34.667
bb606d7c-e6db-48a7-9948-4105e4d4535d	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODJjMTg1MC1lNjA0LTQzNjEtOTA4Yi0xNjJkYmJjODYyZDAiLCJpYXQiOjE3OTAzNDU4NzYsImV4cCI6MTc5MDk1MDY3Nn0.jGzH8PbdNBEpLV9R9eNLmJt_4QJOlOBbj6WcPZywqLg	c82c1850-e604-4361-908b-162dbbc862d0	2026-10-02 14:17:56.409	2026-09-25 14:17:56.41
3b17df70-f750-41d9-a4ee-b3d2c1019e67	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODJjMTg1MC1lNjA0LTQzNjEtOTA4Yi0xNjJkYmJjODYyZDAiLCJpYXQiOjE3OTAzNDU4ODksImV4cCI6MTc5MDk1MDY4OX0.WA6rX7a8Z-b5b5PATB2bF5TuBsXTTG-4DTV_DGSDZ7k	c82c1850-e604-4361-908b-162dbbc862d0	2026-10-02 14:18:09.177	2026-09-25 14:18:09.178
585c8fee-51e7-4afc-8ed1-204d5ef7a08a	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4YzcyNzU2NS03MzIxLTRkYzgtOTY2Ny01ODIwZmMyZjFhMTkiLCJpYXQiOjE3ODU3NDIxMjYsImV4cCI6MTc4NjM0NjkyNn0.GHB5uRZRY62f-s7uHcvrlJkPCfBaKJJslBmSWyrv9jU	8c727565-7321-4dc8-9667-5820fc2f1a19	2026-08-10 07:28:46.684	2026-08-03 07:28:46.686
5c97c235-a333-4ad9-8db7-c3a9c91c2175	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4YzcyNzU2NS03MzIxLTRkYzgtOTY2Ny01ODIwZmMyZjFhMTkiLCJpYXQiOjE3OTAyNjU3ODksImV4cCI6MTc5MDg3MDU4OX0.HTec8Y9t6yBcH2MJUjLl5iY4JuXK_UfVQQ2GdprRmxc	8c727565-7321-4dc8-9667-5820fc2f1a19	2026-10-01 16:03:09.018	2026-09-24 16:03:09.02
97a8c735-b6b4-48b0-a7bb-a994cc08e396	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4YzcyNzU2NS03MzIxLTRkYzgtOTY2Ny01ODIwZmMyZjFhMTkiLCJpYXQiOjE3OTAyNjY4MTgsImV4cCI6MTc5MDg3MTYxOH0.-6jWo1U32CZS_pURhughWcRJw7B4fUw13V6oTQcpThQ	8c727565-7321-4dc8-9667-5820fc2f1a19	2026-10-01 16:20:18.226	2026-09-24 16:20:18.228
be8c51ca-7b9a-4aeb-8c58-b8b71f48e3c7	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4YzcyNzU2NS03MzIxLTRkYzgtOTY2Ny01ODIwZmMyZjFhMTkiLCJpYXQiOjE3OTAyNzI3MTIsImV4cCI6MTc5MDg3NzUxMn0.ymYANO5vqH5v-J3SQMCCMn5Op-SSfK4S4JRzkN2MW3s	8c727565-7321-4dc8-9667-5820fc2f1a19	2026-10-01 17:58:32.122	2026-09-24 17:58:32.126
a2121fc3-85ac-4cd7-8da6-57d80a2c8d0c	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4YzcyNzU2NS03MzIxLTRkYzgtOTY2Ny01ODIwZmMyZjFhMTkiLCJpYXQiOjE3OTAyNzI3MjgsImV4cCI6MTc5MDg3NzUyOH0.ZbKjbJcjR5Lyocc5g8ZoNVFYGhQZBUyqc9Y40kYRgp8	8c727565-7321-4dc8-9667-5820fc2f1a19	2026-10-01 17:58:48.442	2026-09-24 17:58:48.443
9c37069b-eccc-48ed-96fa-f15c55dbe23f	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4YzcyNzU2NS03MzIxLTRkYzgtOTY2Ny01ODIwZmMyZjFhMTkiLCJpYXQiOjE3OTAyNzMzNDAsImV4cCI6MTc5MDg3ODE0MH0.MG1NfooyoPU0qL6WyxZoCqIPR6XXJyil6JNuX9I1LRA	8c727565-7321-4dc8-9667-5820fc2f1a19	2026-10-01 18:09:00.547	2026-09-24 18:09:00.549
5995fba4-86c6-463c-8494-f50fa50d913e	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4YzcyNzU2NS03MzIxLTRkYzgtOTY2Ny01ODIwZmMyZjFhMTkiLCJpYXQiOjE3OTAyNzM2ODcsImV4cCI6MTc5MDg3ODQ4N30.lrcNm1WoebMmsYyFbuJYEfYTDY2INNwRlnCaLVDyGb8	8c727565-7321-4dc8-9667-5820fc2f1a19	2026-10-01 18:14:47.919	2026-09-24 18:14:47.921
e25150f1-82ea-497b-b3cd-d0a0f25a0e89	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4YzcyNzU2NS03MzIxLTRkYzgtOTY2Ny01ODIwZmMyZjFhMTkiLCJpYXQiOjE3OTAyNzM3MDMsImV4cCI6MTc5MDg3ODUwM30.6NMTrSdyNb8I6Tzk0NiqXZo__Fge5oWGbTfJ8fnVLMU	8c727565-7321-4dc8-9667-5820fc2f1a19	2026-10-01 18:15:03.586	2026-09-24 18:15:03.587
560138f4-8fb9-40d2-9e6a-a7cf6dfea44a	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzMGVkODhiNS1iZDEyLTRkNTUtOWMyMy05NzViOGM5ZTAyNDQiLCJpYXQiOjE3OTAyNzQxOTYsImV4cCI6MTc5MDg3ODk5Nn0.TrQ3sPuU9xYBwoM6STYTjWCfX_SGfl3XbDGPMA_iDQc	30ed88b5-bd12-4d55-9c23-975b8c9e0244	2026-10-01 18:23:16.563	2026-09-24 18:23:16.565
106369b1-ce43-426e-8a5e-fcc8469410b7	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzMGVkODhiNS1iZDEyLTRkNTUtOWMyMy05NzViOGM5ZTAyNDQiLCJpYXQiOjE3OTAyNzQyMDQsImV4cCI6MTc5MDg3OTAwNH0.sN92kCj9L3ciGgV7jk5IyZ9nizITkbfKZOcFfkLGOYs	30ed88b5-bd12-4d55-9c23-975b8c9e0244	2026-10-01 18:23:24.975	2026-09-24 18:23:24.978
87b6f354-ab94-41c3-91dc-738c4c1d4ecd	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4YzcyNzU2NS03MzIxLTRkYzgtOTY2Ny01ODIwZmMyZjFhMTkiLCJpYXQiOjE3OTAyNzQyNzAsImV4cCI6MTc5MDg3OTA3MH0.LYA50PqrlKljuYm2bs_0d9ufGF6zimm3iN22wHfJJD4	8c727565-7321-4dc8-9667-5820fc2f1a19	2026-10-01 18:24:30.161	2026-09-24 18:24:30.162
1ced648b-fc3f-4742-8b8a-9918bece98e3	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4YzcyNzU2NS03MzIxLTRkYzgtOTY2Ny01ODIwZmMyZjFhMTkiLCJpYXQiOjE3OTAzMjc5MjYsImV4cCI6MTc5MDkzMjcyNn0.jbx4tXg6YYCJ_VIvZuh9ICf34bC_Abu_nVn6sEHQG5g	8c727565-7321-4dc8-9667-5820fc2f1a19	2026-10-02 09:18:46.551	2026-09-25 09:18:46.552
\.


--
-- Data for Name: Region; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Region" (id, name, "companyId", "monthlyBudget", status, "createdAt", "updatedAt") FROM stdin;
925f8e03-e4b9-4b1f-a4a1-fa2d82568036	Mudug	4911f01d-6c14-43f3-902d-c9e8f063f1b6	0.00	ACTIVE	2026-08-02 16:05:12.632	2026-08-02 16:05:12.632
7eee5fc3-0e23-4a87-9998-66900b92559f	Bari & Sanaag	4911f01d-6c14-43f3-902d-c9e8f063f1b6	0.00	ACTIVE	2026-08-02 16:05:48.366	2026-08-02 16:05:48.366
93aa752f-9ef2-41bd-8c9a-44d888caf134	Karkaar	4911f01d-6c14-43f3-902d-c9e8f063f1b6	0.00	ACTIVE	2026-08-02 16:06:52.297	2026-08-02 16:06:52.297
cdd9cb9a-ee9f-4367-b531-a9bcc535ffd0	Mudug	1d625f68-7207-4e5f-af81-c6d708fba6e8	200.00	ACTIVE	2026-08-02 16:05:22.126	2026-08-02 16:22:33.435
524e00bb-793d-4ea7-9fcb-53ff443438cb	Nugaal	1d625f68-7207-4e5f-af81-c6d708fba6e8	200.00	ACTIVE	2026-08-02 16:05:04.371	2026-08-02 16:22:50.612
59f189b1-da70-4135-9fd5-4e8765db3caa	Sanaag	1d625f68-7207-4e5f-af81-c6d708fba6e8	300.00	ACTIVE	2026-08-02 16:07:01.537	2026-08-02 16:23:04.758
d2db6d61-d1b6-4896-ac38-fcb17ab7c20f	Bari & Karkaar	1d625f68-7207-4e5f-af81-c6d708fba6e8	200.00	ACTIVE	2026-08-02 16:05:37.899	2026-08-02 16:23:13.373
6600517b-6a8e-4245-9371-aacbb8ab73de	Nugaal	4911f01d-6c14-43f3-902d-c9e8f063f1b6	200.00	ACTIVE	2026-08-02 16:04:57.726	2026-08-02 17:47:41.996
\.


--
-- Data for Name: Role; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Role" (id, name, description, "createdAt", "updatedAt") FROM stdin;
d33ac25f-f1a9-4b22-8b3f-b05b288f5677	SUPER_ADMIN	Super administrator with access to all modules and configurations.	2026-08-02 15:56:25.642	2026-08-02 15:56:25.642
b4f4e747-d480-4cf8-ba13-207fd5414690	ACCOUNTANT	Accountant responsible for reviewing and paying petty cash requests.	2026-08-02 15:56:25.658	2026-08-02 15:56:25.658
d47a1a39-84c7-4e05-9471-a0797d9971d6	EMPLOYEE	General employee who can create petty cash requests and settle expenses.	2026-08-02 15:56:25.661	2026-08-02 15:56:25.661
\.


--
-- Data for Name: RolePermission; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."RolePermission" ("roleId", "permissionId") FROM stdin;
d33ac25f-f1a9-4b22-8b3f-b05b288f5677	e6af67ad-78fb-422f-b853-36fcefb9e477
d33ac25f-f1a9-4b22-8b3f-b05b288f5677	a2c32d63-4da5-4d0c-b2c0-78277cfb6f2c
d33ac25f-f1a9-4b22-8b3f-b05b288f5677	0104f8b2-44b0-4cad-91ab-c999021b5c47
d33ac25f-f1a9-4b22-8b3f-b05b288f5677	ed904352-9a14-448d-a3ec-26547f37018e
d33ac25f-f1a9-4b22-8b3f-b05b288f5677	0b1d1700-0d3e-4ee2-b43c-ef0343347e36
d33ac25f-f1a9-4b22-8b3f-b05b288f5677	695b261c-fe7a-42ae-8d42-d68417479044
d33ac25f-f1a9-4b22-8b3f-b05b288f5677	7bc144fe-a721-4a7a-8c64-d999051e7aed
d33ac25f-f1a9-4b22-8b3f-b05b288f5677	95e9fd1c-310a-4c2e-9e9e-623661643331
d33ac25f-f1a9-4b22-8b3f-b05b288f5677	c13737c2-9b20-4e8a-ab1a-94901f038d68
b4f4e747-d480-4cf8-ba13-207fd5414690	a2c32d63-4da5-4d0c-b2c0-78277cfb6f2c
b4f4e747-d480-4cf8-ba13-207fd5414690	ed904352-9a14-448d-a3ec-26547f37018e
b4f4e747-d480-4cf8-ba13-207fd5414690	0b1d1700-0d3e-4ee2-b43c-ef0343347e36
b4f4e747-d480-4cf8-ba13-207fd5414690	695b261c-fe7a-42ae-8d42-d68417479044
b4f4e747-d480-4cf8-ba13-207fd5414690	7bc144fe-a721-4a7a-8c64-d999051e7aed
b4f4e747-d480-4cf8-ba13-207fd5414690	95e9fd1c-310a-4c2e-9e9e-623661643331
d47a1a39-84c7-4e05-9471-a0797d9971d6	a2c32d63-4da5-4d0c-b2c0-78277cfb6f2c
d47a1a39-84c7-4e05-9471-a0797d9971d6	0104f8b2-44b0-4cad-91ab-c999021b5c47
d47a1a39-84c7-4e05-9471-a0797d9971d6	ed904352-9a14-448d-a3ec-26547f37018e
d47a1a39-84c7-4e05-9471-a0797d9971d6	7bc144fe-a721-4a7a-8c64-d999051e7aed
\.


--
-- Data for Name: SystemSetting; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SystemSetting" (id, key, value, description, "updatedAt") FROM stdin;
70656650-3f17-450f-8c40-80eecb1519f8	MAX_ATTACHMENT_SIZE_MB	20	Maximum upload size limit per file in MB	2026-08-02 15:56:26.083
bfbafe65-d1fb-4637-996e-b9369547df26	MAX_ATTACHMENTS_COUNT	10	Maximum allowed attachment files count per request	2026-08-02 15:56:26.094
d375367e-87fc-4430-8ea9-c83eadedf676	CURRENCY_OPTIONS	USD,SOS,SLS	Comma-separated list of supported currencies	2026-08-02 15:56:26.098
61796a28-55d3-4cbc-85f0-fcbe172a2f30	AUTO_APPROVE_LIMIT	50.00	Threshold below which request skips manager review if configured	2026-08-02 15:56:26.101
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."User" (id, "fullName", username, "passwordHash", email, phone, "companyId", "departmentId", "regionId", "roleId", status, "resetPasswordRequired", "createdAt", "updatedAt", "jobTitle") FROM stdin;
30ed88b5-bd12-4d55-9c23-975b8c9e0244	Bashir Abdikarim	bashiir	$2a$10$viYFgpS6jEDHoZbLnKjSBeQNNp.ZUeDq8SfXrOuwwF.CyLgFFA8kS	\N	\N	1d625f68-7207-4e5f-af81-c6d708fba6e8	7bd04125-854a-4d67-bc6a-0c31f9dc1f79	524e00bb-793d-4ea7-9fcb-53ff443438cb	d47a1a39-84c7-4e05-9471-a0797d9971d6	ACTIVE	f	2026-08-03 07:36:14.147	2026-09-25 13:43:20.136	\N
8c727565-7321-4dc8-9667-5820fc2f1a19	System Administrator	admin	$2a$10$dNcxwVUtZPoxDxJre/iG2.Ya0jUVfRi2oPMxYqFXaO5AWRSXVQLpK	admin@somtel.com	+252660000548	1d625f68-7207-4e5f-af81-c6d708fba6e8	bcb54c84-0251-4702-aa22-d2a411a56434	\N	d33ac25f-f1a9-4b22-8b3f-b05b288f5677	ACTIVE	f	2026-08-02 15:56:26.061	2026-09-25 14:14:59.601	\N
c82c1850-e604-4361-908b-162dbbc862d0	Mustafe Abdi Shir	mustafe	$2a$10$b7bgaaQ1Mud8f6i3ti3j6OrZzgRho4bp1nmtmNTVtdXf3PKptaKGW	mustafe@gmail.com	66005959	4911f01d-6c14-43f3-902d-c9e8f063f1b6	81a50da1-faec-41cb-bcef-82c72ebd11a2	\N	b4f4e747-d480-4cf8-ba13-207fd5414690	ACTIVE	f	2026-09-25 14:17:34.432	2026-09-25 14:18:09.172	\N
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
\.


--
-- Name: AuditLog AuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);


--
-- Name: BudgetHead BudgetHead_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."BudgetHead"
    ADD CONSTRAINT "BudgetHead_pkey" PRIMARY KEY (id);


--
-- Name: Company Company_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Company"
    ADD CONSTRAINT "Company_pkey" PRIMARY KEY (id);


--
-- Name: Department Department_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Department"
    ADD CONSTRAINT "Department_pkey" PRIMARY KEY (id);


--
-- Name: ExpenseSettlement ExpenseSettlement_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ExpenseSettlement"
    ADD CONSTRAINT "ExpenseSettlement_pkey" PRIMARY KEY (id);


--
-- Name: Notification Notification_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (id);


--
-- Name: Payment Payment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_pkey" PRIMARY KEY (id);


--
-- Name: Permission Permission_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Permission"
    ADD CONSTRAINT "Permission_pkey" PRIMARY KEY (id);


--
-- Name: PettyCashAttachment PettyCashAttachment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PettyCashAttachment"
    ADD CONSTRAINT "PettyCashAttachment_pkey" PRIMARY KEY (id);


--
-- Name: PettyCashFund PettyCashFund_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PettyCashFund"
    ADD CONSTRAINT "PettyCashFund_pkey" PRIMARY KEY (id);


--
-- Name: PettyCashLedger PettyCashLedger_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PettyCashLedger"
    ADD CONSTRAINT "PettyCashLedger_pkey" PRIMARY KEY (id);


--
-- Name: PettyCashRequest PettyCashRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PettyCashRequest"
    ADD CONSTRAINT "PettyCashRequest_pkey" PRIMARY KEY (id);


--
-- Name: Project Project_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_pkey" PRIMARY KEY (id);


--
-- Name: RefreshToken RefreshToken_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RefreshToken"
    ADD CONSTRAINT "RefreshToken_pkey" PRIMARY KEY (id);


--
-- Name: Region Region_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Region"
    ADD CONSTRAINT "Region_pkey" PRIMARY KEY (id);


--
-- Name: RolePermission RolePermission_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RolePermission"
    ADD CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId", "permissionId");


--
-- Name: Role Role_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Role"
    ADD CONSTRAINT "Role_pkey" PRIMARY KEY (id);


--
-- Name: SystemSetting SystemSetting_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SystemSetting"
    ADD CONSTRAINT "SystemSetting_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: BudgetHead_code_companyId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "BudgetHead_code_companyId_key" ON public."BudgetHead" USING btree (code, "companyId");


--
-- Name: BudgetHead_name_companyId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "BudgetHead_name_companyId_key" ON public."BudgetHead" USING btree (name, "companyId");


--
-- Name: Company_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Company_name_key" ON public."Company" USING btree (name);


--
-- Name: Department_name_companyId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Department_name_companyId_key" ON public."Department" USING btree (name, "companyId");


--
-- Name: ExpenseSettlement_companyId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ExpenseSettlement_companyId_idx" ON public."ExpenseSettlement" USING btree ("companyId");


--
-- Name: ExpenseSettlement_requestId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ExpenseSettlement_requestId_idx" ON public."ExpenseSettlement" USING btree ("requestId");


--
-- Name: ExpenseSettlement_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ExpenseSettlement_status_idx" ON public."ExpenseSettlement" USING btree (status);


--
-- Name: Payment_companyId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Payment_companyId_idx" ON public."Payment" USING btree ("companyId");


--
-- Name: Payment_paidById_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Payment_paidById_idx" ON public."Payment" USING btree ("paidById");


--
-- Name: Payment_requestId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Payment_requestId_idx" ON public."Payment" USING btree ("requestId");


--
-- Name: PettyCashFund_companyId_month_year_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "PettyCashFund_companyId_month_year_key" ON public."PettyCashFund" USING btree ("companyId", month, year);


--
-- Name: PettyCashRequest_requestNumber_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "PettyCashRequest_requestNumber_key" ON public."PettyCashRequest" USING btree ("requestNumber");


--
-- Name: Project_name_companyId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Project_name_companyId_key" ON public."Project" USING btree (name, "companyId");


--
-- Name: RefreshToken_token_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "RefreshToken_token_key" ON public."RefreshToken" USING btree (token);


--
-- Name: Region_name_companyId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Region_name_companyId_key" ON public."Region" USING btree (name, "companyId");


--
-- Name: Role_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Role_name_key" ON public."Role" USING btree (name);


--
-- Name: SystemSetting_key_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "SystemSetting_key_key" ON public."SystemSetting" USING btree (key);


--
-- Name: User_phone_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_phone_key" ON public."User" USING btree (phone);


--
-- Name: User_username_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_username_key" ON public."User" USING btree (username);


--
-- Name: AuditLog AuditLog_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: BudgetHead BudgetHead_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."BudgetHead"
    ADD CONSTRAINT "BudgetHead_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Department Department_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Department"
    ADD CONSTRAINT "Department_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ExpenseSettlement ExpenseSettlement_approvedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ExpenseSettlement"
    ADD CONSTRAINT "ExpenseSettlement_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ExpenseSettlement ExpenseSettlement_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ExpenseSettlement"
    ADD CONSTRAINT "ExpenseSettlement_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ExpenseSettlement ExpenseSettlement_requestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ExpenseSettlement"
    ADD CONSTRAINT "ExpenseSettlement_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES public."PettyCashRequest"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Notification Notification_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Payment Payment_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Payment Payment_paidById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Payment Payment_requestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES public."PettyCashRequest"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PettyCashAttachment PettyCashAttachment_requestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PettyCashAttachment"
    ADD CONSTRAINT "PettyCashAttachment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES public."PettyCashRequest"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PettyCashFund PettyCashFund_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PettyCashFund"
    ADD CONSTRAINT "PettyCashFund_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PettyCashLedger PettyCashLedger_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PettyCashLedger"
    ADD CONSTRAINT "PettyCashLedger_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PettyCashLedger PettyCashLedger_employeeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PettyCashLedger"
    ADD CONSTRAINT "PettyCashLedger_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PettyCashLedger PettyCashLedger_fundId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PettyCashLedger"
    ADD CONSTRAINT "PettyCashLedger_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES public."PettyCashFund"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PettyCashLedger PettyCashLedger_requestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PettyCashLedger"
    ADD CONSTRAINT "PettyCashLedger_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES public."PettyCashRequest"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PettyCashRequest PettyCashRequest_budgetHeadId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PettyCashRequest"
    ADD CONSTRAINT "PettyCashRequest_budgetHeadId_fkey" FOREIGN KEY ("budgetHeadId") REFERENCES public."BudgetHead"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PettyCashRequest PettyCashRequest_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PettyCashRequest"
    ADD CONSTRAINT "PettyCashRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PettyCashRequest PettyCashRequest_departmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PettyCashRequest"
    ADD CONSTRAINT "PettyCashRequest_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES public."Department"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PettyCashRequest PettyCashRequest_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PettyCashRequest"
    ADD CONSTRAINT "PettyCashRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PettyCashRequest PettyCashRequest_regionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PettyCashRequest"
    ADD CONSTRAINT "PettyCashRequest_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES public."Region"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PettyCashRequest PettyCashRequest_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PettyCashRequest"
    ADD CONSTRAINT "PettyCashRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Project Project_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RefreshToken RefreshToken_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RefreshToken"
    ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Region Region_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Region"
    ADD CONSTRAINT "Region_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RolePermission RolePermission_permissionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RolePermission"
    ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES public."Permission"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RolePermission RolePermission_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RolePermission"
    ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public."Role"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: User User_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: User User_departmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES public."Department"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: User User_regionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES public."Region"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: User User_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public."Role"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict plT55B1d4WMM6oxw6tZLpClEhrnGgWu8Nd2RZbcvl9jZWSNBajBqaGFtkA7kIOO

