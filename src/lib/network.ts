import * as dns from "node:dns";
import * as net from "node:net";

let cachedStatus: { online: boolean; timestamp: number } | null = null;
const CACHE_TTL_MS = 4000; // 4 seconds cache

export async function isInternetAvailable(timeoutMs = 2500): Promise<boolean> {
  const now = Date.now();
  if (cachedStatus && now - cachedStatus.timestamp < CACHE_TTL_MS) {
    return cachedStatus.online;
  }

  // فحص موثوق ومزدوج: إمكانية الوصول للخادم السحابي الفعلي أو موفري الـ DNS المعتمدين
  const hostsToTest = [
    "nafeer-web-production.up.railway.app",
    "one.one.one.one",
    "google.com",
  ];

  const result = await new Promise<boolean>((resolve) => {
    let resolved = false;
    let pending = hostsToTest.length;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(false);
      }
    }, timeoutMs);

    for (const host of hostsToTest) {
      dns.lookup(host, (err) => {
        if (resolved) return;
        if (!err) {
          resolved = true;
          clearTimeout(timer);
          return resolve(true);
        }
        pending--;
        if (pending <= 0) {
          // محاولة أخيرة عبر socket مباشر لمنفذ 53
          const socket = new net.Socket();
          socket.setTimeout(Math.min(timeoutMs, 800));
          socket.on("connect", () => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timer);
              socket.destroy();
              resolve(true);
            }
          });
          socket.on("timeout", () => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timer);
              socket.destroy();
              resolve(false);
            }
          });
          socket.on("error", () => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timer);
              socket.destroy();
              resolve(false);
            }
          });
          try {
            socket.connect(53, "1.1.1.1");
          } catch {
            if (!resolved) {
              resolved = true;
              clearTimeout(timer);
              resolve(false);
            }
          }
        }
      });
    }
  });

  cachedStatus = { online: result, timestamp: now };
  return result;
}
