export type UnitStatus =
  | "occupied"
  | "vacant"
  | "reserved"
  | "maintenance"
  | "delinquent";

export type LeaseStatus =
  | "draft"
  | "active"
  | "expiring_soon"
  | "expired"
  | "renewed"
  | "terminated";

export type PaymentStatus = "paid" | "pending" | "overdue";
export type MaintenanceStatus =
  | "new"
  | "assigned"
  | "in_progress"
  | "waiting"
  | "completed";
export type MaintenancePriority = "low" | "medium" | "high" | "emergency";
export type Role = "admin" | "manager" | "staff" | "tenant";

export type Property = {
  id: string;
  name: string;
  address: string;
  city: string;
  status: "active" | "inactive";
  units: number;
  occupiedUnits: number;
};

export type Unit = {
  id: string;
  propertyId: string;
  building: string;
  floor: number;
  label: string;
  bedrooms: number;
  bathrooms: number;
  monthlyRent: number;
  status: UnitStatus;
  tenantId?: string;
};

export type Tenant = {
  id: string;
  name: string;
  email: string;
  phone: string;
  propertyId: string;
  unitId: string;
  leaseStatus: LeaseStatus;
  balance: number;
  lastPaymentDate: string;
};

export type Lease = {
  id: string;
  tenantId: string;
  unitId: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  deposit: number;
  status: LeaseStatus;
};

export type Payment = {
  id: string;
  tenantId: string;
  unitId: string;
  dueDate: string;
  paidDate?: string;
  amount: number;
  status: PaymentStatus;
  method?: "cash" | "bank_transfer" | "card" | "check";
};

export type MaintenanceRequest = {
  id: string;
  title: string;
  propertyId: string;
  unitId: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  assignedTo: string;
  openedAt: string;
};

export type Expense = {
  id: string;
  propertyId: string;
  category: string;
  description: string;
  amount: number;
  expenseDate: string;
};

export type Notification = {
  id: string;
  type: "rent" | "lease" | "maintenance" | "system";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  targetUrl?: string;
};
