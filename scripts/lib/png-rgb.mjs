// scripts/lib/png-rgb.mjs — 알파 없는 PNG 인코딩.
//
// resvg 는 항상 RGBA 로 내보내 `sips -g hasAlpha` 가 yes 가 된다. Play 는 불투명을 요구하므로
// 렌더된 픽셀에서 알파를 버리고 RGB(색 형식 2) PNG 로 직접 쓴다. 바탕을 꽉 채운 그림에만 쓴다.

import { Buffer } from 'node:buffer';
import { deflateSync } from 'node:zlib';

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
export function encodeRgbPng(rgba, width, height) {
  const stride = width * 3 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let yy = 0; yy < height; yy += 1) {
    raw[yy * stride] = 0; // 필터 없음
    for (let xx = 0; xx < width; xx += 1) {
      const si = (yy * width + xx) * 4;
      const di = yy * stride + 1 + xx * 3;
      raw[di] = rgba[si];
      raw[di + 1] = rgba[si + 1];
      raw[di + 2] = rgba[si + 2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 비트 깊이
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
