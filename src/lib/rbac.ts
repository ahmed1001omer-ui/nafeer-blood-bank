/**
 * نظام الصلاحيات المرن (RBAC)
 * كل صلاحية بصيغة "resource:action" — الأدوار تحدد مجموعة افتراضية،
 * ويمكن للمسؤول منح/سحب صلاحيات دقيقة لكل مستخدم.
 */

export const RESOURCES = [
  { key: "dashboard", label: "لوحة التحكم", actions: ["view"] },
  { key: "patients", label: "المرضى", actions: ["view", "create", "update", "delete"] },
  { key: "donors", label: "المتبرعون", actions: ["view", "create", "update", "delete"] },
  { key: "posts", label: "منشورات الاحتياج", actions: ["view", "publish"] },
  { key: "donations", label: "التبرعات", actions: ["view", "create", "update"] },
  { key: "units", label: "وحدات الدم", actions: ["view", "create", "update", "delete", "issue"] },
  { key: "inventory", label: "المخزون", actions: ["view", "manage"] },
  { key: "requests", label: "طلبات الدم", actions: ["view", "create", "update", "fulfill"] },
  { key: "issues", label: "صرف الدم", actions: ["view", "create"] },
  { key: "lab", label: "المختبر", actions: ["view", "create", "update", "approve"] },
  { key: "blacklist", label: "القائمة السوداء", actions: ["view", "create", "delete"] },
  { key: "waiting", label: "قائمة الانتظار", actions: ["view"] },
  { key: "employees", label: "الموظفون", actions: ["view", "create", "update"] },
  { key: "reports", label: "التقارير", actions: ["view", "export", "delete"] },
  { key: "notifications", label: "التنبيهات", actions: ["view"] },
  { key: "audit", label: "سجل العمليات", actions: ["view"] },
  { key: "users", label: "المستخدمون", actions: ["view", "create", "update", "delete", "reset"] },
  { key: "settings", label: "الإعدادات", actions: ["view", "manage"] },
] as const;

export type Permission = `${string}:${string}`;

export type SessionUser = {
  id: number;
  username: string;
  fullName: string;
  role: string;
  permissions: string[];
};

const allPermissions = (): Permission[] =>
  RESOURCES.flatMap((resource) => resource.actions.map((action) => `${resource.key}:${action}` as Permission));

export const ALL_PERMISSIONS = allPermissions();
const POST_PERMISSIONS = ["posts:view", "posts:publish"] as const;

export const ROLES = [
  { value: "admin", label: "مسؤول النظام" },
  { value: "manager", label: "مدير" },
  { value: "reception", label: "موظف استقبال" },
  { value: "lab", label: "موظف مختبر" },
  { value: "inventory", label: "موظف مخزون" },
  { value: "reports", label: "موظف تقارير" },
] as const;

export const ROLE_LABELS: Record<string, string> =
  ROLES.reduce((acc, role) => ({ ...acc, [role.value]: role.label }), {});

/** الصلاحيات الافتراضية لكل دور */
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  admin: ALL_PERMISSIONS,
  manager: [
    "dashboard:view",
    "patients:view",
    "patients:create",
    "patients:update",
    "donors:view",
    "donors:create",
    "donors:update",
    "posts:view",
    "posts:publish",
    "donations:view",
    "units:view",
    "inventory:view",
    "requests:view",
    "issues:view",
    "lab:view",
    "lab:create",
    "lab:update",
    "lab:approve",
    "blacklist:view",
    "blacklist:create",
    "blacklist:delete",
    "waiting:view",
    "employees:view",
    "reports:view",
    "reports:export",
    "reports:delete",
    "notifications:view",
    "audit:view",
  ],
  reception: [
    "dashboard:view",
    "patients:view",
    "patients:create",
    "patients:update",
    "donors:view",
    "donors:create",
    "donors:update",
    "posts:view",
    "posts:publish",
    "donations:view",
    "donations:create",
    "inventory:view",
    "requests:view",
    "requests:create",
    "waiting:view",
    "notifications:view",
  ],
  lab: [
    "dashboard:view",
    "donors:view",
    "lab:view",
    "lab:create",
    "lab:update",
    "lab:approve",
    "blacklist:view",
    "blacklist:create",
    "blacklist:delete",
    "waiting:view",
    "units:view",
    "notifications:view",
  ],
  inventory: [
    "dashboard:view",
    "units:view",
    "units:create",
    "units:update",
    "units:delete",
    "units:issue",
    "inventory:view",
    "inventory:manage",
    "requests:view",
    "requests:fulfill",
    "issues:view",
    "issues:create",
    "notifications:view",
  ],
  reports: [
    "dashboard:view",
    "reports:view",
    "reports:export",
    "reports:delete",
    "notifications:view",
    "audit:view",
  ],
};

export function permissionsForUser(role: string, override?: string[] | null): Permission[] {
  if (override && override.length > 0) {
    const assigned = override as Permission[];
    // Setup created System Admin accounts with the complete pre-posts permission
    // list. Preserve that full-access assignment after adding the posts resource.
    const previousAdminDefaults = ALL_PERMISSIONS.filter(
      (permission) => !POST_PERMISSIONS.includes(permission as (typeof POST_PERMISSIONS)[number]),
    );
    if (role === "admin" && assigned.length === previousAdminDefaults.length && previousAdminDefaults.every((permission) => assigned.includes(permission))) {
      return ALL_PERMISSIONS;
    }
    return assigned;
  }
  return ROLE_PERMISSIONS[role] ?? [];
}

export function can(
  permissions: string[] | undefined,
  resource: string,
  action: string,
): boolean {
  if (!permissions) return false;
  return permissions.includes(`${resource}:${action}`);
}

export const resourceLabel = (key: string) =>
  RESOURCES.find((resource) => resource.key === key)?.label ?? key;

export const actionLabel = (action: string): string => {
  const map: Record<string, string> = {
    view: "عرض",
    create: "إضافة",
    update: "تعديل",
    delete: "حذف",
    issue: "صرف",
    manage: "إدارة",
    fulfill: "تنفيذ",
    approve: "اعتماد",
    export: "تصدير",
    reset: "إعادة تعيين",
  };
  return map[action] ?? action;
};
