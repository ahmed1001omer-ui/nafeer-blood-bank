// Service Worker لنظام إدارة بنك الدم المركزي - نفير
// يدعم التخزين المخبئي الذكي للملفات الثابتة مع استراتيجية Network First للبيانات لمنع تجميد النسخ القديمة
const CACHE_VERSION = "nafeer-cache-v1.0.1";

const STATIC_ASSETS = [
  "/",
  "/login",
  "/favicon.ico",
  "/icon.svg",
  "/manifest.json",
  "/app-icon.png",
  "/nafeer-v2.ico"
];

// التثبيت والتخزين الأولي
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("[SW] Cache preload warning:", err);
      });
    })
  );
});

// التفعيل ومسح الكاش القديم فوراً (Cache Invalidation)
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_VERSION) {
            console.log("[SW] Removing outdated cache:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// معالجة الطلبات
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // استبعاد طلبات الـ POST والـ API غير الـ GET واستبعاد مسارات المصادقة الحساسة نهائياً من الكاش
  if (request.method !== "GET" || url.pathname.startsWith("/api/auth/")) {
    return;
  }

  // استراتيجية Network-First للبيانات والـ API وصفحات HTML
  if (url.pathname.startsWith("/api/") || request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          // عند انقطاع الإنترنت: الرجوع للكاش إذا كان متوفراً
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // إذا كانت صفحة ملاحة: ارجع لصفحة البداية المخزنة
          if (request.mode === "navigate") {
            return caches.match("/") || caches.match("/login");
          }
          return new Response(JSON.stringify({ offline: true }), {
            status: 503,
            headers: { "Content-Type": "application/json" }
          });
        })
    );
    return;
  }

  // استراتيجية Cache-First للملفات الثابتة (CSS, JS, Fonts, Images)
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|ico|woff|woff2|ttf|json)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // جلب النسخة المحدثة في الخلفية بهدوء (Stale-While-Revalidate)
          fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_VERSION).then((cache) => cache.put(request, networkResponse));
            }
          }).catch(() => {});
          return cachedResponse;
        }

        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // أي طلبات أخرى: تمرير عادي للشبكة
  event.respondWith(fetch(request));
});
