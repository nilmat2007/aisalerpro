export interface SiteSettings {
  id: string
  site_name: string
  tagline: string
  description: string
  logo_url: string
  og_image_url: string | null
  updated_at: string
}

export interface Tool {
  id: string
  name: string
  slug: string
  icon: string
  poster_url: string | null
  logo_url: string | null
  password: string
  description: string | null
  price: string | null
  badge_text: string | null
  badge_color: string
  version: string
  is_active: boolean
  is_coming_soon: boolean
  sort_order: number
}

export interface GuideSection {
  id: string
  tool_id: string
  title: string
  icon: string
  description: string | null
  sort_order: number
  style_variant: string
  steps: GuideStep[]
}

export interface GuideStep {
  id: string
  section_id: string
  step_number: number
  label: string | null
  title: string | null
  content: string
  sub_items: string[] | null
  image_urls: string[] | null
  image_caption: string | null
  highlight_style: string
  code_block: string | null
  sort_order: number
}
