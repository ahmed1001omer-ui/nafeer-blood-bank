"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FieldErrors } from "./types";
import { getCachedResource, setCachedResource } from "./offline-storage";

export class ApiRequestError extends Error {
  errors: FieldErrors;
  constructor(message: string, errors: FieldErrors = {}) {
    super(message);
    this.errors = errors;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const isGet = !init?.method || init.method.toUpperCase() === "GET";

  try {
    const response = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      if (response.status >= 500 && typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("app:error", {
            detail: {
              message: (payload.message as string) || "حدث خطأ غير متوقع في الخادم",
              isServerError: true,
            },
          })
        );
      }
      throw new ApiRequestError(
        (payload.message as string) ?? "تعذر تنفيذ العملية",
        (payload.errors as FieldErrors) ?? {},
      );
    }

    // حفظ البيانات في IndexedDB عند النجاح لدعم القراءة دون اتصال
    if (isGet && payload) {
      void setCachedResource(url, payload);
    }

    return payload as T;
  } catch (err) {
    if (err instanceof ApiRequestError) {
      throw err;
    }

    // في حال فشل طلب GET بسبب انقطاع الشبكة: نقرأ البيانات من التخزين المحلي فوراً
    if (isGet) {
      const cached = await getCachedResource<T>(url);
      if (cached) {
        return cached;
      }
    }

    // دعم حفظ المرضى والمتبرعين أوفلاين وإضافتهم لطابور المزامنة التلقائي
    if (!isGet && (url.startsWith("/api/patients") || url.startsWith("/api/donors"))) {
      try {
        const { enqueueSyncOperation } = await import("./sync-queue");
        const entity = url.includes("patients") ? "patients" : "donors";
        const method = init?.method || "POST";
        const bodyObj = init?.body ? (typeof init.body === "string" ? JSON.parse(init.body) : init.body) : {};

        await enqueueSyncOperation({ url, method, body: bodyObj, entity });

        // تحديث الكاش المحلي فوراً ليظهر المريض أو المتبرع في الواجهة أثناء العمل أوفلاين
        const cacheKey = `/api/${entity}`;
        const cachedList = await getCachedResource<Record<string, unknown[]>>(cacheKey);
        if (cachedList && Array.isArray(cachedList[entity])) {
          const newItem = { id: Date.now(), ...bodyObj, offlinePending: true };
          const updated = { ...cachedList, [entity]: [newItem, ...cachedList[entity]] };
          await setCachedResource(cacheKey, updated);
        }

        return { success: true, offline: true, ...bodyObj } as T;
      } catch (queueErr) {
        console.warn("[API] Offline sync queue fallback note:", queueErr);
      }
    }

    // لا نظهر Popup مزعج للمستخدم عند انقطاع الاتصال العادي
    throw err;
  }
}

export const apiGet = <T,>(url: string) => request<T>(url);
export const apiPost = <T,>(url: string, body: unknown) =>
  request<T>(url, { method: "POST", body: JSON.stringify(body) });
export const apiPatch = <T,>(url: string, body: unknown) =>
  request<T>(url, { method: "PATCH", body: JSON.stringify(body) });
export const apiDelete = <T,>(url: string, body?: unknown) =>
  request<T>(url, { method: "DELETE", ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });

export function useResource<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const result = await apiGet<T>(url);
      if (mounted.current) {
        setData(result);
        setError(null);
      }
    } catch (err) {
      if (mounted.current) setError(err instanceof Error ? err.message : "خطأ غير متوقع");
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => {
      mounted.current = false;
    };
  }, [refresh]);

  return { data, loading, error, refresh };
}
