// مولد أيقونة التطبيق برمجياً (بدون مكتبات خارجية) — تصميم 2.3.0 «المصحف المفتوح»
// ينتج: build/icon.png (أصلي بـ512px) + أيقونات أندرويد في android/app/src/main/res/mipmap-*
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

// ---------- PNG encoder ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 8) : c >>> 8;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

// ---------- الرسم ----------
const S = 2; // عينات مضاعفة للسلاسة (1024 مبلط ثم يُصغَّر)
const SIZE = 512 * S;
let buf;

const px = (x, y, r, g, b, a = 255) => {
  const i = (y * SIZE + x) * 4;
  buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a;
};

const lerp = (a, b, t) => a + (b - a) * t;
const mixC = (a, b, t) => ({ r: lerp(a.r, b.r, t), g: lerp(a.g, b.g, t), b: lerp(a.b, b.b, t) });

// لوحة الألوان: زمرد إسلامي + ذهبي
const TEAL_D = { r: 4, g: 44, b: 36 };      // الزمرد الغامق (الأطراف)
const TEAL_L = { r: 16, g: 94, b: 78 };      // الزمرد الفاتح (الوسط)
const GOLD = { r: 212, g: 175, b: 55 };      // ذهبي كلاسيكي
const GOLD_L = { r: 255, g: 224, b: 116 };   // ذهبي مشرق
const PAGE = { r: 249, g: 244, b: 226 };     // أبيض ورقي دافئ
const PAGE_D = { r: 226, g: 215, b: 183 };   // ظل الصفحة

// ملء مضلّع (scanline) مع تدرج لوني عمودي اختياري
function fillPoly(pts, colFn) {
  const ys = pts.map((p) => p[1]);
  const y0 = Math.max(0, Math.ceil(Math.min(...ys)));
  const y1 = Math.min(SIZE - 1, Math.floor(Math.max(...ys)));
  for (let y = y0; y <= y1; y++) {
    const xs = [];
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1p] = pts[i];
      const [x2, y2p] = pts[(i + 1) % pts.length];
      if ((y1p <= y && y2p > y) || (y2p <= y && y1p > y)) {
        xs.push(x1 + ((y - y1p) / (y2p - y1p)) * (x2 - x1));
      }
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const a = Math.max(0, Math.ceil(xs[i]));
      const b = Math.min(SIZE - 1, Math.floor(xs[i + 1]));
      for (let x = a; x <= b; x++) {
        const c = colFn(x, y);
        px(x, y, c.r, c.g, c.b);
      }
    }
  }
}

// رسم خط متصل بين النقاط (بعرض معين) — لحدود الكتاب والحلقات
function strokePoly(pts, col, width) {
  const w = width / 2;
  const seg = (x1, y1, x2, y2) => {
    const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1)) * 2;
    for (let i = 0; i <= steps; i++) {
      const x = lerp(x1, x2, i / steps);
      const y = lerp(y1, y2, i / steps);
      const xi = Math.round(x), yi = Math.round(y);
      for (let dy = -w; dy <= w; dy++) {
        for (let dx = -w; dx <= w; dx++) {
          if (dx * dx + dy * dy <= w * w) {
            const X = xi + dx, Y = yi + dy;
            if (X >= 0 && Y >= 0 && X < SIZE && Y < SIZE) px(X, Y, col.r, col.g, col.b);
          }
        }
      }
    }
  };
  for (let i = 0; i + 1 < pts.length; i++) seg(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
}

function draw() {
  buf = Buffer.alloc(SIZE * SIZE * 4);
  const c = SIZE / 2;

  // خلفية: تدرج شعاعي زمردي
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const d = Math.hypot(x - c, y - c * 0.92) / (SIZE * 0.72);
      const col = mixC(TEAL_L, TEAL_D, Math.min(1, d));
      px(x, y, col.r, col.g, col.b);
    }
  }

  // حلقتان ذهبية رقيقة زخرفيتان
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const d = Math.hypot(x - c, y - c);
      for (const [r, w, alpha] of [[SIZE * 0.415, 2.4, 0.5], [SIZE * 0.443, 1.4, 0.3]]) {
        if (Math.abs(d - r) <= w) {
          const t = (x + y) / (SIZE * 2);
          const g = mixC(GOLD, GOLD_L, t);
          const i = (y * SIZE + x) * 4;
          buf[i] = g.r; buf[i + 1] = g.g; buf[i + 2] = g.b; buf[i + 3] = Math.round(255 * alpha);
        }
      }
    }
  }

  // المصحف المفتوح: صفحتان (يسار ويمين) بحنية مركزية
  const cx = c, topY = SIZE * 0.315, midSpineY = SIZE * 0.345;
  const outerX = SIZE * 0.225, innerSlopeY = SIZE * 0.30;
  const botOuterY = SIZE * 0.70, botSpineY = SIZE * 0.615;

  // الصفحة اليسرى
  fillPoly(
    [
      [cx, midSpineY],
      [outerX, innerSlopeY],
      [outerX, botOuterY],
      [cx, botSpineY],
    ],
    (x, y) => {
      const t = (y - topY) / (botOuterY - topY);
      let col = mixC(PAGE, PAGE_D, t * 0.8);
      // تظليل قرب الحنية
      const edge = Math.abs(x - cx) / (cx - outerX);
      if (edge > 0.82) col = mixC(col, PAGE_D, 0.55);
      return col;
    }
  );
  // الصفحة اليمنى (مرآة)
  fillPoly(
    [
      [cx, midSpineY],
      [SIZE - outerX, innerSlopeY],
      [SIZE - outerX, botOuterY],
      [cx, botSpineY],
    ],
    (x, y) => {
      const t = (y - topY) / (botOuterY - topY);
      let col = mixC(PAGE, PAGE_D, t * 0.8);
      const edge = Math.abs(x - cx) / (cx - outerX);
      if (edge > 0.82) col = mixC(col, PAGE_D, 0.55);
      return col;
    }
  );

  // أسطر النص على الصفحتين
  const lineColor = mixC(PAGE_D, { r: 190, g: 170, b: 120 }, 0.6);
  for (const side of [-1, 1]) {
    for (let ln = 0; ln < 4; ln++) {
      const yTop = SIZE * (0.40 + ln * 0.052);
      yArrows();
      function yArrows() {}
      // الخط بعرض الشفرة يتبع ميل الحنية
      strokePoly(
        [
          [cx + side * SIZE * 0.055, yTop + 4],
          [cx + side * (cx - outerX - SIZE * 0.045), yTop - SIZE * 0.018],
        ],
        { r: 176, g: 160, b: 118 },
        Math.max(1.5, S * 0.9)
      );
      void lineColor;
    }
  }

  // الحنية المركزية الذهبية
  strokePoly(
    [
      [cx, midSpineY - SIZE * 0.01],
      [cx, botSpineY + SIZE * 0.012],
    ],
    mixC(GOLD, GOLD_L, 0.4),
    Math.max(2.6, S * 1.6)
  );

  // حدود ذهبية حول الصفحتين
  for (const side of [-1, 1]) {
    strokePoly(
      [
        [cx, midSpineY],
        [cx + side * (cx - outerX), innerSlopeY],
        [cx + side * (cx - outerX), botOuterY],
        [cx, botSpineY],
      ],
      mixC(GOLD, GOLD_L, 0.25),
      Math.max(2, S * 1.2)
    );
  }

  // هلال صغير أعلى اليسار مع نجمة
  const crescentX = SIZE * 0.265, crescentY = SIZE * 0.205;
  const R1 = SIZE * 0.085, R2 = SIZE * 0.070;
  const cutX = SIZE * 0.295, cutY = SIZE * 0.185;
  for (let y = Math.floor(crescentY - R1 - 2); y <= Math.ceil(crescentY + R1 + 2); y++) {
    for (let x = Math.floor(crescentX - R1 - 2); x <= Math.ceil(crescentX + R1 + 2); x++) {
      const in1 = Math.hypot(x - crescentX, y - crescentY) <= R1;
      const in2 = Math.hypot(x - cutX, y - cutY) <= R2;
      if (in1 && !in2) {
        const t = (x + y) / (SIZE * 2);
        const g = mixC(GOLD, GOLD_L, t);
        px(x, y, g.r, g.g, g.b);
      }
    }
  }
  // نجمة ثمانية صغيرة
  const sX = SIZE * 0.715, sY = SIZE * 0.205, sR = SIZE * 0.052;
  for (let y = Math.floor(sY - sR - 2); y <= Math.ceil(sY + sR + 2); y++) {
    for (let x = Math.floor(sX - sR - 2); x <= Math.ceil(sX + sR + 2); x++) {
      const dx = x - sX, dy = y - sY;
      const r = Math.hypot(dx, dy);
      if (r <= sR) {
        const ang = Math.atan2(dy, dx);
        const v = 1 - 0.72 * Math.abs(Math.cos(ang * 4));
        if (r <= sR * Math.max(0.45, v)) {
          const t = Math.min(1, r / sR);
          const g = mixC(GOLD_L, GOLD, t);
          px(x, y, g.r, g.g, g.b);
        }
      }
    }
  }

  // قناع الزوايا المستديرة (نصف قطر 90/1024)
  const mask = SIZE * 0.088;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const inCorner =
        (x < mask && y < mask) ||
        (x > SIZE - mask && y < mask) ||
        (x < mask && y > SIZE - mask) ||
        (x > SIZE - mask && y > SIZE - mask);
      if (inCorner) {
        const cxn = x <= SIZE / 2 ? 0 : SIZE;
        const cyn = y <= SIZE / 2 ? 0 : SIZE;
        const dd = Math.hypot(x - cxn, y - cyn);
        if (dd > mask) {
          const i = (y * SIZE + x) * 4;
          buf[i + 3] = 0;
        } else if (dd > mask - 1.5) {
          const i = (y * SIZE + x) * 4;
          buf[i + 3] = Math.round(255 * Math.min(1, (mask - dd) / 1.5));
        }
      }
    }
  }
}

// تصغير بمتوسط الصندوق
function downscale(target) {
  const f = SIZE / target;
  const out = Buffer.alloc(target * target * 4);
  for (let y = 0; y < target; y++) {
    for (let x = 0; x < target; x++) {
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      const x0 = Math.floor(x * f), y0 = Math.floor(y * f);
      const x1 = Math.min(SIZE, Math.ceil((x + 1) * f)), y1 = Math.min(SIZE, Math.ceil((y + 1) * f));
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          const i = (yy * SIZE + xx) * 4;
          r += buf[i] * buf[i + 3]; g += buf[i + 1] * buf[i + 3]; b += buf[i + 2] * buf[i + 3];
          a += buf[i + 3]; n++;
        }
      }
      const o = (y * target + x) * 4;
      if (a > 0) {
        out[o] = Math.round(r / a); out[o + 1] = Math.round(g / a);
        out[o + 2] = Math.round(b / a); out[o + 3] = Math.round(a / n);
      }
    }
  }
  return out;
}

function main() {
  draw();
  fs.mkdirSync(path.join(__dirname, "..", "build"), { recursive: true });
  fs.writeFileSync(path.join(__dirname, "..", "build", "icon.png"), encodePNG(512, 512, downscale(512)));

  const res = path.join(__dirname, "..", "android", "app", "src", "main", "res");
  const sizes = { "mipmap-mdpi": 48, "mipmap-hdpi": 72, "mipmap-xhdpi": 96, "mipmap-xxhdpi": 144, "mipmap-xxxhdpi": 192 };
  for (const [dir, size] of Object.entries(sizes)) {
    const dirPath = path.join(res, dir);
    if (fs.existsSync(dirPath)) {
      const png = encodePNG(size, size, downscale(size));
      if (fs.existsSync(path.join(dirPath, "ic_launcher.png"))) {
        fs.writeFileSync(path.join(dirPath, "ic_launcher.png"), png);
      }
      if (fs.existsSync(path.join(dirPath, "ic_launcher_round.png"))) {
        fs.writeFileSync(path.join(dirPath, "ic_launcher_round.png"), png);
      }
      console.log(`icons: ${dir} ${size}px ✓`);
    }
  }
  console.log("build/icon.png ✓ (mint gold mushaf design)");
}

main();
