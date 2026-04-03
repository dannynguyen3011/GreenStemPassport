import type { Activity, OCSResult, TargetMajor } from '@/types'
import { CATEGORY_WEIGHT, TRUST_WEIGHT, MAX_OCS_SCORE } from './constants'

export function calculateOCS(activities: Activity[], targetMajor: TargetMajor): OCSResult {
  const slotted = activities
    .filter((a) => a.slot_order !== null)
    .sort((a, b) => (a.slot_order ?? 0) - (b.slot_order ?? 0))
    .slice(0, 10)

  const breakdown = slotted.map((activity) => {
    const relevance_multiplier = CATEGORY_WEIGHT[targetMajor][activity.category] ?? 1.0
    const trust_weight = TRUST_WEIGHT[activity.trust_tier]
    const base_score = activity.base_score ?? 1.0
    const final_score = base_score * relevance_multiplier * trust_weight

    return {
      activity_id: activity.activity_id,
      title: activity.title,
      base_score,
      relevance_multiplier,
      trust_weight,
      final_score,
    }
  })

  const raw_total = breakdown.reduce((sum, b) => sum + b.final_score, 0)
  const total_ocs = Math.min(Math.round((raw_total / MAX_OCS_SCORE) * 100), 100)

  return { total_ocs, breakdown }
}
