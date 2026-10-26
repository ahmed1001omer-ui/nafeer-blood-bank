const { app, BrowserWindow, Menu, ipcMain } = require("electron");
const path = require("path");

let mainWindow = null;

const PRODUCTION_URL = "https://nafeer-web-production.up.railway.app";
const LOCAL_URL = "http://localhost:3000";

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    title: "نظام إدارة بنك الدم المركزي - نفير",
    icon: path.join(__dirname, "../public/nafeer-v2.ico"),
    backgroundColor: "#0B0F19",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  const appUrl = process.env.ELECTRON_START_URL || LOCAL_URL;

  mainWindow.loadURL(appUrl).catch(() => {
    // Fallback to production cloud if local is not running
    mainWindow.loadURL(PRODUCTION_URL).catch(() => {
      mainWindow.loadFile(path.join(__dirname, "offline.html"));
    });
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  buildApplicationMenu();
}

function buildApplicationMenu() {
  const template = [
    {
      label: "ملف (File)",
      submenu: [
        {
          label: "طباعة التقرير (Print)",
          accelerator: "CmdOrCtrl+P",
          click: () => mainWindow && mainWindow.webContents.print(),
        },
        { type: "separator" },
        {
          label: "إغلاق التطبيق (Exit)",
          accelerator: "CmdOrCtrl+Q",
          click: () => app.quit(),
        },
      ],
    },
    {
      label: "عرض (View)",
      submenu: [
        {
          label: "تحديث الشاشة (Reload)",
          accelerator: "CmdOrCtrl+R",
          click: () => mainWindow && mainWindow.reload(),
        },
        {
          label: "ملء الشاشة (Fullscreen)",
          accelerator: "F11",
          click: () => {
            if (mainWindow) {
              mainWindow.setFullScreen(!mainWindow.isFullScreen());
            }
          },
        },
        { type: "separator" },
        {
          label: "تكبير (Zoom In)",
          accelerator: "CmdOrCtrl+Plus",
          role: "zoomIn",
        },
        {
          label: "تصغير (Zoom Out)",
          accelerator: "CmdOrCtrl+-",
          role: "zoomOut",
        },
        {
          label: "الحجم الطبيعي (Reset Zoom)",
          accelerator: "CmdOrCtrl+0",
          role: "resetZoom",
        },
      ],
    },
    {
      label: "مساعدة (Help)",
      submenu: [
        {
          label: "عن نظام نفير لإدارة بنك الدم",
          click: () => {
            const { dialog } = require("electron");
            dialog.showMessageBox(mainWindow, {
              type: "info",
              title: "عن النظام",
              message: "نظام إدارة بنك الدم المركزي والمستشفى (نفير)",
              detail: "إصدار تطبيق الديسكتوب: 2.1.0\nمخصص للاستقبال، المختبر، بنك الدم، وإدارة المخزون.",
              buttons: ["حسناً"],
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC Handlers for desktop integration
ipcMain.on("desktop:print", () => {
  if (mainWindow) mainWindow.webContents.print();
});

ipcMain.on("desktop:fullscreen", () => {
  if (mainWindow) mainWindow.setFullScreen(!mainWindow.isFullScreen());
});

ipcMain.on("desktop:reload", () => {
  if (mainWindow) mainWindow.reload();
});

app.whenReady().then(createMainWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});
