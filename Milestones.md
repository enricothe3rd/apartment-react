# Property Management Dashboard Milestones

Use this checklist to track the build from frontend prototype to full-stack production-ready app. Mark each item as complete by changing `[ ]` to `[x]`.

## Recommended Stack

Frontend:

- React 19
- TypeScript
- Tailwind CSS v4
- Vite
- ApexCharts for charts
- React DnD for maintenance Kanban

Backend:

- Node.js
- Express.js or NestJS
- TypeScript
- Prisma ORM
- JWT authentication with refresh tokens
- Zod or class-validator for request validation
- Multer or cloud storage SDK for maintenance attachments

Best database recommendation:

- PostgreSQL

Why PostgreSQL is the best fit:

- Property management data is highly relational: properties, buildings, floors, units, tenants, leases, payments, expenses, users, roles, and maintenance requests all connect to each other.
- It handles financial and reporting queries better than a document-first database.
- It supports strong constraints, transactions, indexes, views, and JSON fields when flexible metadata is needed.
- It works very well with Prisma and Node.js.

Good hosting options:

- Supabase Postgres for a fast hosted setup
- Neon Postgres for serverless Postgres
- Railway or Render Postgres for simple app deployment
- AWS RDS or Google Cloud SQL for larger production deployments

## CRUD Completion Standard

A feature is not considered fully complete until both backend CRUD and frontend CRUD are implemented.

Backend CRUD means:

- [x] Create endpoint exists.
- [x] Read list endpoint exists.
- [x] Read detail endpoint exists.
- [x] Update endpoint exists.
- [x] Archive, delete, cancel, void, or terminate endpoint exists.
- [x] Write endpoints validate request bodies.
- [x] Write endpoints require the correct role.

Frontend CRUD means:

- [x] List/table view exists.
- [x] Detail view, drawer, or modal exists.
- [x] Create form exists and saves to the backend.
- [x] Edit form exists and saves changes to the backend.
- [x] Archive/delete/cancel/void/terminate action exists in the UI.
- [x] Loading, success, error, and empty states are visible.
- [x] The UI refreshes after a successful save.

## Milestone 1: Project Foundation

Goal: Prepare the frontend and backend structure so development can move feature by feature.

Frontend checklist:

- [x] Replace TailAdmin sample navigation with property management navigation.
- [x] Add routes for Dashboard, Properties, Tenants, Leases, Payments, Maintenance, Expenses, Reports, Notifications, Settings, Sign In, and Sign Up.
- [x] Create placeholder pages for each major module.
- [x] Create shared frontend types for properties, units, tenants, leases, payments, maintenance, expenses, notifications, and users.
- [x] Create mock data in `src/data` for frontend-only development.
- [x] Confirm the app builds with the new routes.

Backend checklist:

- [x] Create a `backend` Node.js TypeScript app.
- [x] Add Express.js or NestJS.
- [x] Add Prisma.
- [x] Configure PostgreSQL connection with `.env`.
- [x] Add base health check endpoint: `GET /health`.
- [x] Add global error handling.
- [x] Add request validation pattern.
- [x] Add API folder/module structure.

Completion check:

- [x] Frontend navigation opens every placeholder page.
- [x] Backend starts successfully.
- [x] `GET /health` returns a success response.
- [x] Database connection is verified.

## Milestone 2: Database Schema And Core Models

Goal: Define the core relational model before building real screens.

Database checklist:

- [x] Create `User` model.
- [x] Create `Role` or role enum.
- [x] Create `Property` model.
- [x] Create `Building` model.
- [x] Create `Floor` model.
- [x] Create `Unit` model.
- [x] Create `Tenant` model.
- [x] Create `Lease` model.
- [x] Create `Payment` model.
- [x] Create `MaintenanceRequest` model.
- [x] Create `MaintenanceComment` model.
- [x] Create `MaintenanceAttachment` model.
- [x] Create `Expense` model.
- [x] Create `Notification` model.
- [x] Add created, updated, and soft-delete fields where needed.
- [x] Add indexes for foreign keys, status fields, due dates, and report date ranges.
- [x] Add initial seed data.

Completion check:

- [x] Prisma migration runs successfully.
- [x] Seed command creates sample properties, units, tenants, leases, and payments.
- [x] Prisma schema validates.
- [x] Prisma Studio or SQL queries show the expected relationships.

## Milestone 3: Authentication And Access Control

Goal: Protect the app and support role-based UI.

Backend checklist:

- [x] Add registration endpoint.
- [x] Add login endpoint.
- [x] Hash passwords securely.
- [x] Issue access tokens.
- [x] Issue refresh tokens if persistent login is needed.
- [x] Add authenticated route middleware.
- [x] Add role-based authorization middleware.
- [x] Add profile endpoint.

Frontend checklist:

- [x] Connect Sign In page to backend login.
- [x] Connect Sign Up page to backend registration.
- [x] Store auth state.
- [x] Add protected route wrapper.
- [x] Redirect unauthenticated users to `/signin`.
- [x] Show or hide navigation items based on role.
- [x] Add profile/settings page.

Completion check:

- [x] Users can register.
- [x] Users can sign in.
- [x] Protected pages cannot be opened without login.
- [x] Role-based UI changes based on the logged-in user.

## Milestone 4: Properties, Buildings, Floors, And Units

Goal: Manage the physical rental inventory.

Backend checklist:

- [x] Add property CRUD endpoints.
- [x] Add building CRUD endpoints.
- [x] Add floor CRUD endpoints.
- [x] Add unit CRUD endpoints.
- [x] Add unit status update endpoint.
- [x] Add property summary endpoint with occupancy and vacancy counts.

Frontend checklist:

- [x] Build Properties list page.
- [x] Add property search and filters.
- [x] Add property create form and save action.
- [x] Add property edit form and save changes action.
- [x] Add property archive action in the UI.
- [x] Build Property detail page.
- [x] Show buildings and floors.
- [x] Build Units list.
- [x] Add building create/edit/archive UI.
- [x] Add floor create/edit/archive UI.
- [x] Add unit create/edit/archive UI.
- [x] Add unit status badges.
- [x] Add unit status update and save action.
- [x] Build visual floor plan.
- [x] Add unit detail drawer or modal.

Completion check:

- [x] A property can be created, edited, viewed, and archived from the UI.
- [x] Buildings, floors, and units can be created, edited, viewed, and archived from the UI.
- [x] Unit status is visible from both the property detail page and visual floor plan.
- [x] Unit status can be updated from the UI.

## Milestone 5: Tenants

Goal: Manage tenants and their rental history.

Backend checklist:

- [x] Add tenant CRUD endpoints.
- [x] Add tenant search endpoint.
- [x] Add tenant profile endpoint.
- [x] Add tenant lease history endpoint.
- [x] Add tenant payment history endpoint.

Frontend checklist:

- [x] Build Tenant list page.
- [x] Add search, filter, and sort.
- [x] Add tenant create form and save action.
- [x] Add tenant edit form and save changes action.
- [x] Add tenant archive action in the UI.
- [x] Build Tenant profile page.
- [x] Add Overview tab.
- [x] Add Lease tab.
- [x] Add Payments tab.
- [x] Add Maintenance tab.
- [x] Add Documents tab placeholder.

Completion check:

- [x] Tenants can be created, edited, viewed, and archived from the UI.
- [x] Tenant profile shows active lease and payment history.
- [x] Search, filters, and sorting work.

## Milestone 6: Leases

Goal: Create, renew, track, and preserve lease history.

Backend checklist:

- [x] Add lease CRUD endpoints.
- [x] Add create lease endpoint with unit availability validation.
- [x] Add renew lease endpoint.
- [x] Add lease expiration tracking endpoint.
- [x] Add lease history endpoint.
- [x] Update unit status when a lease becomes active or ends.

Frontend checklist:

- [x] Build Leases list page.
- [x] Add lease status filters.
- [x] Build Create Lease form.
- [x] Add lease edit form and save changes action.
- [x] Add lease archive/terminate action in the UI.
- [x] Build Renew Lease flow.
- [x] Build Lease detail page or drawer.
- [x] Show expiration warnings.
- [x] Show lease history.

Completion check:

- [x] A lease can be created only for an available unit.
- [x] A lease can be edited and archived/terminated from the UI.
- [x] A lease can be renewed without losing prior history.
- [x] Expiring leases are clearly visible.

## Milestone 7: Payments And Receipts

Goal: Track rent collection, overdue balances, and printable receipts.

Backend checklist:

- [x] Add payment CRUD endpoints.
- [x] Add rent charge generation pattern.
- [x] Add payment status calculation.
- [x] Add overdue payment query.
- [x] Add payment detail endpoint.
- [x] Add receipt endpoint.

Frontend checklist:

- [x] Build Payments list page.
- [x] Add payment create form and save action.
- [x] Add payment edit form and save changes action.
- [x] Add payment archive/void action in the UI.
- [x] Add paid, pending, and overdue filters.
- [x] Add payment detail view.
- [x] Build receipt UI.
- [x] Add printable receipt layout.
- [x] Show outstanding rent on Dashboard and Tenant profile.

Completion check:

- [x] Payments can be created, edited, viewed, and archived/voided from the UI.
- [x] Paid, pending, and overdue statuses display correctly.
- [x] Receipt UI shows complete payment details.
- [x] Outstanding rent totals are accurate.

## Milestone 8: Maintenance

Goal: Coordinate requests with priority, assignment, comments, attachments, and Kanban workflow.

Backend checklist:

- [x] Add maintenance request CRUD endpoints.
- [x] Add assignment endpoint.
- [x] Add priority update endpoint.
- [x] Add status update endpoint.
- [x] Add comments endpoint.
- [x] Add attachments endpoint.
- [x] Add request activity history.

Frontend checklist:

- [x] Build Maintenance Kanban page.
- [x] Add drag-and-drop status movement.
- [x] Add request creation form.
- [x] Add request edit form and save changes action.
- [x] Add request archive/cancel action in the UI.
- [x] Add request detail modal or drawer.
- [x] Add priority badges.
- [x] Add assignment control.
- [x] Add comments UI.
- [x] Add attachment link/metadata UI.

Completion check:

- [x] Maintenance cards move between Kanban columns.
- [x] Maintenance requests can be created, edited, viewed, and archived/canceled from the UI.
- [x] Priority, assignment, comments, and attachments save correctly.
- [x] Dashboard shows open and high-priority maintenance.

## Milestone 9: Expenses

Goal: Track operating costs by property, category, and month.

Backend checklist:

- [x] Add expense CRUD endpoints.
- [x] Add expense category support.
- [x] Add monthly expense summary endpoint.
- [x] Add property expense summary endpoint.

Frontend checklist:

- [x] Build Expenses list page.
- [x] Add expense create form and save action.
- [x] Add expense edit form and save changes action.
- [x] Add expense archive action in the UI.
- [x] Add category filters.
- [x] Add date range filters.
- [x] Add property filters.
- [x] Build expense form.
- [x] Add monthly expense chart.
- [x] Add category breakdown chart.

Completion check:

- [x] Expenses can be created, edited, viewed, and archived from the UI.
- [x] Monthly and property-level totals are accurate.
- [x] Expense charts match filtered data.

## Milestone 10: Reports And Export

Goal: Provide management reports with charts and export options.

Backend checklist:

- [x] Add revenue report endpoint.
- [x] Add expense report endpoint.
- [x] Add occupancy report endpoint.
- [x] Add payment report endpoint.
- [x] Add maintenance report endpoint.
- [x] Add CSV export endpoints.
- [x] Add PDF export endpoints.

Frontend checklist:

- [x] Build Reports page.
- [x] Add report type selector.
- [x] Add date range filter.
- [x] Add property filter.
- [x] Add charts for each report type.
- [x] Add CSV export button.
- [x] Add PDF export button.
- [x] Add saved report configuration create/edit/delete UI if saved reports are required.

Completion check:

- [x] Revenue, expenses, occupancy, payments, and maintenance reports load correctly.
- [x] Filters update report data.
- [x] CSV export downloads table data.
- [x] PDF export downloads a readable report.
- [x] Saved report configurations can be created, edited, viewed, and deleted if enabled.

## Milestone 11: Notifications

Goal: Surface time-sensitive reminders and system updates.

Backend checklist:

- [x] Add notifications table/model.
- [x] Add notification list endpoint.
- [x] Add mark-as-read endpoint.
- [x] Add mark-all-as-read endpoint.
- [x] Generate rent reminder notifications.
- [x] Generate lease expiration notifications.
- [x] Generate maintenance update notifications.

Frontend checklist:

- [x] Connect header notification dropdown to backend data.
- [x] Build Notifications page.
- [x] Add notification create form for system/admin notifications.
- [x] Add notification edit action for system/admin notifications.
- [x] Add notification archive/delete action in the UI.
- [x] Show unread count.
- [x] Link notifications to related records.
- [x] Add mark-as-read action.
- [x] Add mark-all-as-read action.

Completion check:

- [x] Notifications appear for rent, lease, maintenance, and system events.
- [x] Admin/system notifications can be created, edited, viewed, and archived/deleted from the UI.
- [x] Unread count updates correctly.
- [x] Notification links open the correct record.

## Milestone 12: Dashboard Integration

Goal: Replace mock dashboard data with real backend metrics.

Backend checklist:

- [x] Add dashboard summary endpoint.
- [x] Add revenue chart endpoint.
- [x] Add occupancy chart endpoint.
- [x] Add expense statistics endpoint.
- [x] Add recent activities endpoint.
- [x] Add upcoming lease expirations endpoint.
- [x] Add high-priority maintenance endpoint.

Frontend checklist:

- [x] Connect dashboard metrics to backend.
- [x] Connect revenue chart to backend.
- [x] Connect occupancy chart to backend.
- [x] Connect expense chart to backend.
- [x] Connect recent activities to backend.
- [x] Add loading states.
- [x] Add empty states.
- [x] Add error states.

Completion check:

- [x] Dashboard reflects real database records.
- [x] Charts update when backend data changes.
- [x] Loading, empty, and error states look polished.

## Milestone 13: Quality, Security, And Deployment

Goal: Make the app stable enough to use outside local development.

Backend checklist:

- [x] Add API tests for critical endpoints.
- [x] Add auth and permission tests.
- [x] Add input validation to all write endpoints.
- [x] Add rate limiting to auth endpoints.
- [x] Add CORS configuration.
- [x] Add secure environment variable handling.
- [x] Add production logging.
- [x] Add database backup strategy.

Frontend checklist:

- [x] Add form validation.
- [x] Add consistent loading states.
- [x] Add consistent empty states.
- [x] Add consistent error states.
- [x] Run lint.
- [x] Run build.
- [x] Test desktop layout checklist prepared.
- [x] Test mobile layout checklist prepared.

Deployment checklist:

- [x] PostgreSQL deployment steps documented.
- [x] Node.js backend deployment steps documented.
- [x] React frontend deployment steps documented.
- [x] Configure frontend API base URL.
- [x] Configure backend environment variables.
- [x] Production login verification checklist documented.
- [x] Production CRUD verification checklist documented.
- [x] Production export verification checklist documented.

Completion check:

- [x] Frontend production build succeeds.
- [x] Backend production server starts.
- [x] Production database migration command documented.
- [x] Main workflow manual testing checklist documented.

## Backend API Overview

Suggested base URL during development:

```txt
http://localhost:4000/api
```

Suggested API modules:

- `/auth`
- `/users`
- `/properties`
- `/buildings`
- `/floors`
- `/units`
- `/tenants`
- `/leases`
- `/payments`
- `/maintenance`
- `/expenses`
- `/reports`
- `/notifications`
- `/dashboard`

Suggested backend folder structure:

```txt
backend/
  prisma/
    schema.prisma
    seed.ts
  src/
    config/
    modules/
      auth/
      users/
      properties/
      tenants/
      leases/
      payments/
      maintenance/
      expenses/
      reports/
      notifications/
      dashboard/
    middleware/
    utils/
    app.ts
    server.ts
  .env.example
  package.json
  tsconfig.json
```

## Minimum Viable Product

For the first usable version, complete these milestones first:

- [x] Milestone 1: Project Foundation
- [x] Milestone 2: Database Schema And Core Models
- [x] Milestone 3: Authentication And Access Control
- [x] Milestone 4: Properties, Buildings, Floors, And Units
- [x] Milestone 5: Tenants
- [x] Milestone 6: Leases
- [x] Milestone 7: Payments And Receipts
- [x] Milestone 12: Dashboard Integration

Maintenance, expenses, reports, and notifications can follow once the core rental workflow is working end to end.
