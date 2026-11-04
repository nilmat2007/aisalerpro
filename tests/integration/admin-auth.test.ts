import { describe, test, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createToken } from '@/lib/auth';
import { proxy } from '@/proxy';

let currentCookieToken: string | undefined = undefined;
const mockCookieSet = vi.fn();

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) =>
      name === 'admin_token' && currentCookieToken
        ? { name: 'admin_token', value: currentCookieToken }
        : undefined,
    getAll: () =>
      currentCookieToken ? [{ name: 'admin_token', value: currentCookieToken }] : [],
    set: mockCookieSet,
    delete: vi.fn(),
  })),
}));

vi.mock('@/lib/supabase', () => {
  const createChain = (defaultData: any = []) => {
    const result = { data: defaultData, error: null, count: 0 };
    const chain: any = {
      select: () => chain,
      eq: () => chain,
      order: () => chain,
      limit: () => chain,
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      single: () => Promise.resolve({ data: { id: 'mock-id' }, error: null }),
      then: (onFulfilled?: any, onRejected?: any) =>
        Promise.resolve(result).then(onFulfilled, onRejected),
    };
    return chain;
  };
  return {
    supabase: {
      rpc: vi.fn(async (fnName: string, args: any) => {
        if (fnName === 'verify_admin' && args?.p_username === 'admin' && args?.p_password === 'correct-pass') {
          return { data: true, error: null };
        }
        return { data: false, error: null };
      }),
      from: () => createChain([]),
    },
  };
});

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: 'admin-1', email: 'admin@puppap.ai' } },
        error: null,
      })),
    },
  })),
}));

import { GET as getTrials } from '@/app/api/admin/trials/route';
import { GET as getTrialById } from '@/app/api/admin/trials/[id]/route';
import { GET as getOrders } from '@/app/api/admin/orders/route';
import { GET as getMembers } from '@/app/api/admin/members/route';
import { GET as getLicenses } from '@/app/api/admin/licenses/route';
import { GET as getNotifyUpdate } from '@/app/api/admin/notify-update/route';
import { GET as getFbBroadcast } from '@/app/api/admin/facebook/broadcast/route';
import { GET as getDebugAuth } from '@/app/api/debug-auth/route';
import { POST as postAdminAuth } from '@/app/api/auth/route';

const ADMIN_ROUTES = [
  '/api/admin/trials',
  '/api/admin/trials/xxx',
  '/api/admin/orders',
  '/api/admin/members',
  '/api/admin/licenses',
  '/api/admin/notify-update',
  '/api/admin/facebook/broadcast',
  '/api/debug-auth',
] as const;

async function invokeRouteHandler(route: (typeof ADMIN_ROUTES)[number], token?: string) {
  currentCookieToken = token;
  const url = `http://localhost:3000${route}`;
  const headers = new Headers();
  if (token) {
    headers.set('cookie', `admin_token=${token}`);
  }
  const req = new NextRequest(url, { headers });

  // 1. Check proxy/middleware layer first
  const proxyRes = await proxy(req);
  if (proxyRes.status === 401 || proxyRes.status === 403) {
    return proxyRes;
  }

  // 2. Invoke route handler directly (tests requireAdmin() inside each route)
  switch (route) {
    case '/api/admin/trials':
      return getTrials();
    case '/api/admin/trials/xxx':
      return getTrialById(req, { params: Promise.resolve({ id: 'xxx' }) });
    case '/api/admin/orders':
      return getOrders();
    case '/api/admin/members':
      return getMembers();
    case '/api/admin/licenses':
      return getLicenses();
    case '/api/admin/notify-update':
      return getNotifyUpdate();
    case '/api/admin/facebook/broadcast':
      return getFbBroadcast(req);
    case '/api/debug-auth':
      return getDebugAuth(req);
  }
}

describe('Admin Routes & Proxy Defense-in-Depth Auth Tests', () => {
  beforeEach(() => {
    currentCookieToken = undefined;
  });

  for (const route of ADMIN_ROUTES) {
    test(`${route} → 401 no cookie`, async () => {
      const res = await invokeRouteHandler(route, undefined);
      expect(res.status).toBe(401);
    });

    test(`${route} → 401 fake cookie`, async () => {
      const res = await invokeRouteHandler(route, 'fake-forged-jwt-token-value');
      expect(res.status).toBe(401);
    });

    test(`${route} → 403 user cookie (non-admin)`, async () => {
      const userToken = await createToken({
        username: 'member_user',
        role: 'member',
        is_admin: false,
      });
      const res = await invokeRouteHandler(route, userToken);
      expect(res.status).toBe(403);
    });

    test(`${route} → 200 admin cookie`, async () => {
      const adminToken = await createToken({
        username: 'superadmin',
        role: 'admin',
        is_admin: true,
      });
      const res = await invokeRouteHandler(route, adminToken);
      expect(res.status).toBe(200);
    });
  }

  test('AMBER-A: POST /api/auth (200 login) intercepts cookies().set() and asserts { httpOnly: true, secure: true, sameSite: "lax", path: "/" } in production', async () => {
    mockCookieSet.mockClear();
    vi.stubEnv('NODE_ENV', 'production');

    try {
      const req = new Request('http://localhost:3000/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'correct-pass' }),
      });
      const res = await postAdminAuth(req);
      expect(res.status).toBe(200);

      expect(mockCookieSet).toHaveBeenCalledTimes(1);
      expect(mockCookieSet).toHaveBeenCalledWith(
        'admin_token',
        expect.any(String),
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          path: '/',
        })
      );
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
