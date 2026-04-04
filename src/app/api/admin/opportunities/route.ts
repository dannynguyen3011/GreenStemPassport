/**
 * PUT /api/admin/opportunities
 *
 * Admin verify/reject an opportunity (BA §2.6 — admin_verified field)
 * Only admin-verified entries are shown to students.
 *
 * Body: { opp_id: string, approved: boolean }
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db, schema } from '@/db'
import { requireAuth, isAdmin } from '@/lib/auth'

const approveSchema = z.object({
  opp_id: z.string().uuid(),
  approved: z.boolean(),
})

export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth(req)

    if (!isAdmin(user.id)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = approveSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }

    const { opp_id, approved } = parsed.data

    const [updated] = await db
      .update(schema.opportunities)
      .set({ admin_verified: approved })
      .where(eq(schema.opportunities.opp_id, opp_id))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
    }

    await db.insert(schema.auditLogs).values({
      entity_type: 'opportunity',
      entity_id: opp_id,
      action: approved ? 'opportunity_approved' : 'opportunity_rejected',
      performed_by: user.id,
      metadata: JSON.stringify({ opp_id, approved }),
    })

    return NextResponse.json({
      success: true,
      opp_id,
      admin_verified: approved,
      message: approved ? 'Cơ hội đã được phê duyệt và hiển thị cho học sinh.' : 'Cơ hội đã bị từ chối.',
    })
  } catch (e) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/admin/opportunities — List all opportunities (including unverified)
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req)

    if (!isAdmin(user.id)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const rows = await db
      .select()
      .from(schema.opportunities)
      .orderBy(schema.opportunities.created_at)

    return NextResponse.json(rows)
  } catch (e) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
