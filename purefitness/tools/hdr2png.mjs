import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { FloatType } from 'three';
import fs from 'node:fs';
const [input, output, exposure = '1'] = process.argv.slice(2);
const buf = fs.readFileSync(input);
const loader = new HDRLoader(); loader.setDataType(FloatType);
const { data, width, height } = loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const step = 4; const w = width / step | 0, h = height / step | 0;
const out = Buffer.alloc(w * h * 3);
let max = 0, mx = 0, my = 0;
for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) { const i = (y * width + x) * 4; const l = data[i] + data[i + 1] + data[i + 2]; if (l > max) { max = l; mx = x; my = y; } }
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  const i = ((y * step) * width + x * step) * 4;
  for (let c = 0; c < 3; c++) { const v = data[i + c] * Number(exposure); out[(y * w + x) * 3 + c] = Math.min(255, Math.pow(v / (1 + v), 1 / 2.2) * 255); }
}
fs.writeFileSync(output, Buffer.concat([Buffer.from(`P6 ${w} ${h} 255\n`), out]));
console.log({ width, height, max, sunX: mx / width, sunY: my / height });
