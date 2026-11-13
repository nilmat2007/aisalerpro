import crypto from 'crypto';
import { supabase as supabaseAdmin } from '@/lib/supabase';

export interface AiSlipConfig {
  ai_slip_enabled: boolean;
  gemini_api_key: string;
  slipok_api_url: string;
  slipok_api_key: string;
  max_slip_age_minutes: number;
  receiver_name_keywords: string[];
  receiver_account_digits: string;
  admin_bypass_enabled: boolean;
  admin_bypass_emails: string[];
}

export interface MaskedAiSlipConfig {
  ai_slip_enabled: boolean;
  has_gemini_key: boolean;
  gemini_key_masked: string;
  slipok_api_url: string;
  has_slipok_key: boolean;
  slipok_key_masked: string;
  max_slip_age_minutes: number;
  admin_bypass_enabled: boolean;
  admin_bypass_emails: string[];
}

const CONFIG_BUCKET = 'slips';
const CONFIG_PATH = '_config/ai_slip_settings_v1.enc';

const DEFAULT_ADMIN_BYPASS_EMAILS = ['nilmat2007@gmail.com', 'nilmat200757@gmail.com'];

const DEFAULT_CONFIG: AiSlipConfig = {
  ai_slip_enabled: true,
  gemini_api_key: process.env.GEMINI_API_KEY || '',
  slipok_api_url: process.env.SLIPOK_API_URL || '',
  slipok_api_key: process.env.SLIPOK_API_KEY || '',
  max_slip_age_minutes: 30,
  receiver_name_keywords: [
    'ภีมฑพัฒน์',
    'ภีมทพัฒน์',
    'นิลมาตย์',
    'PHEEMTHAPHAT',
    'PHEEMTAPAT',
    'NILMAT',
  ],
  receiver_account_digits: '0905556356',
  admin_bypass_enabled: false,
  admin_bypass_emails: DEFAULT_ADMIN_BYPASS_EMAILS,
};

let _cachedConfig: AiSlipConfig | null = null;
let _cachedAtMs = 0;
const CACHE_TTL_MS = 10_000;

function getEncryptionKey(): Buffer {
  const raw = process.env.ADMIN_JWT_SECRET;
  if (!raw || raw.length < 32) throw new Error('ADMIN_JWT_SECRET missing or too short');
  return crypto.scryptSync(raw, 'puppap-slip-config-salt-v1', 32);
}

function encryptPayload(plainText: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `v1:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptPayload(token: string): string | null {
  try {
    const parts = token.trim().split(':');
    if (parts.length !== 4 || parts[0] !== 'v1') return null;
    const key = getEncryptionKey();
    const iv = Buffer.from(parts[1], 'hex');
    const authTag = Buffer.from(parts[2], 'hex');
    const encrypted = Buffer.from(parts[3], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    return null;
  }
}

export function maskSecretKey(secret: string): string {
  if (!secret || secret.trim().length < 8) return '';
  const clean = secret.trim();
  return `${clean.slice(0, 6)}••••••••${clean.slice(-4)}`;
}

export async function getAiSlipConfig(opts?: { bypassCache?: boolean }): Promise<AiSlipConfig> {
  if (!opts?.bypassCache && _cachedConfig && Date.now() - _cachedAtMs < CACHE_TTL_MS) {
    return _cachedConfig;
  }

  try {
    const { data, error } = await supabaseAdmin.storage
      .from(CONFIG_BUCKET)
      .download(CONFIG_PATH);

    if (error || !data) {
      const fallback: AiSlipConfig = {
        ...DEFAULT_CONFIG,
        gemini_api_key: process.env.GEMINI_API_KEY || '',
        slipok_api_url: process.env.SLIPOK_API_URL || '',
        slipok_api_key: process.env.SLIPOK_API_KEY || '',
      };
      _cachedConfig = fallback;
      _cachedAtMs = Date.now();
      return fallback;
    }

    const rawText = await data.text();
    const jsonStr = decryptPayload(rawText);
    if (!jsonStr) {
      return { ...DEFAULT_CONFIG };
    }

    const parsed = JSON.parse(jsonStr);
    const result: AiSlipConfig = {
      ai_slip_enabled:
        typeof parsed.ai_slip_enabled === 'boolean' ? parsed.ai_slip_enabled : true,
      gemini_api_key: parsed.gemini_api_key || process.env.GEMINI_API_KEY || '',
      slipok_api_url: parsed.slipok_api_url || process.env.SLIPOK_API_URL || '',
      slipok_api_key: parsed.slipok_api_key || process.env.SLIPOK_API_KEY || '',
      max_slip_age_minutes: Number(parsed.max_slip_age_minutes) || 30,
      receiver_name_keywords: DEFAULT_CONFIG.receiver_name_keywords,
      receiver_account_digits: DEFAULT_CONFIG.receiver_account_digits,
      admin_bypass_enabled:
        typeof parsed.admin_bypass_enabled === 'boolean' ? parsed.admin_bypass_enabled : false,
      admin_bypass_emails: Array.isArray(parsed.admin_bypass_emails)
        ? parsed.admin_bypass_emails.map((e: any) => String(e || '').trim().toLowerCase()).filter(Boolean)
        : DEFAULT_ADMIN_BYPASS_EMAILS,
    };
    _cachedConfig = result;
    _cachedAtMs = Date.now();
    return result;
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export async function isAdminBypassActiveForEmail(email?: string | null): Promise<boolean> {
  if (!email) return false;
  const cleanEmail = String(email).trim().toLowerCase();
  if (!cleanEmail) return false;
  try {
    const cfg = await getAiSlipConfig();
    if (!cfg.admin_bypass_enabled) return false;
    const allowed = Array.isArray(cfg.admin_bypass_emails) && cfg.admin_bypass_emails.length > 0
      ? cfg.admin_bypass_emails
      : DEFAULT_ADMIN_BYPASS_EMAILS;
    return allowed.includes(cleanEmail);
  } catch {
    return false;
  }
}

export async function getMaskedAiSlipConfig(): Promise<MaskedAiSlipConfig> {
  const cfg = await getAiSlipConfig({ bypassCache: true });
  return {
    ai_slip_enabled: cfg.ai_slip_enabled,
    has_gemini_key: Boolean(cfg.gemini_api_key && cfg.gemini_api_key.trim().length > 10),
    gemini_key_masked: maskSecretKey(cfg.gemini_api_key),
    slipok_api_url: cfg.slipok_api_url || '',
    has_slipok_key: Boolean(cfg.slipok_api_key && cfg.slipok_api_key.trim().length > 4),
    slipok_key_masked: maskSecretKey(cfg.slipok_api_key),
    max_slip_age_minutes: cfg.max_slip_age_minutes || 30,
    admin_bypass_enabled: Boolean(cfg.admin_bypass_enabled),
    admin_bypass_emails: cfg.admin_bypass_emails || DEFAULT_ADMIN_BYPASS_EMAILS,
  };
}

export async function saveAiSlipConfig(updates: {
  ai_slip_enabled?: boolean;
  gemini_api_key?: string;
  slipok_api_url?: string;
  slipok_api_key?: string;
  max_slip_age_minutes?: number;
  admin_bypass_enabled?: boolean;
  admin_bypass_emails?: string[] | string;
}): Promise<MaskedAiSlipConfig> {
  const current = await getAiSlipConfig({ bypassCache: true });

  const parsedEmails = (() => {
    if (Array.isArray(updates.admin_bypass_emails)) {
      const list = updates.admin_bypass_emails
        .map((e) => String(e || '').trim().toLowerCase())
        .filter(Boolean);
      return list.length > 0 ? list : DEFAULT_ADMIN_BYPASS_EMAILS;
    }
    if (typeof updates.admin_bypass_emails === 'string') {
      const list = updates.admin_bypass_emails
        .split(/[\s,;]+/)
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
      return list.length > 0 ? list : DEFAULT_ADMIN_BYPASS_EMAILS;
    }
    return current.admin_bypass_emails || DEFAULT_ADMIN_BYPASS_EMAILS;
  })();

  const nextConfig: AiSlipConfig = {
    ...current,
    ai_slip_enabled:
      typeof updates.ai_slip_enabled === 'boolean'
        ? updates.ai_slip_enabled
        : current.ai_slip_enabled,
    gemini_api_key:
      updates.gemini_api_key !== undefined && updates.gemini_api_key !== '__KEEP__'
        ? updates.gemini_api_key.trim()
        : current.gemini_api_key,
    slipok_api_url:
      updates.slipok_api_url !== undefined
        ? updates.slipok_api_url.trim()
        : current.slipok_api_url,
    slipok_api_key:
      updates.slipok_api_key !== undefined && updates.slipok_api_key !== '__KEEP__'
        ? updates.slipok_api_key.trim()
        : current.slipok_api_key,
    max_slip_age_minutes:
      updates.max_slip_age_minutes !== undefined
        ? Math.max(5, Math.min(1440, Number(updates.max_slip_age_minutes) || 30))
        : current.max_slip_age_minutes,
    admin_bypass_enabled:
      typeof updates.admin_bypass_enabled === 'boolean'
        ? updates.admin_bypass_enabled
        : Boolean(current.admin_bypass_enabled),
    admin_bypass_emails: parsedEmails,
  };

  const encrypted = encryptPayload(JSON.stringify(nextConfig));
  const buffer = Buffer.from(encrypted, 'utf8');

  const { error } = await supabaseAdmin.storage
    .from(CONFIG_BUCKET)
    .upload(CONFIG_PATH, buffer, {
      contentType: 'text/plain; charset=utf-8',
      upsert: true,
    });

  if (error) {
    throw new Error(`บันทึกการตั้งค่า AI ไม่สำเร็จ: ${error.message}`);
  }

  _cachedConfig = nextConfig;
  _cachedAtMs = Date.now();

  return {
    ai_slip_enabled: nextConfig.ai_slip_enabled,
    has_gemini_key: Boolean(nextConfig.gemini_api_key && nextConfig.gemini_api_key.length > 10),
    gemini_key_masked: maskSecretKey(nextConfig.gemini_api_key),
    slipok_api_url: nextConfig.slipok_api_url,
    has_slipok_key: Boolean(nextConfig.slipok_api_key && nextConfig.slipok_api_key.length > 4),
    slipok_key_masked: maskSecretKey(nextConfig.slipok_api_key),
    max_slip_age_minutes: nextConfig.max_slip_age_minutes,
    admin_bypass_enabled: Boolean(nextConfig.admin_bypass_enabled),
    admin_bypass_emails: nextConfig.admin_bypass_emails,
  };
}
