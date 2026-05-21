#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const svgPath = resolve(root, 'app/icon.svg');
const icoPath = resolve(root, 'app/favicon.ico');
const applePath = resolve(root, 'app/apple-icon.png');

const svg = await readFile(svgPath);

const ICO_SIZES = [16, 32, 48, 64, 96, 128];
const pngs = await Promise.all(
  ICO_SIZES.map((size) =>
    sharp(svg, { density: 384 })
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9 })
      .toBuffer(),
  ),
);

const HEADER_SIZE = 6;
const DIR_ENTRY_SIZE = 16;
const header = Buffer.alloc(HEADER_SIZE);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(pngs.length, 4);

const dirs = [];
let dataOffset = HEADER_SIZE + DIR_ENTRY_SIZE * pngs.length;
for (let i = 0; i < pngs.length; i += 1) {
  const size = ICO_SIZES[i];
  const png = pngs[i];
  const dir = Buffer.alloc(DIR_ENTRY_SIZE);
  dir.writeUInt8(size === 256 ? 0 : size, 0);
  dir.writeUInt8(size === 256 ? 0 : size, 1);
  dir.writeUInt8(0, 2);
  dir.writeUInt8(0, 3);
  dir.writeUInt16LE(1, 4);
  dir.writeUInt16LE(32, 6);
  dir.writeUInt32LE(png.length, 8);
  dir.writeUInt32LE(dataOffset, 12);
  dirs.push(dir);
  dataOffset += png.length;
}

const ico = Buffer.concat([header, ...dirs, ...pngs]);
await writeFile(icoPath, ico);

await sharp(svg, { density: 768 })
  .resize(180, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ compressionLevel: 9 })
  .toFile(applePath);

console.log(`favicon.ico: ${ICO_SIZES.join('+')} (${ico.length} bytes)`);
console.log(`apple-icon.png: 180x180`);
