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
  example_video_url?: string;
  example_video_title?: string;
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

export type PublicTool = Omit<Tool, 'password' | 'flow_url' | 'trial_flow_url' | 'demo_video_url'> & {
  flow_url?: string;
  trial_flow_url?: string;
  demo_video_url?: string | null;
  password?: never;
};

export type PublicLesson = Omit<Lesson, 'video_url' | 'example_video_url' | 'prompts'> & {
  video_url: string | 'locked';
  example_video_url?: string | 'locked';
  prompts: any | null;
  promptStepCount: number;
};

// IMPORTANT: Whenever you add a new sensitive field that gets stripped or masked here
// (e.g., flow_url, trial_flow_url, demo_video_url, password, features.guide_drive_url,
// features.lessons[].video_url = 'locked', features.lessons[].prompts = null),
// you MUST also update `mergePreservedSensitiveToolFields()` below (used by `PUT /api/tools/[id]`)
// so admin edits never overwrite real DB values with sanitized placeholders.
export function sanitizeLessonForPublic(
  lesson: Lesson,
  opts: { hasAccess: boolean; isFreePreview: boolean }
): PublicLesson {
  const { video_url, example_video_url, prompts, ...rest } = lesson || ({} as Lesson);

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
    ...(example_video_url
      ? { example_video_url: canViewVideo ? example_video_url : 'locked' }
      : {}),
    prompts: opts.hasAccess ? (prompts ?? null) : null,
    promptStepCount,
  };
}

// IMPORTANT: Keep `mergePreservedSensitiveToolFields()` in sync with any field stripped/masked here.
export function sanitizeToolForPublic(
  tool: Tool,
  opts: { session: Session | null; hasAccess: boolean; isTrial: boolean }
): PublicTool {
  const {
    password: _password,
    flow_url,
    trial_flow_url,
    demo_video_url,
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
      // Keep guide_drive_url in DB as admin backup only — never expose on public/member responses
      delete featObj.guide_drive_url;
      if (!opts.hasAccess) {
        delete featObj.tutorial_video_url;
      }
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

  if (opts.hasAccess && demo_video_url) {
    result.demo_video_url = demo_video_url;
  }

  if (opts.isTrial && !opts.hasAccess && trial_flow_url) {
    result.trial_flow_url = trial_flow_url;
  }

  return result;
}

const PROTECTED_SYSTEM_SLUGS = new Set([
  'puppap-all-in-one',
  'tiktok-ai-affiliate',
  'puppap-fashion-studio',
  'puppap-ugc-product',
]);

/**
 * Belt-and-suspenders guard for `PUT /api/tools/[id]` so that if a client ever submits
 * a partially sanitized payload (e.g. `video_url === 'locked'`, `prompts === null`,
 * missing `guide_drive_url` / `demo_video_url`, or an auto-mangled Thai `slug`),
 * real DB values are preserved.
 */
export function mergePreservedSensitiveToolFields(
  existingTool: Record<string, any> | null | undefined,
  updateData: Record<string, any>
): Record<string, any> {
  if (!existingTool) return updateData;
  const merged = { ...updateData };

  // Never allow core system slugs (or the All-in-One row ID) to have their slug overwritten,
  // and never allow an existing valid slug to be replaced by a mangled hyphen-stripped slug (e.g. "-799-ai-").
  if (existingTool.id === '422e791a-a8f5-4821-9ae2-097adfcfa4d5') {
    merged.slug = 'puppap-all-in-one';
  } else if (
    typeof existingTool.slug === 'string' &&
    existingTool.slug.trim() &&
    (PROTECTED_SYSTEM_SLUGS.has(existingTool.slug) ||
      typeof merged.slug !== 'string' ||
      !merged.slug.trim() ||
      merged.slug.startsWith('-') ||
      merged.slug.endsWith('-'))
  ) {
    merged.slug = existingTool.slug;
  }

  if (merged.flow_url === null && existingTool.flow_url) {
    merged.flow_url = existingTool.flow_url;
  }
  if (merged.trial_flow_url === null && existingTool.trial_flow_url) {
    merged.trial_flow_url = existingTool.trial_flow_url;
  }
  if (merged.demo_video_url === undefined && existingTool.demo_video_url) {
    merged.demo_video_url = existingTool.demo_video_url;
  }
  if ((merged.password === 'none' || !merged.password) && existingTool.password && existingTool.password !== 'none') {
    merged.password = existingTool.password;
  }

  const existingFeat =
    existingTool.features && typeof existingTool.features === 'object' && !Array.isArray(existingTool.features)
      ? existingTool.features
      : null;
  const incomingFeat =
    merged.features && typeof merged.features === 'object' && !Array.isArray(merged.features)
      ? { ...merged.features }
      : null;

  if (existingFeat && incomingFeat) {
    if (incomingFeat.guide_drive_url === undefined && existingFeat.guide_drive_url) {
      incomingFeat.guide_drive_url = existingFeat.guide_drive_url;
    }
    if (incomingFeat.bundle_bonus_slugs === undefined && existingFeat.bundle_bonus_slugs) {
      incomingFeat.bundle_bonus_slugs = existingFeat.bundle_bonus_slugs;
    }
    if (incomingFeat.bundle_with_course === undefined && existingFeat.bundle_with_course) {
      incomingFeat.bundle_with_course = existingFeat.bundle_with_course;
    }
    if (incomingFeat.highlights === undefined && existingFeat.highlights) {
      incomingFeat.highlights = existingFeat.highlights;
    }
    if (incomingFeat.original_price === undefined && existingFeat.original_price) {
      incomingFeat.original_price = existingFeat.original_price;
    }
    if (
      incomingFeat.exclude_from_all_in_one === undefined &&
      existingFeat.exclude_from_all_in_one !== undefined
    ) {
      incomingFeat.exclude_from_all_in_one = existingFeat.exclude_from_all_in_one;
    }
    if (Array.isArray(incomingFeat.lessons) && Array.isArray(existingFeat.lessons)) {
      const existingById = new Map<number, any>(
        existingFeat.lessons.map((l: any) => [Number(l.id), l])
      );
      incomingFeat.lessons = incomingFeat.lessons.map((incLesson: any) => {
        const orig = existingById.get(Number(incLesson?.id));
        if (!orig) return incLesson;
        return {
          ...orig,
          ...incLesson,
          video_url:
            !incLesson.video_url || incLesson.video_url === 'locked'
              ? orig.video_url
              : incLesson.video_url,
          example_video_url:
            !incLesson.example_video_url || incLesson.example_video_url === 'locked'
              ? orig.example_video_url
              : incLesson.example_video_url,
          example_video_title:
            incLesson.example_video_title !== undefined
              ? incLesson.example_video_title
              : orig.example_video_title,
          prompts:
            incLesson.prompts === null || incLesson.prompts === undefined
              ? orig.prompts
              : incLesson.prompts,
          flow_tool_slug:
            incLesson.flow_tool_slug !== undefined
              ? incLesson.flow_tool_slug
              : orig.flow_tool_slug,
        };
      });
    }
    merged.features = incomingFeat;
  }

  return merged;
}

// ============================================================================
// Safe Accessor Helpers for UI Components (prevents raw sensitive field access)
// ============================================================================

export function getLessonVideoLink(lesson: any): string {
  const raw = lesson?.video_url;
  if (!raw || raw === 'locked') return '';
  return String(raw);
}

export function getLessonExampleVideoLink(lesson: any): string {
  const raw = lesson?.example_video_url;
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
  return getToolTutorialEmbedUrl(url);
}

export function getLessonExampleEmbedUrl(lesson: any): string {
  const url = getLessonExampleVideoLink(lesson);
  return getToolTutorialEmbedUrl(url);
}

export function getToolTutorialEmbedUrl(rawUrl?: string | null): string {
  const url = rawUrl ? String(rawUrl).trim() : '';
  if (!url || url === 'locked') return '';

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
