const { app, BrowserWindow, shell, ipcMain, Notification, session } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");
const { spawn } = require("child_process");

// منع تشغيل أكثر من نسخة واحدة من البرنامج في نفس الوقت
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

let mainWindow = null;
let localServerProcess = null;

// الرابط الإنتاجي المركزي المباشر على Railway (أو الرابط المحلي أثناء التطوير)
const DEFAULT_URL = process.env.NAFEER_APP_URL || "https://nafeer-web-production.up.railway.app";
const OFFLINE_HTML_PATH = path.join(__dirname, "offline.html");

function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/api/health`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(600, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function startLocalServer() {
  const rootDir = path.join(__dirname, "..");
  const nextBin = path.join(rootDir, "node_modules", "next", "dist", "bin", "next");
  if (fs.existsSync(nextBin)) {
    console.log("[Electron] Starting local Next.js server in background...");
    try {
      localServerProcess = spawn("node", [nextBin, "start", "-H", "0.0.0.0", "-p", "3000"], {
        cwd: rootDir,
        env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
        detached: false,
        stdio: "ignore",
      });
    } catch (err) {
      console.warn("[Electron] Could not start local server:", err);
    }
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 820,
    minWidth: 1024,
    minHeight: 700,
    title: "نظام إدارة بنك الدم المركزي — نفير",
    icon: path.join(__dirname, "../public/nafeer-v2.ico"),
    autoHideMenuBar: true,
    show: false,
    backgroundColor: "#0B0F19",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, "preload.cjs"),
      devTools: !app.isPackaged,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // فتح الروابط الخارجية (مثل خرائط جوجل والواتساب) في متصفح النظام الافتراضي
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http:") || url.startsWith("https:") || url.startsWith("mailto:") || url.startsWith("tel:")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  // معالجة فشل الاتصال بالشبكة عند فتح التطبيق أوفلاين لمنع الشاشة السوداء نهائياً
  mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
    // كود -3 يمثل الإلغاء الطبيعي ولا يعتبر خطأ
    if (errorCode !== -3 && validatedURL.startsWith("http")) {
      console.warn(`[Electron] Failed to load ${validatedURL} (${errorCode}: ${errorDescription}), loading offline shell...`);
      mainWindow.loadFile(OFFLINE_HTML_PATH).catch((err) => {
        console.error("[Electron] Failed to load offline.html:", err);
      });
    }
  });

  // أولوية التحميل: فحص وتشغيل الخادم المحلي المحدث لضمان كل الميزات والأوفلاين، وإلا السيرفر السحابي
  (async () => {
    let targetUrl = DEFAULT_URL;
    if (process.env.NAFEER_APP_URL) {
      targetUrl = process.env.NAFEER_APP_URL;
    } else {
      let isLocalRunning = await checkPort(3000);
      if (!isLocalRunning) {
        startLocalServer();
        for (let i = 0; i < 20; i++) {
          await new Promise((r) => setTimeout(r, 200));
          isLocalRunning = await checkPort(3000);
          if (isLocalRunning) break;
        }
      }
      if (isLocalRunning) {
        targetUrl = "http://127.0.0.1:3000";
        console.log("[Electron] Active local server connected successfully:", targetUrl);
      }
    }
    mainWindow.loadURL(targetUrl).catch((err) => {
      console.warn("[Electron] Initial load network error, loading offline shell:", err);
      mainWindow.loadFile(OFFLINE_HTML_PATH);
    });
  })();

  // إغلاق الجلسة أمنياً عند إغلاق النافذة لفرض تسجيل الدخول عند إعادة فتح البرنامج
  mainWindow.on("close", async () => {
    try {
      const ses = session.defaultSession;
      await ses.clearStorageData({ storages: ["cookies"] });
      console.log("[Electron] Session cookies wiped on window close for security.");
    } catch (err) {
      console.warn("[Electron] Cookie cleanup note:", err);
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// مسح ملفات تعريف الارتباط وإنهاء الخادم المحلي عند الخروج التام من التطبيق
app.on("before-quit", async () => {
  if (localServerProcess) {
    try {
      localServerProcess.kill();
    } catch {}
  }
  try {
    const ses = session.defaultSession;
    await ses.clearStorageData({ storages: ["cookies"] });
  } catch {}
});

// استقبال إشعارات النظام
ipcMain.on("app:notify", (event, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({
      title: title || "نظام نفير",
      body: body || "",
      icon: path.join(__dirname, "../public/app-icon.png"),
    }).show();
  }
});

// إعادة المحاولة عند شاشة الأوفلاين
ipcMain.on("app:retry-server", () => {
  if (mainWindow) {
    mainWindow.loadURL(DEFAULT_URL).catch(() => {
      mainWindow.loadFile(OFFLINE_HTML_PATH);
    });
  }
});

// الانتقال إلى السيرفر المحلي في حال كان متاحاً
ipcMain.on("app:load-local", () => {
  if (mainWindow) {
    mainWindow.loadURL("http://127.0.0.1:3000").catch(() => {
      mainWindow.loadFile(OFFLINE_HTML_PATH);
    });
  }
});
