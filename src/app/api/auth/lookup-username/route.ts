/**
 * GET /api/auth/lookup-username?username=xxx
 * Public endpoint — returns the email associated with a username.
 * Used by the login page to support username-based login.
 */
import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db, schema } from '@/backend/db'

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get('username')?.toLowerCase().trim()

  if (!username) {
    return NextResponse.json({ error: 'username required' }, { status: 400 })
  }

  try {
    const rows = await db
      .select({ email: schema.userProfiles.email })
      .from(schema.userProfiles)
      .where(eq(schema.userProfiles.username, username))
      .limit(1)

    if (!rows.length || !rows[0].email) {
      return NextResponse.json({ error: 'Username not found' }, { status: 404 })
    }

    return NextResponse.json({ email: rows[0].email })
  } catch (e) {
    console.error('[lookup-username]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
