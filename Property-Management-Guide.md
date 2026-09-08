# Property Management Dashboard Guide

This guide expands `features.md` into a practical roadmap for building a rental/property management dashboard with the existing React, TypeScript, Tailwind CSS, and TailAdmin setup.

## Product Goal

Build an admin dashboard that helps property managers monitor portfolio health, manage properties and tenants, track leases and rent payments, coordinate maintenance, record expenses, export reports, and receive timely notifications.

The first screen should be the operational dashboard, not a marketing page. Users should immediately see revenue, occupancy, vacant units, rent status, recent activity, and charts that help them decide what needs attention.

## Core User Roles

- Admin: full access to all properties, users, reports, settings, and role-based controls.
- Property Manager: manages assigned properties, tenants, leases, payments, maintenance, and expenses.
- Staff or Maintenance User: views assigned maintenance requests, updates request status, comments, and uploads attachments.
- Tenant: views lease details, payment history, receipts, and maintenance updates if tenant-facing access is added.

## Navigation Structure

Replace the default TailAdmin sample navigation with property management sections:

- Dashboard
- Properties
- Tenants
- Leases
- Payments
- Maintenance
- Expenses
- Reports
- Notifications
- Profile / Settings
- Authentication

Suggested route map:

| Feature | Route | Purpose |
| --- | --- | --- |
| Dashboard | `/` | Portfolio overview and recent activity |
| Properties | `/properties` | Property, building, floor, and unit management |
| Property Detail | `/properties/:propertyId` | Full property profile and unit status |
| Tenants | `/tenants` | Tenant directory with search, filter, and sort |
| Tenant Profile | `/tenants/:tenantId` | Lease, payment, and contact history |
| Leases | `/leases` | Active, expiring, renewed, and historical leases |
| Create Lease | `/leases/new` | Lease creation workflow |
| Payments | `/payments` | Rent collection and payment tracking |
| Payment Detail | `/payments/:paymentId` | Payment information and receipt UI |
| Maintenance | `/maintenance` | Kanban board for maintenance requests |
| Expenses | `/expenses` | Expense tracking by category, month, and property |
| Reports | `/reports` | Charts and CSV/PDF exports |
| Notifications | `/notifications` | Reminders and system updates |
| Settings | `/settings` | Profile, account, and role-based preferences |
| Sign In | `/signin` | Login |
| Sign Up | `/signup` | Registration |

## Dashboard

The dashboard should summarize the business at a glance.

Primary metrics:

- Total revenue
- Occupancy rate
- Vacant units
- Outstanding rent
- Monthly expenses
- Open maintenance requests

Recommended widgets:

- Revenue trend chart
- Occupancy chart
- Expense statistics chart
- Payment status breakdown: paid, pending, overdue
- Recent activities feed
- Upcoming lease expirations
- High-priority maintenance list

Implementation notes:

- Reuse existing chart components under `src/components/charts`.
- Adapt existing ecommerce dashboard components into property-focused widgets.
- Keep dashboard cards compact and scannable.

## Properties

The Properties section manages the physical structure of the portfolio.

Feature scope:

- Property list
- Building list
- Floor list
- Unit list
- Visual floor plan
- Unit status indicators

Suggested unit statuses:

- Occupied
- Vacant
- Reserved
- Under maintenance
- Delinquent

Recommended screens:

- Properties table with search, filters, and status counts
- Property detail page with buildings, floors, and units
- Visual floor plan showing unit status with color-coded blocks
- Unit detail drawer or modal for rent, tenant, lease, and maintenance status

Suggested data model:

```ts
type Property = {
  id: string;
  name: string;
  address: string;
  city: string;
  status: "active" | "inactive";
};

type Building = {
  id: string;
  propertyId: string;
  name: string;
};

type Floor = {
  id: string;
  buildingId: string;
  level: number;
};

type Unit = {
  id: string;
  floorId: string;
  label: string;
  bedrooms: number;
  bathrooms: number;
  monthlyRent: number;
  status: "occupied" | "vacant" | "reserved" | "maintenance" | "delinquent";
};
```

## Tenants

The Tenants section should make it easy to find a person and understand their history.

Feature scope:

- Tenant list
- Search, filter, and sort
- Tenant profile
- Lease information
- Payment history

Recommended table columns:

- Tenant name
- Contact information
- Property
- Unit
- Lease status
- Balance
- Last payment date
- Actions

Tenant profile tabs:

- Overview
- Lease
- Payments
- Maintenance
- Documents

## Leases

The Leases section handles rental agreements from creation through renewal and history.

Feature scope:

- Create lease
- Renew lease
- Expiration tracking
- Lease history

Recommended statuses:

- Draft
- Active
- Expiring soon
- Expired
- Renewed
- Terminated

Create lease workflow:

1. Select property and unit.
2. Select or create tenant.
3. Enter lease dates and rent amount.
4. Add deposit, payment terms, and notes.
5. Review and save.

Renewal workflow:

1. Open an active or expiring lease.
2. Review existing terms.
3. Set new dates and rent changes.
4. Save renewal and preserve the old lease in history.

## Payments

The Payments section tracks rent collection and payment records.

Feature scope:

- Rent collection
- Payment history
- Paid, pending, and overdue status
- Payment details
- Receipt UI

Recommended table columns:

- Invoice or receipt number
- Tenant
- Property and unit
- Due date
- Paid date
- Amount
- Status
- Payment method
- Actions

Receipt UI should include:

- Receipt number
- Tenant name
- Property and unit
- Payment date
- Amount paid
- Balance after payment
- Payment method
- Printable/exportable layout

## Maintenance

The Maintenance section should work like an operations board.

Feature scope:

- Maintenance requests
- Priority
- Assignment
- Comments
- Attachments
- Drag-and-drop Kanban

Suggested Kanban columns:

- New
- Assigned
- In Progress
- Waiting
- Completed

Suggested priorities:

- Low
- Medium
- High
- Emergency

Implementation notes:

- The project already includes `react-dnd` and `react-dnd-html5-backend`, which are suitable for the Kanban board.
- Use cards for individual maintenance requests.
- Add a detail drawer or modal for comments, attachments, assignment, and status changes.

## Expenses

The Expenses section should record and summarize operating costs.

Feature scope:

- Expense tracking
- Categories
- Monthly expenses
- Property expenses

Suggested categories:

- Repairs
- Utilities
- Taxes
- Insurance
- Cleaning
- Security
- Management fees
- Supplies
- Other

Recommended views:

- Expense table
- Monthly expense chart
- Category breakdown chart
- Property-level expense comparison

## Reports

Reports should turn operational data into exportable summaries.

Feature scope:

- Revenue reports
- Expense reports
- Occupancy reports
- Payment reports
- Maintenance reports
- Charts
- CSV/PDF export

Recommended reports:

- Monthly revenue
- Rent collection summary
- Outstanding rent
- Occupancy by property
- Vacant units
- Maintenance resolution time
- Expense by category
- Net operating income

Export behavior:

- CSV export should contain raw table rows.
- PDF export should contain title, date range, summary metrics, charts, and table highlights.

## Notifications

Notifications should surface time-sensitive work.

Feature scope:

- Rent reminders
- Lease expiration reminders
- Maintenance updates
- System notifications

Recommended notification fields:

```ts
type Notification = {
  id: string;
  type: "rent" | "lease" | "maintenance" | "system";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  targetUrl?: string;
};
```

Recommended behavior:

- Show unread count in the header.
- Link each notification to the relevant tenant, lease, payment, or maintenance request.
- Allow users to mark one notification or all notifications as read.

## Authentication And Access

Feature scope:

- Login
- Registration
- Protected routes
- Role-based UI
- Profile/settings

Implementation notes:

- Keep `/signin` and `/signup`.
- Wrap dashboard routes in a protected route component once real authentication is connected.
- Hide or disable navigation items based on the user role.
- Store role permissions in a central config so sidebar, routes, and buttons behave consistently.

Suggested permission model:

```ts
type Role = "admin" | "manager" | "staff" | "tenant";

type Permission =
  | "view_dashboard"
  | "manage_properties"
  | "manage_tenants"
  | "manage_leases"
  | "manage_payments"
  | "manage_maintenance"
  | "manage_expenses"
  | "view_reports"
  | "manage_settings";
```

## Suggested Folder Structure

Add domain-specific modules under `src/features` while keeping shared TailAdmin components under `src/components`. Add the Node.js backend in a separate `backend` folder so the frontend and API can be developed independently.

```txt
src/
  features/
    dashboard/
    properties/
    tenants/
    leases/
    payments/
    maintenance/
    expenses/
    reports/
    notifications/
    auth/
  components/
  layout/
  pages/
  routes/
  data/
  types/
backend/
  prisma/
  src/
    modules/
    middleware/
    utils/
```

For an early frontend-only version, mock data can live in `src/data`. When a backend is added, replace mock data access with API services.

## Backend And Database

Use Node.js with TypeScript for the backend API. Express.js is a good lightweight choice; NestJS is a good choice if you want a more structured enterprise-style backend.

Recommended backend stack:

- Node.js
- TypeScript
- Express.js or NestJS
- Prisma ORM
- PostgreSQL
- JWT authentication
- Zod or class-validator for validation

Recommended database: PostgreSQL.

PostgreSQL is the best fit because the app is relational by nature. Properties have buildings, buildings have floors, floors have units, units connect to tenants through leases, leases connect to payments, and reports depend on accurate joins across those records. PostgreSQL also gives you transactions, constraints, indexes, date queries, and strong reporting support.

Local backend commands:

```bash
cd backend
npm install
docker compose up -d postgres
npx prisma migrate dev
npm run seed
npm run check:db
npm run build
npm start
```

Default local admin login after seeding:

```txt
Email: admin@property.local
Password: password123
```

The first auth milestone uses JWT access tokens stored by the frontend auth context. Add refresh tokens later if the app needs long-lived sessions across browser restarts or stricter production session control.

The Properties milestone includes authenticated CRUD endpoints for properties, buildings, floors, and units. The frontend Properties page reads live data from PostgreSQL through the Node.js API and shows inventory metrics, unit filtering, status badges, a visual floor plan, and a unit detail drawer.

The Tenants milestone includes authenticated tenant CRUD, search, profile, lease history, and payment history endpoints. The frontend Tenants page reads live API data and provides a searchable/sortable tenant table plus profile tabs for overview, lease, payments, maintenance, and documents.

The Leases milestone includes authenticated CRUD, available-unit validation, tenant active-lease validation, renewal, expiration tracking, and history endpoints. The frontend Leases page reads live API data and provides status filters, create lease workflow, renewal workflow, expiring lease visibility, and lease history through the selected record.

## Implementation Phases

For a detailed milestone tracker with checkboxes, use `Milestones.md`.

### Phase 1: Navigation, Backend Setup, And Mock Data

- Replace sample sidebar labels with property management navigation.
- Add placeholder pages for each feature.
- Create shared TypeScript types.
- Add realistic mock data for properties, tenants, leases, payments, maintenance, expenses, and notifications.
- Create the Node.js backend project.
- Configure PostgreSQL and Prisma.

### Phase 2: Dashboard And Core Tables

- Build dashboard metrics.
- Add revenue, occupancy, and expense charts.
- Build properties, tenants, leases, payments, and expenses tables.
- Add search, filter, sort, and status badges.

### Phase 3: Detail Pages And Workflows

- Add property detail and visual floor plan.
- Add tenant profile tabs.
- Add create lease and renew lease flows.
- Add payment detail and receipt UI.
- Add maintenance request detail modal or drawer.

### Phase 4: Kanban, Reports, And Exports

- Build maintenance Kanban with drag-and-drop.
- Add report pages and chart filters.
- Add CSV export.
- Add PDF export.

### Phase 5: Authentication And Roles

- Connect real login and registration.
- Add protected routes.
- Add role-based navigation and action visibility.
- Add profile/settings management.

## UI Guidelines

- Keep operational pages dense, organized, and easy to scan.
- Use tables for lists, tabs for detail sections, badges for statuses, and modals or drawers for focused actions.
- Use charts only where they clarify trends or comparisons.
- Use consistent status colors across units, payments, leases, and maintenance.
- Keep forms short by grouping fields into clear sections.

Suggested status colors:

| Status Type | Example | Color Direction |
| --- | --- | --- |
| Success | Paid, Occupied, Completed | Green |
| Warning | Pending, Expiring Soon, Waiting | Amber |
| Danger | Overdue, Emergency, Delinquent | Red |
| Neutral | Draft, Vacant, Archived | Gray |
| Info | Assigned, In Progress, Reserved | Blue |

## Acceptance Checklist

- Dashboard shows revenue, occupancy, vacant units, outstanding rent, expenses, charts, and recent activity.
- Properties support buildings, floors, units, visual floor plan, and unit statuses.
- Tenants can be searched, filtered, sorted, and opened into profiles.
- Tenant profiles show lease information and payment history.
- Leases can be created, renewed, tracked by expiration, and viewed historically.
- Payments show paid, pending, overdue, details, history, and receipt UI.
- Maintenance requests support priority, assignment, comments, attachments, and Kanban movement.
- Expenses support categories, monthly totals, and property-level tracking.
- Reports include revenue, expenses, occupancy, payments, maintenance, charts, and CSV/PDF export.
- Notifications cover rent reminders, lease expirations, maintenance updates, and system messages.
- Authentication supports login, registration, protected routes, role-based UI, and profile/settings.
