/**
 * POST /api/activities/[activityId]/trust
 *
 * TrustFactor verification flow (BA §2.2.4)
 * Tier 2: Teacher/peer verification via email link
 * Tier 3: Certificate upload (URL) → admin review
 *
 * This endpoint initiates the upgrade request.
 * Actual tier upgrade happens in /api/admin/trust (admin confirms).
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db, schema } from '@/backend/db'
import { requireAuth } from '@/backend/auth'

const trustRequestSchema = z.discriminatedUnion('tier', [
  z.object({
    tier: z.literal(2),
    verifier_email: z.string().email('Email giáo viên không hợp lệ'),
    verifier_name: z.string().min(1),
  }),
  z.object({
    tier: z.literal(3),
    certificate_url: z.string().url('URL chứng chỉ không hợp lệ'),
    certificate_issuer: z.string().min(1),
  }),
])

type Params = { params: Promise<{ activityId: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req)
    const { activityId } = await params
    const body = await req.json()
    const parsed = trustRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }

    // Verify the activity belongs to this user
    const [activity] = await db
      .select()
      .from(schema.activities)
      .where(
        and(
          eq(schema.activities.activity_id, activityId),
          eq(schema.activities.user_id, user.id)
        )
      )
      .limit(1)

    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    const data = parsed.data

    if (data.tier === 2) {
      /**
       * MVP Tier 2 implementation:
       * - Log the verification request to audit_logs
       * - Update trust_verified_by to the verifier email
       * - In production: send Resend email to verifier with approval link
       * - Tier actually upgraded by admin via /api/admin/trust
       */
      await db.insert(schema.auditLogs).values({
        entity_type: 'activity',
        entity_id: activityId,
        action: 'trust_tier2_requested',
        performed_by: user.id,
        metadata: JSON.stringify({
          verifier_email: data.verifier_email,
          verifier_name: data.verifier_name,
        }),
      })

      // Update verified_by field to show pending review
      await db
        .update(schema.activities)
        .set({ trust_verified_by: `pending:${data.verifier_email}` })
        .where(eq(schema.activities.activity_id, activityId))

      return NextResponse.json({
        success: true,
        message: `Yêu cầu xác thực đã gửi đến ${data.verifier_email}. Tier sẽ được cập nhật sau khi giáo viên xác nhận.`,
        status: 'pending_tier2',
      })
    }

    if (data.tier === 3) {
      /**
       * Tier 3: Certificate upload → admin review within 24-48h
       */
      await db.insert(schema.auditLogs).values({
        entity_type: 'activity',
        entity_id: activityId,
        action: 'trust_tier3_requested',
        performed_by: user.id,
        metadata: JSON.stringify({
          certificate_url: data.certificate_url,
          certificate_issuer: data.certificate_issuer,
        }),
      })

      await db
        .update(schema.activities)
        .set({
          trust_verified_by: `pending:${data.certificate_issuer}`,
          artifact_url: data.certificate_url,
        })
        .where(eq(schema.activities.activity_id, activityId))

      return NextResponse.json({
        success: true,
        message: 'Chứng chỉ đã gửi Admin review. Kết quả trong 24-48h.',
        status: 'pending_tier3',
      })
    }
  } catch (e) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
