/**
 * GET  /api/opportunities  — List verified STEM opportunities with filters
 * POST /api/opportunities  — (Admin only) Create new opportunity
 *
 * Filters: type, field_tag, scope, is_free, is_online, upcoming_only
 * BA §2.6 — Kho Cơ Hội STEM
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { and, eq, gte, sql } from 'drizzle-orm'
import { db, schema } from '@/backend/db'
import { requireAuth, isAdmin } from '@/backend/auth'

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req)

    const { searchParams } = new URL(req.url)

    // Build filter conditions
    const conditions = [
      // Only show admin-verified entries (BA §2.6.1)
      eq(schema.opportunities.admin_verified, true),
    ]

    // Hide past deadlines (BA §2.6.1: "Ẩn entry nếu deadline đã qua")
    const upcomingOnly = searchParams.get('upcoming_only') !== 'false'
    if (upcomingOnly) {
      conditions.push(gte(schema.opportunities.deadline, new Date()))
    }

    if (searchParams.get('type')) {
      conditions.push(
        eq(
          schema.opportunities.type,
          searchParams.get('type') as 'competition' | 'scholarship' | 'workshop' | 'summer_program'
        )
      )
    }

    if (searchParams.get('scope')) {
      conditions.push(
        eq(
          schema.opportunities.scope,
          searchParams.get('scope') as 'international' | 'national' | 'regional'
        )
      )
    }

    if (searchParams.get('is_free') !== null) {
      conditions.push(
        eq(schema.opportunities.is_free, searchParams.get('is_free') === 'true')
      )
    }

    if (searchParams.get('is_online') !== null) {
      conditions.push(
        eq(schema.opportunities.is_online, searchParams.get('is_online') === 'true')
      )
    }

    // field_tag filter (any match in the array)
    const fieldTag = searchParams.get('field_tag')
    if (fieldTag) {
      conditions.push(
        sql`${schema.opportunities.field_tags} @> ARRAY[${fieldTag}]::text[]`
      )
    }

    const rows = await db
      .select()
      .from(schema.opportunities)
      .where(and(...conditions))
      .orderBy(schema.opportunities.deadline)

    return NextResponse.json(rows)
  } catch (e) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const createOpportunitySchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(['competition', 'scholarship', 'workshop', 'summer_program']),
  field_tags: z.array(z.string()).min(1),
  scope: z.enum(['international', 'national', 'regional']),
  is_online: z.boolean(),
  is_free: z.boolean(),
  deadline: z.string().datetime(),
  source_url: z.string().url(),
  description: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req)

    if (!isAdmin(user.id)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = createOpportunitySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }

    const d = parsed.data
    const [inserted] = await db
      .insert(schema.opportunities)
      .values({
        name: d.name,
        type: d.type,
        field_tags: d.field_tags,
        scope: d.scope,
        is_online: d.is_online,
        is_free: d.is_free,
        deadline: new Date(d.deadline),
        source_url: d.source_url,
        description: d.description,
        admin_verified: false, // requires explicit approval
      })
      .returning()

    return NextResponse.json(inserted, { status: 201 })
  } catch (e) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
