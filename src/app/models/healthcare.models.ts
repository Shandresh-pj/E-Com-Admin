/**
 * healthcare.models.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Single source of truth for all Healthcare ERP TypeScript interfaces and enums.
 * Frontend components, services, and templates must import from here only.
 * Backend DTOs must match these contracts exactly.
 * ─────────────────────────────────────────────────────────────────────────
 */

// ─────────────────────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────────────────────

export enum AppointmentStatus {
  BOOKED         = 'BOOKED',
  CONFIRMED      = 'CONFIRMED',
  CHECKED_IN     = 'CHECKED_IN',
  IN_CONSULTATION = 'IN_CONSULTATION',
  COMPLETED      = 'COMPLETED',
  CANCELLED      = 'CANCELLED',
  NO_SHOW        = 'NO_SHOW',
}

export enum StockStatus {
  NORMAL         = 'NORMAL',
  LOW_STOCK      = 'LOW_STOCK',
  CRITICAL_STOCK = 'CRITICAL_STOCK',
  OUT_OF_STOCK   = 'OUT_OF_STOCK',
}

export enum ExpiryStatus {
  SAFE           = 'SAFE',
  EXPIRING_SOON  = 'EXPIRING_SOON',
  CRITICAL       = 'CRITICAL',
  EXPIRED        = 'EXPIRED',
}

export enum PaymentStatus {
  PENDING        = 'PENDING',
  PROCESSING     = 'PROCESSING',
  PAID           = 'PAID',
  PARTIAL        = 'PARTIAL',
  FAILED         = 'FAILED',
  REFUNDED       = 'REFUNDED',
  WAIVED         = 'WAIVED',
}

export enum PaymentMethod {
  CASH           = 'CASH',
  CARD           = 'CARD',
  UPI            = 'UPI',
  ONLINE         = 'ONLINE',
  SPLIT          = 'SPLIT',
  PENDING        = 'PENDING',
}

export enum TransactionType {
  PURCHASE       = 'PURCHASE',
  SALE           = 'SALE',
  RETURN         = 'RETURN',
  DAMAGE         = 'DAMAGE',
  EXPIRED        = 'EXPIRED',
  ADJUSTMENT     = 'ADJUSTMENT',
  TRANSFER_IN    = 'TRANSFER_IN',
  TRANSFER_OUT   = 'TRANSFER_OUT',
  OPENING_STOCK  = 'OPENING_STOCK',
  CORRECTION     = 'CORRECTION',
}

export enum StockApprovalStatus {
  DRAFT          = 'DRAFT',
  SUBMITTED      = 'SUBMITTED',
  PENDING        = 'PENDING',
  APPROVED       = 'APPROVED',
  POSTED         = 'POSTED',
  REJECTED       = 'REJECTED',
}

export enum TimeOfDay {
  MORNING        = 'MORNING',
  AFTERNOON      = 'AFTERNOON',
  EVENING        = 'EVENING',
  NIGHT          = 'NIGHT',
}

export enum DosageForm {
  TABLET         = 'Tablet',
  CAPSULE        = 'Capsule',
  SYRUP          = 'Syrup',
  INJECTION      = 'Injection',
  DROPS          = 'Drops',
  CREAM          = 'Cream',
  OINTMENT       = 'Ointment',
  GEL            = 'Gel',
  PATCH          = 'Patch',
  INHALER        = 'Inhaler',
  SUPPOSITORY    = 'Suppository',
  SUSPENSION     = 'Suspension',
  POWDER         = 'Powder',
  LOTION         = 'Lotion',
  OTHER          = 'Other',
}

export enum ConsultationStatus {
  PENDING        = 'PENDING',
  IN_PROGRESS    = 'IN_PROGRESS',
  COMPLETED      = 'COMPLETED',
  CANCELLED      = 'CANCELLED',
}

export enum HcEventType {
  STOCK_UPDATED       = 'STOCK_UPDATED',
  STOCK_APPROVED      = 'STOCK_APPROVED',
  STOCK_REJECTED      = 'STOCK_REJECTED',
  STOCK_RESERVED      = 'STOCK_RESERVED',
  STOCK_RELEASED      = 'STOCK_RELEASED',
  LOW_STOCK           = 'LOW_STOCK',
  CRITICAL_STOCK      = 'CRITICAL_STOCK',
  OUT_OF_STOCK        = 'OUT_OF_STOCK',
  EXPIRY_ALERT        = 'EXPIRY_ALERT',
  SALE_CREATED        = 'SALE_CREATED',
  SALE_COMPLETED      = 'SALE_COMPLETED',
  PAYMENT_SUCCESS     = 'PAYMENT_SUCCESS',
  PAYMENT_FAILED      = 'PAYMENT_FAILED',
  REFUND_CREATED      = 'REFUND_CREATED',
  INVOICE_CREATED     = 'INVOICE_CREATED',
  INVOICE_UPDATED     = 'INVOICE_UPDATED',
  APPOINTMENT_CREATED = 'APPOINTMENT_CREATED',
  APPOINTMENT_UPDATED = 'APPOINTMENT_UPDATED',
  PRESCRIPTION_CREATED = 'PRESCRIPTION_CREATED',
  PROFIT_UPDATED      = 'PROFIT_UPDATED',
}

// ─────────────────────────────────────────────────────────────────────────────
// REAL-TIME EVENT ENVELOPE
// ─────────────────────────────────────────────────────────────────────────────

export interface HcRtEvent<T = unknown> {
  eventId:        string;
  eventType:      HcEventType;
  entityType:     string;
  entityId:       string;
  organizationId: string;
  timestamp:      string;   // ISO 8601
  version:        number;
  actorId:        string;
  payload:        T;
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCTOR
// ─────────────────────────────────────────────────────────────────────────────

export interface Doctor {
  id:                  number;
  name:                string;
  specialization:      string;
  qualification:       string;
  experience_years:    number;
  registration_number: string;
  registration_body?:  string;
  phone:               string;
  email:               string;
  photo_url?:          string;
  consultation_fee:    number;
  description?:        string;
  is_active:           boolean;
  branch_id?:          number | null;
  branch_name?:        string;
  created_at:          string;
  updated_at:          string;
}

export interface DoctorSchedule {
  id:         number;
  doctor_id:  number;
  day_of_week: number; // 0=Sun … 6=Sat
  start_time: string;  // HH:mm
  end_time:   string;
  slot_duration_min: number;
  max_patients?: number;
  is_active:  boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// PATIENT
// ─────────────────────────────────────────────────────────────────────────────

export interface Patient {
  id:           number;
  patient_code: string;
  name:         string;
  date_of_birth?: string;
  age?:         number;
  gender:       'Male' | 'Female' | 'Other';
  phone:        string;
  email?:       string;
  address?:     string;
  blood_group?: string;
  allergies?:   string;
  notes?:       string;
  is_active:    boolean;
  created_at:   string;
  updated_at:   string;
}

// ─────────────────────────────────────────────────────────────────────────────
// APPOINTMENT
// ─────────────────────────────────────────────────────────────────────────────

export interface Appointment {
  id:               number;
  appointment_code: string;
  patient_id:       number;
  patient_name?:    string;
  doctor_id:        number;
  doctor_name?:     string;
  specialty?:       string;
  appointment_date: string;      // ISO date
  appointment_time: string;      // HH:mm
  status:           AppointmentStatus;
  consultation_fee: number;
  payment_status:   PaymentStatus;
  payment_method?:  PaymentMethod;
  notes?:           string;
  created_by:       number;
  created_at:       string;
  updated_at:       string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSULTATION
// ─────────────────────────────────────────────────────────────────────────────

export interface Consultation {
  id:               number;
  appointment_id:   number;
  patient_id:       number;
  patient_name?:    string;
  doctor_id:        number;
  doctor_name?:     string;
  chief_complaint:  string;
  diagnosis?:       string;
  notes?:           string;
  status:           ConsultationStatus | string;
  prescription_id?: number;
  follow_up_date?:  string;
  created_at:       string;
  updated_at:       string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRESCRIPTION
// ─────────────────────────────────────────────────────────────────────────────

export interface MedicationScheduleItem {
  time_of_day:   TimeOfDay;
  quantity:      number;         // e.g. 1
  unit:          string;         // e.g. "tablet"
  before_food:   boolean;        // true = before food, false = after food
  instructions?: string;         // e.g. "with warm water"
}

export interface PrescriptionItem {
  id?:              number;
  prescription_id?: number;
  medicine_id:      number;
  medicine_name?:   string;
  generic_name?:    string;
  dosage_form?:     string;
  strength?:        string;
  quantity:         number;
  duration_days:    number;
  frequency:        string;      // e.g. "3 times a day"
  instructions?:    string;
  schedule:         MedicationScheduleItem[];  // morning/afternoon/evening/night
  is_dispensed:     boolean;
}

export interface Prescription {
  id:               number;
  prescription_code: string;
  patient_id:       number;
  patient_name?:    string;
  doctor_id:        number;
  doctor_name?:     string;
  consultation_id?: number;
  appointment_id?:  number;
  prescription_date: string;
  notes?:           string;
  items:            PrescriptionItem[];
  is_dispensed:     boolean;
  created_at:       string;
  updated_at:       string;
}

// ─────────────────────────────────────────────────────────────────────────────
// MEDICINE
// ─────────────────────────────────────────────────────────────────────────────

export interface Medicine {
  id:                   number;
  medicine_code:        string;
  name:                 string;
  generic_name:         string;
  brand:                string;
  composition?:         string;
  strength:             string;      // e.g. "500mg"
  dosage_form:          DosageForm;
  manufacturer?:        string;
  description?:         string;
  unit:                 string;      // e.g. "Strip", "Bottle"
  batch_no?:            string;      // Batch number
  manufacture_date?:    string;      // DD-MM-YYYY
  expiry_date?:         string;      // DD-MM-YYYY
  prescription_control?: string;     // OTC, Prescription Only, Schedule H, etc.
  supplier_id?:         number;
  supplier_name?:       string;
  current_stock:        number;
  minimum_stock:        number;
  reorder_level:        number;
  maximum_stock:        number;
  stock_status:         StockStatus;
  is_prescription_required: boolean;
  purchase_price:       number;      // internal only
  mrp:                  number;
  selling_price:        number;
  tax_percent:          number;
  is_active:            boolean;
  created_at:           string;
  updated_at:           string;
}

export interface MedicineBatch {
  id:             number;
  medicine_id:    number;
  medicine_name?: string;
  batch_number:   string;
  manufacture_date: string;
  expiry_date:    string;
  quantity:       number;
  purchase_price: number;
  mrp:            number;
  selling_price:  number;
  supplier_id?:   number;
  supplier_name?: string;
  expiry_status:  ExpiryStatus;
  is_active:      boolean;
  created_at:     string;
}

// ─────────────────────────────────────────────────────────────────────────────
// INVENTORY
// ─────────────────────────────────────────────────────────────────────────────

export interface InventoryTransaction {
  id:                string;   // UUID
  medicine_id:       number;
  medicine_name?:    string;
  batch_id?:         number;
  transaction_type:  TransactionType;
  quantity:          number;
  previous_quantity: number;
  new_quantity:      number;
  unit_cost?:        number;
  reference_id?:     string;
  reference_type?:   string;   // e.g. 'SALE', 'STOCK_APPROVAL'
  reason?:           string;
  user_id:           number;
  user_name?:        string;
  branch_id?:        number;
  created_at:        string;
}

// ─────────────────────────────────────────────────────────────────────────────
// STOCK APPROVAL
// ─────────────────────────────────────────────────────────────────────────────

export interface StockApprovalItem {
  id?:          number;
  approval_id?: number;
  medicine_id:  number;
  medicine_name?: string;
  batch_number: string;
  manufacture_date: string;
  expiry_date:  string;
  quantity:     number;
  unit_cost:    number;
  mrp:          number;
  selling_price: number;
  total_amount: number;
}

export interface StockApproval {
  id:              number;
  reference_number: string;
  supplier_id?:    number;
  supplier_name?:  string;
  status:          StockApprovalStatus;
  items:           StockApprovalItem[];
  total_amount:    number;
  submitted_by:    number;
  submitted_by_name?: string;
  submitted_at?:   string;
  approved_by?:    number;
  approved_by_name?: string;
  approved_at?:    string;
  rejection_reason?: string;
  notes?:          string;
  branch_id?:      number;
  created_at:      string;
  updated_at:      string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PHARMACY SALE (POS)
// ─────────────────────────────────────────────────────────────────────────────

export interface SaleItem {
  medicine_id:    number;
  medicine_name?: string;
  generic_name?:  string;
  batch_id:       number;
  batch_number?:  string;
  quantity:       number;
  unit_price:     number;   // selling_price — used for internal calc
  amount:         number;   // quantity × unit_price (after discount)
  discount_pct:   number;
  prescription_item_id?: number;
}

export interface PharmacySale {
  id:              number;
  sale_code:       string;
  patient_id?:     number;
  patient_name?:   string;
  prescription_id?: number;
  branch_id?:      number;
  items:           SaleItem[];
  subtotal:        number;
  discount_amount: number;
  tax_amount:      number;
  grand_total:     number;
  paid_amount:     number;
  balance_amount:  number;
  payment_method:  PaymentMethod;
  payment_status:  PaymentStatus;
  sold_by:         number;
  sold_by_name?:   string;
  invoice_id?:     number;
  created_at:      string;
}

// ─────────────────────────────────────────────────────────────────────────────
// HOSPITAL INVOICE
// ─────────────────────────────────────────────────────────────────────────────

/** Customer-facing line item — no internal cost/batch info */
export interface InvoiceLineItem {
  no:          number;
  description: string;   // medicine name + strength
  qty:         number;
  amount:      number;   // selling amount — never show purchase cost
}

/** Medication schedule for invoice "How to Use" section */
export interface InvoiceScheduleEntry {
  time_of_day:   TimeOfDay;
  medicine_name: string;
  quantity:      number;
  unit:          string;
  before_food:   boolean;
  instructions?: string;
}

export interface HospitalInvoice {
  id:              number;
  invoice_number:  string;
  invoice_date:    string;
  patient_id?:     number;
  patient_name?:   string;
  patient_phone?:  string;
  sale_id?:        number;
  appointment_id?: number;
  line_items:      InvoiceLineItem[];
  medication_schedule?: InvoiceScheduleEntry[];
  subtotal:        number;
  discount_amount: number;
  grand_total:     number;
  paid_amount:     number;
  balance_amount:  number;
  payment_method:  PaymentMethod;
  payment_status:  PaymentStatus;
  // Organisation branding
  org_name?:       string;
  org_address?:    string;
  org_phone?:      string;
  org_email?:      string;
  org_logo_url?:   string;
  org_license?:    string;
  created_at:      string;
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────

export type HcNotificationCategory =
  | 'LOW_STOCK' | 'CRITICAL_STOCK' | 'OUT_OF_STOCK'
  | 'EXPIRY' | 'STOCK_APPROVAL'
  | 'SALE' | 'PAYMENT_SUCCESS' | 'PAYMENT_FAILED' | 'REFUND'
  | 'APPOINTMENT' | 'PRESCRIPTION' | 'SYSTEM';

export interface HcNotification {
  id:           number;
  category:     HcNotificationCategory;
  title:        string;
  message:      string;
  priority:     'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  is_read:      boolean;
  deep_link?:   string;     // e.g. "/medicines/42"
  entity_id?:   number;
  entity_type?: string;
  created_at:   string;
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD KPIs
// ─────────────────────────────────────────────────────────────────────────────

export interface HcDashboardKpis {
  today_sales:           number;
  today_profit:          number;
  today_purchases:       number;
  low_stock_count:       number;
  critical_stock_count:  number;
  out_of_stock_count:    number;
  pending_approvals:     number;
  today_appointments:    number;
  pending_payments:      number;
  expiring_medicines:    number;
  total_patients:        number;
  total_doctors:         number;
}

export interface HcActivityEvent {
  id:          string;
  event_type:  HcEventType;
  description: string;
  entity_id?:  number | string;
  entity_type?: string;
  actor_name?: string;
  timestamp:   string;
}

// ─────────────────────────────────────────────────────────────────────────────
// API RESPONSE WRAPPERS
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiListResponse<T> {
  data:        T[];
  total:       number;
  page:        number;
  limit:       number;
  total_pages: number;
}

export interface ApiSingleResponse<T> {
  data:    T;
  message?: string;
}

export interface ApiErrorResponse {
  error:   string;
  message: string;
  statusCode: number;
  details?: Record<string, string[]>;
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Maps TimeOfDay to display label + emoji */
export const TIME_OF_DAY_META: Record<TimeOfDay, { label: string; emoji: string; cssClass: string }> = {
  [TimeOfDay.MORNING]:   { label: 'Morning',   emoji: '☀️',  cssClass: 'tod-morning'   },
  [TimeOfDay.AFTERNOON]: { label: 'Afternoon', emoji: '🌤️',  cssClass: 'tod-afternoon' },
  [TimeOfDay.EVENING]:   { label: 'Evening',   emoji: '🌅',  cssClass: 'tod-evening'   },
  [TimeOfDay.NIGHT]:     { label: 'Night',     emoji: '🌙',  cssClass: 'tod-night'     },
};

export const STOCK_STATUS_META: Record<StockStatus, { label: string; cssClass: string; color: string }> = {
  [StockStatus.NORMAL]:         { label: 'Normal',         cssClass: 'status-normal',    color: '#22c55e' },
  [StockStatus.LOW_STOCK]:      { label: 'Low Stock',      cssClass: 'status-low',       color: '#f59e0b' },
  [StockStatus.CRITICAL_STOCK]: { label: 'Critical Stock', cssClass: 'status-critical',  color: '#f97316' },
  [StockStatus.OUT_OF_STOCK]:   { label: 'Out of Stock',   cssClass: 'status-out',       color: '#ef4444' },
};

export const EXPIRY_STATUS_META: Record<ExpiryStatus, { label: string; cssClass: string; color: string }> = {
  [ExpiryStatus.SAFE]:          { label: 'Safe',           cssClass: 'expiry-safe',      color: '#22c55e' },
  [ExpiryStatus.EXPIRING_SOON]: { label: 'Expiring Soon',  cssClass: 'expiry-soon',      color: '#f59e0b' },
  [ExpiryStatus.CRITICAL]:      { label: 'Critical',       cssClass: 'expiry-critical',  color: '#f97316' },
  [ExpiryStatus.EXPIRED]:       { label: 'Expired',        cssClass: 'expiry-expired',   color: '#ef4444' },
};

export const APPOINTMENT_STATUS_META: Record<AppointmentStatus, { label: string; cssClass: string }> = {
  [AppointmentStatus.BOOKED]:          { label: 'Booked',          cssClass: 'appt-booked'     },
  [AppointmentStatus.CONFIRMED]:       { label: 'Confirmed',       cssClass: 'appt-confirmed'  },
  [AppointmentStatus.CHECKED_IN]:      { label: 'Checked In',      cssClass: 'appt-checkedin'  },
  [AppointmentStatus.IN_CONSULTATION]: { label: 'In Consultation', cssClass: 'appt-inprog'     },
  [AppointmentStatus.COMPLETED]:       { label: 'Completed',       cssClass: 'appt-completed'  },
  [AppointmentStatus.CANCELLED]:       { label: 'Cancelled',       cssClass: 'appt-cancelled'  },
  [AppointmentStatus.NO_SHOW]:         { label: 'No Show',         cssClass: 'appt-noshow'     },
};
