// ============================================================
// Electron main — يخدم نسخة التصدير الثابت (out/) بخادم محلي
// صغير ثم يفتح نافذة التطبيق. يعمل 100% محلياً دون سيرفر خارجي،
// والبيانات تُجلب من إنترنت المستخدم مباشرة (نفس التطبيق الويب).
//
// التحديث الذاتي: عند الإقلاع يفحص GitHub Releases (خلف الكواليس)؛
// إذا وُجد web-app.zip بإصدار أحدث يقوم بتنزيله وفك ضغطه إلى
// userData ثم يعيد تشغيل التطبيق — دون تدخل المستخدم. عند عدم
// الاتصال يسقط بأمان إلى النسخة المحزّنة ضمن التطبيق.
// ============================================================
const { app, BrowserWindow, Menu, shell } = require("electron");
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const OUT_DIR = path.join(__dirname, "..", "out");

// مجلد التحديثات داخل بيانات التطبيق
const REPO = "sovereignempirex-ux/quran-alshamela";
const UPD_DIR = path.join(app.getPath("userData"), "selfupdate");
const VERSION_FILE = path.join(UPD_DIR, "current.json");

// اختيار مجلد الخدمة: المرقّى من التحديث السابق إن وجد، وإلا المدمج
function servableDir() {
  try {
    const cur = JSON.parse(fs.readFileSync(VERSION_FILE, "utf8"));
    const dir = path.join(UPD_DIR, "webapp-" + String(cur.version).replace(/[^0-9.]/g, ""));
    if (fs.existsSync(path.join(dir, "index.html"))) return dir;
  } catch {
    /* لا يوجد تحديث سابق */
  }
  return OUT_DIR;
}

// مقارنة إصدارات a.b.c
function isNewer(a, b) {
  const p = (s) => String(s).replace(/^v/, "").split(".").map((x) => parseInt(x, 10) || 0);
  const A = p(a), B = p(b);
  for (const i of [0, 1, 2]) {
    if ((A[i] || 0) > (B[i] || 0)) return true;
    if ((A[i] || 0) < (B[i] || 0)) return false;
  }
  return false;
}

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

function startStaticServer(port, dir) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      try {
        let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
        if (urlPath === "/") urlPath = "/index.html";

        // أمان: منع الخروج من مجلد الخدمة
        const filePath = path.join(dir, path.normalize(urlPath).replace(/^(\.\.[\/\\])+/, ""));
        if (!filePath.startsWith(dir)) {
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
            fs.createReadStream(path.join(dir, "404.html")).pipe(res);
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

// == تنزيل ملف ببث مباشر (يدعم إعادة التوجيه) ==
function downloadFile(url, dest, redirects) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, { headers: { "User-Agent": "Quran-AlShamela-Updater" } }, (res) => {
        if (res.statusCode === 302 && res.headers.location && redirects < 5) {
          res.resume();
          return downloadFile(res.headers.location, dest, redirects + 1).then(resolve, reject);
        }
        if (res.statusCode !== 200) {
          res.resume();
          file.close();
          return reject(new Error("HTTP " + res.statusCode));
        }
        res.pipe(file);
        file.on("finish", () => file.close(() => resolve()));
        file.on("error", (e) => {
          file.close();
          reject(e);
        });
      })
      .on("error", (e) => {
        file.close();
        reject(e);
      });
  });
}

// ============ فحص وتطبيق التحديث (خلف الكواليس) ============
async function checkForUpdates() {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: {
        "User-Agent": "Quran-AlShamela-Updater",
        Accept: "application/vnd.github+json",
      },
    });
    if (!res.ok) return;
    const rel = await res.json();
    const tag = rel && rel.tag_name ? String(rel.tag_name) : "";
    if (!tag || !isNewer(tag, app.getVersion())) return; // نحن محدثون

    const asset = (rel.assets || []).find((a) => a && a.name === "web-app.zip");
    if (!asset) return;

    fs.mkdirSync(UPD_DIR, { recursive: true });
    const zipPath = path.join(UPD_DIR, "update.zip");
    await downloadFile(asset.browser_download_url || asset.url, zipPath, 0);

    const target = path.join(UPD_DIR, "webapp-" + tag.replace(/[^0-9.]/g, ""));
    const clean = (s) => String(s).replace(/'/g, "");
    // فك الضغط عبر PowerShell (متوفر في كل ويندوز)
    const unzip = spawnSync(
      "powershell",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        `Expand-Archive -Force -LiteralPath '${clean(zipPath)}' -DestinationPath '${clean(target)}'`,
      ],
      { timeout: 120000 }
    );

    if (unzip.status !== 0 || !fs.existsSync(path.join(target, "index.html"))) {
      try { fs.unlinkSync(zipPath); } catch { /* تجاهل */ }
      return; // فشل فك الضغط — نحتفظ بالنسخة الحالية بأمان
    }

    // تسجيل الإصدار الجديد ثم إعادة تشغيل التطبيق
    fs.writeFileSync(
      VERSION_FILE,
      JSON.stringify({ version: tag.replace(/^v/, ""), at: Date.now() })
    );
    try { fs.unlinkSync(zipPath); } catch { /* تجاهل */ }
    app.relaunch();
    app.exit(0);
  } catch {
    /* بلا اتصال — نبقى على النسخة الحالية بلا مشاكل */
  }
}

async function createWindow() {
  const serveDir = servableDir();

  // خادم بمنفذ متاح عشوائياً
  const server = await startStaticServer(0, serveDir);
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

  // فحص التحديث بعد 12 ثانية من فتح النافذة (خلف الكواليس) ثم دورياً
  setTimeout(checkForUpdates, 12000);
  setInterval(checkForUpdates, 30 * 60 * 1000);

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
