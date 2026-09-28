const FB_PAGE_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN || ''
const FB_PAGE_ID = process.env.FB_PAGE_ID || ''
const FB_API = 'https://graph.facebook.com/v21.0'

export interface FBContact {
  psid: string
  name?: string
  profile_pic?: string
  first_message_at?: string
  last_message_at?: string
  optin_token?: string
}

/**
 * Send a text message to a specific user via Facebook Messenger
 * Uses UPDATE type — works within 24-hour window of last user interaction
 */
export async function sendFBMessage(recipientPsid: string, text: string) {
  if (!FB_PAGE_TOKEN) {
    console.error('FB_PAGE_ACCESS_TOKEN not set')
    return { success: false, error: 'Token not set' }
  }

  try {
    const res = await fetch(`${FB_API}/me/messages?access_token=${FB_PAGE_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientPsid },
        message: { text },
        messaging_type: 'UPDATE'
      })
    })
    const data = await res.json()
    if (data.error) {
      return { success: false, error: data.error.message }
    }
    return { success: true, messageId: data.message_id }
  } catch (err: any) {
    console.error('FB send error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Send a message with buttons (CTA)
 */
export async function sendFBMessageWithButtons(
  recipientPsid: string,
  text: string,
  buttons: Array<{ title: string; url?: string; payload?: string }>
) {
  if (!FB_PAGE_TOKEN) return { success: false, error: 'Token not set' }

  const fbButtons = buttons.map(b => {
    if (b.url) {
      return { type: 'web_url', url: b.url, title: b.title }
    }
    return { type: 'postback', title: b.title, payload: b.payload || b.title }
  })

  try {
    const res = await fetch(`${FB_API}/me/messages?access_token=${FB_PAGE_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientPsid },
        message: {
          attachment: {
            type: 'template',
            payload: {
              template_type: 'button',
              text,
              buttons: fbButtons
            }
          }
        },
        messaging_type: 'UPDATE'
      })
    })
    const data = await res.json()
    if (data.error) return { success: false, error: data.error.message }
    return { success: true, messageId: data.message_id }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Send an Opt-In Card (Recurring Notifications / One-Time Notification)
 * Lets users give explicit permission to receive updates outside the 24-hour window
 */
export async function sendNotificationOptIn(
  recipientPsid: string,
  options?: {
    title?: string
    imageUrl?: string
    frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY'
    payload?: string
  }
) {
  if (!FB_PAGE_TOKEN) return { success: false, error: 'Token not set' }

  try {
    const res = await fetch(`${FB_API}/me/messages?access_token=${FB_PAGE_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientPsid },
        message: {
          attachment: {
            type: 'template',
            payload: {
              template_type: 'notification_messages',
              notification_messages_frequency: options?.frequency || 'WEEKLY',
              title: options?.title || 'รับข่าวสารโปรโมชั่นและอัปเดต AI',
              image_url: options?.imageUrl || 'https://guhdweujxgsbflkvgryb.supabase.co/storage/v1/object/public/tool-images/site_og_1788176699543.jpg',
              payload: options?.payload || 'OPTIN_PROMO_NEWS'
            }
          }
        }
      })
    })
    const data = await res.json()
    if (data.error) return { success: false, error: data.error.message }
    return { success: true, messageId: data.message_id }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Send message using a Notification Messages Token (Recurring Notifications)
 * Allowed by Meta outside the 24-hour window!
 */
export async function sendFBMessageUsingToken(token: string, text: string) {
  if (!FB_PAGE_TOKEN) return { success: false, error: 'Token not set' }

  try {
    const res = await fetch(`${FB_API}/me/messages?access_token=${FB_PAGE_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { notification_messages_token: token },
        message: { text }
      })
    })
    const data = await res.json()
    if (data.error) return { success: false, error: data.error.message }
    return { success: true, messageId: data.message_id }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Send a generic template (card with image, title, subtitle, buttons)
 */
export async function sendFBCard(
  recipientPsid: string,
  options: {
    title: string
    subtitle?: string
    imageUrl?: string
    buttons?: Array<{ title: string; url?: string; payload?: string }>
  }
) {
  if (!FB_PAGE_TOKEN) return { success: false, error: 'Token not set' }

  const fbButtons = (options.buttons || []).map(b => {
    if (b.url) return { type: 'web_url', url: b.url, title: b.title }
    return { type: 'postback', title: b.title, payload: b.payload || b.title }
  })

  const element: any = {
    title: options.title,
    subtitle: options.subtitle
  }
  if (options.imageUrl) element.image_url = options.imageUrl
  if (fbButtons.length > 0) element.buttons = fbButtons

  try {
    const res = await fetch(`${FB_API}/me/messages?access_token=${FB_PAGE_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientPsid },
        message: {
          attachment: {
            type: 'template',
            payload: {
              template_type: 'generic',
              elements: [element]
            }
          }
        },
        messaging_type: 'UPDATE'
      })
    })
    const data = await res.json()
    if (data.error) return { success: false, error: data.error.message }
    return { success: true, messageId: data.message_id }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Get user profile info from PSID
 */
export async function getFBUserProfile(psid: string) {
  if (!FB_PAGE_TOKEN) return null

  try {
    const res = await fetch(
      `${FB_API}/${psid}?fields=first_name,last_name,profile_pic&access_token=${FB_PAGE_TOKEN}`
    )
    const data = await res.json()
    if (data.error) return null
    return {
      name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
      profilePic: data.profile_pic
    }
  } catch {
    return null
  }
}

/**
 * Smart Broadcast:
 * - Prioritizes 24h active contacts (safe & 100% deliverable)
 * - Sends via notification tokens if available
 * - Gracefully skips contacts outside window without bombing Meta API
 */
export async function broadcastFBSmart(
  contacts: Array<{ psid: string; last_message_at?: string; optin_token?: string }>,
  text: string,
  buttons?: Array<{ title: string; url?: string; payload?: string }>
): Promise<{
  total: number
  sent: number
  skippedOutside24h: number
  failed: number
  errors: string[]
}> {
  let sent = 0
  let failed = 0
  let skippedOutside24h = 0
  const errors: string[] = []

  const now = Date.now()
  const ONE_DAY_MS = 24 * 60 * 60 * 1000

  for (const c of contacts) {
    const lastMsgTime = c.last_message_at ? new Date(c.last_message_at).getTime() : 0
    const isWithin24h = (now - lastMsgTime) < ONE_DAY_MS

    if (c.optin_token) {
      // 1. Try sending via Opt-in token (allowed outside 24h)
      const res = await sendFBMessageUsingToken(c.optin_token, text)
      if (res.success) {
        sent++
      } else {
        failed++
        errors.push(`${c.psid} (token): ${res.error}`)
      }
    } else if (isWithin24h) {
      // 2. Send via 24h UPDATE message
      let res
      if (buttons && buttons.length > 0) {
        res = await sendFBMessageWithButtons(c.psid, text, buttons)
      } else {
        res = await sendFBMessage(c.psid, text)
      }

      if (res.success) {
        sent++
      } else {
        failed++
        errors.push(`${c.psid}: ${res.error}`)
      }
    } else {
      // 3. Outside 24h and no token — skip safely to protect page standing
      skippedOutside24h++
    }

    // Rate limit
    await new Promise(r => setTimeout(r, 80))
  }

  return { total: contacts.length, sent, skippedOutside24h, failed, errors }
}
