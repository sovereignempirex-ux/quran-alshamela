// يحول build/icon.png إلى build/icon.ico (يضم صورة PNG 256x256)
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

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
function encodePNG(size, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

// اقرأ 512 وأصغرّ لـ 256 بالمتوسط
const src = fs.readFileSync(path.join(__dirname, "..", "build", "icon.png"));
function decodePNG(png) {
  // نقرأ IDAT فقط
  let off = 8;
  let idat = Buffer.alloc(0);
  let W = 0, H = 0, bitDepth = 0, type = 0;
  while (off < png.length) {
    const len = png.readUInt32BE(off);
    const type = png.toString("ascii", off + 4, off + 8);
    const data = png.slice(off + 8, off + 8 + len);
    if (type === "IHDR") {
      W = data.readUInt32BE(0); H = data.readUInt32BE(4);
      bitDepth = data[8]; if (data[9] !== 6) throw new Error("expected RGBA");
    } else if (type === "IDAT") {
      idat = Buffer.concat([idat, data]);
    }
    off += 12 + len;
  }
  const raw = zlib.inflateSync(idat);
  const out = Buffer.alloc(W * H * 4);
  const bpp = 4;
  let prev = Buffer.alloc(W * bpp);
  let pos = 0;
  for (let y = 0; y < H; y++) {
    const filter = raw[pos++];
    const line = raw.slice(pos, pos + W * bpp); pos += W * bpp;
    const cur = Buffer.alloc(W * bpp);
    for (let x = 0; x < W * bpp; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0;
      const b = prev[x];
      const c = x >= bpp ? prev[x - bpp] : 0;
      let v = line[x];
      if (filter === 1) v = (v + a) & 0xff;
      else if (filter === 2) v = (v + b) & 0xff;
      else if (filter === 3) v = (v + ((a + b) >> 1)) & 0xff;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        const pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        v = (v + pr) & 0xff;
      }
      cur[x] = v;
    }
    cur.copy(out, y * W * bpp);
    prev = cur;
  }
  return { W, H, rgba: out };
}

const img = decodePNG(src);
const T = 256;
const small = Buffer.alloc(T * T * 4);
const f = img.W / T;
for (let y = 0; y < T; y++) {
  for (let x = 0; x < T; x++) {
    let r = 0, g = 0, b = 0, a = 0, n = 0;
    const x0 = Math.floor(x * f), y0 = Math.floor(y * f);
    const x1 = Math.floor((x + 1) * f), y1 = Math.floor((y + 1) * f);
    for (let yy = y0; yy < y1; yy++) {
      for (let xx = x0; xx < x1; xx++) {
        const i = (yy * img.W + xx) * 4;
        r += img.rgba[i]; g += img.rgba[i + 1]; b += img.rgba[i + 2]; a += img.rgba[i + 3]; n++;
      }
    }
    const o = (y * T + x) * 4;
    small[o] = r / n; small[o + 1] = g / n; small[o + 2] = b / n; small[o + 3] = a / n;
  }
}
const png256 = encodePNG(T, small);

// ICO: header + dir + image
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4);
const dir = Buffer.alloc(16);
dir[0] = 0; dir[1] = 0; // 256 (صفر تعني 256)
dir[2] = 0; dir[3] = 0;
dir.writeUInt16LE(1, 4);   // planes
dir.writeUInt16LE(32, 6);  // bit count
dir.writeUInt32LE(png256.length, 8);  // حجم الصورة
dir.writeUInt32LE(22, 12);            // إزاحة البيانات
fs.writeFileSync(path.join(__dirname, "..", "build", "icon.ico"), Buffer.concat([header, dir, png256]));
console.log("build/icon.ico ✓ (256x256)");
