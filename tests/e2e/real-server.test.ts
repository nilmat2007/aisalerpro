import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { execSync, spawn, type ChildProcess } from 'node:child_process';
import crypto from 'node:crypto';
import net from 'node:net';
import { SignJWT } from 'jose';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase/admin';

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;
let serverProcess: ChildProcess | null = null;

function getAdminJwtSecret(): Uint8Array {
  const raw = process.env.ADMIN_JWT_SECRET;
  if (!raw || raw.length < 32) throw new Error('ADMIN_JWT_SECRET missing or too short');
  return new TextEncoder().encode(raw);
}

function isPortOccupied(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = net
      .createServer()
      .once('error', () => resolve(true))
      .once('listening', () => {
        tester.close(() => resolve(false));
      })
      .listen(port);
  });
}

describe('Real Production Server E2E Security & Leak Tests (Port 3100)', () => {
  beforeAll(async () => {
    // 1. Probe port 3100 before starting; if occupied -> throw error (no skip path)
    const occupied = await isPortOccupied(PORT);
    if (occupied) {
      throw new Error(`Port ${PORT} is already occupied before spawning production server`);
    }

    // 2. Build production bundle first
    execSync('npm run build', {
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: 'production' },
      stdio: 'inherit',
    });

    // 3. Spawn production server on port 3100
    serverProcess = spawn('npm', ['run', 'start'], {
      cwd: process.cwd(),
      shell: process.platform === 'win32',
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: String(PORT),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stderrLog = '';
    serverProcess.stderr?.on('data', (chunk) => {
      stderrLog += chunk.toString();
    });

    // 4. Readiness check against /api/health within 30s
    const deadline = Date.now() + 30_000;
    let ready = false;

    while (Date.now() < deadline) {
      if (serverProcess.exitCode !== null) {
        throw new Error(
          `Production server exited prematurely with code ${serverProcess.exitCode}: ${stderrLog}`
        );
      }
      try {
        const res = await fetch(`${BASE_URL}/api/health`);
        if (res.status === 200) {
          ready = true;
          break;
        }
      } catch {
        // Server not ready yet
      }
      await new Promise((r) => setTimeout(r, 500));
    }

    if (!ready) {
      serverProcess.kill('SIGTERM');
      throw new Error(`Timed out waiting 30s for /api/health on port ${PORT}. Stderr: ${stderrLog}`);
    }
  }, 180_000);

  afterAll(async () => {
    if (!serverProcess) return;
    const pid = serverProcess.pid;

    if (serverProcess.exitCode === null) {
      serverProcess.kill('SIGTERM');
      await new Promise((r) => setTimeout(r, 2000));
    }

    if (serverProcess.exitCode === null) {
      try {
        serverProcess.kill('SIGKILL');
      } catch {
        // Ignore if already exited
      }
    }

    if (process.platform === 'win32' && pid) {
      try {
        execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
      } catch {
        // Process already exited
      }
    }
  }, 30_000);

  test('GET /api/health → 200 OK', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  test('GET /api/admin/trials with 4 JWT tokens → 200 (admin), 403 (member), 401 (expired), 401 (wrong-secret), and 401 (no-cookie)', async () => {
    const secret = getAdminJwtSecret();

    // 1. admin token -> 200
    const adminToken = await new SignJWT({
      username: 'admin',
      role: 'admin',
      is_admin: true,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .sign(secret);

    // 2. member token (is_admin: false) -> 403
    const memberToken = await new SignJWT({
      username: 'member',
      role: 'member',
      is_admin: false,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .sign(secret);

    // 3. expired token -> 401
    const expiredToken = await new SignJWT({
      username: 'admin',
      role: 'admin',
      is_admin: true,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
      .sign(secret);

    // 4. wrong-secret token -> 401
    const wrongSecretToken = await new SignJWT({
      username: 'admin',
      role: 'admin',
      is_admin: true,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode('wrong-secret-key-that-is-at-least-32-chars-long'));

    const resAdmin = await fetch(`${BASE_URL}/api/admin/trials`, {
      headers: { Cookie: `admin_token=${adminToken}` },
    });
    expect(resAdmin.status).toBe(200);

    const resMember = await fetch(`${BASE_URL}/api/admin/trials`, {
      headers: { Cookie: `admin_token=${memberToken}` },
    });
    expect(resMember.status).toBe(403);

    const resExpired = await fetch(`${BASE_URL}/api/admin/trials`, {
      headers: { Cookie: `admin_token=${expiredToken}` },
    });
    expect(resExpired.status).toBe(401);

    const resWrongSecret = await fetch(`${BASE_URL}/api/admin/trials`, {
      headers: { Cookie: `admin_token=${wrongSecretToken}` },
    });
    expect(resWrongSecret.status).toBe(401);

    const resNoCookie = await fetch(`${BASE_URL}/api/admin/trials`);
    expect(resNoCookie.status).toBe(401);
  });

  test('GET /api/tools → 200 and leaks zero password, flow_url, or trial_flow_url keys', async () => {
    const res = await fetch(`${BASE_URL}/api/tools`);
    expect(res.status).toBe(200);
    const rawText = await res.text();
    expect(rawText).not.toMatch(/"(password|flow_url|trial_flow_url)"/);
  });

  test('GET /course/tiktok-ai-affiliate → 200 and contains only the 1 free preview lesson Google Drive file ID', async () => {
    const res = await fetch(`${BASE_URL}/course/tiktok-ai-affiliate`);
    expect(res.status).toBe(200);
    const html = await res.text();

    const matches = [...html.matchAll(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/g)];
    const uniqueDriveIds = new Set(matches.map((m) => m[1]));

    // Must contain ONLY Lesson 1's free preview Drive ID (176lrTuyL191x7iMBykblw-D_ZXu7urS8)
    expect(uniqueDriveIds.size).toBe(1);
    expect([...uniqueDriveIds]).toEqual(['176lrTuyL191x7iMBykblw-D_ZXu7urS8']);

    // Locked lesson Drive IDs (e.g. Lesson 2, Lesson 3) must NOT be in HTML
    expect(html).not.toContain('1oa_a3dx4liAZodf46VIFO-HAhMY1wyyv');
    expect(html).not.toContain('11-9AfT8YR6GFwKsaCYj6LCKjRtKPwHhO');
  });

  test('GET /_next/static/chunks/main.js.map → 404 (productionBrowserSourceMaps: false)', async () => {
    const res = await fetch(`${BASE_URL}/_next/static/chunks/main.js.map`);
    expect(res.status).toBe(404);
  });

  test('POST /api/auth → Set-Cookie includes HttpOnly, SameSite=Lax, and Secure in production', async () => {
    const res = await fetch(`${BASE_URL}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(401);
    const setCookie = res.headers.get('set-cookie') || '';
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Lax/i);
    expect(setCookie).toMatch(/Secure/i);
  });

  test('/api/verify-password 6th request returns 429 not 200', async () => {
    const ip = '198.51.100.99';
    const hmacKey = process.env.RATE_LIMIT_HMAC_KEY!;
    const ipHash = crypto.createHmac('sha256', hmacKey).update(ip).digest('hex');

    // Reset prior test rows for this IP using supabaseAdmin (service_role)
    await supabaseAdmin.from('rate_limit_attempts').delete().eq('ip_hash', ipHash);

    for (let i = 0; i < 5; i++) {
      const r = await fetch(`${BASE_URL}/api/verify-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
        body: JSON.stringify({ toolId: 'invalid', password: 'x' }),
      });
      expect([400, 401, 403]).toContain(r.status);
    }
    const sixth = await fetch(`${BASE_URL}/api/verify-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
      body: JSON.stringify({ toolId: 'invalid', password: 'x' }),
    });
    expect(sixth.status).toBe(429);

    // Cleanup test rows after verification using supabaseAdmin (service_role)
    await supabaseAdmin.from('rate_limit_attempts').delete().eq('ip_hash', ipHash);
  });

  test('anon cannot DELETE rate_limit_attempts (RLS blocks bypass)', async () => {
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { error } = await anonClient
      .from('rate_limit_attempts')
      .delete()
      .eq('ip_hash', 'any');
    expect(error).not.toBeNull();
  });
});
