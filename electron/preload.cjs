// جسر آمن بين الواجهة (Next) وعمليات إلكترون — contextIsolation مفعّل
// يكشف فقط: فحص الإصدار + فحص التحديث + تثبيت التحديث + استماع لأحداثه
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopAPI", {
  isDesktop: true,
  getVersion: () => ipcRenderer.invoke("update:version"),
  checkUpdate: () => ipcRenderer.invoke("update:check"),
  applyUpdate: () => ipcRenderer.invoke("update:apply"),
  onUpdateEvent: (cb) => {
    const listener = (_e, data) => cb(data);
    ipcRenderer.on("update:event", listener);
    return () => ipcRenderer.removeListener("update:event", listener);
  },
});
