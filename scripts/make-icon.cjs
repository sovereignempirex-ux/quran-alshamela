// مولد أيقونة التطبيق برمجياً (بدون مكتبات خارجية)
// ينتج: build/icon.png + أيقونات أندرويد في android/app/src/main/res/mipmap-*
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

// ---------- PNG encoder ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
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
const S = 2; // عينات مضاعفة للسلاسة
const SIZE = 512 * S;
const px = (x, y, r, g, b, a = 255) => {
  const i = (y * SIZE + x) * 4;
  buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a;
};
let buf;

const GOLD = { r: 255, g: 215, b: 0 };
const GOLD_LIGHT = { r: 255, g: 237, b: 78 };
const NAVY = { r: 13, g: 20, b: 33 };
const NAVY_LIGHT = { r: 26, g: 35, b: 126 };

function lerpC(a, b, t) {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

function draw() {
  buf = Buffer.alloc(SIZE * SIZE * 4);
  const c = SIZE / 2;

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      // تدرج شعاعي كحلي
      const d = Math.hypot(x - c, y - c * 0.9) / (SIZE * 0.75);
      let col = lerpC(NAVY_LIGHT, NAVY, Math.min(1, d));
      px(x, y, col.r, col.g, col.b);
    }
  }

  // (بدون زخرفة زوايا — أُزيلت لصالح البساطة)

  // الهلال (دائرة كاملة ناقص دائرة مزاحة) داخل مركز فوق
  const crescentX = SIZE * 0.46, crescentY = SIZE * 0.55;
  const R1 = SIZE * 0.27, R2 = SIZE * 0.225;
  const cutX = SIZE * 0.60, cutY = SIZE * 0.48;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const in1 = Math.hypot(x - crescentX, y - crescentY) <= R1;
      const in2 = Math.hypot(x - cutX, y - cutY) <= R2;
      if (in1 && !in2) {
        // تدرج ذهبي من الأسفل يميناً للأعلى يساراً
        const t = (x + y) / (SIZE * 2);
        const col = lerpC(GOLD, GOLD_LIGHT, t);
        px(x, y, col.r, col.g, col.b);
      }
    }
  }

  // النجم الصغير السداسي بجانب الهلال
  const sX = SIZE * 0.70, sY = SIZE * 0.33, sR = SIZE * 0.075;
  const insideStar = (x, y) => {
    const dx = x - sX, dy = y - sY;
    const r = Math.hypot(dx, dy);
    if (r > sR) return false;
    const ang = Math.atan2(dy, dx);
    // سداسي مبطط لكن بزوايا مدببة (نجمة 6)
    const spikes = 9; // كثافة أضرار — نجمة بثلاث رؤوس مضاعفة
    const v = 1 - 0.62 * Math.abs(Math.cos(ang * 3));
    return r <= sR * Math.max(0.55, v);
  };
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (insideStar(x, y)) {
        const t = (x + y) / (SIZE * 2);
        const col = lerpC(GOLD_LIGHT, GOLD, t);
        px(x, y, col.r, col.g, col.b);
      }
    }
  }

  // قناع زوايا مستديرة (radius 96*2 في 1024)
  const mask = SIZE * 0.19;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const cornerX = x <= mask ? (y <= mask ? 0 : SIZE) : x > SIZE - mask ? (y <= mask ? 0 : SIZE) === 0 ? 0 : SIZE : null;
      const nx =
        (x < mask && y < mask) || (x > SIZE - mask && y < mask) ||
        (x < mask && y > SIZE - mask) || (x > SIZE - mask && y > SIZE - mask)
          ? SIZE - mask
          : null;
      if (nx !== null) {
        const cx = x <= mask ? 0 : SIZE;
        const cy = y <= mask ? 0 : SIZE;
        const dd = Math.hypot(x - cx, y - cy);
        if (dd > mask) {
          const i = (y * SIZE + x) * 4;
          buf[i + 3] = 0;
        }
      }
    }
  }
}

// تصغير بخطوتين (متوسط صندوقي) من SIZE إلى الهدف
function downscale(target) {
  const f = SIZE / target;
  const out = Buffer.alloc(target * target * 4);
  for (let y = 0; y < target; y++) {
    for (let x = 0; x < target; x++) {
      // متوسط منطقة f×f
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      const x0 = Math.floor(x * f), y0 = Math.floor(y * f);
      const x1 = Math.min(SIZE, Math.floor((x + 1) * f)), y1 = Math.min(SIZE, Math.floor((y + 1) * f));
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          const i = (yy * SIZE + xx) * 4;
          r += buf[i]; g += buf[i + 1]; b += buf[i + 2]; a += buf[i + 3]; n++;
        }
      }
      const o = (y * target + x) * 4;
      out[o] = Math.round(r / n); out[o + 1] = Math.round(g / n);
      out[o + 2] = Math.round(b / n); out[o + 3] = Math.round(a / n);
    }
  }
  return out;
}

function main() {
  draw();
  fs.mkdirSync(path.join(__dirname, "..", "build"), { recursive: true });
  fs.writeFileSync(path.join(__dirname, "..", "build", "icon.png"), encodePNG(512, 512, downscale(512)));

  // أيقونات أندرويد من أيقوناتنا
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
  console.log("build/icon.png ✓");
}

main();
