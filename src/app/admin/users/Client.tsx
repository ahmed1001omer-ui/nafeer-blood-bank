"use client";

import { useEffect, useMemo, useState } from "react";
import { apiDelete, apiPatch, apiPost, ApiRequestError, useResource } from "@/lib/api";
import { Badge, Button, Card, EmptyState, Field, Modal, PageHeader, SelectInput, TextInput } from "@/components/ui";
import { ROLES, ROLE_LABELS, RESOURCES, ROLE_PERMISSIONS, actionLabel } from "@/lib/rbac";
import { formatDate } from "@/lib/format";
import { useCan, useSession } from "@/lib/session-context";
import { useLanguage } from "@/lib/i18n-context";

type UserRow = {
  id: number;
  username: string;
  fullName: string;
  role: string;
  permissions: string[] | null;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

export default function UsersClient() {
  const { t, lang } = useLanguage();
  const { data, loading, error, refresh } = useResource<{ users: UserRow[] }>("/api/users");
  const canAccess = useCan();
  const currentUser = useSession();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<UserRow | null>(null);

  // Deletion modal state
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("reception");
  const [password, setPassword] = useState("");
  const [active, setActive] = useState(true);
  const [useCustom, setUseCustom] = useState(false);
  const [perms, setPerms] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const users = useMemo(() => data?.users ?? [], [data]);

  useEffect(() => {
    if (!dialogOpen) return;
    setErrors({});
    if (selected) {
      setUsername(selected.username);
      setFullName(selected.fullName);
      setRole(selected.role);
      setPassword("");
      setActive(selected.active);
      const custom = (selected.permissions ?? []).length > 0;
      setUseCustom(custom);
      setPerms(custom ? selected.permissions ?? [] : ROLE_PERMISSIONS[selected.role] ?? []);
    } else {
      setUsername("");
      setFullName("");
      setRole("reception");
      setPassword("");
      setActive(true);
      setUseCustom(false);
      setPerms(ROLE_PERMISSIONS.reception);
    }
  }, [dialogOpen, selected]);

  useEffect(() => {
    if (!useCustom) setPerms(ROLE_PERMISSIONS[role] ?? []);
  }, [role, useCustom]);

  const togglePerm = (perm: string) => {
    setPerms((prev) => (prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]));
  };

  const handleToggleActive = async (u: UserRow) => {
    setTogglingId(u.id);
    try {
      await apiPatch(`/api/users/${u.id}`, { active: !u.active });
      refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "تعذر تغيير حالة الحساب");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await apiDelete(`/api/users/${deleteTarget.id}`);
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : (lang === "en" ? "Failed to delete user" : "تعذر حذف المستخدم"));
    } finally {
      setDeleting(false);
    }
  };

  const submit = async () => {
    setSaving(true);
    setErrors({});
    const payload: Record<string, unknown> = {
      username,
      fullName,
      role,
      active,
      permissions: useCustom ? perms : [],
    };
    if (password) payload.password = password;
    try {
      if (selected) await apiPatch(`/api/users/${selected.id}`, payload);
      else await apiPost("/api/users", payload);
      refresh();
      setDialogOpen(false);
    } catch (err) {
      if (err instanceof ApiRequestError) setErrors(err.errors);
      else setErrors({ form: lang === "en" ? "Failed to save user" : "تعذر حفظ المستخدم" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-rise">
      <PageHeader
        title={t("usersPermissions")}
        description={lang === "en" ? "Manage user accounts and access permissions" : "إدارة حسابات الدخول وصلاحيات الوصول"}
        action={
          canAccess("users", "create") ? (
            <Button onClick={() => { setSelected(null); setDialogOpen(true); }}>
              {lang === "en" ? "Add User" : "إضافة مستخدم"}
            </Button>
          ) : null
        }
      />

      <Card padding="p-0">
        {loading ? (
          <EmptyState title={t("loading")} />
        ) : error ? (
          <div className="p-6 text-center">
            <EmptyState title={t("errorLoading")} />
            <Button onClick={refresh}>{t("retry")}</Button>
          </div>
        ) : users.length === 0 ? (
          <EmptyState title={lang === "en" ? "No users registered" : "لا يوجد مستخدمون"} />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("usernameLabel")}</th>
                  <th>{t("name")}</th>
                  <th>{lang === "en" ? "Role" : "الدور"}</th>
                  <th>{lang === "en" ? "Permissions" : "الصلاحيات"}</th>
                  <th>{t("status")}</th>
                  <th>{lang === "en" ? "Last Login" : "آخر دخول"}</th>
                  {canAccess("users", "update") || canAccess("users", "delete") ? <th>{t("actions")}</th> : null}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="font-semibold">@{u.username}</td>
                    <td>{u.fullName}</td>
                    <td>{ROLE_LABELS[u.role] ?? u.role}</td>
                    <td>{(u.permissions ?? []).length > 0 ? (lang === "en" ? "Custom" : "مخصّصة") : (lang === "en" ? "Role Default" : "افتراضية للدور")}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Badge tone={u.active ? "success" : "neutral"}>
                          {u.active ? (lang === "en" ? "Active" : "نشط") : (lang === "en" ? "Disabled" : "معطّل")}
                        </Badge>
                        {canAccess("users", "update") && u.id !== currentUser?.id && (
                          <button
                            type="button"
                            disabled={togglingId === u.id}
                            onClick={() => handleToggleActive(u)}
                            className="text-xs text-brand hover:underline font-medium"
                          >
                            {u.active ? (lang === "en" ? "Disable" : "تعطيل") : (lang === "en" ? "Activate" : "تفعيل")}
                          </button>
                        )}
                      </div>
                    </td>
                    <td>{u.lastLoginAt ? formatDate(u.lastLoginAt) : "—"}</td>
                    {canAccess("users", "update") || canAccess("users", "delete") ? (
                      <td>
                        <div className="flex items-center gap-2">
                          {canAccess("users", "update") && (
                            <Button variant="secondary" size="sm" onClick={() => { setSelected(u); setDialogOpen(true); }}>
                              {t("edit")}
                            </Button>
                          )}
                          {canAccess("users", "delete") && (
                            <Button variant="danger" size="sm" onClick={() => setDeleteTarget(u)}>
                              {t("delete")}
                            </Button>
                          )}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add / Edit User Modal */}
      <Modal
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={selected ? (lang === "en" ? "Edit User" : "تعديل مستخدم") : (lang === "en" ? "Add User" : "إضافة مستخدم")}
        description={lang === "en" ? "Account credentials and access permissions" : "بيانات الحساب وصلاحيات الوصول"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>{t("cancel")}</Button>
            <Button onClick={submit} disabled={saving}>{saving ? (lang === "en" ? "Saving..." : "جارٍ الحفظ...") : t("save")}</Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("usernameLabel")} required error={errors.username}>
            <TextInput value={username} onChange={setUsername} invalid={!!errors.username} />
          </Field>
          <Field label={lang === "en" ? "Full Name" : "الاسم الكامل"} required error={errors.fullName}>
            <TextInput value={fullName} onChange={setFullName} invalid={!!errors.fullName} />
          </Field>
          <Field label={lang === "en" ? "System Role" : "الدور بالنظام"}>
            <SelectInput
              value={role}
              onChange={setRole}
              options={ROLES.map((r) => ({ value: r.value, label: ROLE_LABELS[r.value] ?? r.label }))}
            />
          </Field>
          <Field label={t("passwordLabel")} hint={selected ? (lang === "en" ? "Leave blank to keep unchanged" : "اتركه فارغًا للحفاظ على الحالية") : undefined} error={errors.password}>
            <TextInput type="text" value={password} onChange={setPassword} invalid={!!errors.password} />
          </Field>
        </div>

        <div className="mt-4 border-t border-line pt-4 flex items-center justify-between">
          <label className="flex items-center gap-2 text-[14px] font-semibold text-ink cursor-pointer">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-4 w-4 rounded accent-brand"
            />
            {lang === "en" ? "Active Account" : "حساب نشط"}
          </label>

          <label className="flex items-center gap-2 text-[14px] font-semibold text-ink cursor-pointer">
            <input
              type="checkbox"
              checked={useCustom}
              onChange={(e) => setUseCustom(e.target.checked)}
              className="h-4 w-4 rounded accent-brand"
            />
            {lang === "en" ? "Customize user permissions individually" : "تخصيص صلاحيات هذا المستخدم فرديًا"}
          </label>
        </div>

        {useCustom ? (
          <div className="mt-4 space-y-4">
            {RESOURCES.map((res) => (
              <div key={res.key} className="rounded-[12px] bg-[var(--bg-elevated)] p-3">
                <p className="text-[13px] font-bold text-ink mb-2">{res.label}</p>
                <div className="flex flex-wrap gap-3">
                  {res.actions.map((act) => {
                    const code = `${res.key}:${act}`;
                    const checked = perms.includes(code);
                    return (
                      <label key={act} className="flex items-center gap-1.5 text-[12.5px] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePerm(code)}
                          className="h-3.5 w-3.5 rounded accent-brand"
                        />
                        <span>{actionLabel(act)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </Modal>

      {/* Delete User Confirmation Modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setDeleteError(""); }}
        title={lang === "en" ? "Delete User" : "حذف مستخدم"}
        description={lang === "en" ? "This action cannot be undone" : "هذا الإجراء لا يمكن التراجع عنه"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              {t("cancel")}
            </Button>
            <Button variant="danger" onClick={handleDeleteConfirm} disabled={deleting}>
              {deleting ? (lang === "en" ? "Deleting..." : "جاري الحذف...") : t("delete")}
            </Button>
          </>
        }
      >
        <div className="py-2">
          {deleteError && (
            <div className="mb-3 p-3 rounded-lg bg-red-500/10 text-red-600 text-sm">
              {deleteError}
            </div>
          )}
          <p className="text-sm text-ink">
            {lang === "en"
              ? `Are you sure you want to delete user @${deleteTarget?.username} (${deleteTarget?.fullName})?`
              : `هل أنت تأكد من رغبتك في حذف المستخدم @${deleteTarget?.username} (${deleteTarget?.fullName})؟`}
          </p>
        </div>
      </Modal>
    </div>
  );
}
