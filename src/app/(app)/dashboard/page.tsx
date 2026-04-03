'use client'

import { Topbar } from '@/components/shared/Topbar'
import { useProfileStore } from '@/store/useProfileStore'
import { calculateOCS } from '@/lib/ocs'
import { BIG6_SCHOOLS, CATEGORY_LABELS, CATEGORY_COLORS } from '@/lib/constants'
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts'
import type { ActivityCategory } from '@/types'

const RADAR_CATEGORIES: { label: string; categories: ActivityCategory[] }[] = [
  { label: 'Deep STEM', categories: ['competition', 'research'] },
  { label: 'Leadership', categories: ['extracurricular'] },
  { label: 'Research', categories: ['research'] },
  { label: 'Competition', categories: ['competition'] },
  { label: 'Self-learning', categories: ['self_learning'] },
  { label: 'Social Impact', categories: ['green_ethics', 'extracurricular'] },
]

function computeTrafficLight(
  gpa: number,
  sat: number,
  ielts: number,
  school: (typeof BIG6_SCHOOLS)[0]
): { light: 'green' | 'yellow' | 'red'; pct: number; label: string } {
  const passGpa = gpa >= school.min_gpa
  const passSat = school.min_sat === null ? true : sat >= school.min_sat
  const passIelts = ielts >= school.min_ielts

  const count = [passGpa, passSat, passIelts].filter(Boolean).length

  if (count === 3) return { light: 'green', pct: 92, label: 'An toàn' }
  if (count === 2) return { light: 'yellow', pct: 75, label: 'Cần cố gắng' }
  return { light: 'red', pct: 55, label: 'Cần điều chỉnh' }
}

export default function DashboardPage() {
  const { profile, activities } = useProfileStore()
  const { total_ocs, breakdown } = calculateOCS(activities, profile.target_major)

  const slottedCount = activities.filter((a) => a.slot_order !== null).length
  const totalCount = activities.length

  // SVG circle gauge
  const circumference = 2 * Math.PI * 40 // r=40
  const dashOffset = circumference - (total_ocs / 100) * circumference

  // Radar data
  const radarData = RADAR_CATEGORIES.map(({ label, categories }) => {
    const relevant = activities.filter((a) => categories.includes(a.category))
    const score = relevant.reduce((sum, a) => sum + (a.base_score ?? 0), 0)
    return { subject: label, score: Math.min(score * 10, 100), fullMark: 100 }
  })

  // Top 5 breakdown
  const top5 = breakdown.slice(0, 5)

  const PROFILE_GPA = profile.gpa
  const PROFILE_SAT = profile.sat_score
  const PROFILE_IELTS = profile.ielts_score
  const currentGpaForMatching = PROFILE_GPA ?? 0
  const currentSatForMatching = PROFILE_SAT ?? 0
  const currentIeltsForMatching = PROFILE_IELTS ?? 0

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Topbar title="Dashboard — Hồ Sơ Năng Lực" />

      <main className="flex-1 p-4 sm:p-6 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: 'Hoạt động đã nhập', value: totalCount, color: 'text-blue-600' },
            { label: 'Slot đã dùng', value: `${slottedCount}/10`, color: 'text-green-600' },
            { label: 'OCS Score', value: total_ocs, color: 'text-green-700' },
            { label: 'Trường mục tiêu', value: profile.target_schools.length, color: 'text-purple-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <p className="text-sm text-gray-500 mb-1">{label}</p>
              <p className={`text-3xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* OCS Gauge */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col items-center justify-center">
            <h2 className="text-sm font-semibold text-gray-600 mb-4">OCS Score</h2>
            <div className="relative w-36 h-36">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="10"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#16a34a"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-green-700">{total_ocs}</span>
                <span className="text-xs text-gray-500">/100</span>
              </div>
            </div>
            <p className="mt-3 text-sm text-gray-500">Overall Competency Score</p>
          </div>

          {/* T-Shape Radar */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-600 mb-2">T-Shape Radar</h2>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={false}
                  axisLine={false}
                />
                <Radar
                  dataKey="score"
                  stroke="#16a34a"
                  fill="#16a34a"
                  fillOpacity={0.25}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Quick Summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-3">
            <h2 className="text-sm font-semibold text-gray-600">Hồ sơ cá nhân</h2>
            {[
              { label: 'GPA', value: PROFILE_GPA === null ? 'Chua cap nhat' : PROFILE_GPA.toFixed(1) },
              { label: 'SAT', value: PROFILE_SAT === null ? 'Chua cap nhat' : PROFILE_SAT.toString() },
              { label: 'IELTS', value: PROFILE_IELTS === null ? 'Chua cap nhat' : PROFILE_IELTS.toFixed(1) },
              { label: 'Trường', value: profile.school_name },
              { label: 'Ngành', value: profile.target_major === 'cntt' ? 'CNTT' : 'Toán & Thống kê' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="font-semibold text-gray-800">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Traffic Light Grid */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Traffic Light — Mức độ phù hợp</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {BIG6_SCHOOLS.map((school) => {
              const { light, pct, label } = computeTrafficLight(
                currentGpaForMatching,
                currentSatForMatching,
                currentIeltsForMatching,
                school
              )
              const dotColor =
                light === 'green'
                  ? 'bg-green-500'
                  : light === 'yellow'
                  ? 'bg-yellow-400'
                  : 'bg-red-500'
              const textColor =
                light === 'green'
                  ? 'text-green-700'
                  : light === 'yellow'
                  ? 'text-yellow-700'
                  : 'text-red-600'

              return (
                <div
                  key={school.school_id}
                  className="flex items-center justify-between border border-gray-100 rounded-lg p-4 bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${dotColor} shrink-0`} />
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{school.short_name}</p>
                      <p className={`text-xs font-medium ${textColor}`}>{label}</p>
                    </div>
                  </div>
                  <span className={`text-lg font-bold ${textColor}`}>{pct}%</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* OCS Breakdown Table */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-700 mb-4">OCS Breakdown — Top 5 Hoạt động</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  {['Hoạt động', 'Danh mục', 'Base Score', 'Trust Weight', 'Relevance', 'Final Score'].map(
                    (h) => (
                      <th key={h} className="pb-3 pr-4 font-semibold text-gray-500 text-xs uppercase tracking-wide">
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {top5.map((item) => {
                  const activity = activities.find((a) => a.activity_id === item.activity_id)
                  const cat = activity?.category ?? 'competition'
                  return (
                    <tr key={item.activity_id}>
                      <td className="py-3 pr-4 font-medium text-gray-800 max-w-xs truncate">
                        {item.title}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[cat as ActivityCategory]}`}>
                          {CATEGORY_LABELS[cat as ActivityCategory]}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-gray-700">{item.base_score}</td>
                      <td className="py-3 pr-4 text-gray-700">×{item.trust_weight}</td>
                      <td className="py-3 pr-4 text-gray-700">×{item.relevance_multiplier}</td>
                      <td className="py-3 pr-4 font-bold text-green-700">
                        {item.final_score.toFixed(2)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
