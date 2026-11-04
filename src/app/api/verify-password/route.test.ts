import { describe, test, expect, beforeEach, vi } from 'vitest';

const mockGetUser = vi.fn();
const mockToolSingle = vi.fn();
const mockLicenseMaybeSingle = vi.fn();
const mockUserToolsUpsert = vi.fn();
const mockLicenseUpdateEqStatus = vi.fn();
const mockRpc = vi.fn();

interface RateLimitRow {
  id: string;
  ip_hash: string;
  endpoint: string;
  created_at: string;
}

let mockRateLimitRows: RateLimitRow[] = [];
let mockRateLimitSelectError: { message: string } | null = null;
let mockRateLimitInsertError: { message: string } | null = null;

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'rate_limit_attempts') {
        let filterIpHash = '';
        let filterEndpoint = '';
        let filterWindowStart = '';
        return {
          select: () => ({
            eq: (_col1: string, val1: string) => {
              filterIpHash = val1;
              return {
                eq: (_col2: string, val2: string) => {
                  filterEndpoint = val2;
                  return {
                    gte: (_col3: string, val3: string) => {
                      filterWindowStart = val3;
                      return {
                        order: () => {
                          if (mockRateLimitSelectError) {
                            return Promise.resolve({
                              data: null,
                              error: mockRateLimitSelectError,
                            });
                          }
                          const matched = mockRateLimitRows.filter(
                            (r) =>
                              r.ip_hash === filterIpHash &&
                              r.endpoint === filterEndpoint &&
                              new Date(r.created_at).getTime() >=
                                new Date(filterWindowStart).getTime()
                          );
                          return Promise.resolve({ data: matched, error: null });
                        },
                      };
                    },
                  };
                },
              };
            },
          }),
          insert: (row: Omit<RateLimitRow, 'id'>) => {
            if (mockRateLimitInsertError) {
              return Promise.resolve({
                data: null,
                error: mockRateLimitInsertError,
              });
            }
            mockRateLimitRows.push({
              id: `rl-${mockRateLimitRows.length + 1}`,
              ...row,
            });
            return Promise.resolve({ data: null, error: null });
          },
        };
      }
      return {};
    },
  },
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
    rpc: mockRpc,
    from: (table: string) => {
      if (table === 'tools') {
        return {
          select: () => ({
            eq: () => ({
              single: mockToolSingle,
            }),
          }),
        };
      }
      if (table === 'license_keys') {
        return {
          select: () => ({
            ilike: (_col: string, val: string) => ({
              maybeSingle: () => mockLicenseMaybeSingle(val),
            }),
          }),
          update: () => ({
            eq: () => ({
              eq: mockLicenseUpdateEqStatus,
            }),
          }),
        };
      }
      if (table === 'user_tools') {
        return {
          upsert: mockUserToolsUpsert,
        };
      }
      return {};
    },
  })),
}));

import { POST, hashIpHmac } from './route';

function makeRequest(body: Record<string, unknown>, ip = '10.0.0.1') {
  return new Request('http://localhost:3000/api/verify-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': ip,
    },
    body: JSON.stringify(body),
  });
}

const ACTIVE_TOOL = {
  id: 'tool-1',
  name: 'Pro Flow Tool',
  slug: 'pro-flow-tool',
  icon: '⚡',
  poster_url: null,
  logo_url: null,
  password: 'LEGACY-SECRET-PASSWORD',
  description: 'Test tool',
  price: '990',
  badge_text: 'PRO',
  badge_color: 'cyan',
  version: '2.0',
  is_active: true,
  is_coming_soon: false,
  sort_order: 1,
  flow_url: 'https://labs.google/fx/tools/flow/shared/tool/secret-1234',
  trial_enabled: true,
  trial_flow_url: 'https://labs.google/fx/tools/flow/shared/tool/trial-5678',
  features: {},
};

describe('POST /api/verify-password — Truth Table & Security Checks', () => {
  beforeEach(() => {
    mockRateLimitRows = [];
    mockRateLimitSelectError = null;
    mockRateLimitInsertError = null;
    vi.clearAllMocks();
    mockUserToolsUpsert.mockResolvedValue({ data: null, error: null });
    mockLicenseUpdateEqStatus.mockResolvedValue({ data: null, error: null });
    mockRpc.mockResolvedValue({ data: { success: true }, error: null });
  });

  test('Row 1: activated | user = null | tool.is_active = true → 401 "ต้องล็อกอิน" (no flow_url)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockToolSingle.mockResolvedValue({ data: ACTIVE_TOOL, error: null });
    mockLicenseMaybeSingle.mockResolvedValue({
      data: {
        id: 'key-1',
        key_code: 'PHM-AAAA-BBBB',
        tool_id: 'tool-1',
        status: 'activated',
        activated_by: 'owner-user-id',
        activated_email: 'owner@example.com',
      },
      error: null,
    });

    const res = await POST(makeRequest({ toolId: 'tool-1', password: '  phm-aaaa-bbbb  ' }));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toContain('ต้องล็อกอิน');
    expect(json).not.toHaveProperty('flow_url');
    expect(JSON.stringify(json)).not.toContain(ACTIVE_TOOL.flow_url);
  });

  test('Row 2: activated | user != owner | tool.is_active = true → 403 "ไม่ใช่เจ้าของคีย์" (no flow_url)', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'intruder-user-id', email: 'intruder@example.com' } },
    });
    mockToolSingle.mockResolvedValue({ data: ACTIVE_TOOL, error: null });
    mockLicenseMaybeSingle.mockResolvedValue({
      data: {
        id: 'key-1',
        key_code: 'PHM-AAAA-BBBB',
        tool_id: 'tool-1',
        status: 'activated',
        activated_by: 'owner-user-id',
        activated_email: 'owner@example.com',
      },
      error: null,
    });

    const res = await POST(makeRequest({ toolId: 'tool-1', password: 'PHM-AAAA-BBBB' }));
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toContain('ไม่ใช่เจ้าของคีย์');
    expect(json).not.toHaveProperty('flow_url');
    expect(JSON.stringify(json)).not.toContain(ACTIVE_TOOL.flow_url);
  });

  test('Row 3: activated | user = owner | tool.is_active = true → 200 + flow_url (and normalizes .trim().toUpperCase())', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'owner-user-id', email: 'owner@example.com' } },
    });
    mockToolSingle.mockResolvedValue({ data: ACTIVE_TOOL, error: null });
    mockLicenseMaybeSingle.mockImplementation((queriedKey: string) => {
      expect(queriedKey).toBe('PHM-AAAA-BBBB');
      return Promise.resolve({
        data: {
          id: 'key-1',
          key_code: 'PHM-AAAA-BBBB',
          tool_id: 'tool-1',
          status: 'activated',
          activated_by: 'owner-user-id',
          activated_email: 'owner@example.com',
        },
        error: null,
      });
    });

    const res = await POST(makeRequest({ toolId: 'tool-1', password: '  phm-aaaa-bbbb \n' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.flow_url).toBe(ACTIVE_TOOL.flow_url);
    expect(json.tool).not.toHaveProperty('password');
    expect(mockUserToolsUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'owner-user-id',
        tool_id: 'tool-1',
        license_key_id: 'key-1',
        is_active: true,
      }),
      { onConflict: 'user_id,tool_id' }
    );
  });

  test('Row 4: activated | any user | tool.is_active = false → 403 "ปิดปรับปรุง" (no flow_url)', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'owner-user-id', email: 'owner@example.com' } },
    });
    mockToolSingle.mockResolvedValue({
      data: { ...ACTIVE_TOOL, is_active: false },
      error: null,
    });
    mockLicenseMaybeSingle.mockResolvedValue({
      data: {
        id: 'key-1',
        key_code: 'PHM-AAAA-BBBB',
        tool_id: 'tool-1',
        status: 'activated',
        activated_by: 'owner-user-id',
        activated_email: 'owner@example.com',
      },
      error: null,
    });

    const res = await POST(makeRequest({ toolId: 'tool-1', password: 'PHM-AAAA-BBBB' }));
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toContain('ปิดปรับปรุง');
    expect(json).not.toHaveProperty('flow_url');
    expect(JSON.stringify(json)).not.toContain(ACTIVE_TOOL.flow_url);
  });

  test('Row 5: expired | any user | any tool.is_active → 403 + วันหมดอายุ (no flow_url)', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'owner-user-id', email: 'owner@example.com' } },
    });
    mockToolSingle.mockResolvedValue({ data: ACTIVE_TOOL, error: null });
    mockLicenseMaybeSingle.mockResolvedValue({
      data: {
        id: 'key-exp',
        key_code: 'PHM-EXPR-1111',
        tool_id: 'tool-1',
        status: 'expired',
        activated_by: 'owner-user-id',
        expires_at: '2026-10-31',
      },
      error: null,
    });

    const res = await POST(makeRequest({ toolId: 'tool-1', password: 'PHM-EXPR-1111' }));
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toContain('2026-10-31');
    expect(json).not.toHaveProperty('flow_url');
  });

  test('Row 6: revoked | any user | any tool.is_active → 403 "ถูกยกเลิก" (no flow_url)', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'owner-user-id', email: 'owner@example.com' } },
    });
    mockToolSingle.mockResolvedValue({ data: ACTIVE_TOOL, error: null });
    mockLicenseMaybeSingle.mockResolvedValue({
      data: {
        id: 'key-rev',
        key_code: 'PHM-REVK-2222',
        tool_id: 'tool-1',
        status: 'revoked',
        activated_by: 'owner-user-id',
      },
      error: null,
    });

    const res = await POST(makeRequest({ toolId: 'tool-1', password: 'PHM-REVK-2222' }));
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toContain('ถูกยกเลิก');
    expect(json).not.toHaveProperty('flow_url');
  });

  test('Row 7: activated + activated_by IS NULL | any user | any tool.is_active → 500 + log error (data corruption)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'owner-user-id', email: 'owner@example.com' } },
    });
    mockToolSingle.mockResolvedValue({ data: ACTIVE_TOOL, error: null });
    mockLicenseMaybeSingle.mockResolvedValue({
      data: {
        id: 'key-corrupt',
        key_code: 'PHM-NULL-9999',
        tool_id: 'tool-1',
        status: 'activated',
        activated_by: null,
      },
      error: null,
    });

    const res = await POST(makeRequest({ toolId: 'tool-1', password: 'PHM-NULL-9999' }));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(errorSpy).toHaveBeenCalled();
    expect(json).not.toHaveProperty('flow_url');
    errorSpy.mockRestore();
  });

  test('Rate limit: blocks 6th request within 1 minute from same IP with 429 and logs IP + timestamp', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockToolSingle.mockResolvedValue({ data: ACTIVE_TOOL, error: null });
    mockLicenseMaybeSingle.mockResolvedValue({ data: null, error: null });

    const clientIp = '203.0.113.77';
    const expectedHash = hashIpHmac(clientIp);
    expect(expectedHash).toMatch(/^[a-f0-9]{64}$/);
    expect(expectedHash).not.toContain(clientIp);

    for (let i = 0; i < 5; i++) {
      const r = await POST(makeRequest({ toolId: 'tool-1', password: 'WRONG' }, clientIp));
      expect(r.status).toBe(401);
    }

    expect(mockRateLimitRows).toHaveLength(5);
    expect(mockRateLimitRows[0].ip_hash).toBe(expectedHash);
    expect(mockRateLimitRows[0].endpoint).toBe('/api/verify-password');

    const sixthRes = await POST(makeRequest({ toolId: 'tool-1', password: 'WRONG' }, clientIp));
    const sixthJson = await sixthRes.json();

    expect(sixthRes.status).toBe(429);
    expect(sixthJson).not.toHaveProperty('flow_url');
    expect(warnSpy).toHaveBeenCalledWith(
      '[verify-password] Failed attempt',
      expect.objectContaining({
        ip: clientIp,
        timestamp: expect.any(String),
      })
    );
    warnSpy.mockRestore();
  });

  test('RED-A (1): checkRateLimit fails closed (429) when selectError occurs', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockRateLimitSelectError = { message: 'Could not find the table public.rate_limit_attempts' };

    const res = await POST(makeRequest({ toolId: 'tool-1', password: 'PHM-AAAA-BBBB' }, '198.51.100.10'));
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(json).not.toHaveProperty('flow_url');
    expect(errorSpy).toHaveBeenCalledWith(
      '[verify-password] Rate limit selectError (failing closed):',
      mockRateLimitSelectError
    );
    errorSpy.mockRestore();
  });

  test('RED-A (2): checkRateLimit fails closed (429) when insertError occurs', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockRateLimitInsertError = { message: 'insert into rate_limit_attempts failed' };

    const res = await POST(makeRequest({ toolId: 'tool-1', password: 'PHM-AAAA-BBBB' }, '198.51.100.11'));
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(json).not.toHaveProperty('flow_url');
    expect(errorSpy).toHaveBeenCalledWith(
      '[verify-password] Rate limit insertError (failing closed):',
      mockRateLimitInsertError
    );
    errorSpy.mockRestore();
  });
});
