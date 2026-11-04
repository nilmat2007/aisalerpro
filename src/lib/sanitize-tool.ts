import type { Session } from '@/lib/auth';

export interface PromptPreset {
  label: string;
  value: string;
}

export interface LessonPromptStep {
  step: string;
  app?: string;
  instruction?: string;
  prompt: string;
  tip?: string;
  editable_label?: string;
  editable_placeholder?: string;
  default_variable?: string;
  presets?: PromptPreset[];
}

export interface Lesson {
  id: number;
  slug?: string;
  module_id?: number;
  module_title?: string;
  module_desc?: string;
  title: string;
  description: string;
  video_url: string;
  duration?: string;
  status: 'ready' | 'coming_soon';
  is_free_preview: boolean;
  flow_tool_slug?: string;
  key_points?: string[];
  prompts?: LessonPromptStep[] | string | null;
  promptStepCount?: number;
}

export interface Tool {
  id: string;
  name: string;
  slug: string;
  icon: string;
  poster_url: string | null;
  logo_url: string | null;
  password?: string;
  description: string | null;
  price: string | null;
  badge_text: string | null;
  badge_color: string;
  version: string;
  is_active: boolean;
  is_coming_soon: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
  flow_url?: string | null;
  trial_enabled?: boolean;
  trial_flow_url?: string | null;
  features?: Record<string, any> | string[] | null;
  demo_video_url?: string | null;
  contact_url?: string | null;
  youtube_url?: string | null;
  [key: string]: any;
}

/**
 * Explicit allow-list of columns to select from `tools` for public routes
 * (Notice: `password` is never selected in public queries).
 */
export const PUBLIC_TOOL_SELECT_COLUMNS =
  'id, name, slug, icon, poster_url, logo_url, description, price, badge_text, badge_color, version, is_active, is_coming_soon, sort_order, created_at, updated_at, features, demo_video_url, contact_url, youtube_url, trial_enabled, flow_url, trial_flow_url';

/**
 * Explicit allow-list of columns to select from `tools` for admin routes.
 */
export const ADMIN_TOOL_SELECT_COLUMNS =
  'id, name, slug, icon, poster_url, logo_url, password, description, price, badge_text, badge_color, version, is_active, is_coming_soon, sort_order, created_at, updated_at, features, demo_video_url, contact_url, youtube_url, trial_enabled, flow_url, trial_flow_url';

export type PublicTool = Omit<Tool, 'password' | 'flow_url' | 'trial_flow_url'> & {
  flow_url?: string;
  trial_flow_url?: string;
  password?: never;
};

export type PublicLesson = Omit<Lesson, 'video_url' | 'prompts'> & {
  video_url: string | 'locked';
  prompts: any | null;
  promptStepCount: number;
};

export function sanitizeLessonForPublic(
  lesson: Lesson,
  opts: { hasAccess: boolean; isFreePreview: boolean }
): PublicLesson {
  const { video_url, prompts, ...rest } = lesson || ({} as Lesson);

  const promptStepCount = Array.isArray(prompts)
    ? prompts.length
    : typeof prompts === 'string' && prompts.trim().length > 0
      ? 1
      : typeof lesson?.promptStepCount === 'number'
        ? lesson.promptStepCount
        : 0;

  const canViewVideo = Boolean(opts.hasAccess || opts.isFreePreview);

  return {
    ...rest,
    video_url: canViewVideo ? (video_url || '') : 'locked',
    prompts: opts.hasAccess ? (prompts ?? null) : null,
    promptStepCount,
  };
}

export function sanitizeToolForPublic(
  tool: Tool,
  opts: { session: Session | null; hasAccess: boolean; isTrial: boolean }
): PublicTool {
  const {
    password: _password,
    flow_url,
    trial_flow_url,
    api_key: _apiKey,
    secret: _secret,
    webhook_url: _webhookUrl,
    internal_notes: _internalNotes,
    cost_price: _costPrice,
    ...allowedFields
  } = (tool || {}) as Tool & Record<string, any>;

  const sanitizedFeatures = (() => {
    if (
      allowedFields.features &&
      typeof allowedFields.features === 'object' &&
      !Array.isArray(allowedFields.features)
    ) {
      const featObj = { ...allowedFields.features };
      if (Array.isArray(featObj.lessons)) {
        featObj.lessons = featObj.lessons.map((l: Lesson) =>
          sanitizeLessonForPublic(l, {
            hasAccess: opts.hasAccess,
            isFreePreview: Boolean(l?.is_free_preview),
          })
        );
      }
      return featObj;
    }
    return allowedFields.features;
  })();

  const result: PublicTool = {
    ...allowedFields,
    features: sanitizedFeatures,
  };

  if (opts.hasAccess && flow_url) {
    result.flow_url = flow_url;
  }

  if (opts.isTrial && !opts.hasAccess && trial_flow_url) {
    result.trial_flow_url = trial_flow_url;
  }

  return result;
}

// ============================================================================
// Safe Accessor Helpers for UI Components (prevents raw sensitive field access)
// ============================================================================

export function getLessonVideoLink(lesson: any): string {
  const raw = lesson?.video_url;
  if (!raw || raw === 'locked') return '';
  return String(raw);
}

export function hasLessonVideoLink(lesson: any): boolean {
  const link = getLessonVideoLink(lesson);
  return link.trim().length > 0;
}

export function withLessonVideoLink<T extends Record<string, any>>(lesson: T, url: string): T {
  return {
    ...lesson,
    video_url: url,
  };
}

export function getLessonEmbedUrl(lesson: any): string {
  const url = getLessonVideoLink(lesson);
  if (!url) return '';

  const driveMatch =
    url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/) ||
    url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (driveMatch && driveMatch[1]) {
    return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
  }

  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([\w-]{11})/);
  const videoId = match && match[1] ? match[1] : null;
  if (videoId) {
    return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&iv_load_policy=3&playsinline=1&controls=1&disablekb=0`;
  }
  if (url.includes('youtube.com/embed/') || url.includes('youtube-nocookie.com/embed/')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}rel=0&modestbranding=1&iv_load_policy=3&playsinline=1`;
  }
  return url;
}

export function getToolFlowLink(tool: any): string {
  return tool?.flow_url ? String(tool.flow_url) : '';
}

export function getToolTrialFlowLink(tool: any): string {
  return tool?.trial_flow_url ? String(tool.trial_flow_url) : '';
}

export function getToolSecretCode(tool: any): string {
  return tool?.password ? String(tool.password) : '';
}

export function createDefaultToolFormState() {
  return {
    name: '',
    slug: '',
    icon: '📦',
    poster_url: '',
    logo_url: '',
    secret_code: '',
    description: '',
    price: '',
    badge_text: '',
    badge_color: 'cyan',
    version: '1.0',
    is_active: true,
    is_coming_soon: false,
    sort_order: 0,
    flow_link: '',
    demo_video_url: '',
    contact_url: '',
    youtube_url: '',
    features: '' as string,
    trial_enabled: false,
    trial_flow_link: '',
  };
}

export function mapToolToFormState(tool: any) {
  return {
    name: tool.name || '',
    slug: tool.slug || '',
    icon: tool.icon || '📦',
    poster_url: tool.poster_url || '',
    logo_url: tool.logo_url || '',
    secret_code: tool.password || '',
    description: tool.description || '',
    price: tool.price || '',
    badge_text: tool.badge_text || '',
    badge_color: tool.badge_color || 'cyan',
    version: tool.version || '1.0',
    is_active: tool.is_active ?? true,
    is_coming_soon: tool.is_coming_soon ?? false,
    sort_order: tool.sort_order || 0,
    flow_link: tool.flow_url || '',
    demo_video_url: tool.demo_video_url || '',
    contact_url: tool.contact_url || '',
    youtube_url: tool.youtube_url || '',
    features: Array.isArray(tool.features) ? tool.features.join('\n') : '',
    trial_enabled: tool.trial_enabled ?? false,
    trial_flow_link: tool.trial_flow_url || '',
  };
}

export function mapFormStateToToolPayload(form: ReturnType<typeof createDefaultToolFormState>) {
  const { secret_code, flow_link, trial_flow_link, features, ...rest } = form;
  return {
    ...rest,
    password: secret_code,
    flow_url: flow_link,
    trial_flow_url: trial_flow_link,
    features: features
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean),
  };
}

export function buildAdminToolSavePayload(
  cleanFormData: Record<string, any>,
  featuresPayload: Record<string, any>
) {
  const { secret_code, flow_link, trial_flow_link, ...rest } = cleanFormData;
  return {
    ...rest,
    password: secret_code || '',
    flow_url: flow_link || '',
    trial_flow_url: trial_flow_link || '',
    features: featuresPayload,
  };
}
