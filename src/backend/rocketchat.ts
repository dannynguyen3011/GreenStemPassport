/**
 * Rocket.Chat notification helper
 *
 * Posts messages to a Rocket.Chat channel via Incoming Webhook.
 * Configure ROCKETCHAT_WEBHOOK_URL in .env.local (full URL including token).
 *
 * Design choices:
 * - Silently no-op if ROCKETCHAT_WEBHOOK_URL is unset (so dev without
 *   Rocket.Chat running doesn't crash routes).
 * - Never throws — notification failures must NOT propagate to the user.
 * - 5s timeout via AbortSignal so a hung webhook can't stall API routes.
 */

type NotifyField = {
  title: string
  value: string
  short?: boolean
}

type NotifyOptions = {
  text: string
  fields?: NotifyField[]
  color?: 'good' | 'warning' | 'danger' | string // accepts hex (#3b82f6) too
  channel?: string // override the channel configured in Rocket.Chat
}

export async function notifyAdmin(opts: NotifyOptions): Promise<void> {
  const url = process.env.ROCKETCHAT_WEBHOOK_URL
  if (!url) return

  const payload: Record<string, unknown> = {
    text: opts.text,
    channel: opts.channel,
  }

  if (opts.fields && opts.fields.length > 0) {
    payload.attachments = [
      {
        color: opts.color ?? '#3b82f6',
        fields: opts.fields,
      },
    ]
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      console.error('[rocketchat] webhook returned', res.status, await res.text())
    }
  } catch (err) {
    console.error('[rocketchat] notification failed:', err)
  }
}
