// ──────────────────────────────────────────────
// Literal types (status, roles, plans, etc.)
// ──────────────────────────────────────────────

export type TenantStatus = "trial" | "active" | "suspended" | "cancelled";

export type UserRole = "superadmin" | "admin" | "professional";

export type AppointmentStatus =
  | "confirmed"
  | "cancelled"
  | "blocked"
  | "no_show";

export type BookingSource = "system" | "public_url";

export type Plan = "base" | "pro" | "premium";

export type SubscriptionStatus =
  | "trial"
  | "active"
  | "past_due"
  | "cancelled";

export type PaymentMethod = "mercadopago" | "manual";

export type PaymentStatus = "paid" | "failed" | "refunded";

// ──────────────────────────────────────────────
// Entity interfaces
// ──────────────────────────────────────────────

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  working_days: number[];
  open_time: string;
  close_time: string;
  status: TenantStatus;
  trial_ends_at: string | null;
  created_at: string;
}

export interface User {
  id: string;
  tenant_id: string | null;
  role: UserRole;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Invitation {
  id: string;
  tenant_id: string;
  token: string;
  email: string | null;
  expires_at: string | null;
  used_at: string | null;
  created_by: string;
}

export interface Service {
  id: string;
  tenant_id: string;
  name: string;
  duration_slots: number;
  price: number | null;
  color: string | null;
  is_active: boolean;
}

export interface Professional {
  id: string;
  tenant_id: string;
  user_id: string;
  display_name: string | null;
  specialty: string | null;
  is_available: boolean;
}

export interface Client {
  id: string;
  tenant_id: string;
  full_name: string;
  phone: string;
  created_at: string;
}

export interface Appointment {
  id: string;
  tenant_id: string;
  professional_id: string;
  service_id: string;
  client_id: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  notes: string | null;
  booked_from: BookingSource;
  whatsapp_sent: boolean;
  created_at: string;
}

export interface TimeBlock {
  id: string;
  tenant_id: string;
  professional_id: string;
  starts_at: string;
  ends_at: string;
  reason: string | null;
}

export interface Subscription {
  id: string;
  tenant_id: string;
  plan: Plan;
  status: SubscriptionStatus;
  payment_method: PaymentMethod | null;
  mp_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  promo_ends_at: string | null;
  created_at: string;
}

export interface PaymentHistory {
  id: string;
  tenant_id: string;
  subscription_id: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  paid_at: string | null;
  notes: string | null;
}
