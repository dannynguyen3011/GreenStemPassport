/**
 * GET /api/mentor   — List active, verified mentors
 * Query params: school, expertise_tag
 */
import { NextRequest, NextResponse } from 'next/server'
import { and, eq, sql } from 'drizzle-orm'
import { db, schema } from '@/db'
import { requireAuth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req)

    const { searchParams } = new URL(req.url)
    const conditions = [
      eq(schema.mentors.is_active, true),
      eq(schema.mentors.verified, true),
    ]

    if (searchParams.get('school')) {
      conditions.push(eq(schema.mentors.school, searchParams.get('school')!))
    }

    const expertiseTag = searchParams.get('expertise_tag')
    if (expertiseTag) {
      conditions.push(
        sql`${schema.mentors.expertise_tags} @> ARRAY[${expertiseTag}]::text[]`
      )
    }

    const rows = await db
      .select()
      .from(schema.mentors)
      .where(and(...conditions))
      .orderBy(schema.mentors.rating)

    return NextResponse.json(rows)
  } catch (e) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
