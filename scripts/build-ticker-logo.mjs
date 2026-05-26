import { readFileSync, writeFileSync } from "node:fs";
import { deflateSync, inflateSync } from "node:zlib";

const input = new URL("../public/news-ticker-bg.png", import.meta.url);
const output = new URL("../public/news-ticker-logo.png", import.meta.url);
const crop = { x: 22, y: 993, width: 116, height: 78 };

function chunks(buffer) {
  const out = [];
  let offset = 8;
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    out.push({ type, data: buffer.subarray(offset + 8, offset + 8 + length) });
    offset += length + 12;
    if (type === "IEND") break;
  }
  return out;
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

function decodePng(buffer) {
  const fileChunks = chunks(buffer);
  const header = fileChunks.find((chunk) => chunk.type === "IHDR")?.data;
  if (!header) throw new Error("PNG is missing IHDR");
  const width = header.readUInt32BE(0);
  const height = header.readUInt32BE(4);
  const bitDepth = header[8];
  const colorType = header[9];
  if (bitDepth !== 8 || colorType !== 6) throw new Error("Only 8-bit RGBA PNG is supported");

  const source = inflateSync(Buffer.concat(fileChunks.filter((chunk) => chunk.type === "IDAT").map((chunk) => chunk.data)));
  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const pixels = Buffer.alloc(stride * height);
  let sourceOffset = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = source[sourceOffset++];
    const row = source.subarray(sourceOffset, sourceOffset + stride);
    sourceOffset += stride;
    const previous = y ? pixels.subarray((y - 1) * stride, y * stride) : null;
    const destination = pixels.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x += 1) {
      const left = x >= bytesPerPixel ? destination[x - bytesPerPixel] : 0;
      const up = previous ? previous[x] : 0;
      const upLeft = previous && x >= bytesPerPixel ? previous[x - bytesPerPixel] : 0;
      let value = row[x];
      if (filter === 1) value = (value + left) & 255;
      else if (filter === 2) value = (value + up) & 255;
      else if (filter === 3) value = (value + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) value = (value + paeth(left, up, upLeft)) & 255;
      destination[x] = value;
    }
  }

  return { width, pixels };
}

function crc32(buffer) {
  let crc = -1;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ -1) >>> 0;
}

function chunk(type, data = Buffer.alloc(0)) {
  const typeBuffer = Buffer.from(type, "ascii");
  const outputBuffer = Buffer.alloc(12 + data.length);
  outputBuffer.writeUInt32BE(data.length, 0);
  typeBuffer.copy(outputBuffer, 4);
  data.copy(outputBuffer, 8);
  outputBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 8 + data.length);
  return outputBuffer;
}

function encodeRgbaPng(width, height, pixels) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const rows = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * (width * 4 + 1);
    rows[rowOffset] = 0;
    pixels.copy(rows, rowOffset + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    signature,
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(rows, { level: 9 })),
    chunk("IEND")
  ]);
}

const source = decodePng(readFileSync(input));
const logo = Buffer.alloc(crop.width * crop.height * 4);

for (let y = 0; y < crop.height; y += 1) {
  for (let x = 0; x < crop.width; x += 1) {
    const sourceOffset = ((crop.y + y) * source.width + crop.x + x) * 4;
    const r = source.pixels[sourceOffset];
    const g = source.pixels[sourceOffset + 1];
    const b = source.pixels[sourceOffset + 2];
    const brightness = (r + g + b) / 3;
    const saturation = Math.max(r, g, b) - Math.min(r, g, b);
    const alpha = brightness > 150 && saturation < 95 ? Math.max(0, Math.min(255, Math.round((brightness - 150) * 2.6))) : 0;
    const targetOffset = (y * crop.width + x) * 4;
    logo[targetOffset] = 255;
    logo[targetOffset + 1] = 255;
    logo[targetOffset + 2] = 255;
    logo[targetOffset + 3] = alpha;
  }
}

writeFileSync(output, encodeRgbaPng(crop.width, crop.height, logo));
console.log(`Wrote ${output.pathname}`);
