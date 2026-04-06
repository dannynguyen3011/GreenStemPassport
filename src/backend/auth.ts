/**
 * Supabase Auth helpers for API route authentication
 */
import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

export function createSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Supabase environment variables are not configured')
  }
  return createClient(url, key, { auth: { persistSession: false } })
}

export async function getAuthUser(
  req: NextRequest
): Promise<{ id: string; email: string } | null> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.slice(7)
  const supabase = createSupabaseClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token)

  if (error || !user) return null
  return { id: user.id, email: user.email ?? '' }
}

/**
 * Require auth — returns user or throws a 401 response.
 * Usage: const user = await requireAuth(req)
 */
export async function requireAuth(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) {
    throw new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return user
}

/**
 * Minimal admin check — reads ADMIN_USER_IDS env var (comma-separated UUIDs).
 */
export function isAdmin(userId: string): boolean {
  const admins = (process.env.ADMIN_USER_IDS ?? '').split(',').map((s) => s.trim())
  return admins.includes(userId)
}
