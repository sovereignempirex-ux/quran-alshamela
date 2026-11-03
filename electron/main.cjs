// ============================================================
// Electron main — يخدم نسخة التصدير الثابت (out/) بخادم محلي
// صغير ثم يفتح نافذة التطبيق. يعمل 100% محلياً دون سيرفر خارجي،
// والبيانات تُجلب من إنترنت المستخدم مباشرة (نفس التطبيق الويب).
// ============================================================
const { app, BrowserWindow, Menu, shell } = require("electron");
const http = require("http");
const fs = require("fs");
const path = require("path");

const OUT_DIR = path.join(__dirname, "..", "out");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

function startStaticServer(port) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      try {
        let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
        if (urlPath === "/") urlPath = "/index.html";

        // أمان: منع الخروج من مجلد out
        const filePath = path.join(OUT_DIR, path.normalize(urlPath).replace(/^(\.\.[\/\\])+/, ""));
        if (!filePath.startsWith(OUT_DIR)) {
          res.writeHead(403);
          return res.end();
        }

        fs.stat(filePath, (err, stat) => {
          if (!err && stat.isFile()) {
            res.writeHead(200, {
              "Content-Type": MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream",
              "Content-Length": stat.size,
            });
            fs.createReadStream(filePath).pipe(res);
          } else {
            console.error(`Not found: ${urlPath}`);
            res.writeHead(200, { "Content-Type": MIME[".html"] });
            fs.createReadStream(path.join(OUT_DIR, "404.html")).pipe(res);
          }
        });
      } catch (e) {
        res.writeHead(500);
        res.end();
      }
    });
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

async function createWindow() {
  // خادم بمنفذ متاح عشوائياً
  const server = await startStaticServer(0);
  const port = server.address().port;

  const win = new BrowserWindow({
    width: 1150,
    height: 820,
    minWidth: 420,
    autoHideMenuBar: true,
    title: "القرآن الكريم - مصحف الشاملة",
    backgroundColor: "#0d1421",
    icon: path.join(__dirname, "..", "build", "icon.png"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  Menu.setApplicationMenu(null);
  // وسم ?env=desktop يجعل التطبيق يعرف أنه داخل إلكترون (يخفي قسم التنزيل)
  await win.loadURL(`http://127.0.0.1:${port}/?env=desktop`);

  // اختصارات: F11 = ملء الشاشة، Ctrl+R = إعادة تحميل، Ctrl+س = تكبير، Ctrl+- تصغير
  win.webContents.on("before-input-event", (event, input) => {
    if (input.type !== "keyDown") return;
    const key = (input.key || "").toLowerCase();
    if (key === "f11") {
      win.setFullScreen(!win.isFullScreen());
      event.preventDefault();
    } else if (input.control && key === "r") {
      win.reload();
      event.preventDefault();
    } else if (input.control && key === "=") {
      win.webContents.setZoomLevel(win.webContents.getZoomLevel() + 0.5);
      event.preventDefault();
    } else if (input.control && key === "-") {
      win.webContents.setZoomLevel(win.webContents.getZoomLevel() - 0.5);
      event.preventDefault();
    } else if (input.control && key === "0") {
      win.webContents.setZoomLevel(0);
      event.preventDefault();
    }
  });

  // فتح روابط خارجية في المتصفح النظامي
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(`http://127.0.0.1:${port}`)) return { action: "allow" };
    shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
