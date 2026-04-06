/**
 * POST /api/compass/analyze
 *
 * Compass Engine — Traffic Light Matching (BA §2.3)
 * Body: { profile: UserProfile, activities: Activity[] }
 * Returns: CompassResult[] for all target schools
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db, schema } from '@/backend/db'
import { requireAuth } from '@/backend/auth'
import { analyzeCompass, detectUnrealisticGoal } from '@/shared/matching'
import { calculateOCS } from '@/shared/ocs'
import type { UserProfile, Activity } from '@/types'

const requestSchema = z.object({
  // Optional: if omitted, will be fetched from DB for the authenticated user
  use_demo: z.boolean().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    const body = await req.json().catch(() => ({}))
    const parsed = requestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }

    // Load profile and activities from DB
    const [profileRow] = await db
      .select()
      .from(schema.userProfiles)
      .where(eq(schema.userProfiles.user_id, user.id))
      .limit(1)

    if (!profileRow) {
      return NextResponse.json(
        { error: 'Hồ sơ không tồn tại. Vui lòng tạo hồ sơ trước.' },
        { status: 404 }
      )
    }

    const activityRows = await db
      .select()
      .from(schema.activities)
      .where(eq(schema.activities.user_id, user.id))

    // Map DB rows to domain types
    const profile: UserProfile = {
      user_id: profileRow.user_id,
      display_name: profileRow.display_name,
      grade: profileRow.grade as 10 | 11 | 12,
      school_name: profileRow.school_name,
      province: profileRow.province,
      gpa: profileRow.gpa ? parseFloat(profileRow.gpa) : null,
      sat_score: profileRow.sat_score,
      ielts_score: profileRow.ielts_score ? parseFloat(profileRow.ielts_score) : null,
      target_major: (profileRow.target_major ?? 'cntt') as 'cntt' | 'toan_thong_ke',
      target_schools: profileRow.target_schools ?? [],
    }

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

    // Run matching + OCS
    const compassResults = analyzeCompass(profile, activities)
    const ocsResult = calculateOCS(activities, profile.target_major)

    // Unrealistic goal warning
    const warning = detectUnrealisticGoal(profile)

    return NextResponse.json({
      compass: compassResults,
      ocs: ocsResult,
      warning,
      meta: {
        total_activities: activities.length,
        slotted_activities: activities.filter((a) => a.slot_order !== null).length,
        last_updated: new Date().toISOString(),
      },
    })
  } catch (e) {
    if (e instanceof Response) return e
    console.error('[compass/analyze]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
