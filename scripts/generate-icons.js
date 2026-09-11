const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Minimal PNG generator using standard Node.js zlib
function createPng(width, height, renderPixel) {
  const bytesPerPixel = 4;
  const rawData = Buffer.alloc(height * (1 + width * bytesPerPixel));

  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = renderPixel(x, y, width, height);
      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // PNG Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth: 8
  ihdrData[9] = 6; // Color type: RGBA
  ihdrData[10] = 0; // Compression: Deflate
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace: None

  const ihdrChunk = createChunk('IHDR', ihdrData);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(4 + 4 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crc = crc32(chunk.subarray(4, 8 + len));
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

// Standard CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

// Icon Pixel Shader: Minimalist dark folded sheet emblem
function renderIconPixel(x, y, w, h) {
  const nx = (x / w) * 2 - 1; // -1 to 1
  const ny = (y / h) * 2 - 1;
  const dist = Math.sqrt(nx * nx + ny * ny);

  // Background: deep dark void
  let r = 5, g = 5, b = 7, a = 255;

  // Rounded icon mask for apple-touch-icon / app launcher
  if (dist > 0.88) {
    const aa = Math.max(0, Math.min(1, (0.92 - dist) / 0.04));
    a = Math.round(aa * 255);
  }

  // Folded geometry in center
  // Left flap (flat): nx in [-0.45, 0], ny in [-0.55, 0.55]
  if (nx >= -0.45 && nx <= 0 && ny >= -0.55 && ny <= 0.55) {
    const edgeFade = Math.min(1, (nx - (-0.45)) / 0.05);
    const topFade = Math.min(1, (0.55 - Math.abs(ny)) / 0.05);
    const mask = edgeFade * topFade;
    const lum = 240 + Math.round(nx * 40);
    r = Math.round(lum * mask + r * (1 - mask));
    g = Math.round(lum * mask + g * (1 - mask));
    b = Math.round(lum * mask + b * (1 - mask));
  }

  // Right flap (folded back in perspective): nx in [0, 0.35], ny in [-0.45, 0.45]
  const slantY = 0.55 - (nx / 0.35) * 0.12;
  if (nx > 0 && nx <= 0.35 && Math.abs(ny) <= slantY) {
    const edgeFade = Math.min(1, (0.35 - nx) / 0.04);
    const topFade = Math.min(1, (slantY - Math.abs(ny)) / 0.04);
    const mask = edgeFade * topFade;
    // Darkened depth fold
    const lum = 130 - Math.round((nx / 0.35) * 60);
    r = Math.round(lum * mask + r * (1 - mask));
    g = Math.round(lum * mask + g * (1 - mask));
    b = Math.round((lum + 10) * mask + b * (1 - mask));
  }

  return [r, g, b, a];
}

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(iconsDir, { recursive: true });

console.log('Generating PWA icons...');
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), createPng(192, 192, renderIconPixel));
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), createPng(512, 512, renderIconPixel));
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), createPng(180, 180, renderIconPixel));
fs.writeFileSync(path.join(iconsDir, 'og-image.png'), createPng(600, 315, renderIconPixel));
console.log('Done!');
