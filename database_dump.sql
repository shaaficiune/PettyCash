--
-- PostgreSQL database dump
--

\restrict 888cDRHrCpRD9QrW2RehnHZaB7N995bJ09S3DfnVDwDShA9aaTOVobRrxctblfm

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

ALTER TABLE IF EXISTS ONLY public."User" DROP CONSTRAINT IF EXISTS "User_roleId_fkey";
ALTER TABLE IF EXISTS ONLY public."User" DROP CONSTRAINT IF EXISTS "User_regionId_fkey";
ALTER TABLE IF EXISTS ONLY public."User" DROP CONSTRAINT IF EXISTS "User_departmentId_fkey";
ALTER TABLE IF EXISTS ONLY public."User" DROP CONSTRAINT IF EXISTS "User_companyId_fkey";
ALTER TABLE IF EXISTS ONLY public."RolePermission" DROP CONSTRAINT IF EXISTS "RolePermission_roleId_fkey";
ALTER TABLE IF EXISTS ONLY public."RolePermission" DROP CONSTRAINT IF EXISTS "RolePermission_permissionId_fkey";
ALTER TABLE IF EXISTS ONLY public."Region" DROP CONSTRAINT IF EXISTS "Region_companyId_fkey";
ALTER TABLE IF EXISTS ONLY public."RefreshToken" DROP CONSTRAINT IF EXISTS "RefreshToken_userId_fkey";
ALTER TABLE IF EXISTS ONLY public."Project" DROP CONSTRAINT IF EXISTS "Project_companyId_fkey";
ALTER TABLE IF EXISTS ONLY public."PettyCashRequest" DROP CONSTRAINT IF EXISTS "PettyCashRequest_userId_fkey";
ALTER TABLE IF EXISTS ONLY public."PettyCashRequest" DROP CONSTRAINT IF EXISTS "PettyCashRequest_regionId_fkey";
ALTER TABLE IF EXISTS ONLY public."PettyCashRequest" DROP CONSTRAINT IF EXISTS "PettyCashRequest_projectId_fkey";
ALTER TABLE IF EXISTS ONLY public."PettyCashRequest" DROP CONSTRAINT IF EXISTS "PettyCashRequest_departmentId_fkey";
ALTER TABLE IF EXISTS ONLY public."PettyCashRequest" DROP CONSTRAINT IF EXISTS "PettyCashRequest_companyId_fkey";
ALTER TABLE IF EXISTS ONLY public."PettyCashRequest" DROP CONSTRAINT IF EXISTS "PettyCashRequest_budgetHeadId_fkey";
ALTER TABLE IF EXISTS ONLY public."PettyCashLedger" DROP CONSTRAINT IF EXISTS "PettyCashLedger_requestId_fkey";
ALTER TABLE IF EXISTS ONLY public."PettyCashLedger" DROP CONSTRAINT IF EXISTS "PettyCashLedger_fundId_fkey";
ALTER TABLE IF EXISTS ONLY public."PettyCashLedger" DROP CONSTRAINT IF EXISTS "PettyCashLedger_employeeId_fkey";
ALTER TABLE IF EXISTS ONLY public."PettyCashLedger" DROP CONSTRAINT IF EXISTS "PettyCashLedger_companyId_fkey";
ALTER TABLE IF EXISTS ONLY public."PettyCashFund" DROP CONSTRAINT IF EXISTS "PettyCashFund_companyId_fkey";
ALTER TABLE IF EXISTS ONLY public."PettyCashAttachment" DROP CONSTRAINT IF EXISTS "PettyCashAttachment_requestId_fkey";
ALTER TABLE IF EXISTS ONLY public."Payment" DROP CONSTRAINT IF EXISTS "Payment_requestId_fkey";
ALTER TABLE IF EXISTS ONLY public."Payment" DROP CONSTRAINT IF EXISTS "Payment_paidById_fkey";
ALTER TABLE IF EXISTS ONLY public."Payment" DROP CONSTRAINT IF EXISTS "Payment_companyId_fkey";
ALTER TABLE IF EXISTS ONLY public."Notification" DROP CONSTRAINT IF EXISTS "Notification_userId_fkey";
ALTER TABLE IF EXISTS ONLY public."ExpenseSettlement" DROP CONSTRAINT IF EXISTS "ExpenseSettlement_requestId_fkey";
ALTER TABLE IF EXISTS ONLY public."ExpenseSettlement" DROP CONSTRAINT IF EXISTS "ExpenseSettlement_companyId_fkey";
ALTER TABLE IF EXISTS ONLY public."ExpenseSettlement" DROP CONSTRAINT IF EXISTS "ExpenseSettlement_approvedById_fkey";
ALTER TABLE IF EXISTS ONLY public."Department" DROP CONSTRAINT IF EXISTS "Department_companyId_fkey";
ALTER TABLE IF EXISTS ONLY public."BudgetHead" DROP CONSTRAINT IF EXISTS "BudgetHead_companyId_fkey";
ALTER TABLE IF EXISTS ONLY public."AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_userId_fkey";
DROP INDEX IF EXISTS public."User_username_key";
DROP INDEX IF EXISTS public."User_employeeNumber_key";
DROP INDEX IF EXISTS public."SystemSetting_key_key";
DROP INDEX IF EXISTS public."Role_name_key";
DROP INDEX IF EXISTS public."Region_name_companyId_key";
DROP INDEX IF EXISTS public."RefreshToken_token_key";
DROP INDEX IF EXISTS public."Project_name_companyId_key";
DROP INDEX IF EXISTS public."PettyCashRequest_requestNumber_key";
DROP INDEX IF EXISTS public."PettyCashFund_companyId_month_year_key";
DROP INDEX IF EXISTS public."Payment_requestId_idx";
DROP INDEX IF EXISTS public."Payment_paidById_idx";
DROP INDEX IF EXISTS public."Payment_companyId_idx";
DROP INDEX IF EXISTS public."ExpenseSettlement_status_idx";
DROP INDEX IF EXISTS public."ExpenseSettlement_requestId_idx";
DROP INDEX IF EXISTS public."ExpenseSettlement_companyId_idx";
DROP INDEX IF EXISTS public."Department_name_companyId_key";
DROP INDEX IF EXISTS public."Company_name_key";
DROP INDEX IF EXISTS public."BudgetHead_name_companyId_key";
DROP INDEX IF EXISTS public."BudgetHead_code_companyId_key";
ALTER TABLE IF EXISTS ONLY public._prisma_migrations DROP CONSTRAINT IF EXISTS _prisma_migrations_pkey;
ALTER TABLE IF EXISTS ONLY public."User" DROP CONSTRAINT IF EXISTS "User_pkey";
ALTER TABLE IF EXISTS ONLY public."SystemSetting" DROP CONSTRAINT IF EXISTS "SystemSetting_pkey";
ALTER TABLE IF EXISTS ONLY public."Role" DROP CONSTRAINT IF EXISTS "Role_pkey";
ALTER TABLE IF EXISTS ONLY public."RolePermission" DROP CONSTRAINT IF EXISTS "RolePermission_pkey";
ALTER TABLE IF EXISTS ONLY public."Region" DROP CONSTRAINT IF EXISTS "Region_pkey";
ALTER TABLE IF EXISTS ONLY public."RefreshToken" DROP CONSTRAINT IF EXISTS "RefreshToken_pkey";
ALTER TABLE IF EXISTS ONLY public."Project" DROP CONSTRAINT IF EXISTS "Project_pkey";
ALTER TABLE IF EXISTS ONLY public."PettyCashRequest" DROP CONSTRAINT IF EXISTS "PettyCashRequest_pkey";
ALTER TABLE IF EXISTS ONLY public."PettyCashLedger" DROP CONSTRAINT IF EXISTS "PettyCashLedger_pkey";
ALTER TABLE IF EXISTS ONLY public."PettyCashFund" DROP CONSTRAINT IF EXISTS "PettyCashFund_pkey";
ALTER TABLE IF EXISTS ONLY public."PettyCashAttachment" DROP CONSTRAINT IF EXISTS "PettyCashAttachment_pkey";
ALTER TABLE IF EXISTS ONLY public."Permission" DROP CONSTRAINT IF EXISTS "Permission_pkey";
ALTER TABLE IF EXISTS ONLY public."Payment" DROP CONSTRAINT IF EXISTS "Payment_pkey";
ALTER TABLE IF EXISTS ONLY public."Notification" DROP CONSTRAINT IF EXISTS "Notification_pkey";
ALTER TABLE IF EXISTS ONLY public."ExpenseSettlement" DROP CONSTRAINT IF EXISTS "ExpenseSettlement_pkey";
ALTER TABLE IF EXISTS ONLY public."Department" DROP CONSTRAINT IF EXISTS "Department_pkey";
ALTER TABLE IF EXISTS ONLY public."Company" DROP CONSTRAINT IF EXISTS "Company_pkey";
ALTER TABLE IF EXISTS ONLY public."BudgetHead" DROP CONSTRAINT IF EXISTS "BudgetHead_pkey";
ALTER TABLE IF EXISTS ONLY public."AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_pkey";
DROP TABLE IF EXISTS public._prisma_migrations;
DROP TABLE IF EXISTS public."User";
DROP TABLE IF EXISTS public."SystemSetting";
DROP TABLE IF EXISTS public."RolePermission";
DROP TABLE IF EXISTS public."Role";
DROP TABLE IF EXISTS public."Region";
DROP TABLE IF EXISTS public."RefreshToken";
DROP TABLE IF EXISTS public."Project";
DROP TABLE IF EXISTS public."PettyCashRequest";
DROP TABLE IF EXISTS public."PettyCashLedger";
DROP TABLE IF EXISTS public."PettyCashFund";
DROP TABLE IF EXISTS public."PettyCashAttachment";
DROP TABLE IF EXISTS public."Permission";
DROP TABLE IF EXISTS public."Payment";
DROP TABLE IF EXISTS public."Notification";
DROP TABLE IF EXISTS public."ExpenseSettlement";
DROP TABLE IF EXISTS public."Department";
DROP TABLE IF EXISTS public."Company";
DROP TABLE IF EXISTS public."BudgetHead";
DROP TABLE IF EXISTS public."AuditLog";
DROP TYPE IF EXISTS public."SettlementStatus";
DROP TYPE IF EXISTS public."RoleName";
DROP TYPE IF EXISTS public."RequestType";
DROP TYPE IF EXISTS public."RequestStatus";
DROP TYPE IF EXISTS public."Priority";
DROP TYPE IF EXISTS public."PaymentMethod";
-- *not* dropping schema, since initdb creates it
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
    "employeeNumber" text NOT NULL,
    "companyId" text NOT NULL,
    "departmentId" text NOT NULL,
    "regionId" text,
    "roleId" text NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "resetPasswordRequired" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
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
06c32ec9-4815-491c-bc13-3ddf3ea84978	703c4a81-d279-4de7-9d19-15ef005211dc	LOGOUT	{"url":"/api/auth/logout","method":"POST","body":{"refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3MDNjNGE4MS1kMjc5LTRkZTctOWQxOS0xNWVmMDA1MjExZGMiLCJpYXQiOjE3ODU2ODc1NTAsImV4cCI6MTc4NjI5MjM1MH0.KM9KoiKKyoOh81bY5E9Avbf3w-os_I8_EUqTNO0O8W4"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 16:21:05.686
b7903544-39d7-49ac-a569-7cea7e8161e5	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"admin","password":"********"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 16:21:10.187
fd8c6e27-fc30-4fb9-b240-dbf8ad2b4d9a	8c727565-7321-4dc8-9667-5820fc2f1a19	LOGOUT	{"url":"/api/auth/logout","method":"POST","body":{"refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4YzcyNzU2NS03MzIxLTRkYzgtOTY2Ny01ODIwZmMyZjFhMTkiLCJpYXQiOjE3ODU2ODc2NzAsImV4cCI6MTc4NjI5MjQ3MH0.z51iwMembW41NZad-A3dZPFPN131QVlmfPiNv2yziIc"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 16:24:01.082
490f7a35-343f-4eef-8f08-ec9b8c27a520	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"shaafici","password":"********"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 16:24:06.938
07e1658f-589b-4106-8d5b-f95b33c5bde8	703c4a81-d279-4de7-9d19-15ef005211dc	CREATE_REQUEST	{"url":"/api/requests","method":"POST","body":{"projectId":"959d6eed-c5c9-45d7-97c7-780ee60bc7ce","regionId":"6600517b-6a8e-4245-9371-aacbb8ab73de","budgetHeadId":"8c61786e-bcaa-4565-baa8-d98fb727cd65","purpose":"Item iib","description":"dkdkkjfdjdjjdfjd","requestedAmount":20,"currency":"USD","priority":"NORMAL","requiredDate":"2026-08-02","attachments":[],"status":"PENDING_APPROVAL"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 16:24:46.148
d01430f4-3cf5-4694-8ffa-f607e255241e	703c4a81-d279-4de7-9d19-15ef005211dc	LOGOUT	{"url":"/api/auth/logout","method":"POST","body":{"refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3MDNjNGE4MS1kMjc5LTRkZTctOWQxOS0xNWVmMDA1MjExZGMiLCJpYXQiOjE3ODU2ODc4NDYsImV4cCI6MTc4NjI5MjY0Nn0.2A3l3Of_uyc3EO9NvfMklIjlfT4-5ReGXHwHY2VZlbw"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 16:25:04.32
bdd0f560-4aa3-4092-ac29-4479db5cb9fb	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"admin","password":"********"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 16:25:06.932
e48e01b9-aca8-44ba-bae1-9efe44735bce	8c727565-7321-4dc8-9667-5820fc2f1a19	CREATE_REQUEST	{"url":"/api/requests/c052ac59-0a29-4e62-ae9d-31fc52f1b9ed/review","method":"POST","body":{"status":"APPROVED","comments":"","approvedAmount":20},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 16:25:13.242
09345e98-2366-4ab0-b4e4-238206349f8a	8c727565-7321-4dc8-9667-5820fc2f1a19	RECORD_PAYMENT	{"url":"/api/payments","method":"POST","body":{"requestId":"c052ac59-0a29-4e62-ae9d-31fc52f1b9ed","amountPaid":20,"paymentMethod":"EDAHAB","notes":""},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 16:31:12.709
a5ebce68-d37f-487a-bb5b-94b71ef77045	8c727565-7321-4dc8-9667-5820fc2f1a19	LOGOUT	{"url":"/api/auth/logout","method":"POST","body":{"refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4YzcyNzU2NS03MzIxLTRkYzgtOTY2Ny01ODIwZmMyZjFhMTkiLCJpYXQiOjE3ODU2ODk3MzQsImV4cCI6MTc4NjI5NDUzNH0.qKhPRH1B4GSA24j2dli0-bnrKqos2gI1ZzD2c-VFqzo"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 16:58:37.065
a5e77c01-516e-4064-aa79-6642edab873c	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"shaafici","password":"********"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 16:58:45.522
5db4fa70-b9e9-41e9-8030-630a468feb5d	703c4a81-d279-4de7-9d19-15ef005211dc	CREATE_REQUEST	{"url":"/api/requests","method":"POST","body":{"regionId":"6600517b-6a8e-4245-9371-aacbb8ab73de","budgetHeadId":"607c77ba-53dd-4306-874c-0a1ff41cd902","purpose":"test","description":"done","requestedAmount":20,"currency":"USD","priority":"NORMAL","requiredDate":"2026-08-02","attachments":[],"status":"PENDING_APPROVAL"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 16:59:09.562
71978282-69ce-4f3d-b505-8bad982759cf	703c4a81-d279-4de7-9d19-15ef005211dc	LOGOUT	{"url":"/api/auth/logout","method":"POST","body":{"refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3MDNjNGE4MS1kMjc5LTRkZTctOWQxOS0xNWVmMDA1MjExZGMiLCJpYXQiOjE3ODU2ODk5MjUsImV4cCI6MTc4NjI5NDcyNX0.oN7QoJ1XVJSly7EXpf6_NQ4MyrmcBcQhdrIvMRe90Uo"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 16:59:13.48
e0d10dd2-0058-4624-9362-d1a47668bd5c	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"admin","password":"********"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 16:59:15.634
804af297-f5f4-47d8-ae4e-04fb5727b7fd	8c727565-7321-4dc8-9667-5820fc2f1a19	CREATE_REQUEST	{"url":"/api/requests/0bf06374-ac9a-49a9-9df8-d1863c02adfe/review","method":"POST","body":{"status":"APPROVED","comments":"","approvedAmount":20},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 16:59:19.915
d60d5dee-b02a-471f-80f2-16e8e8cd5a25	8c727565-7321-4dc8-9667-5820fc2f1a19	RECORD_PAYMENT	{"url":"/api/payments","method":"POST","body":{"requestId":"0bf06374-ac9a-49a9-9df8-d1863c02adfe","amountPaid":20,"paymentMethod":"EDAHAB","notes":""},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 16:59:29.293
3ed617dd-42c0-4edc-a043-7f767602aaea	8c727565-7321-4dc8-9667-5820fc2f1a19	LOGOUT	{"url":"/api/auth/logout","method":"POST","body":{"refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4YzcyNzU2NS03MzIxLTRkYzgtOTY2Ny01ODIwZmMyZjFhMTkiLCJpYXQiOjE3ODU2ODk5NTUsImV4cCI6MTc4NjI5NDc1NX0.AhrpjIcVDGZcyjnfR0vubrLid7EkZEchx-UMGFme-pU"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 17:12:11.905
17bcbfe3-d61b-4b18-85a2-c5c175fefa36	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"shaafici","password":"********"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 17:12:17.496
e9e99f07-c131-4b37-8a8a-4afcdcadf62e	703c4a81-d279-4de7-9d19-15ef005211dc	LOGOUT	{"url":"/api/auth/logout","method":"POST","body":{"refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3MDNjNGE4MS1kMjc5LTRkZTctOWQxOS0xNWVmMDA1MjExZGMiLCJpYXQiOjE3ODU2OTA3MzcsImV4cCI6MTc4NjI5NTUzN30.hL-6Qg0ppN-rH4oRMvfZ353TP43LUPHjNZd0s5j4NIU"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 17:16:28.335
f0379846-988d-44ee-ae01-240a908a5c34	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"admin","password":"********"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 17:16:30.375
dca28ac7-7e72-429e-bb7f-e11f8c361ea3	8c727565-7321-4dc8-9667-5820fc2f1a19	LOGOUT	{"url":"/api/auth/logout","method":"POST","body":{"refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4YzcyNzU2NS03MzIxLTRkYzgtOTY2Ny01ODIwZmMyZjFhMTkiLCJpYXQiOjE3ODU2OTE4OTMsImV4cCI6MTc4NjI5NjY5M30.YFiGLlxCZkBvtVr4LfMLiz8qjEalDeOpMfiEESsHh3Y"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 17:46:20.712
93e4b45a-1ff9-4a91-a483-1c81bc3a33cf	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"shaafici","password":"********"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 17:46:25.265
475d473f-2149-49cf-ba0c-c4d12490eb06	703c4a81-d279-4de7-9d19-15ef005211dc	CREATE_REQUEST	{"url":"/api/requests","method":"POST","body":{"regionId":"6600517b-6a8e-4245-9371-aacbb8ab73de","budgetHeadId":"ec67bfb1-05ba-4a5d-8f7c-7169f00a4261","purpose":"laptop","description":"dlkdkdfkf","requestedAmount":200,"currency":"USD","priority":"URGENT","requiredDate":"2026-08-02","attachments":[],"status":"PENDING_APPROVAL"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 17:46:43.656
b4f10f0c-ce32-4ac6-9cf0-59a1ca79e091	703c4a81-d279-4de7-9d19-15ef005211dc	LOGOUT	{"url":"/api/auth/logout","method":"POST","body":{"refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3MDNjNGE4MS1kMjc5LTRkZTctOWQxOS0xNWVmMDA1MjExZGMiLCJpYXQiOjE3ODU2OTI3ODUsImV4cCI6MTc4NjI5NzU4NX0.ugB0BkmDQplwx345wq5N-ZAGKe6Yvi-B-hE1npNgZvI"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 17:46:48.096
6f118fdb-9feb-43d3-aea6-40de20ee9a64	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"admin","password":"********"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 17:46:50.515
1b6d9b91-e748-4a4b-92f5-d5cd916d4455	8c727565-7321-4dc8-9667-5820fc2f1a19	CREATE_REQUEST	{"url":"/api/requests/83901e6b-9266-4ee1-b3f4-b1231a0abd56/review","method":"POST","body":{"status":"APPROVED","comments":"","approvedAmount":200},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 17:46:57.013
853fd637-2fe8-4c7e-80fb-e281d590cf7b	8c727565-7321-4dc8-9667-5820fc2f1a19	RECORD_PAYMENT	{"url":"/api/payments","method":"POST","body":{"requestId":"83901e6b-9266-4ee1-b3f4-b1231a0abd56","amountPaid":200,"paymentMethod":"EDAHAB","notes":""},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 17:47:00.15
f29dcbba-56ef-43c5-9ba2-5ae73f3f6769	8c727565-7321-4dc8-9667-5820fc2f1a19	LOGOUT	{"url":"/api/auth/logout","method":"POST","body":{"refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4YzcyNzU2NS03MzIxLTRkYzgtOTY2Ny01ODIwZmMyZjFhMTkiLCJpYXQiOjE3ODU2OTI4MTAsImV4cCI6MTc4NjI5NzYxMH0.PbBXLJ7irLSDbDzrToSMV9G3wlDqLzj4bHJ_3TcmWpw"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 17:47:05.923
e3f97850-bc87-44ef-a5f6-9e7b9848553f	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"admin","password":"********"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 17:47:07.843
faf0eeea-d38e-4355-ad94-873432741fb8	8c727565-7321-4dc8-9667-5820fc2f1a19	LOGOUT	{"url":"/api/auth/logout","method":"POST","body":{"refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4YzcyNzU2NS03MzIxLTRkYzgtOTY2Ny01ODIwZmMyZjFhMTkiLCJpYXQiOjE3ODU2OTI4MjcsImV4cCI6MTc4NjI5NzYyN30.mHWvnWXe4ehsh_InwGzhwjgz8Xr3hVZ3oxgFClpLSok"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 17:47:10.669
52cd941b-a59b-4aec-aeb8-b44b432221d1	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"shaafici","password":"********"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 17:47:14.314
89a329b5-07d9-485e-b66c-07b40b3f2e4f	703c4a81-d279-4de7-9d19-15ef005211dc	LOGOUT	{"url":"/api/auth/logout","method":"POST","body":{"refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3MDNjNGE4MS1kMjc5LTRkZTctOWQxOS0xNWVmMDA1MjExZGMiLCJpYXQiOjE3ODU2OTI4MzQsImV4cCI6MTc4NjI5NzYzNH0.H7TkeQCr6zbywgf40JvJFu-WfGy_Py5YDpB2lTsaZK8"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 17:47:24.112
c1880c9c-5620-45a8-85ed-c530eb991919	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"admin","password":"********"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 17:47:25.882
bb0a2984-93d1-4352-bfd1-1b413f322eb7	8c727565-7321-4dc8-9667-5820fc2f1a19	LOGOUT	{"url":"/api/auth/logout","method":"POST","body":{"refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4YzcyNzU2NS03MzIxLTRkYzgtOTY2Ny01ODIwZmMyZjFhMTkiLCJpYXQiOjE3ODU2OTI4NDUsImV4cCI6MTc4NjI5NzY0NX0.xtGs74tB9n6wCGSPfBGBnY8CJylimHvHuadOgvN_buw"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 17:47:48.898
2fc53608-2728-432e-9b20-a94e834a8eee	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"shaafici","password":"********"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 17:47:52.627
89752520-cd6c-4a03-b1e9-3779aef00ec4	703c4a81-d279-4de7-9d19-15ef005211dc	LOGOUT	{"url":"/api/auth/logout","method":"POST","body":{"refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3MDNjNGE4MS1kMjc5LTRkZTctOWQxOS0xNWVmMDA1MjExZGMiLCJpYXQiOjE3ODU2OTI4NzIsImV4cCI6MTc4NjI5NzY3Mn0.8DLNw8q_kBEUmONdep5_W8ZG66mc9LTVuKqSFA-gxxg"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 17:49:10.701
ecb11f87-c512-4eb6-87b4-3e90707d8bdf	\N	LOGIN	{"url":"/api/auth/login","method":"POST","body":{"username":"admin","password":"********"},"responseStatus":"SUCCESS"}	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36	2026-08-02 17:49:18.195
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
589a315b-52c5-4bf7-8043-705318c903dc	703c4a81-d279-4de7-9d19-15ef005211dc	Request Approved: PC-20260802-0001	Your petty cash request PC-20260802-0001 has been approved for USD 20.	f	2026-08-02 16:25:13.235
d5e7070d-10af-4a86-bbf4-c57d0689c090	703c4a81-d279-4de7-9d19-15ef005211dc	Payment Disbursed: PC-20260802-0001	A payment of USD 20 has been disbursed for request PC-20260802-0001 via EDAHAB.	f	2026-08-02 16:31:12.706
42f13e59-26e6-49ad-b604-d37893d5e8a6	703c4a81-d279-4de7-9d19-15ef005211dc	Request Approved: PC-20260802-0002	Your petty cash request PC-20260802-0002 has been approved for USD 20.	f	2026-08-02 16:59:19.906
41c37f5b-1c95-4e08-96f2-b42482e8be25	703c4a81-d279-4de7-9d19-15ef005211dc	Payment Disbursed: PC-20260802-0002	A payment of USD 20 has been disbursed for request PC-20260802-0002 via EDAHAB.	f	2026-08-02 16:59:29.29
983d8029-a42e-4bd7-975c-fc0077cf847b	703c4a81-d279-4de7-9d19-15ef005211dc	Request Approved: PC-20260802-0003	Your petty cash request PC-20260802-0003 has been approved for USD 200.	f	2026-08-02 17:46:57.003
ca8bd928-7edb-4e78-8156-e7f9b1f4b012	703c4a81-d279-4de7-9d19-15ef005211dc	Payment Disbursed: PC-20260802-0003	A payment of USD 200 has been disbursed for request PC-20260802-0003 via EDAHAB.	f	2026-08-02 17:47:00.147
\.


--
-- Data for Name: Payment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Payment" (id, "requestId", "companyId", "paymentDate", "amountPaid", "paymentMethod", "transactionId", "referenceNumber", "paidById", notes, "createdAt") FROM stdin;
503b0d35-5fb2-4320-8591-c3a97659e5a7	c052ac59-0a29-4e62-ae9d-31fc52f1b9ed	4911f01d-6c14-43f3-902d-c9e8f063f1b6	2026-08-02 16:31:12.665	20.00	EDAHAB	\N	\N	8c727565-7321-4dc8-9667-5820fc2f1a19		2026-08-02 16:31:12.667
7e4c0cd3-d665-4740-8637-34c399ea516a	0bf06374-ac9a-49a9-9df8-d1863c02adfe	4911f01d-6c14-43f3-902d-c9e8f063f1b6	2026-08-02 16:59:29.267	20.00	EDAHAB	\N	\N	8c727565-7321-4dc8-9667-5820fc2f1a19		2026-08-02 16:59:29.268
3fc3d1e0-98a7-48cc-9914-14ce56b6e877	83901e6b-9266-4ee1-b3f4-b1231a0abd56	4911f01d-6c14-43f3-902d-c9e8f063f1b6	2026-08-02 17:47:00.117	200.00	EDAHAB	\N	\N	8c727565-7321-4dc8-9667-5820fc2f1a19		2026-08-02 17:47:00.119
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
9b5963c2-4868-4fb6-95bc-7756f37ac5b9	1d625f68-7207-4e5f-af81-c6d708fba6e8	8	2026	900.00	90.00	990.00	0.00	0.00	990.00	990.00	OPEN	2026-08-02 16:21:43.189	2026-08-02 17:24:40.706
c2521714-72eb-454e-b47a-0674e6abb988	4911f01d-6c14-43f3-902d-c9e8f063f1b6	8	2026	800.00	0.00	800.00	240.00	240.00	560.00	560.00	OPEN	2026-08-02 16:21:50.905	2026-08-02 17:47:00.134
\.


--
-- Data for Name: PettyCashLedger; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."PettyCashLedger" (id, "fundId", "companyId", date, "referenceNumber", "transactionType", "employeeId", "requestId", description, debit, credit, "balanceAfter", remarks, "createdAt", "updatedAt") FROM stdin;
39ac4db4-fb3a-4ed3-8daf-83587c2e78b2	9b5963c2-4868-4fb6-95bc-7756f37ac5b9	1d625f68-7207-4e5f-af81-c6d708fba6e8	2026-08-02 16:21:43.204	\N	ALLOCATION	\N	\N	Initial petty cash fund allocation for 8/2026	\N	900.00	900.00	Initial Allocation: $900	2026-08-02 16:21:43.204	2026-08-02 16:21:43.204
0b2c27c1-54b6-4bd3-ad59-cbfa990c4f61	c2521714-72eb-454e-b47a-0674e6abb988	4911f01d-6c14-43f3-902d-c9e8f063f1b6	2026-08-02 16:21:50.911	\N	ALLOCATION	\N	\N	Initial petty cash fund allocation for 8/2026	\N	800.00	800.00	Initial Allocation: $800	2026-08-02 16:21:50.911	2026-08-02 16:21:50.911
83bfd2df-31bb-4a9d-8cf4-988418730134	c2521714-72eb-454e-b47a-0674e6abb988	4911f01d-6c14-43f3-902d-c9e8f063f1b6	2026-08-02 16:31:12.699	\N	PAYMENT	8c727565-7321-4dc8-9667-5820fc2f1a19	c052ac59-0a29-4e62-ae9d-31fc52f1b9ed	Payment for PC-20260802-0001 - Item iib	20.00	\N	780.00	\N	2026-08-02 16:31:12.699	2026-08-02 16:31:12.699
3dba590d-a065-4bcc-8004-2c5b7cba89de	c2521714-72eb-454e-b47a-0674e6abb988	4911f01d-6c14-43f3-902d-c9e8f063f1b6	2026-08-02 16:59:29.283	\N	PAYMENT	8c727565-7321-4dc8-9667-5820fc2f1a19	0bf06374-ac9a-49a9-9df8-d1863c02adfe	test	20.00	\N	760.00	\N	2026-08-02 16:59:29.283	2026-08-02 16:59:29.283
521a5120-56a0-43aa-ba47-70cf07868cac	9b5963c2-4868-4fb6-95bc-7756f37ac5b9	1d625f68-7207-4e5f-af81-c6d708fba6e8	2026-08-02 17:24:40.734	\N	ALLOCATION	\N	\N	Petty cash fund top-up / injection	\N	90.00	990.00	Fund top-up: +$90	2026-08-02 17:24:40.734	2026-08-02 17:24:40.734
7b8e2272-0bef-457f-ab9d-39410827b7bc	c2521714-72eb-454e-b47a-0674e6abb988	4911f01d-6c14-43f3-902d-c9e8f063f1b6	2026-08-02 17:47:00.139	\N	PAYMENT	8c727565-7321-4dc8-9667-5820fc2f1a19	83901e6b-9266-4ee1-b3f4-b1231a0abd56	laptop	200.00	\N	560.00	\N	2026-08-02 17:47:00.139	2026-08-02 17:47:00.139
\.


--
-- Data for Name: PettyCashRequest; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."PettyCashRequest" (id, "requestNumber", "requestDate", "userId", "companyId", "departmentId", "projectId", "regionId", "budgetHeadId", "costCenter", "requestType", "vendorName", "invoiceNumber", "invoiceDate", remarks, purpose, description, "requestedAmount", "approvedAmount", currency, priority, status, "requiredDate", "correctionNotes", "createdAt", "updatedAt") FROM stdin;
c052ac59-0a29-4e62-ae9d-31fc52f1b9ed	PC-20260802-0001	2026-08-02 16:24:46.129	703c4a81-d279-4de7-9d19-15ef005211dc	4911f01d-6c14-43f3-902d-c9e8f063f1b6	51ea7d31-d79e-4487-ad91-a0189ec9c141	959d6eed-c5c9-45d7-97c7-780ee60bc7ce	6600517b-6a8e-4245-9371-aacbb8ab73de	8c61786e-bcaa-4565-baa8-d98fb727cd65	\N	OTHER	\N	\N	\N	\N	Item iib	dkdkkjfdjdjjdfjd	20.00	20.00	USD	NORMAL	PAID	2026-08-02 00:00:00	\N	2026-08-02 16:24:46.129	2026-08-02 16:31:12.703
0bf06374-ac9a-49a9-9df8-d1863c02adfe	PC-20260802-0002	2026-08-02 16:59:09.515	703c4a81-d279-4de7-9d19-15ef005211dc	4911f01d-6c14-43f3-902d-c9e8f063f1b6	51ea7d31-d79e-4487-ad91-a0189ec9c141	\N	6600517b-6a8e-4245-9371-aacbb8ab73de	607c77ba-53dd-4306-874c-0a1ff41cd902	\N	OTHER	\N	\N	\N	\N	test	done	20.00	20.00	USD	NORMAL	PAID	2026-08-02 00:00:00	\N	2026-08-02 16:59:09.515	2026-08-02 16:59:29.287
83901e6b-9266-4ee1-b3f4-b1231a0abd56	PC-20260802-0003	2026-08-02 17:46:43.629	703c4a81-d279-4de7-9d19-15ef005211dc	4911f01d-6c14-43f3-902d-c9e8f063f1b6	51ea7d31-d79e-4487-ad91-a0189ec9c141	\N	6600517b-6a8e-4245-9371-aacbb8ab73de	ec67bfb1-05ba-4a5d-8f7c-7169f00a4261	\N	OTHER	\N	\N	\N	\N	laptop	dlkdkdfkf	200.00	200.00	USD	URGENT	PAID	2026-08-02 00:00:00	\N	2026-08-02 17:46:43.629	2026-08-02 17:47:00.144
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
72c0783d-2a54-4f30-a288-a361d6d70477	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3MDNjNGE4MS1kMjc5LTRkZTctOWQxOS0xNWVmMDA1MjExZGMiLCJpYXQiOjE3ODU2ODc1NDMsImV4cCI6MTc4NjI5MjM0M30.sGnxC6o1dUBoPKUgHkwi87-FlQzUKwRjT93tT5ebyJg	703c4a81-d279-4de7-9d19-15ef005211dc	2026-08-09 16:19:03.778	2026-08-02 16:19:03.78
b6c1dc91-b874-4d7c-9a76-f855397665ac	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4YzcyNzU2NS03MzIxLTRkYzgtOTY2Ny01ODIwZmMyZjFhMTkiLCJpYXQiOjE3ODU2OTM4NTgsImV4cCI6MTc4NjI5ODY1OH0.bYynTlQnwRk1823jFiy9azglJitQdoXa8pc_cqo-MeA	8c727565-7321-4dc8-9667-5820fc2f1a19	2026-08-09 18:04:18.337	2026-08-02 18:04:18.34
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

COPY public."User" (id, "fullName", username, "passwordHash", email, phone, "employeeNumber", "companyId", "departmentId", "regionId", "roleId", status, "resetPasswordRequired", "createdAt", "updatedAt") FROM stdin;
8c727565-7321-4dc8-9667-5820fc2f1a19	System Administrator	admin	$2a$10$dNcxwVUtZPoxDxJre/iG2.Ya0jUVfRi2oPMxYqFXaO5AWRSXVQLpK	admin@somtel.com	+252610000001	EMP-001	1d625f68-7207-4e5f-af81-c6d708fba6e8	bcb54c84-0251-4702-aa22-d2a411a56434	\N	d33ac25f-f1a9-4b22-8b3f-b05b288f5677	ACTIVE	f	2026-08-02 15:56:26.061	2026-08-02 15:59:51.065
703c4a81-d279-4de7-9d19-15ef005211dc	Shaafici Diiriye	shaafici	$2a$10$qBU7oQw/QSb4XERkS3rg..f6wdD2QfbGVObVJumvpLzZzYjv7Ft8O	shaaficidiiriye6@gmail.com	660000548	BLKM-001	4911f01d-6c14-43f3-902d-c9e8f063f1b6	51ea7d31-d79e-4487-ad91-a0189ec9c141	6600517b-6a8e-4245-9371-aacbb8ab73de	d47a1a39-84c7-4e05-9471-a0797d9971d6	ACTIVE	f	2026-08-02 16:18:36.284	2026-08-02 16:19:10.857
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
-- Name: User_employeeNumber_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_employeeNumber_key" ON public."User" USING btree ("employeeNumber");


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

\unrestrict 888cDRHrCpRD9QrW2RehnHZaB7N995bJ09S3DfnVDwDShA9aaTOVobRrxctblfm

