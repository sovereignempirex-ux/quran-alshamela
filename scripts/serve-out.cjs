// خادم ثابت مؤقت لاختبار نسخة out — سطر أوامر: node scripts/serve-out.cjs
const http = require("http");
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "..", "out");
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};

http
  .createServer((req, res) => {
    let p = decodeURIComponent((req.url || "/").split("?")[0]);
    if (p === "/") p = "/index.html";
    const file = path.join(OUT, path.normalize(p).replace(/^(\.\.[\/\\])+/, ""));
    fs.stat(file, (err, stat) => {
      if (err || !stat.isFile()) {
        fs.readFile(path.join(OUT, "404.html"), (e2, d2) => {
          res.writeHead(200, { "Content-Type": MIME[".html"] });
          res.end(e2 ? "<h1>404</h1>" : d2);
        });
        return;
      }
      res.writeHead(200, {
        "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream",
        "Content-Length": stat.size,
      });
      fs.readFile(file, (e2, data) => {
        if (e2) { res.end(); return; }
        res.end(data);
      });
    });
  })
  .listen(4173, "127.0.0.1", () => console.log("http://127.0.0.1:4173"));
