// Cleans a photo of handwritten notes into black ink on white paper.
// Pure JavaScript with no React Native imports, so it runs in plain Node tests.
// Uses no Buffer global: jpeg-js is called with useTArray, and output is Uint8Array.

import jpeg from 'jpeg-js';
import { zlibSync } from 'fflate';

export function decodeJpeg(bytes) {
  // Reject non-JPEG input up front. jpeg-js reports bad input with cryptic
  // messages such as "SOI not found", so this gives a clearer error.
  if (!(bytes instanceof Uint8Array) || bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw new Error('decodeJpeg: input is not a JPEG');
  }
  let decoded;
  try {
    // useTArray keeps the output a Uint8Array. The default path calls Buffer.alloc(),
    // which React Native does not provide.
    decoded = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: true });
  } catch (err) {
    throw new Error(`decodeJpeg: could not decode JPEG (${err.message})`);
  }
  return { width: decoded.width, height: decoded.height, data: decoded.data };
}

export function cleanScan(image) {
  const { width, height, data } = image;
  const n = width * height;
  if (data.length !== n * 4) {
    throw new Error(`cleanScan: expected ${n * 4} RGBA bytes, got ${data.length}`);
  }

  // (a) Luminance. Green carries most of perceived brightness, so the standard
  // luma weights give a more natural grey than a plain average.
  const lum = new Uint8Array(n);
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    lum[i] = Math.round(0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2]);
  }

  // (b) Paper background. A max filter keeps the brightest value in each window.
  // Paper is the brightest thing nearby, and ink strokes are thinner than the
  // window, so they drop out. The radius is 1/20 of the shorter side.
  const radius = Math.max(1, Math.round(Math.min(width, height) / 20));
  // Run on a downsampled map so the cost does not grow with photo resolution.
  // The block size keeps the map's filter radius near 4 cells.
  const f = Math.max(1, Math.floor(radius / 4));
  const sw = Math.ceil(width / f);
  const sh = Math.ceil(height / f);
  // Downsample with a block max, not an average. An average would let ink
  // inside a block darken the paper estimate.
  const small = new Uint8Array(sw * sh);
  for (let by = 0; by < sh; by++) {
    const y1 = Math.min(height, (by + 1) * f);
    for (let bx = 0; bx < sw; bx++) {
      const x1 = Math.min(width, (bx + 1) * f);
      let m = 0;
      for (let y = by * f; y < y1; y++) {
        for (let x = bx * f; x < x1; x++) {
          const v = lum[y * width + x];
          if (v > m) m = v;
        }
      }
      small[by * sw + bx] = m;
    }
  }
  const bgMap = maxFilter(small, sw, sh, Math.max(1, Math.round(radius / f)));

  // (c) Divide. Shadows and uneven light scale all the paper by about the same
  // factor, so lum / bg cancels them out and paper comes out near white.
  // (d) Threshold at 200 so the result is pure black or white.
  // The background map is bilinearly sampled back to full size. Nearest
  // neighbour would leave visible block seams in the divided image.
  const ax = axisSamples(width, f, sw);
  const ay = axisSamples(height, f, sh);
  const gray = new Uint8Array(n);
  for (let y = 0; y < height; y++) {
    const r0 = ay.i0[y] * sw;
    const r1 = ay.i1[y] * sw;
    const ty = ay.t[y];
    for (let x = 0; x < width; x++) {
      const c0 = ax.i0[x];
      const c1 = ax.i1[x];
      const tx = ax.t[x];
      const top = bgMap[r0 + c0] * (1 - tx) + bgMap[r0 + c1] * tx;
      const bot = bgMap[r1 + c0] * (1 - tx) + bgMap[r1 + c1] * tx;
      // Floor at 1 so an all-black frame cannot divide by zero.
      const bg = Math.max(1, top * (1 - ty) + bot * ty);
      const i = y * width + x;
      const out = Math.min(255, Math.round((255 * lum[i]) / bg));
      gray[i] = out >= 200 ? 255 : 0;
    }
  }
  return { width, height, gray };
}

// Separable max filter: a horizontal pass, then a vertical pass. Windows are
// clipped at the edges, not padded with zeros, so borders keep real values.
function maxFilter(src, w, h, r) {
  const tmp = new Uint8Array(w * h);
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r);
      const x1 = Math.min(w - 1, x + r);
      let m = 0;
      for (let k = x0; k <= x1; k++) {
        const v = src[y * w + k];
        if (v > m) m = v;
      }
      tmp[y * w + x] = m;
    }
  }
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r);
    const y1 = Math.min(h - 1, y + r);
    for (let x = 0; x < w; x++) {
      let m = 0;
      for (let k = y0; k <= y1; k++) {
        const v = tmp[k * w + x];
        if (v > m) m = v;
      }
      out[y * w + x] = m;
    }
  }
  return out;
}

// For each full-size pixel centre, the two neighbouring downsampled cells and
// the interpolation weight between them. Computed once per axis, not per pixel.
function axisSamples(size, f, smallSize) {
  const i0 = new Uint32Array(size);
  const i1 = new Uint32Array(size);
  const t = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    // Cell k covers pixels k*f .. k*f+f-1, so its centre is at k*f + (f-1)/2.
    const s = Math.min(smallSize - 1, Math.max(0, (i - (f - 1) / 2) / f));
    const a = Math.floor(s);
    i0[i] = a;
    i1[i] = Math.min(smallSize - 1, a + 1);
    t[i] = s - a;
  }
  return { i0, i1, t };
}

// PNG signature: the fixed 8 bytes that identify a PNG file.
const PNG_SIGNATURE = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10);

// CRC-32 lookup table (polynomial 0xEDB88320), built once. Each chunk's CRC covers
// its type and data, but not its length field.
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c;
}

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

// One PNG chunk: big-endian length, 4-byte type, data, then CRC over type + data.
function pngChunk(type, data) {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

export function encodePng(width, height, gray) {
  if (!(width > 0 && height > 0) || gray.length !== width * height) {
    throw new Error(`encodePng: ${width}x${height} needs ${width * height} grey bytes`);
  }

  // Each scanline starts with a filter-type byte. Byte 0 means no filter.
  const stride = width + 1;
  const raw = new Uint8Array(height * stride);
  for (let y = 0; y < height; y++) {
    raw.set(gray.subarray(y * width, (y + 1) * width), y * stride + 1);
  }

  // IHDR: width, height, bit depth 8, colour type 0 (greyscale). The last three
  // bytes are compression, filter method and interlace, all 0.
  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  ihdr[8] = 8;
  ihdr[9] = 0;

  const parts = [
    PNG_SIGNATURE,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlibSync(raw)),
    pngChunk('IEND', new Uint8Array(0)),
  ];
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const png = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    png.set(p, offset);
    offset += p.length;
  }
  return png;
}

export function cleanJpegToPng(bytes) {
  const { width, height, gray } = cleanScan(decodeJpeg(bytes));
  return encodePng(width, height, gray);
}
