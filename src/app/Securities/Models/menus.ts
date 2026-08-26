export interface AppMenuRoute {
  id?: number;
  name: string;
  path: string;
  icon: string;
  webIcon?: string;
  appIcon?: string;
  category?: string;
  permissions?: any[];
}

/**
 * Authoritative collection of all system application routes.
 * Used for dynamic frontend role matrix rendering and bulk database seeding.
 * Total: 46 routes (37 core + 9 healthcare).
 */
export const ALL_APP_ROUTES_46: AppMenuRoute[] = [
  // ─── Finance ───────────────────────────────────────────────────────────
  { id: 1,  name: "Profit & Loss",         path: "/profit-loss",          icon: "monetization_on",       category: "Finance" },

  // ─── Administration ────────────────────────────────────────────────────
  { id: 2,  name: "App Admin",             path: "/admin",                icon: "admin_panel_settings",  category: "Admin" },
  { id: 3,  name: "Branch",               path: "/branch",               icon: "account_tree",          category: "Admin" },
  { id: 4,  name: "Employees",            path: "/employees",            icon: "badge",                 category: "Workforce" },
  { id: 5,  name: "Roles",                path: "/roles",                icon: "security",              category: "Admin" },
  { id: 6,  name: "Role Access",          path: "/role-access",          icon: "lock_person",           category: "Admin" },
  { id: 7,  name: "Profile",              path: "/profile",              icon: "person",                category: "Settings" },
  { id: 8,  name: "Menu Bar",             path: "/menubar",              icon: "menu",                  category: "Settings" },
  { id: 9,  name: "Status",               path: "/status",               icon: "toggle_on",             category: "Settings" },

  // ─── Catalog ───────────────────────────────────────────────────────────
  { id: 10, name: "Product Attribute",    path: "/product-attribute",    icon: "sell",                  category: "Catalog" },
  { id: 11, name: "Attribute Value",      path: "/attribute-value",      icon: "label",                 category: "Catalog" },
  { id: 12, name: "Category",             path: "/category",             icon: "category",              category: "Catalog" },
  { id: 13, name: "Product",              path: "/product",              icon: "inventory_2",           category: "Catalog" },

  // ─── Sales ─────────────────────────────────────────────────────────────
  { id: 14, name: "Orders",               path: "/orders",               icon: "shopping_cart",         category: "Sales" },
  { id: 15, name: "Change Password",      path: "/change-password",      icon: "key",                   category: "Settings" },
  { id: 16, name: "Audit Logs",           path: "/audit-logs",           icon: "receipt_long",          category: "Audit" },
  { id: 17, name: "Alerts",               path: "/alerts",               icon: "notifications_active",  category: "Operations" },

  // ─── Workforce ─────────────────────────────────────────────────────────
  { id: 18, name: "Attendance",           path: "/attendance",           icon: "history",               category: "Workforce" },
  { id: 19, name: "Branch Stocks",        path: "/branch-stocks",        icon: "store",                 category: "Inventory" },
  { id: 20, name: "Stocks",               path: "/stocks",               icon: "warehouse",             category: "Inventory" },
  { id: 21, name: "Payroll",              path: "/payroll",              icon: "payments",              category: "Workforce" },
  { id: 22, name: "Leave",                path: "/leave",                icon: "event_busy",            category: "Workforce" },
  { id: 23, name: "Delivery Tracking",    path: "/delivery-tracking",    icon: "local_shipping",        category: "Logistics" },
  { id: 24, name: "Payments",             path: "/payments",             icon: "account_balance_wallet", category: "Finance" },
  { id: 25, name: "Notifications",        path: "/notifications",        icon: "notifications",         category: "Operations" },
  { id: 26, name: "Workforce Console",    path: "/workforce",            icon: "tune",                  category: "Workforce" },
  { id: 27, name: "Shifts & Schedules",   path: "/shifts",               icon: "schedule",              category: "Workforce" },
  { id: 28, name: "Break Deduction Rules",path: "/break-policies",       icon: "free_breakfast",        category: "Workforce" },
  { id: 29, name: "Biometric Sensors",    path: "/biometric",            icon: "fingerprint",           category: "Workforce" },
  { id: 30, name: "GPS Geofencing",       path: "/geofencing",           icon: "location_on",           category: "Workforce" },
  { id: 31, name: "Company Calendar",     path: "/calendar",             icon: "calendar_month",        category: "Workforce" },
  { id: 32, name: "KYC Document Vault",   path: "/employee-documents",   icon: "folder_shared",         category: "Workforce" },
  { id: 33, name: "Translation Console",  path: "/translations",         icon: "translate",             category: "Settings" },
  { id: 34, name: "Workforce Requests",   path: "/workforce-requests",   icon: "assignment",            category: "Workforce" },
  { id: 35, name: "Invoice Generator",    path: "/invoices",             icon: "description",           category: "Sales" },
  { id: 36, name: "Workflow Approvals",   path: "/approvals",            icon: "approval",              category: "Operations" },
  { id: 37, name: "CRM Contacts",         path: "/crm-contacts",         icon: "contacts",              category: "Admin" },

  // ─── Healthcare ────────────────────────────────────────────────────────
  { id: 38, name: "Doctors",              path: "/doctors",              icon: "medical_services",      category: "Healthcare" },
  { id: 39, name: "Patients",             path: "/patients",             icon: "personal_injury",       category: "Healthcare" },
  { id: 40, name: "Appointments",         path: "/appointments",         icon: "event_available",       category: "Healthcare" },
  { id: 41, name: "Consultations",        path: "/consultations",        icon: "record_voice_over",     category: "Healthcare" },
  { id: 42, name: "Prescriptions",        path: "/prescriptions",        icon: "medication",            category: "Healthcare" },
  { id: 43, name: "Medicine Master",      path: "/medicines",            icon: "local_pharmacy",        category: "Pharmacy" },
  { id: 44, name: "Pharmacy POS",         path: "/pharmacy-pos",         icon: "point_of_sale",         category: "Pharmacy" },
  { id: 45, name: "Stock Approvals",      path: "/stock-approvals",      icon: "inventory",             category: "Pharmacy" },
  { id: 46, name: "Medicine Expiry",      path: "/medicine-expiry",      icon: "hourglass_bottom",      category: "Pharmacy" },
];

/** @deprecated Use ALL_APP_ROUTES_46 — kept for backward compatibility with existing backend seed scripts */
export const ALL_APP_ROUTES_37 = ALL_APP_ROUTES_46;
