const { contextBridge, ipcRenderer } = require("electron");

// جسر اتصال آمن مع الواجهة مع عزل الصلاحيات (Context Isolation)
contextBridge.exposeInMainWorld("electronAPI", {
  isDesktop: true,
  appVersion: "1.0.1",
  platform: process.platform,
  // إمكانية إرسال إشعارات النظام
  sendNotification: (title, body) => {
    ipcRenderer.send("app:notify", { title, body });
  },
  // إعادة المحاولة عند شاشة الأوفلاين
  retryServer: () => {
    ipcRenderer.send("app:retry-server");
  },
  loadLocalServer: () => {
    ipcRenderer.send("app:load-local");
  },
});
