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



--
-- Data for Name: Notification; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: Payment; Type: TABLE DATA; Schema: public; Owner: postgres
--



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



--
-- Data for Name: PettyCashFund; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: PettyCashLedger; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: PettyCashRequest; Type: TABLE DATA; Schema: public; Owner: postgres
--



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



--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--



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

