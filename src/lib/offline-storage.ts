// محرك التخزين المحلي الآمن باستخدام IndexedDB لدعم وضع العمل دون اتصال (Offline Mode) وطابور المزامنة
const DB_NAME = "NafeerOfflineDB";
const DB_VERSION = 2;
export const STORE_CACHE = "api_cache";
export const STORE_QUEUE = "sync_queue";

export interface SyncQueueItem {
  id: string;
  url: string;
  method: string;
  body: unknown;
  entity: string;
  createdAt: number;
  retryCount: number;
}

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB is not supported"));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_CACHE)) {
        db.createObjectStore(STORE_CACHE, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * حفظ استجابة API في التخزين المحلي لاستخدامها عند انقطاع الإنترنت
 */
export async function setCachedResource(key: string, data: unknown): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CACHE, "readwrite");
      const store = tx.objectStore(STORE_CACHE);
      store.put({
        key,
        data,
        updatedAt: Date.now(),
      });
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
    console.warn("[OfflineDB] Failed to cache:", key, err);
  }
}

/**
 * قراءة البيانات المخزنة محلياً عند عدم توفر اتصال بالشبكة
 */
export async function getCachedResource<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_CACHE, "readonly");
      const store = tx.objectStore(STORE_CACHE);
      const req = store.get(key);

      req.onsuccess = () => {
        db.close();
        if (req.result && req.result.data) {
          resolve(req.result.data as T);
        } else {
          resolve(null);
        }
      };

      req.onerror = () => {
        db.close();
        resolve(null);
      };
    });
  } catch {
    return null;
  }
}

/**
 * مسح البيانات الحساسة المخزنة محلياً عند تسجيل الخروج (Logout)
 * يشمل تفريغ IndexedDB ومسح كاش المتصفح الحساس لضمان عدم بقاء أي سجلات بعد خروج الموظف
 */
export async function clearSensitiveCache(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction([STORE_CACHE, STORE_QUEUE], "readwrite");
      tx.objectStore(STORE_CACHE).clear();
      tx.objectStore(STORE_QUEUE).clear();
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    });

    if (typeof window !== "undefined" && "caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch (err) {
    console.warn("[OfflineDB] Cache cleanup note:", err);
  }
}
