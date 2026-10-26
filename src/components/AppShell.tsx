"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { useCan, useSession } from "@/lib/session-context";
import { ROLE_LABELS } from "@/lib/rbac";
import { SYSTEM_NAME } from "@/lib/constants";
import SectionBackground from "@/components/SectionBackground";
import ThemeToggle from "@/components/ThemeToggle";
import LangToggle from "@/components/LangToggle";
import ConnectivityBadge from "@/components/ConnectivityBadge";
import { useLanguage } from "@/lib/i18n-context";

type NavItem = { labelKey: keyof typeof import("@/lib/translations").translations.ar; href: string; resource: string; action?: string };
type NavGroup = { titleKey: keyof typeof import("@/lib/translations").translations.ar; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    titleKey: "dashboard",
    items: [
      { labelKey: "dashboard", href: "/dashboard", resource: "dashboard" },
      { labelKey: "employees", href: "/employees", resource: "employees" },
    ],
  },
  {
    titleKey: "receptionRole",
    items: [
      { labelKey: "patients", href: "/reception/patients", resource: "patients" },
      { labelKey: "donors", href: "/reception/donors", resource: "donors" },
      { labelKey: "inventory", href: "/reception/inventory", resource: "inventory" },
      { labelKey: "createPost", href: "/reception/posts", resource: "posts" },
    ],
  },
  {
    titleKey: "donations",
    items: [{ labelKey: "donations", href: "/donations", resource: "donations" }],
  },
  {
    titleKey: "labRole",
    items: [
      { labelKey: "labOverview", href: "/lab", resource: "lab" },
      { labelKey: "waitingLab", href: "/lab/waiting", resource: "lab" },
      { labelKey: "blacklist", href: "/lab/blacklist?tab=final", resource: "blacklist" },
    ],
  },
  {
    titleKey: "inventoryRole",
    items: [
      { labelKey: "units", href: "/inventory/units", resource: "units" },
      { labelKey: "issues", href: "/inventory/issues", resource: "issues" },
    ],
  },
  {
    titleKey: "reports",
    items: [
      { labelKey: "reports", href: "/reports", resource: "reports" },
      { labelKey: "notifications", href: "/notifications", resource: "notifications" },
    ],
  },
  {
    titleKey: "settings",
    items: [
      { labelKey: "usersPermissions", href: "/admin/users", resource: "users" },
      { labelKey: "auditLogs", href: "/admin/audit", resource: "audit" },
      { labelKey: "settings", href: "/settings", resource: "settings" },
    ],
  },
];

type SearchHit = { type: string; label: string; meta: string; href: string };

function GlobalSearch() {
  const router = useRouter();
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) return;
    const timer = setTimeout(async () => {
      try {
        const result = await apiGet<{ results: SearchHit[] }>(
          `/api/search?q=${encodeURIComponent(query.trim())}`,
        );
        setHits(result.results);
        setOpen(true);
      } catch {
        setHits([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (wrapper.current && !wrapper.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative w-full max-w-[380px]" ref={wrapper}>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t("searchPlaceholder")}
        className="field-input h-10 rounded-[12px] text-[13.5px]"
      />
      {open && query.trim().length >= 2 ? (
        <div className="surface absolute z-40 mt-2 w-full overflow-hidden p-2 shadow-[0_12px_40px_rgba(16,24,40,0.14)] animate-pop">
          {hits.length === 0 ? (
            <p className="px-3 py-3 text-[13px] text-[var(--text-muted)]">لا توجد بيانات مطابقة</p>
          ) : (
            <ul>
              {hits.map((hit) => (
                <li key={`${hit.type}-${hit.label}-${hit.meta}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      setQuery("");
                      router.push(hit.href);
                    }}
                    className="w-full rounded-[10px] px-3 py-2 text-start transition-colors hover:bg-[var(--bg-elevated)]"
                  >
                    <span className="block text-[13px] font-semibold text-[var(--text-ink)]">{hit.label}</span>
                    <span className="block text-[12px] text-[var(--text-muted)]">
                      {hit.type} — {hit.meta}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

function NotificationsBell() {
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<{ title: string; description: string; titleEn?: string; descriptionEn?: string; href: string; severity: string }[]>([]);
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { t, lang } = useLanguage();

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const data = await apiGet<{ count: number; items: typeof items }>("/api/notifications");
        if (alive) {
          setCount(data.count);
          setItems(data.items);
        }
      } catch {
        /* ignore */
      }
    };
    void load();
    const timer = setInterval(load, 60000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (wrapper.current && !wrapper.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const severityColor: Record<string, string> = {
    critical: "bg-critical",
    warning: "bg-warning",
    info: "bg-info",
  };

  return (
    <div className="relative" ref={wrapper}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative grid h-10 w-10 place-items-center rounded-[12px] border border-[var(--border-line)] bg-[var(--bg-card)] transition-colors hover:bg-[var(--bg-elevated)]"
        aria-label={t("notifications")}
      >
        <svg className="w-5 h-5 text-ink" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
        {count > 0 ? (
          <span className="absolute -top-1 -left-1 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--color-brand)] px-1 text-[10px] font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="surface absolute ltr:right-0 rtl:left-0 z-40 mt-2 w-[320px] overflow-hidden shadow-[0_12px_40px_rgba(16,24,40,0.14)] animate-pop">
          <div className="flex items-center justify-between border-b border-[var(--border-line)] px-4 py-3">
            <span className="text-[13.5px] font-bold text-[var(--text-ink)]">{t("notifications")}</span>
            <span className="badge badge-danger">{count}</span>
          </div>
          <div className="scroll-area max-h-[320px] overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-center text-[13px] text-[var(--text-muted)]">
                {lang === "en" ? "No active notifications" : "لا توجد تنبيهات حالياً"}
              </p>
            ) : (
              items.map((item, index) => {
                const displayTitle = lang === "en" && item.titleEn ? item.titleEn : item.title;
                const displayDesc = lang === "en" && item.descriptionEn ? item.descriptionEn : item.description;
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      router.push(item.href);
                    }}
                    className="flex w-full items-start gap-3 border-b border-[var(--border-line)] px-4 py-3 text-start transition-colors last:border-0 hover:bg-[var(--bg-elevated)]"
                  >
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${severityColor[item.severity] ?? "bg-info"}`} />
                    <span>
                      <span className="block text-[13px] font-semibold text-[var(--text-ink)]">{displayTitle}</span>
                      <span className="block text-[12px] text-[var(--text-muted)]">{displayDesc}</span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-[var(--border-line)] px-4 py-2.5 text-center text-[12.5px] font-semibold text-[var(--color-brand)] hover:bg-[var(--bg-elevated)]"
          >
            {t("notifications")}
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function UserMenu() {
  const user = useSession();
  const router = useRouter();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (wrapper.current && !wrapper.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const logout = async () => {
    try {
      await apiPost("/api/auth/logout", {});
    } catch {
      // الاستمرار في مسح الجلسة محلياً حتى لو انقطع الاتصال
    }
    const { clearSensitiveCache } = await import("@/lib/offline-storage");
    await clearSensitiveCache();
    router.push("/login");
    router.refresh();
  };

  if (!user) return null;
  const initials = user.fullName.trim().charAt(0);

  return (
    <div className="relative" ref={wrapper}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-[12px] border border-[var(--border-line)] bg-[var(--bg-card)] py-1.5 px-2.5 transition-colors hover:bg-[var(--bg-elevated)]"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--color-brand)] text-[13px] font-bold text-white">
          {initials}
        </span>
        <span className="hidden text-start sm:block">
          <span className="block text-[12.5px] font-semibold leading-4 text-[var(--text-ink)]">{user.fullName}</span>
          <span className="block text-[11px] text-[var(--text-muted)]">{ROLE_LABELS[user.role] ?? user.role}</span>
        </span>
      </button>
      {open ? (
        <div className="surface absolute ltr:right-0 rtl:left-0 z-40 mt-2 w-[220px] overflow-hidden p-2 shadow-[0_12px_40px_rgba(16,24,40,0.14)] animate-pop">
          <div className="px-3 py-2">
            <p className="text-[13px] font-bold text-[var(--text-ink)]">{user.fullName}</p>
            <p className="text-[12px] text-[var(--text-muted)]">@{user.username} — {ROLE_LABELS[user.role] ?? user.role}</p>
          </div>
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="block rounded-[10px] px-3 py-2 text-[13px] text-[var(--text-ink)] transition-colors hover:bg-[var(--bg-elevated)]"
          >
            {t("settings")}
          </Link>
          <button
            type="button"
            onClick={logout}
            className="block w-full rounded-[10px] px-3 py-2 text-start text-[13px] font-medium text-[#D32F2F] dark:text-[#EF5350] transition-colors hover:bg-[var(--color-brand-soft)]"
          >
            {t("logout")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function AppShell({
  children,
  bank,
}: {
  children: React.ReactNode;
  bank?: { name: string; hospitalName: string; city?: string; address?: string; phone?: string };
}) {
  const pathname = usePathname();
  const canAccess = useCan();
  const user = useSession();
  const { t } = useLanguage();
  const [openMobile, setOpenMobile] = useState(false);

  const isActive = (href: string) => pathname === href.split("?")[0];

  const groups = NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => canAccess(item.resource, item.action ?? "view")),
  })).filter((group) => group.items.length > 0);

  const sidebar = (
    <aside className="flex h-full w-[252px] flex-col bg-[var(--color-sidebar-deep)] px-3 py-5">
      <div className="mb-6 flex items-center gap-3 px-2">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 text-[17px] font-bold text-white shadow-sm">
          🩸
        </div>
        <div>
          <p className="font-heading text-[14px] font-bold leading-4 text-white">{bank?.name || SYSTEM_NAME}</p>
          <p className="text-[11px] text-white/60">{bank?.hospitalName || t("hospitalName")}</p>
        </div>
      </div>

      <nav className="scroll-area flex-1 space-y-5 overflow-y-auto">
        {groups.map((group) => (
          <div key={group.titleKey}>
            <p className="nav-section-title">{t(group.titleKey)}</p>
            <div className="space-y-1">
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpenMobile(false)}
                  className={`nav-link ${isActive(item.href) ? "nav-link-active" : ""}`}
                >
                  {t(item.labelKey)}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {user ? (
        <div className="mt-4 flex items-center gap-2.5 rounded-[12px] bg-white/8 px-3 py-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-white/15 text-[13px] font-bold text-white">
            {user.fullName.charAt(0)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[12.5px] font-semibold text-white">{user.fullName}</p>
            <p className="text-[11px] text-white/55">{ROLE_LABELS[user.role] ?? user.role}</p>
          </div>
        </div>
      ) : null}
    </aside>
  );

  return (
    <div className="flex min-h-screen bg-[var(--bg-page)]">
      <div className="hidden shrink-0 lg:block">{sidebar}</div>

      {openMobile ? (
        <div className="fixed inset-0 z-50 flex lg:hidden animate-fade">
          <div className="h-full animate-rise">{sidebar}</div>
          <button
            type="button"
            aria-label="إغلاق القائمة"
            className="h-full flex-1 bg-[#111827]/50"
            onClick={() => setOpenMobile(false)}
          />
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 bg-[var(--bg-card)] px-5 py-3 border-b border-[var(--border-line)]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setOpenMobile(true)}
                className="btn btn-secondary btn-sm lg:hidden"
              >
                القائمة
              </button>
              <div className="hidden sm:flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <span className="font-semibold text-[var(--text-ink)]">{bank?.hospitalName || t("hospitalName")}</span>
                {bank?.city ? (
                  <span className="rounded-md bg-[var(--bg-elevated)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-muted)]">
                    {bank.city}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <ConnectivityBadge showDetails className="hidden sm:inline-flex" />
              <div className="hidden md:block">
                <GlobalSearch />
              </div>
              <LangToggle />
              <ThemeToggle />
              <NotificationsBell />
              <UserMenu />
            </div>
          </div>
        </header>

        <div className="relative flex flex-1 flex-col">
          <SectionBackground />
          <main className="relative z-10 flex-1 px-5 py-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
