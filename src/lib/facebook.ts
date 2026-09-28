const FB_PAGE_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN || ''
const FB_PAGE_ID = process.env.FB_PAGE_ID || ''
const FB_API = 'https://graph.facebook.com/v21.0'

export interface FBContact {
  psid: string
  name?: string
  profile_pic?: string
  first_message_at?: string
  last_message_at?: string
}

/**
 * Send a text message to a specific user via Facebook Messenger
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
        messaging_type: 'MESSAGE_TAG',
        tag: 'post_purchase_update'
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
        messaging_type: 'MESSAGE_TAG',
        tag: 'post_purchase_update'
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
        messaging_type: 'MESSAGE_TAG',
        tag: 'post_purchase_update'
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
 * Broadcast a message to multiple PSIDs
 */
export async function broadcastFBMessage(
  psids: string[],
  text: string,
  buttons?: Array<{ title: string; url?: string; payload?: string }>
): Promise<{ total: number; sent: number; failed: number; errors: string[] }> {
  let sent = 0
  let failed = 0
  const errors: string[] = []

  for (const psid of psids) {
    let result
    if (buttons && buttons.length > 0) {
      result = await sendFBMessageWithButtons(psid, text, buttons)
    } else {
      result = await sendFBMessage(psid, text)
    }

    if (result.success) {
      sent++
    } else {
      failed++
      errors.push(`${psid}: ${result.error}`)
    }

    // Rate limit: 200 calls per hour per page
    await new Promise(r => setTimeout(r, 100))
  }

  return { total: psids.length, sent, failed, errors }
}
