import type {
  Expense,
  Lease,
  MaintenanceRequest,
  Notification,
  Payment,
  Property,
  Tenant,
  Unit,
} from "../types/property-management";

export const properties: Property[] = [
  {
    id: "prop-001",
    name: "Maple Residences",
    address: "112 Maple Avenue",
    city: "Quezon City",
    status: "active",
    units: 42,
    occupiedUnits: 38,
  },
  {
    id: "prop-002",
    name: "Harbor Point Apartments",
    address: "28 Bayfront Road",
    city: "Manila",
    status: "active",
    units: 30,
    occupiedUnits: 25,
  },
  {
    id: "prop-003",
    name: "Cedar Walk Homes",
    address: "9 Cedar Street",
    city: "Makati",
    status: "active",
    units: 18,
    occupiedUnits: 16,
  },
];

export const units: Unit[] = [
  {
    id: "unit-101",
    propertyId: "prop-001",
    building: "A",
    floor: 1,
    label: "A-101",
    bedrooms: 2,
    bathrooms: 1,
    monthlyRent: 24500,
    status: "occupied",
    tenantId: "tenant-001",
  },
  {
    id: "unit-214",
    propertyId: "prop-001",
    building: "A",
    floor: 2,
    label: "A-214",
    bedrooms: 1,
    bathrooms: 1,
    monthlyRent: 18500,
    status: "delinquent",
    tenantId: "tenant-002",
  },
  {
    id: "unit-305",
    propertyId: "prop-002",
    building: "B",
    floor: 3,
    label: "B-305",
    bedrooms: 3,
    bathrooms: 2,
    monthlyRent: 42000,
    status: "maintenance",
  },
  {
    id: "unit-020",
    propertyId: "prop-003",
    building: "Main",
    floor: 2,
    label: "M-020",
    bedrooms: 2,
    bathrooms: 2,
    monthlyRent: 31500,
    status: "vacant",
  },
];

export const tenants: Tenant[] = [
  {
    id: "tenant-001",
    name: "Angela Reyes",
    email: "angela.reyes@example.com",
    phone: "+63 917 555 0101",
    propertyId: "prop-001",
    unitId: "unit-101",
    leaseStatus: "active",
    balance: 0,
    lastPaymentDate: "2026-09-01",
  },
  {
    id: "tenant-002",
    name: "Marco Santos",
    email: "marco.santos@example.com",
    phone: "+63 918 555 0198",
    propertyId: "prop-001",
    unitId: "unit-214",
    leaseStatus: "active",
    balance: 18500,
    lastPaymentDate: "2026-07-30",
  },
  {
    id: "tenant-003",
    name: "Lina Cruz",
    email: "lina.cruz@example.com",
    phone: "+63 919 555 0182",
    propertyId: "prop-003",
    unitId: "unit-020",
    leaseStatus: "expiring_soon",
    balance: 0,
    lastPaymentDate: "2026-08-29",
  },
];

export const leases: Lease[] = [
  {
    id: "lease-001",
    tenantId: "tenant-001",
    unitId: "unit-101",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    monthlyRent: 24500,
    deposit: 49000,
    status: "active",
  },
  {
    id: "lease-002",
    tenantId: "tenant-002",
    unitId: "unit-214",
    startDate: "2026-03-01",
    endDate: "2027-02-28",
    monthlyRent: 18500,
    deposit: 37000,
    status: "active",
  },
  {
    id: "lease-003",
    tenantId: "tenant-003",
    unitId: "unit-020",
    startDate: "2025-10-01",
    endDate: "2026-09-30",
    monthlyRent: 31500,
    deposit: 63000,
    status: "expiring_soon",
  },
];

export const payments: Payment[] = [
  {
    id: "pay-001",
    tenantId: "tenant-001",
    unitId: "unit-101",
    dueDate: "2026-09-01",
    paidDate: "2026-09-01",
    amount: 24500,
    status: "paid",
    method: "bank_transfer",
  },
  {
    id: "pay-002",
    tenantId: "tenant-002",
    unitId: "unit-214",
    dueDate: "2026-09-01",
    amount: 18500,
    status: "overdue",
  },
  {
    id: "pay-003",
    tenantId: "tenant-003",
    unitId: "unit-020",
    dueDate: "2026-09-15",
    amount: 31500,
    status: "pending",
  },
];

export const maintenanceRequests: MaintenanceRequest[] = [
  {
    id: "maint-001",
    title: "Aircon leak in bedroom",
    propertyId: "prop-001",
    unitId: "unit-214",
    priority: "high",
    status: "assigned",
    assignedTo: "R. Mendoza",
    openedAt: "2026-09-04",
  },
  {
    id: "maint-002",
    title: "Kitchen sink replacement",
    propertyId: "prop-002",
    unitId: "unit-305",
    priority: "medium",
    status: "in_progress",
    assignedTo: "Facilities Team",
    openedAt: "2026-09-02",
  },
  {
    id: "maint-003",
    title: "Lobby light inspection",
    propertyId: "prop-003",
    unitId: "unit-020",
    priority: "low",
    status: "new",
    assignedTo: "Unassigned",
    openedAt: "2026-09-06",
  },
];

export const expenses: Expense[] = [
  {
    id: "exp-001",
    propertyId: "prop-001",
    category: "Repairs",
    description: "Aircon service and parts",
    amount: 6200,
    expenseDate: "2026-09-05",
  },
  {
    id: "exp-002",
    propertyId: "prop-002",
    category: "Utilities",
    description: "Common area electricity",
    amount: 18300,
    expenseDate: "2026-09-03",
  },
  {
    id: "exp-003",
    propertyId: "prop-003",
    category: "Cleaning",
    description: "Weekly common area cleaning",
    amount: 4500,
    expenseDate: "2026-09-01",
  },
];

export const notifications: Notification[] = [
  {
    id: "note-001",
    type: "rent",
    title: "Overdue rent",
    message: "Marco Santos has an overdue September rent balance.",
    read: false,
    createdAt: "2026-09-07T09:30:00.000Z",
    targetUrl: "/payments",
  },
  {
    id: "note-002",
    type: "lease",
    title: "Lease expiring soon",
    message: "Lina Cruz's lease expires on 2026-09-30.",
    read: false,
    createdAt: "2026-09-07T08:15:00.000Z",
    targetUrl: "/leases",
  },
  {
    id: "note-003",
    type: "maintenance",
    title: "Maintenance update",
    message: "Kitchen sink replacement moved to In Progress.",
    read: true,
    createdAt: "2026-09-06T15:45:00.000Z",
    targetUrl: "/maintenance",
  },
];

export const portfolioSummary = {
  revenue: payments
    .filter((payment) => payment.status === "paid")
    .reduce((total, payment) => total + payment.amount, 0),
  outstandingRent: payments
    .filter((payment) => payment.status === "overdue")
    .reduce((total, payment) => total + payment.amount, 0),
  totalUnits: properties.reduce((total, property) => total + property.units, 0),
  occupiedUnits: properties.reduce(
    (total, property) => total + property.occupiedUnits,
    0
  ),
  vacantUnits: properties.reduce(
    (total, property) => total + property.units - property.occupiedUnits,
    0
  ),
  monthlyExpenses: expenses.reduce((total, expense) => total + expense.amount, 0),
};
