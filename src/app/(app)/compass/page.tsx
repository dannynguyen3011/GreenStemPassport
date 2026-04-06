'use client'

import { Topbar } from '@/components/shared/Topbar'
import { useProfileStore } from '@/store/useProfileStore'
import { BIG6_SCHOOLS, CATEGORY_LABELS } from '@/shared/constants'
import { calculateOCS } from '@/shared/ocs'
import type { SchoolPersona } from '@/types'

type Gap = {
  field: string
  message: string
  action: string
}

const GAP_ACTIONS: Record<string, string> = {
  GPA: 'Tập trung cải thiện điểm các môn STEM trong 1-2 học kỳ tới.',
  SAT: 'Lập lộ trình SAT 8-12 tuần, ưu tiên phần Math và làm full test Bluebook.',
  IELTS: 'Luyện theo band mục tiêu và thi thử mỗi 2 tuần để theo dõi tiến độ.',
  Portfolio: 'Bổ sung thêm dự án/hoạt động đúng ngành mục tiêu để đủ độ sâu hồ sơ.',
  OCS: 'Nâng chất lượng STAR (đặc biệt phần Action) và tăng TrustFactor cho hoạt động mạnh nhất.',
}

function scoreByThreshold(current: number, min: number, tolerance: number) {
  if (current >= min) return 1
  return Math.max(0, 1 - (min - current) / tolerance)
}

function getCompassResult(
  school: SchoolPersona,
  input: {
    gpa: number
    sat: number
    ielts: number
    portfolioCount: number
    ocs: number
  }
) {
  const metrics = [
    {
      key: 'GPA',
      weight: 0.25,
      value: input.gpa,
      min: school.min_gpa,
      tolerance: 1.0,
      requiredText: `>= ${school.min_gpa.toFixed(1)}`,
    },
    {
      key: 'SAT',
      weight: 0.25,
      value: input.sat,
      min: school.min_sat ?? 0,
      tolerance: 300,
      requiredText: school.min_sat === null ? 'Không bắt buộc' : `>= ${school.min_sat}`,
      optional: school.min_sat === null,
    },
    {
      key: 'IELTS',
      weight: 0.2,
      value: input.ielts,
      min: school.min_ielts,
      tolerance: 2.0,
      requiredText: `>= ${school.min_ielts.toFixed(1)}`,
    },
    {
      key: 'Portfolio',
      weight: 0.15,
      value: input.portfolioCount,
      min: school.min_portfolio_activities,
      tolerance: 4,
      requiredText: `>= ${school.min_portfolio_activities} hoạt động`,
    },
    {
      key: 'OCS',
      weight: 0.15,
      value: input.ocs,
      min: 70,
      tolerance: 40,
      requiredText: '>= 70',
    },
  ]

  const weighted = metrics.reduce((sum, metric) => {
    if (metric.optional) return sum + metric.weight
    return sum + scoreByThreshold(metric.value, metric.min, metric.tolerance) * metric.weight
  }, 0)

  const matchPercentage = Math.round(weighted * 100)
  const gaps: Gap[] = metrics
    .filter((metric) => !metric.optional && metric.value < metric.min)
    .map((metric) => ({
      field: metric.key,
      message: `${metric.key} hiện tại ${metric.value} (yêu cầu ${metric.requiredText})`,
      action: GAP_ACTIONS[metric.key] ?? 'Bổ sung theo gợi ý từ Compass.',
    }))

  const light =
    matchPercentage >= 90 ? 'safe' : matchPercentage >= 70 ? 'try_harder' : 'adjust'

  return { matchPercentage, light, gaps }
}

export default function CompassPage() {
  const { profile, activities } = useProfileStore()
  const slottedActivities = activities.filter((activity) => activity.slot_order !== null)
  const { total_ocs } = calculateOCS(activities, profile.target_major)

  const gpaInput = profile.gpa ?? 0
  const satInput = profile.sat_score ?? 0
  const ieltsInput = profile.ielts_score ?? 0

  const warningUnrealistic = gpaInput < 7 && satInput >= 1500

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Topbar title="Strategic Matching — Compass Engine" />

      <main className="flex-1 p-4 sm:p-6 space-y-6">
        {/* Read-only summary — edit via Cài đặt hồ sơ */}
        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-gray-800 dark:text-white">Hồ sơ hiện tại</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Hệ thống so sánh với ngưỡng Big 6. Cập nhật điểm số tại{' '}
                <a href="/profile" className="text-green-600 dark:text-green-400 underline">Cài đặt hồ sơ</a>.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {[
                { label: 'GPA', value: gpaInput > 0 ? gpaInput.toFixed(1) : '—' },
                { label: 'SAT', value: satInput > 0 ? satInput : '—' },
                { label: 'IELTS', value: ieltsInput > 0 ? ieltsInput.toFixed(1) : '—' },
                { label: 'OCS', value: total_ocs, green: true },
              ].map(({ label, value, green }) => (
                <div key={label} className={`rounded-lg border px-4 py-2 text-center min-w-[70px] ${green ? 'border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-500/10' : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700'}`}>
                  <p className={`text-xs font-medium ${green ? 'text-green-700 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>{label}</p>
                  <p className={`text-xl font-bold ${green ? 'text-green-800 dark:text-green-300' : 'text-gray-800 dark:text-white'}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>
          {warningUnrealistic && (
            <div className="mt-4 rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
              Mục tiêu chưa thực tế: GPA hiện tại đang thấp so với mức SAT kỳ vọng.
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {BIG6_SCHOOLS.map((school) => {
            const result = getCompassResult(school, {
              gpa: gpaInput,
              sat: satInput,
              ielts: ieltsInput,
              portfolioCount: slottedActivities.length,
              ocs: total_ocs,
            })

            const tone =
              result.light === 'safe'
                ? {
                    dot: 'bg-green-500',
                    text: 'text-green-700 dark:text-green-400',
                    badge: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300',
                    label: 'An toàn',
                    guidance: 'Hồ sơ vượt ngưỡng an toàn. Tự tin nộp.',
                  }
                : result.light === 'try_harder'
                ? {
                    dot: 'bg-yellow-400',
                    text: 'text-yellow-700 dark:text-yellow-400',
                    badge: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300',
                    label: 'Cần cố gắng',
                    guidance: 'Hồ sơ tiềm năng, cần bổ sung một vài chỉ số.',
                  }
                : {
                    dot: 'bg-red-500',
                    text: 'text-red-700 dark:text-red-400',
                    badge: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300',
                    label: 'Cần điều chỉnh',
                    guidance: 'Hồ sơ chưa đạt ngưỡng tối thiểu của trường này.',
                  }

            return (
              <article
                key={school.school_id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${tone.dot}`} />
                    <h3 className="font-semibold text-gray-800 dark:text-white">{school.school_name}</h3>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${tone.badge}`}>
                    {tone.label}
                  </span>
                </div>

                <div className="flex items-end justify-between">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Mức độ phù hợp</p>
                  <p className={`text-3xl font-bold ${tone.text}`}>{result.matchPercentage}%</p>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-300">{tone.guidance}</p>

                <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-md p-2">
                  Ưu tiên danh mục:{' '}
                  {school.preferred_categories.map((cat) => CATEGORY_LABELS[cat]).join(', ')}
                </div>

                {result.gaps.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Gap Analysis</p>
                    {result.gaps.map((gap) => (
                      <div key={`${school.school_id}-${gap.field}`} className="rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/40 p-2.5">
                        <p className="text-sm text-gray-700 dark:text-gray-200">{gap.message}</p>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{gap.action}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-md border border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-500/10 p-2.5">
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Bạn đang đạt các ngưỡng chính của trường này.
                    </p>
                  </div>
                )}
              </article>
            )
          })}
        </section>
      </main>
    </div>
  )
}
