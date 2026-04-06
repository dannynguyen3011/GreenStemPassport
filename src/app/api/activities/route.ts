/**
 * GET  /api/activities    — List all activities for the authenticated user
 * POST /api/activities    — Create a new STAR activity
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq, asc } from 'drizzle-orm'
import { db, schema } from '@/backend/db'
import { requireAuth } from '@/backend/auth'
import { extractTechTags, scoreStar } from '@/backend/nlp-tagger'

// STAR validation rules from BA §2.2.1
const activitySchema = z.object({
  category: z.enum([
    'scholarship',
    'competition',
    'extracurricular',
    'research',
    'self_learning',
    'green_ethics',
  ]),
  title: z.string().min(1).max(200),
  star_situation: z.string().min(30, 'Situation phải ≥ 30 ký tự'),
  star_task: z.string().min(30, 'Task phải ≥ 30 ký tự'),
  star_action: z.string().min(50, 'Action phải ≥ 50 ký tự (hard rule)'),
  star_result: z.string().min(30, 'Result phải ≥ 30 ký tự'),
  slot_order: z.number().int().min(1).max(10).nullable().optional(),
  artifact_url: z.string().url().nullable().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req)

    const rows = await db
      .select()
      .from(schema.activities)
      .where(eq(schema.activities.user_id, user.id))
      .orderBy(asc(schema.activities.created_at))

    return NextResponse.json(rows)
  } catch (e) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    const body = await req.json()
    const parsed = activitySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 422 }
      )
    }

    const data = parsed.data

    // Auto-tag tech stack from action field (BA §2.2.3)
    const tech_tags = extractTechTags(
      `${data.star_action} ${data.star_situation} ${data.star_result}`
    )

    // Heuristic base_score (BA §2.2.5)
    const base_score = scoreStar({
      star_situation: data.star_situation,
      star_task: data.star_task,
      star_action: data.star_action,
      star_result: data.star_result,
      trust_tier: 1,
      tech_tags,
    })

    // If slot_order is provided, check for uniqueness first
    if (data.slot_order !== null && data.slot_order !== undefined) {
      const existing = await db
        .select({ slot_order: schema.activities.slot_order })
        .from(schema.activities)
        .where(eq(schema.activities.user_id, user.id))
      const slotTaken = existing.some((a) => a.slot_order === data.slot_order)
      if (slotTaken) {
        return NextResponse.json(
          { error: `Slot ${data.slot_order} đã được sử dụng. Chọn slot khác.` },
          { status: 409 }
        )
      }
    }

    const [inserted] = await db
      .insert(schema.activities)
      .values({
        user_id: user.id,
        category: data.category,
        title: data.title,
        star_situation: data.star_situation,
        star_task: data.star_task,
        star_action: data.star_action,
        star_result: data.star_result,
        trust_tier: 1,
        tech_tags,
        base_score: base_score.toString(),
        slot_order: data.slot_order ?? null,
        artifact_url: data.artifact_url ?? null,
      })
      .returning()

    return NextResponse.json(inserted, { status: 201 })
  } catch (e) {
    if (e instanceof Response) return e
    console.error(e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
