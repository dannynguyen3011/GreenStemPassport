/**
 * GET    /api/activities/[activityId]   — Get single activity
 * PUT    /api/activities/[activityId]   — Update activity (re-runs NLP + scoring)
 * DELETE /api/activities/[activityId]   — Delete activity
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db, schema } from '@/db'
import { requireAuth } from '@/lib/auth'
import { extractTechTags, scoreStar } from '@/lib/nlp-tagger'

const updateSchema = z.object({
  category: z
    .enum(['scholarship', 'competition', 'extracurricular', 'research', 'self_learning', 'green_ethics'])
    .optional(),
  title: z.string().min(1).max(200).optional(),
  star_situation: z.string().min(30).optional(),
  star_task: z.string().min(30).optional(),
  star_action: z.string().min(50).optional(),
  star_result: z.string().min(30).optional(),
  slot_order: z.number().int().min(1).max(10).nullable().optional(),
  artifact_url: z.string().url().nullable().optional(),
})

type Params = { params: Promise<{ activityId: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req)
    const { activityId } = await params

    const rows = await db
      .select()
      .from(schema.activities)
      .where(
        and(
          eq(schema.activities.activity_id, activityId),
          eq(schema.activities.user_id, user.id)
        )
      )
      .limit(1)

    if (!rows.length) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }
    return NextResponse.json(rows[0])
  } catch (e) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req)
    const { activityId } = await params
    const body = await req.json()
    const parsed = updateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }

    // Fetch current row to merge with partial update
    const [current] = await db
      .select()
      .from(schema.activities)
      .where(
        and(
          eq(schema.activities.activity_id, activityId),
          eq(schema.activities.user_id, user.id)
        )
      )
      .limit(1)

    if (!current) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    const d = parsed.data
    const merged = {
      star_action: d.star_action ?? current.star_action,
      star_situation: d.star_situation ?? current.star_situation,
      star_task: d.star_task ?? current.star_task,
      star_result: d.star_result ?? current.star_result,
      trust_tier: current.trust_tier,
    }

    // Re-run NLP and scoring if any STAR field changed
    const tech_tags = extractTechTags(
      `${merged.star_action} ${merged.star_situation} ${merged.star_result}`
    )
    const base_score = scoreStar({ ...merged, tech_tags })

    const updates: Record<string, unknown> = { tech_tags, base_score: base_score.toString() }
    if (d.category !== undefined) updates.category = d.category
    if (d.title !== undefined) updates.title = d.title
    if (d.star_situation !== undefined) updates.star_situation = d.star_situation
    if (d.star_task !== undefined) updates.star_task = d.star_task
    if (d.star_action !== undefined) updates.star_action = d.star_action
    if (d.star_result !== undefined) updates.star_result = d.star_result
    if (d.slot_order !== undefined) updates.slot_order = d.slot_order
    if (d.artifact_url !== undefined) updates.artifact_url = d.artifact_url

    const [updated] = await db
      .update(schema.activities)
      .set(updates)
      .where(
        and(
          eq(schema.activities.activity_id, activityId),
          eq(schema.activities.user_id, user.id)
        )
      )
      .returning()

    return NextResponse.json(updated)
  } catch (e) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req)
    const { activityId } = await params

    const deleted = await db
      .delete(schema.activities)
      .where(
        and(
          eq(schema.activities.activity_id, activityId),
          eq(schema.activities.user_id, user.id)
        )
      )
      .returning()

    if (!deleted.length) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
