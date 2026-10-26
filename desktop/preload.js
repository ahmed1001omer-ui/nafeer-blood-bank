const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopApp", {
  isDesktop: true,
  platform: process.platform,
  version: "2.1.0",
  printPage: () => ipcRenderer.send("desktop:print"),
  toggleFullscreen: () => ipcRenderer.send("desktop:fullscreen"),
  reloadApp: () => ipcRenderer.send("desktop:reload"),
});
