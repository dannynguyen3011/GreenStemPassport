/**
 * POST /api/mentor/connect
 *
 * Consent-based Mentor Connection (BA §2.7.2)
 * Creates a connection between student and mentor WITH explicit consent.
 * Once connected, mentor can see Portfolio 10-Slot (anonymised name/phone).
 *
 * Body: { mentor_id: string, consent: true }
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db, schema } from '@/backend/db'
import { requireAuth } from '@/backend/auth'
import { calculateOCS } from '@/shared/ocs'
import { analyzeCompass } from '@/shared/matching'
import type { Activity, UserProfile } from '@/types'

const connectSchema = z.object({
  mentor_id: z.string().uuid(),
  consent: z.literal(true, 'Bạn phải đồng ý chia sẻ hồ sơ để kết nối.'),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    const body = await req.json()
    const parsed = connectSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }

    const { mentor_id } = parsed.data

    // Verify mentor exists and is active
    const [mentor] = await db
      .select()
      .from(schema.mentors)
      .where(and(eq(schema.mentors.mentor_id, mentor_id), eq(schema.mentors.is_active, true)))
      .limit(1)

    if (!mentor) {
      return NextResponse.json({ error: 'Mentor không tồn tại hoặc không hoạt động.' }, { status: 404 })
    }

    // Prevent duplicate connections
    const [existing] = await db
      .select()
      .from(schema.mentorConnections)
      .where(
        and(
          eq(schema.mentorConnections.student_id, user.id),
          eq(schema.mentorConnections.mentor_id, mentor_id)
        )
      )
      .limit(1)

    if (existing) {
      return NextResponse.json(
        { error: 'Bạn đã kết nối với Mentor này rồi.' },
        { status: 409 }
      )
    }

    const [connection] = await db
      .insert(schema.mentorConnections)
      .values({
        student_id: user.id,
        mentor_id,
        consented: true,
      })
      .returning()

    // Build AI Profile Digest for Mentor (BA §2.7.1)
    const [profileRow] = await db
      .select()
      .from(schema.userProfiles)
      .where(eq(schema.userProfiles.user_id, user.id))
      .limit(1)

    const activityRows = await db
      .select()
      .from(schema.activities)
      .where(eq(schema.activities.user_id, user.id))

    let profileDigest = null
    if (profileRow && activityRows.length > 0) {
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

      const ocsResult = calculateOCS(activities, profile.target_major)
      const compassResults = analyzeCompass(profile, activities)

      // Top 3 strongest activities by final_score
      const top3 = [...ocsResult.breakdown]
        .sort((a, b) => b.final_score - a.final_score)
        .slice(0, 3)
        .map((item) => ({
          title: item.title,
          final_score: item.final_score,
        }))

      // Key gaps from target schools
      const keyGaps = compassResults
        .flatMap((r) => r.gaps.filter((g) => !g.passed))
        .slice(0, 3)
        .map((g) => g.action_suggestion)

      // Mentor question suggestions based on gaps
      const mentorQuestions = keyGaps.map(
        (gap, i) => `${i + 1}. ${gap.replace('Cần ', 'Hỏi về việc ')}`
      )

      profileDigest = {
        // Anonymised until student reveals identity (BA §2.7.2)
        display_name: `Học sinh ${profile.grade} - ${profile.province}`,
        grade: profile.grade,
        target_major: profile.target_major,
        ocs_total: ocsResult.total_ocs,
        top3_activities: top3,
        gap_summary: keyGaps,
        mentor_questions: mentorQuestions,
        generated_at: new Date().toISOString(),
      }
    }

    return NextResponse.json({
      connection_id: connection.connection_id,
      mentor: {
        mentor_id: mentor.mentor_id,
        display_name: mentor.display_name,
        school: mentor.school,
        major: mentor.major,
      },
      profile_digest: profileDigest,
      message: 'Kết nối thành công. Mentor sẽ liên hệ trong vòng 48 giờ.',
    }, { status: 201 })
  } catch (e) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
