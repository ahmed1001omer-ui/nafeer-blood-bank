import {
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/* ============================================================
 * الحسابات والصلاحيات
 * ========================================================== */

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  fullName: text("full_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(), // admin | manager | reception | lab | inventory | reports
  /** قائمة صلاحيات دقيقة "resource:action" — تتجاوز صلاحيات الدور عند وجودها */
  permissions: text("permissions", { mode: "json" }).$type<string[]>().default([]),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  email: text("email"),
  phone: text("phone"),
  otpHash: text("otp_hash"),
  otpExpiry: integer("otp_expiry", { mode: "timestamp_ms" }),
  lastLoginAt: integer("last_login_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

/** حسابات مستخدمي تطبيق التبرع، منفصلة عن حسابات موظفي لوحة التحكم وصلاحياتهم. */
export const mobileUsers = sqliteTable("mobile_users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  city: text("city").notNull(),
  bloodType: text("blood_type").notNull(),
  passwordHash: text("password_hash").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  otpHash: text("otp_hash"),
  otpExpiry: integer("otp_expiry", { mode: "timestamp_ms" }),
  otpAttempts: integer("otp_attempts").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

/* ============================================================
 * الموظفون (بيانات إدارية منفصلة عن حسابات الدخول)
 * ========================================================== */

export const employees = sqliteTable("employees", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  role: text("role").notNull(),
  hireDate: text("hire_date").notNull(),
  status: text("status").notNull().default("active"),
  phone: text("phone"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

/* ============================================================
 * المرضى
 * ========================================================== */

export const patients = sqliteTable("patients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  age: integer("age").notNull(),
  nationalId: text("national_id"),
  phone: text("phone"),
  bloodType: text("blood_type").notNull(),
  hospital: text("hospital").notNull(),
  gender: text("gender").notNull(),
  recordDate: text("record_date").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

/* ============================================================
 * المتبرعون
 * ========================================================== */

export const donors = sqliteTable("donors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  age: integer("age").notNull(),
  gender: text("gender").notNull(),
  phone: text("phone"),
  nationalId: text("national_id"),
  address: text("address"),
  initialExam: text("initial_exam").notNull(),
  bloodType: text("blood_type").notNull(),
  vitalSigns: text("vital_signs"),
  hemoglobin: real("hemoglobin"),
  eligibility: text("eligibility").notNull(),
  ineligibilityReason: text("ineligibility_reason"),
  stage: text("stage").notNull().default("reception"),
  status: text("status").notNull().default("reception_rejected"),
  donationCount: integer("donation_count").notNull().default(0),
  lastDonationDate: text("last_donation_date"),
  registerDate: text("register_date").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

/* ============================================================
 * التبرعات
 * ========================================================== */

export const donations = sqliteTable("donations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  donorId: integer("donor_id").notNull(),
  donorCode: text("donor_code").notNull(),
  donorName: text("donor_name").notNull(),
  bloodType: text("blood_type").notNull(),
  quantityMl: integer("quantity_ml").notNull().default(450),
  donationDate: text("donation_date").notNull(),
  status: text("status").notNull().default("under_review"), // completed | under_review | rejected
  handledBy: text("handled_by"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

/* ============================================================
 * فحوصات المختبر
 * ========================================================== */

export const labTests = sqliteTable("lab_tests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  donorId: integer("donor_id").notNull(),
  donorCode: text("donor_code").notNull(),
  donorName: text("donor_name").notNull(),
  hiv: text("hiv").notNull().default("negative"),
  hepatitisB: text("hepatitis_b").notNull().default("negative"),
  hepatitisC: text("hepatitis_c").notNull().default("negative"),
  htlv: text("htlv").notNull().default("negative"),
  syphilis: text("syphilis").notNull().default("negative"),
  malaria: text("malaria").notNull().default("negative"),
  decision: text("decision").notNull(),
  approved: integer("approved", { mode: "boolean" }).notNull().default(false),
  reason: text("reason"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  notes: text("notes"),
  testedBy: text("tested_by"),
  testedAt: integer("tested_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

/* ============================================================
 * القائمة السوداء / الحظر / التأجيل
 * ========================================================== */

export const blacklist = sqliteTable("blacklist", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  donorId: integer("donor_id"),
  donorCode: text("donor_code").notNull(),
  donorName: text("donor_name").notNull(),
  type: text("type").notNull(), // final | temporary | deferral
  reason: text("reason").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

/* ============================================================
 * وحدات الدم / المخزون
 * ========================================================== */

export const bloodUnits = sqliteTable("blood_units", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  unitNumber: text("unit_number").notNull().unique(),
  bloodType: text("blood_type").notNull(),
  rh: text("rh").notNull(),
  component: text("component").notNull(),
  status: text("status").notNull().default("available"),
  collectionDate: text("collection_date").notNull(),
  expiryDate: text("expiry_date").notNull(),
  quantity: integer("quantity").notNull().default(1),
  storageLocation: text("storage_location").notNull(),
  sourceCode: text("source_code"),
  donorId: integer("donor_id"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

/** الحد الأدنى المطلوب لكل فصيلة */
export const inventoryThresholds = sqliteTable("inventory_thresholds", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bloodType: text("blood_type").notNull().unique(),
  minUnits: integer("min_units").notNull().default(5),
});

/* ============================================================
 * طلبات الدم والصرف
 * ========================================================== */

export const bloodRequests = sqliteTable("blood_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  requestNumber: text("request_number").notNull().unique(),
  patientId: integer("patient_id"),
  patientName: text("patient_name").notNull(),
  requester: text("requester").notNull(),
  bloodType: text("blood_type").notNull(),
  component: text("component").notNull(),
  unitsRequested: integer("units_requested").notNull(),
  unitsFulfilled: integer("units_fulfilled").notNull().default(0),
  priority: text("priority").notNull().default("normal"), // critical | urgent | normal
  status: text("status").notNull().default("pending"), // pending | partial | fulfilled | cancelled
  requestDate: text("request_date").notNull(),
  notes: text("notes"),
  createdBy: text("created_by"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const bloodIssues = sqliteTable("blood_issues", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  requestId: integer("request_id"),
  requestNumber: text("request_number"),
  unitId: integer("unit_id").notNull(),
  unitNumber: text("unit_number").notNull(),
  bloodType: text("blood_type").notNull(),
  component: text("component").notNull(),
  patientName: text("patient_name").notNull(),
  issueDate: text("issue_date").notNull(),
  issuedBy: text("issued_by"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

/* ============================================================
 * منشورات احتياج الدم
 * ========================================================== */

export const donationPosts = sqliteTable("donation_posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bloodType: text("blood_type").notNull(),
  component: text("component").notNull(),
  unitsNeeded: integer("units_needed").notNull(),
  hospital: text("hospital").notNull(),
  phone: text("phone"),
  urgency: text("urgency").notNull().default("normal"),
  publishDate: text("publish_date").notNull(),
  notes: text("notes"),
  status: text("status").notNull().default("published"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

/* ============================================================
 * تحركات المخزون (إضافة / صرف / إتلاف / نقل)
 * ========================================================== */

export const inventoryMovements = sqliteTable("inventory_movements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  unitId: integer("unit_id"),
  unitNumber: text("unit_number").notNull(),
  bloodType: text("blood_type").notNull(),
  type: text("type").notNull(), // add | issue | discard | transfer
  fromLocation: text("from_location"),
  toLocation: text("to_location"),
  reason: text("reason"),
  performedBy: text("performed_by"),
  movementDate: text("movement_date").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

/* ============================================================
 * إعدادات النظام (قواعد الأهلية القابلة للتعديل)
 * ========================================================== */

export const systemSettings = sqliteTable("system_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  value: text("value", { mode: "json" }),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

/* ============================================================
 * سجل العمليات (Audit Log)
 * ========================================================== */

export const auditLogs = sqliteTable("audit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id"),
  username: text("username"),
  action: text("action").notNull(), // login | logout | create | update | delete | issue | approve ...
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  page: text("page"),
  changes: text("changes", { mode: "json" }).$type<{ field: string; from: unknown; to: unknown }[]>(),
  ip: text("ip"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

/* ============================================================
 * استجابات المتبرعين على المنشورات
 * ========================================================== */

export const postResponses = sqliteTable(
  "post_responses",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    postId: integer("post_id").notNull(),
    mobileUserId: integer("mobile_user_id").notNull(),
    donorName: text("donor_name").notNull(),
    donorPhone: text("donor_phone").notNull(),
    bloodType: text("blood_type").notNull(),
    status: text("status").notNull().default("queued"), // queued | new | reviewed | contacted | registered | donated | cancelled
    isNearby: text("is_nearby"), // e.g. "nearby_15m" | "nearby_30m" | "far" or descriptive text
    isSerious: integer("is_serious", { mode: "boolean" }).notNull().default(true),
    estimatedArrival: text("estimated_arrival"),
    notes: text("notes"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  },
  (table) => ({
    postUserIdx: uniqueIndex("post_responses_post_user_idx").on(table.postId, table.mobileUserId),
  })
);
