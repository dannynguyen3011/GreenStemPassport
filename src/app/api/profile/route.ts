/**
 * GET  /api/profile       — Get the authenticated user's profile
 * PUT  /api/profile       — Update the authenticated user's profile
 * POST /api/profile       — Create profile (called once on first login)
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db, schema } from '@/backend/db'
import { requireAuth } from '@/backend/auth'
import { detectUnrealisticGoal } from '@/shared/matching'

const profileSchema = z.object({
  display_name: z.string().min(1).max(100),
  grade: z.union([z.literal(10), z.literal(11), z.literal(12)]),
  school_name: z.string().min(1).max(200),
  province: z.string().min(1).max(100),
  username: z.string().regex(/^[a-z0-9_]{3,20}$/).optional(),
  gpa: z.number().min(0).max(10).nullable().optional(),
  sat_score: z.number().int().min(400).max(1600).nullable().optional(),
  ielts_score: z.number().min(0).max(9).nullable().optional(),
  target_major: z.enum(['cntt', 'toan_thong_ke']).optional(),
  target_schools: z.array(z.string()).max(6).optional(),
})

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req)

    const rows = await db
      .select()
      .from(schema.userProfiles)
      .where(eq(schema.userProfiles.user_id, user.id))
      .limit(1)

    if (!rows.length) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    return NextResponse.json(rows[0])
  } catch (e) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    const body = await req.json()
    const parsed = profileSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }

    const data = parsed.data

    // Unrealistic goal check (BA §4.2)
    const warning = detectUnrealisticGoal({
      user_id: user.id,
      display_name: data.display_name,
      grade: data.grade,
      school_name: data.school_name,
      province: data.province,
      gpa: data.gpa ?? null,
      sat_score: data.sat_score ?? null,
      ielts_score: data.ielts_score ?? null,
      target_major: data.target_major ?? 'cntt',
      target_schools: data.target_schools ?? [],
    })

    const [inserted] = await db
      .insert(schema.userProfiles)
      .values({
        user_id: user.id,
        email: user.email || null,
        username: data.username?.toLowerCase() ?? null,
        display_name: data.display_name,
        grade: data.grade,
        school_name: data.school_name,
        province: data.province,
        gpa: data.gpa?.toString(),
        sat_score: data.sat_score,
        ielts_score: data.ielts_score?.toString(),
        target_major: data.target_major,
        target_schools: data.target_schools,
      })
      .onConflictDoNothing()
      .returning()

    return NextResponse.json({ profile: inserted, warning }, { status: 201 })
  } catch (e) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    const body = await req.json()
    const parsed = profileSchema.partial().safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }

    const updates: Record<string, unknown> = {}
    const d = parsed.data
    if (d.display_name !== undefined) updates.display_name = d.display_name
    if (d.grade !== undefined) updates.grade = d.grade
    if (d.school_name !== undefined) updates.school_name = d.school_name
    if (d.province !== undefined) updates.province = d.province
    if (d.username !== undefined) updates.username = d.username?.toLowerCase() ?? null
    if (d.gpa !== undefined) updates.gpa = d.gpa?.toString()
    if (d.sat_score !== undefined) updates.sat_score = d.sat_score
    if (d.ielts_score !== undefined) updates.ielts_score = d.ielts_score?.toString()
    if (d.target_major !== undefined) updates.target_major = d.target_major
    if (d.target_schools !== undefined) updates.target_schools = d.target_schools
    updates.last_active = new Date()

    const [updated] = await db
      .update(schema.userProfiles)
      .set(updates)
      .where(eq(schema.userProfiles.user_id, user.id))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Re-run unrealistic goal check with latest data
    const warning = detectUnrealisticGoal({
      user_id: user.id,
      display_name: updated.display_name,
      grade: updated.grade as 10 | 11 | 12,
      school_name: updated.school_name,
      province: updated.province,
      gpa: updated.gpa ? parseFloat(updated.gpa) : null,
      sat_score: updated.sat_score,
      ielts_score: updated.ielts_score ? parseFloat(updated.ielts_score) : null,
      target_major: (updated.target_major ?? 'cntt') as 'cntt' | 'toan_thong_ke',
      target_schools: updated.target_schools ?? [],
    })

    return NextResponse.json({ profile: updated, warning })
  } catch (e) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
