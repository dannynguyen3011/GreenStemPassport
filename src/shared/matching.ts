/**
 * Compass Matching Engine
 * Implements Traffic Light logic from BA §2.3
 */
import type { UserProfile, Activity, CompassResult, GapItem } from '@/types'
import { BIG6_SCHOOLS } from './constants'

export function analyzeCompass(
  profile: UserProfile,
  activities: Activity[]
): CompassResult[] {
  const targetSchools = profile.target_schools?.length
    ? BIG6_SCHOOLS.filter((s) => profile.target_schools.includes(s.school_id))
    : BIG6_SCHOOLS

  return targetSchools.map((school) => {
    const gaps: GapItem[] = []
    let totalCriteria = 0
    let passedCriteria = 0

    // ── SAT ───────────────────────────────────────────────
    if (school.min_sat !== null) {
      totalCriteria++
      const sat = profile.sat_score ?? 0
      const passed = sat >= school.min_sat
      if (passed) passedCriteria++
      gaps.push({
        field: 'SAT',
        current_value: profile.sat_score ? String(profile.sat_score) : 'Chưa thi',
        required_value: String(school.min_sat),
        passed,
        action_suggestion: passed
          ? 'SAT đạt ngưỡng. Duy trì và chuẩn bị phỏng vấn.'
          : `Cần tăng SAT lên tối thiểu ${school.min_sat}. Tham khảo Khan Academy SAT Prep.`,
      })
    }

    // ── GPA ───────────────────────────────────────────────
    totalCriteria++
    const gpa = profile.gpa ?? 0
    const passedGpa = gpa >= school.min_gpa
    if (passedGpa) passedCriteria++
    gaps.push({
      field: 'GPA',
      current_value: profile.gpa ? String(profile.gpa) : 'Chưa nhập',
      required_value: String(school.min_gpa),
      passed: passedGpa,
      action_suggestion: passedGpa
        ? 'GPA đạt ngưỡng. Duy trì kết quả học tập.'
        : `GPA cần đạt tối thiểu ${school.min_gpa}/10. Ưu tiên cải thiện môn STEM.`,
    })

    // ── IELTS ─────────────────────────────────────────────
    totalCriteria++
    const ielts = profile.ielts_score ?? 0
    const passedIelts = ielts >= school.min_ielts
    if (passedIelts) passedCriteria++
    gaps.push({
      field: 'IELTS',
      current_value: profile.ielts_score ? String(profile.ielts_score) : 'Chưa thi',
      required_value: String(school.min_ielts),
      passed: passedIelts,
      action_suggestion: passedIelts
        ? 'IELTS đạt ngưỡng yêu cầu.'
        : `IELTS cần đạt tối thiểu ${school.min_ielts}. Tham khảo British Council và Blue Book.`,
    })

    // ── PORTFOLIO DEPTH ───────────────────────────────────
    totalCriteria++
    const slottedCount = activities.filter((a) => a.slot_order !== null).length
    const passedPortfolio = slottedCount >= school.min_portfolio_activities
    if (passedPortfolio) passedCriteria++
    gaps.push({
      field: 'Portfolio Activities',
      current_value: String(slottedCount),
      required_value: String(school.min_portfolio_activities),
      passed: passedPortfolio,
      action_suggestion: passedPortfolio
        ? 'Số lượng hoạt động đạt yêu cầu.'
        : `Cần thêm ${school.min_portfolio_activities - slottedCount} hoạt động vào Portfolio. Xem Kho Cơ Hội STEM.`,
    })

    // ── PREFERRED CATEGORY BALANCE ────────────────────────
    totalCriteria++
    const activityCategories = new Set(activities.map((a) => a.category))
    const hasCategoryBalance = school.preferred_categories.some((c) =>
      activityCategories.has(c)
    )
    if (hasCategoryBalance) passedCriteria++
    gaps.push({
      field: 'Category Balance',
      current_value: [...activityCategories].join(', ') || 'Chưa có',
      required_value: school.preferred_categories.join(', '),
      passed: hasCategoryBalance,
      action_suggestion: hasCategoryBalance
        ? 'Danh mục hoạt động phù hợp với trường.'
        : `Trường ưu tiên: ${school.preferred_categories.join(', ')}. Bổ sung hoạt động phù hợp.`,
    })

    // ── TRAFFIC LIGHT ─────────────────────────────────────
    const matchPct = Math.round((passedCriteria / totalCriteria) * 100)
    const trafficLight =
      matchPct >= 90 ? 'safe' : matchPct >= 70 ? 'try_harder' : 'adjust'

    return {
      school_id: school.school_id,
      school_name: school.school_name,
      short_name: school.short_name,
      traffic_light: trafficLight,
      match_percentage: matchPct,
      gaps,
    } satisfies CompassResult
  })
}

/**
 * Unrealistic goal detection (BA §4.2 Anti-Fraud / SDG-3)
 * Returns a warning string if the profile has suspicious combinations.
 */
export function detectUnrealisticGoal(profile: UserProfile): string | null {
  const { gpa, sat_score, grade } = profile

  if (gpa && sat_score) {
    if (gpa < 7.0 && sat_score > 1400) {
      return `GPA ${gpa} + SAT ${sat_score} là tổ hợp bất thường. Hãy đặt mục tiêu thực tế hơn hoặc kiểm tra lại điểm số.`
    }
    if (grade === 10 && gpa < 7.5 && sat_score >= 1550) {
      return `GPA ${gpa} ở lớp ${grade} với mục tiêu SAT ${sat_score} cần cân nhắc lại. Tập trung cải thiện GPA trước.`
    }
  }
  return null
}
