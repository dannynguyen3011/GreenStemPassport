/**
 * POST /api/ocs/calculate
 *
 * On-demand OCS calculation (BA §2.2.5)
 * Used for real-time preview as student rearranges slots.
 * Body: { activities?: Activity[], target_major?: TargetMajor }
 * If activities omitted: loads from DB for the authenticated user.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db, schema } from '@/backend/db'
import { requireAuth } from '@/backend/auth'
import { calculateOCS } from '@/shared/ocs'
import type { Activity } from '@/types'

const requestSchema = z.object({
  target_major: z.enum(['cntt', 'toan_thong_ke']).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    const body = await req.json().catch(() => ({}))
    const parsed = requestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }

    // Load profile for target_major
    const [profileRow] = await db
      .select()
      .from(schema.userProfiles)
      .where(eq(schema.userProfiles.user_id, user.id))
      .limit(1)

    const targetMajor =
      parsed.data.target_major ??
      ((profileRow?.target_major ?? 'cntt') as 'cntt' | 'toan_thong_ke')

    // Load activities from DB
    const activityRows = await db
      .select()
      .from(schema.activities)
      .where(eq(schema.activities.user_id, user.id))

    const activities: Activity[] = activityRows.map((a) => ({
      activity_id: a.activity_id,
      user_id: a.user_id,
      category: a.category as Activity['category'],
      title: a.title,
      star_situation: a.star_situation,
      star_task: a.star_task,
      star_action: a.star_action,
      star_result: a.star_result,
      trust_tier: a.trust_tier as 1 | 2 | 3,
      trust_verified_by: a.trust_verified_by,
      tech_tags: a.tech_tags ?? [],
      base_score: a.base_score ? parseFloat(a.base_score) : 1.0,
      slot_order: a.slot_order,
      artifact_url: a.artifact_url,
      created_at: a.created_at.toISOString(),
    }))

    const result = calculateOCS(activities, targetMajor)

    // T-Shape distribution for radar chart
    const tshapeDistribution: Record<string, number> = {}
    for (const item of result.breakdown) {
      const activity = activities.find((a) => a.activity_id === item.activity_id)
      if (activity) {
        const cat = activity.category
        tshapeDistribution[cat] = (tshapeDistribution[cat] ?? 0) + item.final_score
      }
    }

    return NextResponse.json({
      ...result,
      target_major: targetMajor,
      tshape_distribution: tshapeDistribution,
      slotted_count: activities.filter((a) => a.slot_order !== null).length,
    })
  } catch (e) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
