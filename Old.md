# Project Snapshot: Inventory_SaaS (Old State Before Git Changes)

> **Document Created**: October 26, 2026  
> **Status**: Snapshot taken prior to subsequent Git branch/commit alterations  
> **Workspace**: `c:\Users\Nihal\Documents\Webbea\Website\Inventory_SaaS`  
> **Repository**: `nihal8547/Inventory_SaaS`

---

## 1. 📌 Executive Project Summary

**Inventory_SaaS** is an enterprise-grade, multi-tenant cloud inventory, point-of-sale (POS), and supply chain management SaaS application. It is architected for scalability, strict tenant data isolation, offline-resilient retail operations, and real-time operational analytics.

### Core Value Propositions
- **Multi-Tenant Cloud Architecture**: Row-level and tenant-bound query enforcement across all entities with customizable tenant slugs, branding, and subscription plans.
- **Modern Offline-First POS Terminal**: High-speed touch and keyboard-driven checkout interface, barcode scanner wedge support, thermal ESC/POS receipt printing (80mm/58mm via USB/Bluetooth), and Web Audio acoustic feedback.
- **Warehouse & Multi-Branch Inventory**: Real-time stock ledgers, cross-branch stock transfers, stock counting/audits, and automated low-stock warnings.
- **Enterprise Security & Compliance**: Strict JWT authentication with HttpOnly refresh tokens, granular RBAC (Role-Based Access Control) with custom permissions, and comprehensive audit logging.
- **Extensible API & Integrations**: API Client management (API keys with read/write scopes) and Webhook dispatching with cryptographic HMAC signatures.

---

## 2. 🔀 Current Git & Working State Snapshot

### Git Metadata
- **Current Branch**: `main`
- **Remote Tracking**: `origin/main` (Up to date)
- **Local Branches**: `main`, `claude/admiring-meitner-joyl7k`
- **Latest Commit Hash**: `1c5065f7`
- **Latest Commit Message**:
  `fix(auth): resolve login redirect bounce loop, add hydration guard and tenant fallback, add modern favicon icons`

### Commit History (Recent 10 Commits)
```
1c5065f7 fix(auth): resolve login redirect bounce loop, add hydration guard and tenant fallback, add modern favicon icons
a2cd4f6c fix(cors): use dynamic relative API baseURL in browser and expand backend allowed origins
7d22f3ea fix(backend): make AuthModule @Global() so guards resolve and run prisma db push on startup
22a118e9 fix(frontend): add iconBg to StatCard, export apiClient alias, and configure next.config build settings
a3709a9a fix(backend): fix typescript compilation types and exclude test specs in build
9de14621 chore: ensure frontend/public exists for docker build
4949146e fix(docker): use npm install in backend Dockerfile for reliable container build
b8c9d685 chore: ensure test@admin.com is included in seed.ts for deployment
ba9de57e chore: prepare docker configuration and production compose for server deployment
e8e8fb60 feat: initial commit - enterprise multi-tenant inventory SaaS & POS platform
```

### Uncommitted / Modified Files in Working Directory
1. **`frontend/src/services/sales.service.ts`** *(Modified)*:
   - Added helper endpoints:
     - `salesService.quote(data)`: Quote generation before sale finalization.
     - `salesService.createReturn(data)`: Sale return processing.
     - `salesService.getDailyRegister(params)`: Daily cash register report querying.
     - `salesService.getMonthlyRegister(params)`: Monthly sales aggregation querying.
2. **`frontend/tsconfig.json`** & **`frontend/tsconfig.tsbuildinfo`** *(Modified)*:
   - TypeScript build cache updates.
3. **`frontend/src/app/(dashboard)/pos/today/`** *(Untracked / New Feature)*:
   - Contains `page.tsx` for real-time POS daily summary, hourly breakdowns, top-selling items, tender breakdowns, and live register reconciliation.

---

## 3. 🛠️ Complete Technology Stack

### Frontend
- **Framework**: Next.js 14.2.5 (React 18.3, App Router architecture)
- **Language**: TypeScript 5.6
- **Styling**: Tailwind CSS 3.4, PostCSS, Autoprefixer, `tailwind-merge`, `clsx`, `tailwindcss-animate`
- **UI & Components**:
  - Radix UI primitives (Dialog, Dropdown Menu, Popover, Select, Tabs, Toast, Tooltip, Switch, etc.)
  - Lucide React (0.454.0) modern icons
  - Sonner for reactive toast notifications
- **State Management**: Zustand 5.0 (Client-side auth, tenant context, active branch, cart state)
- **Forms & Validation**: React Hook Form 7.53, Zod 3.23, `@hookform/resolvers`
- **Data Visualization**: Recharts 2.13 (Revenue charts, hourly sales, sales breakdown)
- **Barcode & QR Generation**: JsBarcode 3.11, QRCode 1.5
- **Networking**: Axios 1.7 with central JWT interception and automated token renewal

### Backend
- **Framework**: NestJS 10.4.5 (Express engine)
- **Language**: TypeScript 5.6
- **Database ORM**: Prisma ORM 5.22
- **Database Engine**: PostgreSQL 16 (Relational multi-tenant schema)
- **In-Memory Caching & Queues**: Redis 7, Bull Queue 4.16, `@nestjs/cache-manager`
- **Authentication & Security**: Passport JWT, Passport Local, BCryptJS, Helmet, NestJS Throttler
- **Object Storage**: S3-compatible storage (MinIO)
- **Documentation**: Swagger / OpenAPI (`@nestjs/swagger`) at `/api/docs`

### DevOps & Infrastructure
- **Containerization**: Docker & Docker Compose
  - `docker-compose.yml`: Local full-stack environment (PostgreSQL, Redis, MinIO, Backend, Frontend).
  - `docker-compose.prod.yml`: Production orchestration with health checks and restart policies.
- **Database Scripts**: `scripts/init.sql` (Initial PostgreSQL schema and extension setup).

---

## 4. 🗄️ Database Architecture & Prisma Domain Models

The database is structured around strict tenant separation with `tenantId` foreign keys indexing all business data.

### Platform & Subscription
- **`Tenant`**: Root multi-tenant unit (id, name, slug, logo, primaryColor, currency, timezone, locale, isActive).
- **`SubscriptionPlan`**: Plans for tenants with branch limits, user limits, product caps, and pricing intervals.
- **`Subscription`**: Active tenant subscription binding with plan reference and status tracking.

### Identity & Access Control (RBAC)
- **`User`**: Global user account (email, passwordHash, firstName, lastName, phone, isSuperAdmin).
- **`UserSession`**: Refresh token tracking, IP address, user agent, expiration.
- **`Membership`**: Pivot table binding `User` + `Tenant` + `Role`, with default branch assignment.
- **`Role`**: Custom or system-defined roles per tenant.
- **`Permission`**: Granular platform permissions (e.g., `pos:access`, `inventory:write`, `reports:view`).
- **`RolePermission`**: Link table mapping roles to permissions.

### Organization & Physical Locations
- **`Branch`**: Retail store branches with addresses, tax rates, and contact info.
- **`Warehouse`**: Storage depots / fulfillment centers linked to branches.

### Catalog & Barcoding
- **`Product`**: Master SKU, name, description, cost price, selling price, barcode, min/max stock thresholds.
- **`ProductVariant`**: Color, size, or spec variants of products.
- **`Category`** & **`Brand`**: Hierarchical classification trees.
- **`Unit`**: Units of measurement (pcs, kg, box, etc.).
- **`Barcode`**: Internal barcode registry and symbology type.
- **`BarcodeLabelTemplate`**: Custom label print layouts (width, height, barcode format).
- **`BarcodePrintJob`**: Queue and history of physical label print requests.

### Stock & Warehouse Management
- **`StockBalance`**: Current stock-on-hand quantity per product/variant per warehouse.
- **`StockLedger`**: Immutable financial and quantity movement ledger for every change (SALE, PURCHASE, TRANSFER_IN, TRANSFER_OUT, ADJUSTMENT).
- **`StockTransfer`** & **`StockTransferLine`**: Cross-warehouse inventory transfer workflows (Pending -> In-Transit -> Received).
- **`StockCount`** & **`StockCountLine`**: Physical inventory stock-taking audits and variance reconciliation.
- **`StockAdjustment`** & **`StockAdjustmentLine`**: Manual write-offs, damages, and found stock corrections.

### Purchasing & Vendors
- **`Supplier`**: Vendor profiles, contact information, credit limits, payment terms.
- **`PurchaseOrder`** & **`PurchaseOrderLine`**: PO generation, receiving, and supplier bill tracking.

### Sales & POS System
- **`Customer`**: Customer records, loyalty tracking, credit balance, contact details.
- **`Sale`**: Complete transaction record (invoice number, branch, cashier, subtotal, tax, discount, total, paymentStatus, fulfillmentStatus).
- **`SaleLine`**: Line items sold with unit price, discount, tax, cost price at time of sale.
- **`Payment`**: Tender breakdown per transaction (CASH, CARD, UPI, BANK_TRANSFER, STORE_CREDIT).

### Extensibility & Auditing
- **`ApiClient`**: Third-party API keys with hashed secret tokens and permission scopes.
- **`WebhookEndpoint`**: Outbound HTTP webhooks registered by tenant.
- **`WebhookDelivery`**: Webhook attempt logs, payload inspection, and HTTP response statuses.
- **`AuditEvent`**: Complete audit trail of critical tenant actions with IP and change diffs.

---

## 5. 🔌 Backend API Modules Directory

Located in `backend/src/modules/`:

| Module | Primary Endpoints | Key Capabilities |
|---|---|---|
| **`auth`** | `/api/v1/auth/*` | Login, registration, token refresh, password recovery, session logout |
| **`tenants`** | `/api/v1/tenants/*` | Tenant CRUD, settings update, branding, currency customization |
| **`users`** | `/api/v1/users/*` | Employee accounts, memberships, branch assignments |
| **`roles`** | `/api/v1/roles/*` | Custom role definitions, permission matrix assignment |
| **`branches`** | `/api/v1/branches/*` | Branch and warehouse location management |
| **`products`** | `/api/v1/products/*` | Product catalog CRUD, variant handling, categories, brands, units |
| **`barcodes`** | `/api/v1/barcodes/*` | Barcode label generation (Code128, EAN13, QR), template printing |
| **`inventory`** | `/api/v1/inventory/*` | Stock balance lookup, stock transfers, stock audits, manual adjustments |
| **`purchasing`**| `/api/v1/purchasing/*` | Supplier management, Purchase Orders (PO), receiving workflows |
| **`sales`** | `/api/v1/sales/*` | POS checkout, quote generation, order returns, sales register, reports |
| **`reports`** | `/api/v1/reports/*` | Profit & loss, sales velocity, dead stock, employee performance |
| **`integrations`**| `/api/v1/integrations/*`| API Key generation, third-party credentials |
| **`webhooks`** | `/api/v1/webhooks/*` | Webhook subscription management, test event delivery |
| **`admin`** | `/api/v1/admin/*` | Platform Super-Admin metrics, global tenant management |

---

## 6. 💻 Frontend Application Routes & Architecture

Located in `frontend/src/app/`:

### Public / Authentication Routes
- `/(auth)/login/page.tsx`: Tenant and staff login portal with credentials and tenant switching.
- `/(auth)/register/page.tsx`: Self-service tenant signup and initial account onboarding.

### Protected Dashboard Routes
- `/(dashboard)/dashboard/page.tsx`: Executive KPI overview (Total revenue, order count, top products, low stock warnings, revenue charts).
- `/(dashboard)/pos/page.tsx`: Full-featured touch-friendly POS terminal:
  - Fast barcode scanner input listener.
  - Cart state with line item discounts, tax calculation, and custom prices.
  - Multi-tender checkout modal (Cash, Card, QR).
  - Thermal ESC/POS receipt generation and audio feedback.
- `/(dashboard)/pos/today/page.tsx`: Real-time daily register summary, shift closing, and hourly sales breakdown.
- `/(dashboard)/products/page.tsx`: Catalog table with search, filter, export, and inventory status badges.
- `/(dashboard)/products/new/page.tsx`: Multi-tab product creation (Basic info, pricing, variants, barcodes).
- `/(dashboard)/products/[id]/page.tsx`: Product detail, editing, and stock history across warehouses.
- `/(dashboard)/products/barcodes/page.tsx`: Barcode batch label generator and printer interface.
- `/(dashboard)/inventory/stock/page.tsx`: Current on-hand stock balances across all locations.
- `/(dashboard)/inventory/transfers/page.tsx`: Inter-branch inventory transfer management.
- `/(dashboard)/inventory/stock-counts/page.tsx`: Physical inventory audits and count adjustments.
- `/(dashboard)/purchasing/page.tsx`: Purchasing dashboard overview.
- `/(dashboard)/purchasing/orders/page.tsx`: Purchase orders management and receiving.
- `/(dashboard)/purchasing/suppliers/page.tsx`: Vendor directory and payment terms.
- `/(dashboard)/sales/page.tsx`: Sales history, transaction details, voiding, and receipts.
- `/(dashboard)/reports/page.tsx`: Analytics, sales breakdowns, and business reports.
- `/(dashboard)/users/page.tsx`: Staff directory, role assignments, and permissions.
- `/(dashboard)/settings/page.tsx`: Store profile, tax rates, currency, and invoice styling.
- `/(dashboard)/integrations/page.tsx`: Developer settings, API Keys, and Webhook management.

---

## 7. ⚙️ Environment Configuration Reference

### Backend Configuration (`backend/.env`)
```env
NODE_ENV=development
PORT=3001
API_PREFIX=api/v1

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/inventory_saas
DIRECT_URL=postgresql://postgres:postgres@localhost:5432/inventory_saas

REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRY=7d
REFRESH_TOKEN_SECRET=your-refresh-token-secret-change-in-production
REFRESH_TOKEN_EXPIRY=30d
ENCRYPTION_KEY=your-32-char-encryption-key-here!!

S3_ENDPOINT=http://localhost:9000
S3_BUCKET=inventory-saas
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_REGION=us-east-1

SUPER_ADMIN_EMAIL=admin@inventorysaas.com
SUPER_ADMIN_PASSWORD=Admin@123456
```

### Frontend Configuration (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 8. 🚀 Run & Validation Commands

### Run Locally (Development)
```bash
# 1. Start Infrastructure (PostgreSQL, Redis, MinIO)
docker compose up -d postgres redis minio

# 2. Start Backend
cd backend
npm install
npx prisma generate
npx prisma db push
npm run start:dev

# 3. Start Frontend (in separate terminal)
cd frontend
npm install
npm run dev
```

### Run Full Stack with Docker Compose
```bash
# Build and run all services
docker compose up --build -d
```

---

## 9. 📝 Summary Notes
This snapshot provides a frozen reference of the repository's configuration, database models, backend endpoints, and frontend dashboard architecture prior to new Git branches or upstream modifications.
