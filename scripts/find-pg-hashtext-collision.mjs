#!/usr/bin/env node
import crypto from 'node:crypto';

function rot(x, k) {
  return ((x << k) | (x >>> (32 - k))) >>> 0;
}

/**
 * Exact replica of PostgreSQL src/common/hashfn.c hash_any / hash_any_extended(seed=0)
 * for 36-byte ASCII UUID strings.
 */
export function pgHashTextBoth(str) {
  const buf = Buffer.from(str, 'utf8');
  const len = buf.length;
  let a, b, c;
  a = b = c = (0x9e3779b9 + len + 3923095) >>> 0;
  let offset = 0;
  let rem = len;
  while (rem >= 12) {
    a = (a + buf.readUInt32LE(offset)) >>> 0;
    b = (b + buf.readUInt32LE(offset + 4)) >>> 0;
    c = (c + buf.readUInt32LE(offset + 8)) >>> 0;
    a = (a - c) >>> 0; a ^= rot(c, 4); c = (c + b) >>> 0;
    b = (b - a) >>> 0; b ^= rot(a, 6); a = (a + c) >>> 0;
    c = (c - b) >>> 0; c ^= rot(b, 8); b = (b + a) >>> 0;
    a = (a - c) >>> 0; a ^= rot(c, 16); c = (c + b) >>> 0;
    b = (b - a) >>> 0; b ^= rot(a, 19); a = (a + c) >>> 0;
    c = (c - b) >>> 0; c ^= rot(b, 4); b = (b + a) >>> 0;
    offset += 12;
    rem -= 12;
  }
  c = (c ^ b) >>> 0; c = (c - rot(b, 14)) >>> 0;
  a = (a ^ c) >>> 0; a = (a - rot(c, 11)) >>> 0;
  b = (b ^ a) >>> 0; b = (b - rot(a, 25)) >>> 0;
  c = (c ^ b) >>> 0; c = (c - rot(b, 16)) >>> 0;
  a = (a ^ c) >>> 0; a = (a - rot(c, 4)) >>> 0;
  b = (b ^ a) >>> 0; b = (b - rot(a, 14)) >>> 0;
  c = (c ^ b) >>> 0; c = (c - rot(b, 24)) >>> 0;
  const h32 = c | 0;
  const h64 = BigInt.asIntN(64, (BigInt(b) << 32n) | BigInt(c));
  return { h32, h64: h64.toString() };
}

export function pgHashtext32(str) {
  return pgHashTextBoth(str).h32;
}

export function pgHashtextExtended64(str) {
  return pgHashTextBoth(str).h64;
}

export const COLLISION_UUID_A = '39249983-7745-415d-a39b-4ed3f4c85258';
export const COLLISION_UUID_B = '66f6be06-9125-445e-9682-6c7f6f976831';


if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  const seen = new Map();
  for (let i = 1; i <= 500000; i++) {
    const u = crypto.randomUUID();
    const { h32, h64 } = pgHashTextBoth(u);
    if (seen.has(h32)) {
      const prev = seen.get(h32);
      if (prev.h64 !== h64) {
        console.log(
          JSON.stringify(
            {
              iterations: i,
              UUID_A: prev.uuid,
              UUID_B: u,
              hashtext32: h32,
              hashtextextended64_A: prev.h64,
              hashtextextended64_B: h64,
            },
            null,
            2
          )
        );
        process.exit(0);
      }
    }
    seen.set(h32, { uuid: u, h64 });
  }
  console.error('No collision found within 500,000 iterations');
  process.exit(1);
}
