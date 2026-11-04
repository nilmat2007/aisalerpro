import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sanitizeToolForPublic, type Tool } from '@/lib/sanitize-tool';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_ENDPOINT = '/api/verify-password';

export function getClientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    return xff.split(',')[0].trim() || '127.0.0.1';
  }
  return request.headers.get('x-real-ip')?.trim() || '127.0.0.1';
}

export function hashIpHmac(ip: string): string {
  const raw = process.env.RATE_LIMIT_HMAC_KEY;
  if (!raw || raw.length < 32) {
    throw new Error('RATE_LIMIT_HMAC_KEY missing or too short');
  }
  return crypto.createHmac('sha256', raw).update(ip).digest('hex');
}

export async function checkRateLimit(
  ip: string,
  now = Date.now(),
  adminClient: any = supabaseAdmin
): Promise<boolean> {
  const ipHash = hashIpHmac(ip);
  const windowStartIso = new Date(now - RATE_LIMIT_WINDOW_MS).toISOString();

  const { data: attempts, error: selectError } = await adminClient
    .from('rate_limit_attempts')
    .select('id, created_at')
    .eq('ip_hash', ipHash)
    .eq('endpoint', RATE_LIMIT_ENDPOINT)
    .gte('created_at', windowStartIso)
    .order('created_at', { ascending: false });

  if (selectError) {
    console.error('[verify-password] Rate limit selectError (failing closed):', selectError);
    return false;
  }

  if (Array.isArray(attempts) && attempts.length >= RATE_LIMIT_MAX_ATTEMPTS) {
    return false;
  }

  const { error: insertError } = await adminClient.from('rate_limit_attempts').insert({
    ip_hash: ipHash,
    endpoint: RATE_LIMIT_ENDPOINT,
    created_at: new Date(now).toISOString(),
  });

  if (insertError) {
    console.error('[verify-password] Rate limit insertError (failing closed):', insertError);
    return false;
  }

  return true;
}

function logFailedAttempt(ip: string, reason: string, extra?: Record<string, unknown>) {
  console.warn('[verify-password] Failed attempt', {
    ip,
    timestamp: new Date().toISOString(),
    reason,
    ...extra,
  });
}

export async function POST(request: Request) {
  const ip = getClientIp(request);

  try {
    // 1. checkRateLimit() via supabaseAdmin (service_role)
    const allowed = await checkRateLimit(ip);
    if (!allowed) {
      logFailedAttempt(ip, 'rate_limit_exceeded');
      return NextResponse.json(
        { success: false, error: 'พยายามเกินกำหนด (สูงสุด 5 ครั้ง/นาที) กรุณารอสักครู่' },
        { status: 429 }
      );
    }

    // 2. validate body
    const { toolId, password } = await request.json();
    const cleanInput = String(password || '').trim();
    const normalizedKey = cleanInput.trim().toUpperCase();

    if (!toolId || !cleanInput) {
      logFailedAttempt(ip, 'missing_input', { toolId });
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกรหัสปลดล็อก' },
        { status: 400 }
      );
    }

    // 3. verify password / license key
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: tool, error: toolError } = await supabase
      .from('tools')
      .select(
        'id, name, slug, icon, poster_url, logo_url, password, description, price, badge_text, badge_color, version, is_active, is_coming_soon, sort_order, flow_url, trial_enabled, trial_flow_url, features'
      )
      .eq('id', toolId)
      .single();

    if (toolError || !tool) {
      logFailedAttempt(ip, 'tool_not_found', { toolId });
      return NextResponse.json(
        { success: false, error: 'ไม่พบเครื่องมือนี้' },
        { status: 400 }
      );
    }

    // 1. Check License Key first using normalizedKey (.trim().toUpperCase())
    const { data: licenseKey } = await supabase
      .from('license_keys')
      .select(
        'id, key_code, tool_id, package_type, status, activated_by, activated_email, activated_at, created_at'
      )
      .ilike('key_code', normalizedKey)
      .maybeSingle();

    if (licenseKey) {
      const matchesTool = !licenseKey.tool_id || licenseKey.tool_id === tool.id;
      if (!matchesTool) {
        logFailedAttempt(ip, 'wrong_tool_key', { toolId, keyId: licenseKey.id });
        return NextResponse.json(
          {
            success: false,
            error: 'รหัส License Key นี้เป็นของเครื่องมืออื่น กรุณานำไปกรอกที่หน้าแดชบอร์ดหลักครับ',
          },
          { status: 403 }
        );
      }

      // Row: expired -> 403 + วันหมดอายุ
      if (licenseKey.status === 'expired') {
        const expDate =
          (licenseKey as any).expires_at ||
          (licenseKey as any).expired_at ||
          licenseKey.activated_at ||
          '2026-01-01';
        logFailedAttempt(ip, 'license_expired', { keyId: licenseKey.id, expDate });
        return NextResponse.json(
          {
            success: false,
            error: `คีย์หมดอายุแล้ว (วันหมดอายุ: ${expDate})`,
            expiredAt: expDate,
          },
          { status: 403 }
        );
      }

      // Row: revoked -> 403 "ถูกยกเลิก"
      if (licenseKey.status === 'revoked') {
        logFailedAttempt(ip, 'license_revoked', { keyId: licenseKey.id });
        return NextResponse.json(
          {
            success: false,
            error: 'คีย์นี้ถูกยกเลิกการใช้งานแล้ว',
          },
          { status: 403 }
        );
      }

      // Row: activated + activated_by IS NULL -> 500 + log error (data corruption)
      if (licenseKey.status === 'activated' && !licenseKey.activated_by) {
        console.error('[verify-password] Data corruption: activated license has null activated_by', {
          ip,
          timestamp: new Date().toISOString(),
          keyId: licenseKey.id,
          toolId: tool.id,
        });
        return NextResponse.json(
          {
            success: false,
            error: 'Data corruption: activated license missing owner',
          },
          { status: 500 }
        );
      }

      // Row: tool.is_active === false -> 403 "ปิดปรับปรุง"
      if (!tool.is_active || tool.is_coming_soon) {
        logFailedAttempt(ip, 'tool_disabled', { toolId: tool.id });
        return NextResponse.json(
          {
            success: false,
            error: 'เครื่องมือนี้ปิดปรับปรุงชั่วคราว',
          },
          { status: 403 }
        );
      }

      // Row: activated | user = null | tool.is_active = true -> 401 "ต้องล็อกอิน"
      if (licenseKey.status === 'activated' && !user) {
        logFailedAttempt(ip, 'unauthenticated_activated_key', { keyId: licenseKey.id });
        return NextResponse.json(
          {
            success: false,
            error: 'ต้องล็อกอินก่อนใช้งานคีย์ที่เปิดใช้งานแล้ว',
          },
          { status: 401 }
        );
      }

      // Row: activated | user != owner | tool.is_active = true -> 403 "ไม่ใช่เจ้าของคีย์"
      if (licenseKey.status === 'activated' && user && licenseKey.activated_by !== user.id) {
        logFailedAttempt(ip, 'not_key_owner', {
          keyId: licenseKey.id,
          userId: user.id,
        });
        return NextResponse.json(
          {
            success: false,
            error: 'คุณไม่ใช่เจ้าของคีย์นี้',
          },
          { status: 403 }
        );
      }

      // Row: activated | user = owner | tool.is_active = true -> 200 + flow_url
      if (licenseKey.status === 'activated' && user && licenseKey.activated_by === user.id) {
        await supabase.from('user_tools').upsert(
          {
            user_id: user.id,
            tool_id: tool.id,
            license_key_id: licenseKey.id,
            is_active: true,
          },
          { onConflict: 'user_id,tool_id' }
        );

        const sanitizedTool = sanitizeToolForPublic(tool as unknown as Tool, {
          session: null,
          hasAccess: true,
          isTrial: false,
        });

        return NextResponse.json(
          {
            success: true,
            boundToAccount: true,
            flow_url: sanitizedTool.flow_url,
            tool: sanitizedTool,
          },
          { status: 200 }
        );
      }

      if (licenseKey.status === 'unused') {
        if (!user) {
          logFailedAttempt(ip, 'unauthenticated_unused_key', { keyId: licenseKey.id });
          return NextResponse.json(
            {
              success: false,
              error: 'ต้องล็อกอินก่อนเปิดใช้งาน License Key',
            },
            { status: 401 }
          );
        }

        // Atomic conditional activation + RPC + unique constraint upsert
        await supabase.rpc('activate_license', {
          p_key_code: normalizedKey,
          p_user_id: user.id,
        });

        await supabase
          .from('license_keys')
          .update({
            status: 'activated',
            activated_by: user.id,
            activated_email: user.email,
            activated_at: new Date().toISOString(),
          })
          .eq('id', licenseKey.id)
          .eq('status', 'unused');

        await supabase.from('user_tools').upsert(
          {
            user_id: user.id,
            tool_id: tool.id,
            license_key_id: licenseKey.id,
            is_active: true,
          },
          { onConflict: 'user_id,tool_id' }
        );

        const sanitizedTool = sanitizeToolForPublic(tool as unknown as Tool, {
          session: null,
          hasAccess: true,
          isTrial: false,
        });

        return NextResponse.json(
          {
            success: true,
            boundToAccount: true,
            flow_url: sanitizedTool.flow_url,
            tool: sanitizedTool,
          },
          { status: 200 }
        );
      }
    }

    // 2. Legacy tool password check
    if (!tool.is_active || tool.is_coming_soon) {
      logFailedAttempt(ip, 'tool_disabled', { toolId: tool.id });
      return NextResponse.json(
        {
          success: false,
          error: 'เครื่องมือนี้ปิดปรับปรุงชั่วคราว',
        },
        { status: 403 }
      );
    }

    const isPasswordMatch =
      Boolean(tool.password) &&
      tool.password !== 'none' &&
      tool.password.trim().toUpperCase() === normalizedKey;

    if (isPasswordMatch) {
      if (user) {
        await supabase.from('user_tools').upsert(
          {
            user_id: user.id,
            tool_id: tool.id,
            is_active: true,
          },
          { onConflict: 'user_id,tool_id' }
        );
      }

      const sanitizedTool = sanitizeToolForPublic(tool as unknown as Tool, {
        session: null,
        hasAccess: true,
        isTrial: false,
      });

      return NextResponse.json(
        {
          success: true,
          boundToAccount: Boolean(user),
          flow_url: sanitizedTool.flow_url,
          tool: sanitizedTool,
        },
        { status: 200 }
      );
    }

    logFailedAttempt(ip, 'invalid_credentials', { toolId: tool.id });
    return NextResponse.json(
      {
        success: false,
        error: '❌ รหัสไม่ถูกต้อง กรุณาตรวจสอบรหัสผ่านหรือ License Key อีกครั้ง',
      },
      { status: 401 }
    );
  } catch (err: any) {
    console.error('[verify-password] Unexpected error', {
      ip,
      timestamp: new Date().toISOString(),
      message: err?.message,
    });
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
