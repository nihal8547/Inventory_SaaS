# MASTER IMPLEMENTATION PROMPT
# Multi-Tenant Inventory SaaS, POS, Barcode & Warehouse Management System

## 1. PROJECT OBJECTIVE

Build a production-ready, multi-tenant SaaS Inventory Management and Point of Sale (POS) platform that can be sold and deployed for multiple companies.

The platform must support multiple companies, multiple branches, warehouses, separate user accounts, role-based access control, centralized product management, branch-wise stock tracking, barcode generation and printing, physical barcode scanners, POS billing, purchasing, stock transfers, reports, API integrations, webhooks, and SaaS administration.

This must be a functional application, not a static UI prototype.

All buttons, forms, filters, tables, database operations, API integrations, and business workflows must work correctly.

If an existing repository is available, inspect its architecture and preserve working functionality. Do not replace or delete existing functionality without a justified technical reason.

If starting from scratch, build the complete project using the architecture and implementation phases specified below.

---

## 2. TECHNOLOGY STACK

### Frontend
- React
- Next.js App Router
- TypeScript with strict mode
- Tailwind CSS
- shadcn/ui and Radix UI where appropriate
- Lucide React icons
- TanStack Table for data tables
- React Hook Form and Zod for forms and validation
- Recharts for dashboards and analytics

### Backend
- Node.js
- NestJS modular architecture
- REST API with versioning: `/api/v1`
- Prisma ORM
- PostgreSQL
- Redis
- BullMQ for background jobs

### Infrastructure
- Docker
- Docker Compose for development
- Nginx or an equivalent production reverse proxy
- S3-compatible storage for uploaded images and files
- OpenAPI / Swagger documentation
- Automated database migrations
- Automated tests and CI/CD

Use compatible, stable dependency versions. Do not mix incompatible versions or install unnecessary packages.

---

## 3. PREMIUM UI / UX DESIGN SYSTEM

Create a minimal, premium, professional SaaS interface suitable for resale to different businesses.

Use Tailwind CSS exclusively as the primary styling system. Do not use Bootstrap.

### Design principles
- Clean, minimal and professional layout.
- Neutral backgrounds and subtle borders.
- White surfaces with a restrained blue accent.
- Consistent typography and spacing.
- Reusable components.
- Rounded cards and controls with restrained shadows.
- Professional data tables.
- Clear visual hierarchy.
- Responsive desktop, tablet and mobile layouts.
- Light mode by default.
- Optional dark mode.
- Accessible keyboard navigation and contrast.
- No excessive gradients, decorative animations or unnecessary cards.

### Standard theme
- Primary: #2563EB
- Dark: #111827
- Background: #F8FAFC
- Surface: #FFFFFF
- Border: #E2E8F0
- Muted text: #64748B
- Success: #059669
- Warning: #D97706
- Danger: #DC2626

Centralize design tokens and reusable components.

Create:
- AppSidebar
- AppHeader
- TenantSwitcher
- BranchSwitcher
- PageHeader
- DataTable
- SearchFilterBar
- StatCard
- StatusBadge
- FormField
- ConfirmDialog
- BarcodeInput
- BarcodePreview
- BarcodeLabelDesigner
- StockAvailabilityTable
- POSCart
- NotificationCenter
- LoadingSkeleton
- EmptyState
- ErrorState

### Multi-tenant branding

Each company must be able to configure:
- Company name and logo.
- Favicon.
- Primary brand color.
- Light / dark theme preference.
- Supported language.
- Currency and timezone.
- Invoice and receipt branding.
- Approved typography options.

Do not hardcode one customer's branding throughout the application.

Support Arabic right-to-left layouts where required, including appropriate text direction, table alignment and navigation.

---

## 4. SAAS MULTI-TENANT ARCHITECTURE

Support multiple independent companies using the same platform.

Each tenant must have:
- Company profile.
- Multiple branches.
- Multiple warehouses.
- Products and variants.
- Independent stock balances.
- Suppliers and customers.
- Sales and purchase transactions.
- Users, roles and permissions.
- API credentials.
- Webhook configurations.
- Company settings.
- Subscription plan and usage limits.

Use a shared PostgreSQL database with logical schemas and tenant-scoped tables.

Recommended PostgreSQL schemas:
- platform
- identity
- organization
- catalog
- inventory
- purchasing
- sales
- finance
- integrations
- audit

Tenant-owned records must have appropriate tenant identifiers and database constraints.

Enforce tenant isolation in backend services and database access. Consider PostgreSQL Row-Level Security where appropriate.

Never rely only on frontend filtering for security.

---

## 5. AUTHENTICATION AND ACCESS CONTROL

Implement:
- Login and logout.
- Secure password hashing.
- Password reset.
- Session management.
- Optional MFA.
- User invitations.
- Company membership.
- Branch assignment.
- Role-based permissions.
- Audit logging.

Required roles:
- SaaS Super Admin
- Company Owner
- Company Admin
- Inventory Manager
- Branch Manager
- Storekeeper
- Purchase Manager
- Cashier
- Accountant
- Viewer / Auditor

Permissions must be granular.

Examples:
- products.view
- products.create
- products.update
- products.barcode.generate
- products.barcode.print
- inventory.view
- inventory.receive
- inventory.adjust
- inventory.transfer.create
- inventory.transfer.approve
- sales.create
- sales.return.create
- sales.discount.approve
- reports.export
- integrations.api_keys.manage
- integrations.webhooks.manage

A user must only access the companies, branches and resources authorized for that user.

---

## 6. PRODUCT AND CATALOG MANAGEMENT

Create complete product management functionality.

### Product fields
- Product ID
- Tenant ID
- SKU
- Product name
- Description
- Category
- Brand
- Base unit
- Product image
- Cost price
- Selling price
- Wholesale price, if enabled
- Tax category
- Inventory tracking status
- Batch tracking status
- Expiry tracking status
- Active / archived status
- Created by
- Created timestamp
- Updated timestamp

### Product variants

Support:
- Size
- Weight
- Color
- Volume
- Pack size
- Variant-specific SKU
- Variant-specific barcode
- Variant-specific prices
- Variant-specific stock

### Units of measurement

Support:
- Piece
- Box
- Carton
- Pack
- Kilogram
- Gram
- Litre
- Millilitre

Allow configurable unit conversions.

Example:
1 carton = 24 bottles.

Validate conversions to avoid incorrect stock calculations.

### Product pages
- Product list.
- Add product.
- Edit product.
- Product details.
- Product variants.
- Categories.
- Brands.
- Units and conversions.
- Price lists.
- Barcode management.
- Bulk CSV/XLSX import.
- Bulk export.
- Product history.

---

# 7. COMPLETE BARCODE MANAGEMENT MODULE

This is a mandatory core module, not an optional add-on.

Implement barcode creation, barcode mapping, label design, printing, scanning and barcode-based stock operations.

The barcode module must integrate with product management, inventory, purchasing, POS, returns, stock counting, transfers and reporting.

## 7.1 Supported barcode formats

Support the following formats where technically appropriate:

- Code 128
- EAN-13
- EAN-8
- UPC-A
- UPC-E
- Code 39
- GS1-128 where required
- QR Code for supplementary product or internal identification use

Use a maintained barcode generation library compatible with the selected frontend/backend architecture.

Validate the format before generating or saving a barcode.

EAN and UPC formats must validate their required length and check digit.

Do not invent or allocate official GS1 company prefixes. When using externally registered retail identifiers, preserve the assigned identifier.

For internally generated barcodes, use a configurable, collision-resistant internal numbering scheme and an appropriate supported barcode format.

A barcode is an identifier, not proof that an item is authentic.

## 7.2 Barcode database design

Create the following tables or equivalent models.

### catalog.barcodes

Fields:
- id
- tenant_id
- product_id
- product_variant_id
- barcode_value
- barcode_format
- barcode_type
- is_primary
- is_active
- created_by
- created_at
- updated_at

Barcode types may include:
- INTERNAL
- EXTERNAL
- SUPPLIER
- PACKAGING

Allow multiple valid barcode aliases for one product variant when required.

Implement uniqueness constraints to prevent an active barcode from being incorrectly assigned to different products within the relevant identifier scope.

Define tenant-scoped or global uniqueness according to the identifier type. Never assume every supplier barcode is globally unique without validating the business requirements.

### Additional tables
- catalog.barcode_sequences
- catalog.barcode_label_templates
- catalog.barcode_print_jobs
- catalog.barcode_print_job_items
- audit.audit_events

Print job records must track:
- Job ID
- Tenant ID
- User ID
- Template
- Selected products
- Quantity of labels
- Printer configuration reference
- Job status
- Created timestamp
- Error details, where applicable

Do not store raw printer credentials or unnecessary sensitive device information.

## 7.3 Barcode management page

Route:

`/products/barcodes`

Features:
- Search by product name.
- Search by SKU.
- Search by barcode.
- Filter by category.
- Filter by branch where relevant.
- Filter by barcode format.
- Filter by missing barcode.
- Filter by active / inactive status.
- View barcode preview.
- Generate barcode.
- Assign existing barcode.
- Add alternate barcode.
- Regenerate internal barcode where allowed.
- Print selected barcode labels.
- Bulk generate missing barcodes.
- Bulk print.
- Export barcode records.
- View barcode history.

Show:
- Product image.
- Product name.
- Variant.
- SKU.
- Barcode value.
- Barcode format.
- Barcode status.
- Label preview.
- Print action.

Do not silently overwrite an existing externally assigned barcode.

## 7.4 Barcode generation workflow

Implement this workflow:

1. User opens a product or variant.
2. User selects Barcode Management.
3. System checks whether a barcode already exists.
4. If one exists, display it.
5. If none exists, user chooses an allowed format.
6. For internal barcodes, generate a unique identifier.
7. Validate the format and uniqueness.
8. Save the barcode record in PostgreSQL.
9. Generate a barcode image or SVG representation.
10. Allow preview, download and printing.
11. Record the action in the audit log.

Generate and persist the barcode value before printing.

A failed printing operation must not create a duplicate barcode record.

Regenerating a barcode must require appropriate permission and confirmation. Existing transactions and historical barcode mappings must remain traceable.

## 7.5 Barcode label designer

Route:

`/products/barcodes/labels`

Create a configurable label designer with a live preview.

### Label content options
- Company logo.
- Product name.
- Product variant.
- SKU.
- Barcode graphic.
- Human-readable barcode value.
- Selling price.
- Wholesale price, if permitted.
- Unit.
- Batch number.
- Expiry date.
- Product category.
- Optional custom text.

Allow users to toggle each field on or off.

### Label sizes

Support configurable presets, including:
- 25 × 15 mm
- 30 × 20 mm
- 40 × 30 mm
- 50 × 25 mm
- 50 × 30 mm
- 50 × 50 mm
- 100 × 50 mm
- Custom width and height in millimetres

These are configurable presets, not a guarantee that every printer supports every size.

### Print layout options
- Single label.
- Multiple labels.
- A4 label sheets.
- Thermal label printer.
- Multiple columns and rows.
- Horizontal and vertical spacing.
- Page margins.
- Label quantity per product.
- Repeat the same product label.
- Bulk print selected products.
- Preview before printing.

Allow saving reusable label templates.

Provide default templates:
- Product barcode label.
- Product name + barcode.
- Product name + barcode + price.
- Batch + expiry label.
- Warehouse identification label.

### Printing requirements

Implement:
- Browser-based print view.
- Print-specific CSS using `@media print`.
- Correct physical dimensions.
- Millimetre-based layout.
- Black-on-white high-contrast barcode graphics.
- Correct quiet zones.
- Sufficient barcode width and height.
- No clipped barcode edges.
- No unwanted headers, footers or navigation.
- Print preview.
- Label-sheet pagination.
- Configurable print scaling guidance.

Use SVG or a sufficiently high-resolution representation suitable for the selected printing workflow.

Avoid low-quality screenshots of barcodes.

For A4 sheets, correctly calculate rows, columns, page margins, label gaps and page breaks.

For thermal printing, provide suitable label sizes and printer configuration guidance.

Browser printing is the default solution. If silent printing, raw ESC/POS commands or advanced thermal printer control is required, implement a clearly separated optional print bridge or supported printer SDK. Do not claim that ordinary browser printing can silently control every connected printer.

## 7.6 Barcode scanner integration

The system must support common USB, Bluetooth and wireless barcode scanners.

Most keyboard-wedge scanners behave like a keyboard and type the scanned barcode into the currently focused input field.

Implement a reusable `BarcodeScannerInput` component.

Requirements:
- Auto-focus where appropriate.
- Keyboard input support.
- Enter-key termination.
- Optional configurable suffix handling.
- Debounced search for manually typed product codes.
- Scan validation.
- Clear visual feedback after successful scans.
- Clear error feedback for unknown barcodes.
- Duplicate-scan protection where appropriate.
- Loading state while resolving a barcode.
- No requirement to install special drivers for ordinary keyboard-wedge scanners.
- Scanner setup instructions in the application help page.

Do not depend solely on timing-based keystroke detection. Use a dedicated scan input and support both keyboard-wedge scanners and manual entry.

Allow scanner settings to be configured per workstation when necessary.

### Supported scanning workflows
- POS billing.
- Product lookup.
- Stock receiving.
- Purchase order receiving.
- Stock transfer dispatch.
- Stock transfer receiving.
- Physical stock count.
- Inventory adjustment.
- Customer return lookup.
- Product label verification.

### Scanner behavior

When a barcode is scanned:
1. Capture the barcode value.
2. Validate the input.
3. Resolve the barcode to a product variant.
4. Verify tenant access.
5. Verify branch access when relevant.
6. Verify the requested workflow and product status.
7. Load current product and stock details.
8. Execute the relevant workflow action.
9. Display success or failure feedback.

A scanner must never directly modify stock without the relevant business validation and transaction rules.

Unknown barcodes must display an error and must not create a product automatically unless a specifically authorized product-registration workflow is selected.

### Barcode scanner settings page

Route:

`/settings/barcode-scanners`

Include:
- Scanner name.
- Workstation name.
- Scanner type.
- Input method.
- Expected suffix.
- Scanner test field.
- Sample scan result.
- Connection troubleshooting.
- Supported printer information where applicable.

For keyboard-wedge scanners, the application can validate incoming input but generally cannot reliably determine the exact physical device model or actual hardware connection status. Do not falsely display a hardware connection as confirmed when it has not been verified.

For advanced device integrations, use an appropriate WebHID, WebUSB or vendor-supported SDK only after checking browser support, device permissions and security constraints.

## 7.7 POS barcode scanning

Route:

`/pos`

The POS must have a dedicated scan input and support continuous scanning.

Workflow:
1. Cashier scans a product.
2. Backend resolves and validates the barcode.
3. Product and variant details appear in the cart.
4. Quantity increases according to the configured scan behavior.
5. Product price, discount and tax are calculated.
6. Branch availability is displayed.
7. Cashier scans the next item.
8. Cashier selects payment method.
9. Backend validates and completes the sale transaction.
10. Stock balance and stock ledger are updated atomically.
11. Receipt is generated.
12. Relevant webhook events are queued after the transaction is committed.

If a barcode is scanned twice, handle it according to the product and POS configuration. Do not accidentally add duplicate lines when the intended behavior is to increase quantity.

Support:
- Barcode scanner input.
- Manual product search.
- Cart quantity adjustments.
- Price and discount permissions.
- Customer selection.
- Cash, card and configured payment methods.
- Split payments if enabled.
- Receipt printing.
- Sales returns.
- Cashier shift management.

The backend must remain the source of truth for prices, stock, taxes and sale completion.

## 7.8 Barcode-based stock receiving

Route:

`/inventory/receiving`

Implement:
- Select supplier.
- Select purchase order.
- Select receiving branch and warehouse.
- Scan product barcode.
- Resolve the product variant.
- Enter or increment received quantity.
- Validate ordered versus received quantity.
- Capture batch and expiry when required.
- Record purchase cost.
- Support partial receipt.
- Validate and submit receipt.
- Update stock balance and ledger atomically.

Support a workflow for unknown barcodes that allows an authorized user to search the catalog or open a product creation form.

Do not silently create products or accept an unknown barcode as a valid stock receipt.

## 7.9 Barcode-based stock counting

Route:

`/inventory/stock-counts`

Features:
- Create a stock-count session.
- Select branch and warehouse.
- Load expected stock.
- Scan products.
- Enter or increment counted quantity.
- Handle repeated scans correctly.
- Support manual quantity entry.
- Display expected versus counted quantities.
- Calculate variance.
- Require approval where configured.
- Post approved adjustments.
- Record every adjustment in the stock ledger.
- Provide a count reconciliation report.

Do not modify the official stock balance merely because a count session has started.

Only approved, posted adjustments should change the stock balance.

## 7.10 Batch and expiry barcode support

Where batch tracking is enabled, allow:
- Batch number.
- Expiry date.
- Lot-specific stock.
- Batch-specific cost.
- Barcode or supplementary code mapping.
- FEFO picking where appropriate.
- Expiry alerts.
- Batch-level returns and adjustments.

Do not assume that every ordinary product barcode uniquely identifies a batch. Use separate batch identification or an appropriate GS1-compatible workflow when required.

## 7.11 Barcode search and API

Implement endpoints similar to:

GET `/api/v1/barcodes/lookup?value=...`

POST `/api/v1/products/:productId/barcodes`

POST `/api/v1/products/:productId/barcodes/generate`

GET `/api/v1/products/:productId/barcodes`

PATCH `/api/v1/barcodes/:barcodeId`

POST `/api/v1/barcodes/bulk-generate`

POST `/api/v1/barcodes/print-jobs`

GET `/api/v1/barcodes/print-jobs/:jobId`

POST `/api/v1/inventory/receipts/scan`

POST `/api/v1/inventory/stock-counts/:id/scan`

POST `/api/v1/integrations/api-keys`

Use appropriate authentication, authorization, tenant isolation, validation and rate limiting on every endpoint.

Never trust a tenant ID supplied by a browser without verifying the authenticated user's authorized tenant context.

## 7.12 Barcode audit and reporting

Track:
- Barcode created.
- Barcode assigned.
- Barcode changed.
- Barcode deactivated.
- Labels printed.
- Bulk print jobs.
- Unknown barcode attempts.
- Product lookup by barcode.
- Barcode-based stock operations.

Do not log passwords, API secrets or other sensitive credentials.

Create reports for:
- Products without barcodes.
- Duplicate barcode conflicts.
- Inactive barcodes.
- Label print history.
- Barcode lookup failures.
- Product and variant barcode mapping.

---

# 8. BRANCH AND INVENTORY MANAGEMENT

Create:
- Branch management.
- Warehouse management.
- Product availability by branch.
- Stock balance.
- Available and reserved quantities.
- Incoming stock.
- Low-stock alerts.
- Out-of-stock alerts.
- Stock entry.
- Stock transfers.
- Stock adjustments.
- Physical stock counts.
- Batch and expiry tracking.
- Stock valuation.
- Stock ledger.
- Reconciliation reports.

The Stock Finder page must show:
- Product name.
- SKU.
- Barcode.
- Branch.
- Warehouse.
- On-hand quantity.
- Reserved quantity.
- Available quantity.
- Incoming quantity.
- Reorder level.
- Stock status.
- Last movement date.

Use:

Available Stock = On-hand Stock - Reserved Stock

Incoming stock must not be treated as available until the destination branch confirms receipt.

Use a transactional stock ledger as the source of truth. Current stock balances may be stored as summary records for performance, provided they are updated atomically and reconciled.

---

# 9. STOCK TRANSFERS

Implement the following states:

- Draft
- Submitted
- Approved
- Reserved
- Dispatched
- In Transit
- Partially Received
- Received
- Rejected
- Cancelled

Support:
- Source branch.
- Destination branch.
- Source warehouse.
- Destination warehouse.
- Product and variant.
- Requested quantity.
- Dispatched quantity.
- Received quantity.
- Damaged quantity.
- Discrepancy reason.
- Approval records.
- Transfer history.

Stock must not increase at the destination until the appropriate receiving transaction is committed.

Support partial dispatch and partial receiving.

Do not allow arbitrary edits to completed stock movements. Use authorized reversal or compensating transactions.

---

# 10. PURCHASING

Create:
- Supplier management.
- Purchase requisitions.
- Purchase orders.
- Purchase order approvals.
- Goods receipt.
- Supplier returns.
- Supplier invoice references.
- Purchase history.
- Supplier-wise reports.

Support barcode-based receiving and partial deliveries.

Purchase workflow:

Requisition → Approval → Purchase Order → Goods Receipt → Invoice Matching → Payment Tracking

Keep accounting integrations and advanced financial features modular.

---

# 11. SALES AND RETURNS

Create:
- POS sales.
- Sales invoices.
- Sales orders.
- Quotations.
- Customers.
- Payment records.
- Sales returns.
- Refunds.
- Discounts and approvals.
- Cashier shifts.
- Sales reports.

All sale completion and inventory changes must use safe database transactions.

Implement idempotency for sale creation and other critical operations.

Payment credentials and sensitive card data must not be stored in the application's database.

---

# 12. DATABASE DESIGN

Use Prisma with version-controlled database migrations.

Core models should include:

### Platform
- Tenant
- SubscriptionPlan
- Subscription
- UsageRecord

### Identity
- User
- Membership
- Role
- Permission
- RolePermission
- UserBranch
- Session

### Organization
- Branch
- Warehouse
- StorageLocation

### Catalog
- Product
- ProductVariant
- Category
- Brand
- Unit
- UnitConversion
- Barcode
- BarcodeLabelTemplate
- BarcodePrintJob
- BarcodePrintJobItem

### Inventory
- StockBalance
- StockLedger
- StockReservation
- StockBatch
- StockTransfer
- StockTransferLine
- StockCount
- StockCountLine
- StockAdjustment

### Purchasing
- Supplier
- PurchaseOrder
- PurchaseOrderLine
- GoodsReceipt
- GoodsReceiptLine
- SupplierReturn

### Sales
- Customer
- Sale
- SaleLine
- Payment
- SalesReturn
- SalesReturnLine
- CashierShift

### Integrations
- ApiClient
- ApiKey
- WebhookEndpoint
- WebhookDelivery
- OutboxEvent

### Audit
- AuditEvent
- ApprovalRecord

Add the necessary foreign keys, indexes, uniqueness constraints and tenant-scoped relationships.

Use appropriate decimal types for prices and monetary values.

Define explicit policies for stock quantity precision, currency precision and rounding.

---

# 13. API KEYS AND WEBHOOKS

Implement:
- API key creation.
- Scoped API access.
- Key expiry.
- Key rotation.
- Key revocation.
- Usage tracking.
- Rate limiting.
- Webhook endpoint configuration.
- Event subscriptions.
- HMAC-signed payloads.
- Retry with exponential backoff.
- Delivery history.
- Manual redelivery.
- Dead-letter handling.

Example events:
- product.created
- product.updated
- inventory.stock_changed
- inventory.low_stock
- inventory.out_of_stock
- inventory.transfer_dispatched
- inventory.transfer_received
- purchase.received
- sale.completed
- sale.returned

Use a transactional outbox so business events are not lost when a worker or network fails.

Webhook consumers must tolerate duplicate events.

Protect configurable webhook URLs against SSRF and unsafe network destinations.

---

# 14. REPORTS AND DASHBOARD

Create:
- Sales dashboard.
- Inventory dashboard.
- Branch comparison.
- Stock valuation.
- Stock ledger.
- Low-stock report.
- Out-of-stock report.
- Barcode coverage report.
- Barcode print history.
- Purchase report.
- Stock transfer report.
- Expiry report.
- Sales return report.
- User activity report.
- API usage report.
- Webhook delivery report.

Use permission-aware filters and server-side pagination.

Provide CSV/XLSX export where appropriate.

Large exports should run through background jobs.

---

# 15. DOCKER AND DEPLOYMENT

Create:
- Frontend Dockerfile.
- Backend Dockerfile.
- Worker Dockerfile.
- Development Docker Compose configuration.
- Production deployment configuration.
- PostgreSQL configuration.
- Redis configuration.
- Nginx or reverse proxy configuration.
- `.env.example`.
- `.dockerignore`.
- Database migration scripts.
- Seed scripts.
- Health checks.
- Backup and restore scripts.
- Deployment documentation.

Use multi-stage builds, non-root runtime users and pinned base image versions.

Do not expose PostgreSQL or Redis publicly.

Do not embed secrets in Docker images or commit real production credentials.

Implement controlled migrations, monitoring, database backups and tested restoration procedures.

---

# 16. TESTING REQUIREMENTS

Create unit, integration and end-to-end tests.

Mandatory scenarios:

1. Tenant A cannot access Tenant B's products or barcodes.
2. A branch user cannot access unauthorized branches.
3. Duplicate barcodes cannot be assigned to conflicting products.
4. Barcode format and check digits are validated.
5. A barcode scan resolves the correct product variant.
6. Unknown barcodes produce a safe error.
7. Repeated POS scans follow the configured quantity behavior.
8. A sale updates stock and ledger atomically.
9. Duplicate checkout requests do not create duplicate sales.
10. Stock receiving handles partial quantities.
11. Stock transfers handle partial dispatch and receipt.
12. Stock counts do not change official balances before posting.
13. Barcode label dimensions and print layouts are validated.
14. Barcode printing does not create duplicate barcode records.
15. API keys respect scopes and tenant boundaries.
16. Webhook delivery retries work correctly.
17. Concurrent checkouts do not oversell stock unless explicitly configured.
18. Database backup restoration succeeds.
19. Keyboard-wedge scanner input works in the supported browser.
20. Barcode workflows work across desktop and tablet layouts.

Add automated linting, type checking, migration validation and build verification.

---

# 17. REQUIRED DEVELOPMENT WORKFLOW

Follow this implementation sequence.

### Phase 1: Repository audit
- Inspect the existing project.
- Identify the current stack and dependencies.
- Review existing pages, API routes, database schema and authentication.
- Identify missing modules and existing defects.
- Produce a concise implementation plan.
- Preserve working functionality.

### Phase 2: Foundation
- Configure Next.js, TypeScript and Tailwind CSS.
- Build the reusable premium design system.
- Configure NestJS and PostgreSQL.
- Add tenant architecture and authentication.
- Add database migrations and audit logging.

### Phase 3: Product and barcode core
- Implement products, variants, categories and units.
- Implement barcode mapping and validation.
- Implement barcode generation.
- Implement label templates and print preview.
- Implement scanner input.
- Implement barcode search APIs.
- Test uniqueness and tenant isolation.

### Phase 4: Inventory
- Implement stock ledger and balances.
- Implement stock receiving.
- Implement stock transfers.
- Implement stock counts and adjustments.
- Implement branch-wise Stock Finder.
- Integrate barcode scanning into each applicable workflow.

### Phase 5: POS
- Build the POS interface.
- Integrate continuous barcode scanning.
- Implement cart and price validation.
- Implement sale completion and payments.
- Implement receipt printing and returns.
- Test transaction consistency.

### Phase 6: SaaS integrations
- Implement company and user administration.
- Implement subscriptions and usage limits.
- Implement API keys and webhooks.
- Implement reporting and audit history.

### Phase 7: Production readiness
- Run unit and integration tests.
- Run tenant isolation and security tests.
- Verify Docker builds.
- Test database migrations and restoration.
- Run concurrency tests.
- Fix all critical defects.
- Document deployment and recovery procedures.

---

# 18. IMPLEMENTATION RULES FOR THE CODING AGENT

Follow these rules strictly:

1. Do not build only a frontend mockup.
2. Do not leave buttons with placeholder actions.
3. Do not use fake stock balances as production data.
4. Do not hardcode tenant IDs, branch IDs or user permissions.
5. Do not trust client-provided prices or stock quantities.
6. Do not allow direct stock modifications outside the approved inventory services.
7. Do not silently create products from unknown barcode scans.
8. Do not store raw API secrets in the database.
9. Do not delete posted stock ledger entries.
10. Do not bypass database migrations.
11. Do not overwrite existing project files without inspecting them.
12. Do not disable security checks to make tests pass.
13. Do not claim a feature is complete unless its implementation and tests support that claim.
14. Use reusable components and shared validation schemas.
15. Keep API contracts documented.
16. Handle loading, error, empty and success states.
17. Ensure barcode labels are physically scannable, not merely visually attractive.
18. Separate business logic from UI components.
19. Enforce tenant and branch authorization on the backend.
20. Complete and verify each implementation phase before proceeding.

If requirements are ambiguous, choose a safe, maintainable default and document the decision rather than silently implementing risky behavior.

---

# 19. REQUIRED FINAL DELIVERABLES

The completed project must contain:

- Working Next.js frontend.
- Working Node.js backend.
- PostgreSQL schemas and migrations.
- Authentication and RBAC.
- Multi-tenant company and branch management.
- Product and variant management.
- Barcode generation and management.
- Barcode label designer.
- Browser-based barcode label printing.
- USB/Bluetooth keyboard-wedge scanner support.
- POS barcode scanning.
- Barcode-based stock receiving.
- Barcode-based stock counting.
- Branch-wise Stock Finder.
- Stock ledger and stock transfers.
- Purchasing and supplier management.
- Sales and returns.
- Reports and dashboard.
- API key management.
- Webhook configuration and delivery.
- SaaS administration.
- Docker files.
- Automated tests.
- Environment variable template.
- OpenAPI documentation.
- Setup instructions.
- Production deployment guide.
- Backup and restore guide.
- Known limitations and supported printer/scanner workflows.

At the end, provide:
1. A summary of implemented modules.
2. Database schema and migration status.
3. API endpoint documentation.
4. Environment variables required.
5. Docker startup instructions.
6. Test results.
7. Barcode printer setup instructions.
8. Barcode scanner setup instructions.
9. Known limitations.
10. Remaining work, if any.

Start by inspecting the repository and presenting the implementation plan. Then implement the system in verified phases. Do not stop after producing a plan or generating static pages. Continue through actual implementation and testing within the capabilities of the available development environment.
