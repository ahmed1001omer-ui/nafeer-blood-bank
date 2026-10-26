"use client";

import { openDB, STORE_QUEUE, type SyncQueueItem } from "./offline-storage";

/**
 * إضافة عملية محلية إلى طابور المزامنة عند انقطاع الإنترنت (مثل تسجيل مريض أو متبرع)
 */
export async function enqueueSyncOperation(op: {
  url: string;
  method: string;
  body: unknown;
  entity: string;
}): Promise<string> {
  const item: SyncQueueItem = {
    id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    url: op.url,
    method: op.method,
    body: op.body,
    entity: op.entity,
    createdAt: Date.now(),
    retryCount: 0,
  };

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_QUEUE, "readwrite");
      const store = tx.objectStore(STORE_QUEUE);
      store.put(item);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
    console.log(`[SyncQueue] Enqueued offline ${op.entity} operation:`, item.id);
  } catch (err) {
    console.warn("[SyncQueue] Failed to enqueue operation:", err);
  }

  return item.id;
}

/**
 * جلب جميع العمليات المنتظرة في طابور المزامنة
 */
export async function getPendingSyncOperations(): Promise<SyncQueueItem[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_QUEUE, "readonly");
      const store = tx.objectStore(STORE_QUEUE);
      const req = store.getAll();

      req.onsuccess = () => {
        db.close();
        resolve((req.result as SyncQueueItem[]) || []);
      };

      req.onerror = () => {
        db.close();
        resolve([]);
      };
    });
  } catch {
    return [];
  }
}

/**
 * إزالة عنصر من طابور المزامنة بعد نجاح رفعه إلى الخادم
 */
export async function removeSyncOperation(id: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_QUEUE, "readwrite");
      const store = tx.objectStore(STORE_QUEUE);
      store.delete(id);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch (err) {
    console.warn("[SyncQueue] Failed to remove synced item:", id, err);
  }
}

let isSyncing = false;

/**
 * معالجة ومزامنة طابور العمليات تلقائياً فور عودة الاتصال بالإنترنت
 */
export async function processSyncQueue(): Promise<{ synced: number; failed: number }> {
  if (isSyncing) return { synced: 0, failed: 0 };
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  isSyncing = true;
  let synced = 0;
  let failed = 0;

  try {
    const queue = await getPendingSyncOperations();
    if (queue.length === 0) {
      isSyncing = false;
      return { synced: 0, failed: 0 };
    }

    console.log(`[SyncQueue] Processing ${queue.length} pending offline operations...`);

    for (const item of queue) {
      try {
        const res = await fetch(item.url, {
          method: item.method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.body),
        });

        if (res.ok) {
          await removeSyncOperation(item.id);
          synced++;
          console.log(`[SyncQueue] Successfully synced item: ${item.id} (${item.entity})`);
        } else if (res.status >= 400 && res.status < 500) {
          // خطأ تحقق في البيانات لا يفيد معه إعادة المحاولة
          console.warn(`[SyncQueue] Client error ${res.status} for item ${item.id}, dropping`);
          await removeSyncOperation(item.id);
          failed++;
        } else {
          failed++;
          break; // خطأ خادم أو شبكة، توقف مؤقتاً للمحاولة لاحقاً
        }
      } catch (err) {
        failed++;
        console.warn(`[SyncQueue] Network error while syncing item ${item.id}:`, err);
        break;
      }
    }

    if (synced > 0) {
      window.dispatchEvent(new CustomEvent("app:sync-complete", { detail: { synced } }));
    }
  } finally {
    isSyncing = false;
  }

  return { synced, failed };
}

// الاستماع لعودة الإنترنت وتشغيل المزامنة التلقائية فوراً
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    console.log("[SyncQueue] Internet restored, initiating auto-sync...");
    void processSyncQueue();
  });

  // فحص دوري خفيف كل دقيقة
  setInterval(() => {
    if (typeof navigator !== "undefined" && navigator.onLine) {
      void processSyncQueue();
    }
  }, 60000);
}
