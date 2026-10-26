"use client";

import { useEffect, useMemo, useState } from "react";
import PostDialog from "@/components/dialogs/PostDialog";
import ProcessResponseDialog from "@/components/dialogs/ProcessResponseDialog";
import { Badge, Button, Card, EmptyState, Modal, PageHeader, SelectInput, TextInput } from "@/components/ui";
import { BLOOD_TYPES, URGENCY_OPTIONS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { apiDelete, apiPatch, apiPost, useResource } from "@/lib/api";
import { useCan } from "@/lib/session-context";
import { useLanguage } from "@/lib/i18n-context";
import type { DonationPost } from "@/lib/types";

const urgencyTone: Record<string, string> = {
  normal: "info",
  urgent: "warning",
  critical: "danger",
};

export type PostResponseItem = {
  id: number;
  postId: number;
  mobileUserId: number;
  donorName: string;
  donorPhone: string;
  bloodType: string;
  status: "queued" | "new" | "reviewed" | "contacted" | "registered" | "donated" | "cancelled";
  isNearby?: string | null;
  isSerious?: boolean | number | null;
  estimatedArrival?: string | null;
  notes?: string | null;
  createdAt: string | number;
  hospital?: string | null;
  postComponent?: string | null;
};

const RESPONSE_STATUS_LABELS: Record<string, { labelAr: string; labelEn: string; tone: "info" | "warning" | "neutral" | "success" | "danger" }> = {
  queued: { labelAr: "في قائمة الانتظار للوصول", labelEn: "Waiting Arrival", tone: "info" },
  new: { labelAr: "جديد", labelEn: "New", tone: "info" },
  reviewed: { labelAr: "تمت المراجعة", labelEn: "Reviewed", tone: "warning" },
  contacted: { labelAr: "تم التواصل", labelEn: "Contacted", tone: "neutral" },
  registered: { labelAr: "تم تسجيل الوصول للمختبر", labelEn: "Sent to Lab", tone: "success" },
  donated: { labelAr: "تم التبرع", labelEn: "Donated", tone: "success" },
  cancelled: { labelAr: "ملغى", labelEn: "Cancelled", tone: "danger" },
};

const RESPONSE_FILTER_OPTIONS = [
  { value: "", label: "جميع الاستجابات" },
  { value: "queued", label: "في قائمة الانتظار" },
  { value: "registered", label: "تم تسجيل الوصول للمختبر" },
  { value: "contacted", label: "تم التواصل" },
  { value: "donated", label: "تم التبرع" },
  { value: "cancelled", label: "ملغى" },
];

export default function PostsPage() {
  const { t, lang } = useLanguage();
  const { data, loading, refresh } = useResource<{ posts: DonationPost[] }>("/api/posts");
  const { data: responsesData, loading: responsesLoading, refresh: refreshResponses } = useResource<{ responses: PostResponseItem[] }>("/api/posts/responses");
  const canAccess = useCan();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [preset, setPreset] = useState<string>("");

  // Filter state for donor responses
  const [respSearch, setRespSearch] = useState("");
  const [respStatusFilter, setRespStatusFilter] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [processTarget, setProcessTarget] = useState<PostResponseItem | null>(null);

  // Poll for new responses every 6 seconds so the dashboard updates automatically
  useEffect(() => {
    const timer = setInterval(() => {
      void refreshResponses();
    }, 6000);
    return () => clearInterval(timer);
  }, [refreshResponses]);

  const urgencyLabel = (value: string) => {
    if (value === "normal") return lang === "en" ? "Normal" : "عادي";
    if (value === "urgent") return lang === "en" ? "Urgent" : "عاجل";
    if (value === "critical") return lang === "en" ? "Critical" : "حرج";
    return URGENCY_OPTIONS.find((item) => item.value === value)?.label ?? value;
  };

  const posts = useMemo(() => data?.posts ?? [], [data]);
  const responses = useMemo(() => responsesData?.responses ?? [], [responsesData]);

  const filteredPosts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return posts.filter((row) => {
      if (bloodType && row.bloodType !== bloodType) return false;
      if (!query) return true;
      return (
        row.hospital.toLowerCase().includes(query) ||
        row.bloodType.toLowerCase().includes(query) ||
        row.component.toLowerCase().includes(query)
      );
    });
  }, [posts, search, bloodType]);

  const filteredResponses = useMemo(() => {
    const query = respSearch.trim().toLowerCase();
    return responses.filter((row) => {
      if (respStatusFilter && row.status !== respStatusFilter) return false;
      if (!query) return true;
      return (
        row.donorName.toLowerCase().includes(query) ||
        row.donorPhone.toLowerCase().includes(query) ||
        row.bloodType.toLowerCase().includes(query) ||
        (row.hospital ?? "").toLowerCase().includes(query)
      );
    });
  }, [responses, respSearch, respStatusFilter]);

  const handleUpdateStatus = async (responseId: number, newStatus: string) => {
    if (updatingId === responseId) return;
    setUpdatingId(responseId);
    setStatusMessage(null);
    try {
      await apiPatch(`/api/posts/responses/${responseId}`, { status: newStatus });
      setStatusMessage(lang === "en" ? "Response status updated successfully" : "تم تحديث حالة الاستجابة بنجاح");
      setTimeout(() => setStatusMessage(null), 3000);
      await refreshResponses();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "تعذر تحديث الحالة";
      alert(msg);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRegisterArrival = async (item: PostResponseItem) => {
    if (updatingId === item.id) return;
    setUpdatingId(item.id);
    setStatusMessage(null);
    try {
      const res = await apiPost<{ success: boolean; message: string; donorCode: string }>(
        `/api/posts/responses/${item.id}/register-donor`,
        {}
      );
      setStatusMessage(res.message || "تم تسجيل وصول المتبرع ونقله لقائمة انتظار فحص المختبر");
      setTimeout(() => setStatusMessage(null), 5000);
      await refreshResponses();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "تعذر تسجيل وصول المتبرع";
      alert(msg);
    } finally {
      setUpdatingId(null);
    }
  };

  const [deleteTarget, setDeleteTarget] = useState<DonationPost | null>(null);
  const [deletingPost, setDeletingPost] = useState(false);

  const handleDeletePostConfirm = async () => {
    if (!deleteTarget) return;
    setDeletingPost(true);
    try {
      await apiDelete(`/api/posts/${deleteTarget.id}`);
      setDeleteTarget(null);
      setStatusMessage(lang === "en" ? "Post deleted successfully" : "تم حذف المنشور وإزالته بنجاح من لوحة الإدارة وتطبيق المتبرعين");
      setTimeout(() => setStatusMessage(null), 4000);
      await refresh();
      await refreshResponses();
    } catch (err) {
      alert(err instanceof Error ? err.message : "تعذر حذف المنشور");
    } finally {
      setDeletingPost(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("createPost")}
        description={
          lang === "en"
            ? "Publish blood requirement announcement to donor application"
            : "نشر احتياج الدم إلى تطبيق المتبرعين، ويُحفظ في بيانات النظام التجريبية"
        }
        action={
          canAccess("posts", "publish") ? (
            <Button
              onClick={() => {
                setPreset(bloodType || "");
                setDialogOpen(true);
              }}
            >
              {t("createPost")}
            </Button>
          ) : null
        }
      />

      {/* Published Posts Table */}
      <Card padding="p-0">
        <div className="flex flex-wrap items-center gap-2 p-4">
          <div className="min-w-[220px] flex-1">
            <TextInput
              value={search}
              onChange={setSearch}
              placeholder={lang === "en" ? "Search hospital, blood type, or component" : "بحث بالمستشفى أو الفصيلة أو المكوّن"}
            />
          </div>
          <div className="w-[170px]">
            <SelectInput
              value={bloodType}
              onChange={setBloodType}
              options={BLOOD_TYPES}
              placeholder={lang === "en" ? "All blood types" : "كل الفصائل"}
            />
          </div>
        </div>

        {loading ? (
          <EmptyState title={t("loading")} />
        ) : posts.length === 0 ? (
          <EmptyState
            title={lang === "en" ? "No posts published" : "لا توجد منشورات"}
            description={lang === "en" ? "Click Create Announcement to publish a new blood requirement" : "اضغط على إنشاء منشور لنشر احتياج دم جديد"}
          />
        ) : filteredPosts.length === 0 ? (
          <EmptyState
            title={t("noData")}
            description={lang === "en" ? "Try changing search or filters" : "جرّب تغيير البحث أو عوامل التصفية"}
          />
        ) : (
          <div className="table-wrap border-t border-[var(--border-line)]">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("bloodType")}</th>
                  <th>{lang === "en" ? "Component" : "المكوّن"}</th>
                  <th>{lang === "en" ? "Units Needed" : "عدد الوحدات"}</th>
                  <th>{lang === "en" ? "Hospital / Org" : "المستشفى / الجهة"}</th>
                  <th>{t("phone")}</th>
                  <th>{lang === "en" ? "Urgency" : "الاستعجال"}</th>
                  <th>{lang === "en" ? "Publish Date" : "تاريخ النشر"}</th>
                  <th>{t("status")}</th>
                  <th>{t("notes")}</th>
                  <th>{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredPosts.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Badge tone="danger">{row.bloodType}</Badge>
                    </td>
                    <td>{row.component}</td>
                    <td className="font-semibold">{row.unitsNeeded}</td>
                    <td>{row.hospital}</td>
                    <td>{row.phone ?? "—"}</td>
                    <td>
                      <Badge tone={urgencyTone[row.urgency] ?? "neutral"}>{urgencyLabel(row.urgency)}</Badge>
                    </td>
                    <td>{formatDate(row.publishDate)}</td>
                    <td>
                      <Badge tone="success">
                        {lang === "en" ? "Published — Sent to Donors App" : "منشور — مرسل لتطبيق المتبرعين"}
                      </Badge>
                    </td>
                    <td>{row.notes ?? "—"}</td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(
                            `*نداء استغاثة عاجل للتبرع بالدم | بنك الدم - نفير*\n\n` +
                            `*الفصيلة المطلوبة:* ${row.bloodType}\n` +
                            `*المستشفى / الجهة:* ${row.hospital}\n` +
                            `*المكوّن والكمية:* ${row.component} (${row.unitsNeeded} وحدة مطلوبة)\n` +
                            `*درجة الاستعجال:* ${row.urgency === "critical" ? "حالة حرجة وطارئة جداً" : "احتياج عاجل"}\n` +
                            (row.phone ? `*للتواصل والتنسيق:* ${row.phone}\n` : "") +
                            `\nقال تعالى: ﴿وَمَنْ أَحْيَاهَا فَكَأَنَّمَا أَحْيَا النَّاسَ جَمِيعًا﴾\n` +
                            `أخي الكريم / أختي الكريمة: إذا كنت قادراً على التبرع أو تعرف من يمكنه ذلك، لا تتردد في الحضور فوراً أو نشر الرسالة في المجموعات.\n\n` +
                            `للاستجابة والتبرع حمّل تطبيق بنك الدم (نفير) مباشرة عبر الرابط:\nhttps://expo.dev/artifacts/eas/eyLve8BXnd5XSOUOTujRPizlc6LZ1YSONNSWx8KEia4.apk`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                          title="مشاركة في مجموعات ومحادثات واتساب"
                        >
                          <span>واتساب</span>
                        </a>
                        {canAccess("posts", "publish") ? (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setDeleteTarget(row)}
                          >
                            {lang === "en" ? "Delete" : "حذف"}
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Donor Responses Section */}
      <div className="mt-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-[var(--foreground)]">
              {lang === "en" ? "Donor Responses to Blood Need Announcements" : "استجابات المتبرعين على احتياجات الدم"}
            </h2>
            <p className="text-xs text-[var(--muted-foreground)]">
              {lang === "en"
                ? "Track mobile app donor responses for published blood requirement posts"
                : "متابعة طلبات المتبرعين المستجيبين لإعلانات واحتياجات بنك الدم القادمة من التطبيق"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void refreshResponses()}
              disabled={responsesLoading}
            >
              ↻ {lang === "en" ? "Refresh Responses" : "تحديث الاستجابات"}
            </Button>
            {statusMessage ? (
              <span className="rounded-lg bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                {statusMessage}
              </span>
            ) : null}
          </div>
        </div>

        <Card padding="p-0">
          <div className="flex flex-wrap items-center gap-2 p-4">
            <div className="min-w-[220px] flex-1">
              <TextInput
                value={respSearch}
                onChange={setRespSearch}
                placeholder={lang === "en" ? "Search donor name, phone, or blood type" : "بحث باسم المتبرع أو الهاتف أو الفصيلة"}
              />
            </div>
            <div className="w-[180px]">
              <SelectInput
                value={respStatusFilter}
                onChange={setRespStatusFilter}
                options={RESPONSE_FILTER_OPTIONS}
                placeholder={lang === "en" ? "All statuses" : "جميع الحالات"}
              />
            </div>
          </div>

          {responsesLoading ? (
            <EmptyState title={t("loading")} />
          ) : responses.length === 0 ? (
            <EmptyState
              title={lang === "en" ? "No donor responses yet" : "لا توجد استجابات من المتبرعين حتى الآن"}
              description={
                lang === "en"
                  ? "When mobile app users click 'I want to donate', their responses will appear here"
                  : "عندما يضغط المتبرعون على زر (أريد التبرع لهذا الاحتياج) في تطبيق الهواتف ستظهر استجاباتهم هنا"
              }
            />
          ) : filteredResponses.length === 0 ? (
            <EmptyState
              title={t("noData")}
              description={lang === "en" ? "Try changing search query or status filter" : "جرّب تغيير البحث أو خيار تصفية الحالات"}
            />
          ) : (
            <div className="table-wrap border-t border-[var(--border-line)]">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{lang === "en" ? "Donor Name" : "اسم المتبرع"}</th>
                    <th>{t("phone")}</th>
                    <th>{t("bloodType")}</th>
                    <th>{lang === "en" ? "Proximity & Seriousness" : "القرب والجدية"}</th>
                    <th>{lang === "en" ? "Hospital / Component" : "المستشفى / المكوّن"}</th>
                    <th>{lang === "en" ? "Response Date" : "تاريخ ووقت الاستجابة"}</th>
                    <th>{t("status")}</th>
                    <th>{lang === "en" ? "Reception & Lab Action" : "إجراء الاستقبال والمختبر"}</th>
                    <th>{lang === "en" ? "Change Status" : "تغيير الحالة"}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResponses.map((row) => {
                    const statusMeta = RESPONSE_STATUS_LABELS[row.status] ?? {
                      labelAr: row.status,
                      labelEn: row.status,
                      tone: "neutral" as const,
                    };
                    const statusLabel = lang === "en" ? statusMeta.labelEn : statusMeta.labelAr;

                    return (
                      <tr key={row.id}>
                        <td className="font-bold text-[var(--foreground)]">{row.donorName}</td>
                        <td className="font-mono text-sm">{row.donorPhone}</td>
                        <td>
                          <Badge tone="danger">{row.bloodType}</Badge>
                        </td>
                        <td>
                          <div className="flex flex-col gap-1">
                            {row.isNearby ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                                {row.isNearby}
                              </span>
                            ) : (
                              <span className="text-xs text-[var(--muted-foreground)]">قريب</span>
                            )}
                            {row.isSerious !== false ? (
                              <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
                                جاد وملتزم بالحضور
                              </span>
                            ) : null}
                            {row.estimatedArrival ? (
                              <span className="text-[10px] text-[var(--muted-foreground)]">
                                الوصول: {row.estimatedArrival}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td>
                          <div className="text-sm font-medium">{row.hospital ?? "—"}</div>
                          {row.postComponent ? (
                            <div className="text-xs text-[var(--muted-foreground)]">{row.postComponent}</div>
                          ) : null}
                        </td>
                        <td className="text-xs text-[var(--muted-foreground)]">
                          {row.createdAt ? (typeof row.createdAt === "number" ? formatDate(new Date(row.createdAt).toISOString()) : formatDate(String(row.createdAt))) : "—"}
                        </td>
                        <td>
                          <Badge tone={statusMeta.tone}>{statusLabel}</Badge>
                        </td>
                        <td>
                          {canAccess("posts", "publish") ? (
                            <div className="flex items-center gap-2">
                              {row.status === "donated" ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                  تم التبرع وحفظ السجل
                                </span>
                              ) : row.status === "cancelled" ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-1 text-xs font-bold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                                  مستبعد / قائمة سوداء
                                </span>
                              ) : row.status === "registered" ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-1 text-xs font-bold text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
                                    مسجل بقائمة فحص المختبر
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => setProcessTarget(row)}
                                  >
                                    فحص الأهلية
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    disabled={updatingId === row.id}
                                    onClick={() => void handleRegisterArrival(row)}
                                    className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-300"
                                  >
                                    {updatingId === row.id ? "..." : "تسجيل وصول للمختبر"}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="primary"
                                    onClick={() => setProcessTarget(row)}
                                  >
                                    فحص مباشر
                                  </Button>
                                </div>
                              )}
                              {row.status === "donated" || row.status === "cancelled" ? (
                                <button
                                  type="button"
                                  onClick={() => setProcessTarget(row)}
                                  className="text-[11px] text-[var(--muted-foreground)] underline hover:text-[var(--foreground)]"
                                >
                                  تعديل الفحص
                                </button>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-xs text-[var(--muted-foreground)]">—</span>
                          )}
                        </td>
                        <td>
                          {canAccess("posts", "publish") ? (
                            <select
                              value={row.status}
                              disabled={updatingId === row.id}
                              onChange={(e) => void handleUpdateStatus(row.id, e.target.value)}
                              className="rounded-lg border border-[var(--border-line)] bg-[var(--card-bg)] px-2 py-1 text-xs font-medium text-[var(--foreground)] transition-colors focus:border-[var(--primary)] focus:outline-none"
                            >
                              <option value="queued">في قائمة الانتظار</option>
                              <option value="registered">تم تسجيل الوصول للمختبر</option>
                              <option value="contacted">تم التواصل</option>
                              <option value="reviewed">تمت المراجعة</option>
                              <option value="donated">تم التبرع</option>
                              <option value="cancelled">ملغى</option>
                            </select>
                          ) : (
                            <span className="text-xs text-[var(--muted-foreground)]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <PostDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={refresh}
        presetBloodType={preset}
      />

      <ProcessResponseDialog
        open={!!processTarget}
        response={processTarget}
        onClose={() => setProcessTarget(null)}
        onSaved={(msg) => {
          setStatusMessage(msg);
          void refreshResponses();
        }}
      />

      {/* Delete Post Confirmation Modal */}
      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={lang === "en" ? "Delete Blood Request Post" : "حذف إعلان منشور احتياج الدم"}
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--foreground)]">
            {lang === "en"
              ? `Are you sure you want to delete this post for blood type (${deleteTarget?.bloodType})? It will be completely removed from this dashboard and from the donors mobile app.`
              : `هل أنت متأكد من حذف منشور احتياج الفصيلة (${deleteTarget?.bloodType}) لـ (${deleteTarget?.hospital})؟`}
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">
            {lang === "en"
              ? "This post will disappear immediately from all mobile apps without requiring users to logout."
              : "سيختفي هذا المنشور فوراً وتلقائياً من جميع هواتف المتبرعين وتطبيق نفير دون الحاجة لتسجيل الخروج."}
          </p>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-line)]">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deletingPost}>
              {t("cancel")}
            </Button>
            <Button variant="danger" onClick={handleDeletePostConfirm} disabled={deletingPost}>
              {deletingPost ? "..." : (lang === "en" ? "Confirm Delete" : "تأكيد الحذف النهائي")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
