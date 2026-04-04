'use client'

import Link from 'next/link'
import { Topbar } from '@/components/shared/Topbar'
import { useProfileStore } from '@/store/useProfileStore'
import { calculateOCS } from '@/lib/ocs'
import { BIG6_SCHOOLS, CATEGORY_LABELS, CATEGORY_COLORS } from '@/lib/constants'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
} from 'recharts'
import type { ActivityCategory } from '@/types'
import { ArrowRight } from 'lucide-react'

const RADAR_CATEGORIES: { label: string; categories: ActivityCategory[] }[] = [
  { label: 'Deep STEM', categories: ['competition', 'research'] },
  { label: 'Leadership', categories: ['extracurricular'] },
  { label: 'Research', categories: ['research'] },
  { label: 'Competition', categories: ['competition'] },
  { label: 'Self-learning', categories: ['self_learning'] },
  { label: 'Social Impact', categories: ['green_ethics', 'extracurricular'] },
]

function computeTrafficLight(gpa: number, sat: number, ielts: number, school: (typeof BIG6_SCHOOLS)[0]) {
  const count = [gpa >= school.min_gpa, school.min_sat === null || sat >= school.min_sat, ielts >= school.min_ielts].filter(Boolean).length
  if (count === 3) return { light: 'green', pct: 92, label: 'An toàn' }
  if (count === 2) return { light: 'yellow', pct: 75, label: 'Cần cố gắng' }
  return { light: 'red', pct: 55, label: 'Cần điều chỉnh' }
}

export default function DemoPage() {
  const { profile, activities } = useProfileStore()
  const { total_ocs, breakdown } = calculateOCS(activities, profile.target_major)
  const slottedCount = activities.filter((a) => a.slot_order !== null).length
  const circumference = 2 * Math.PI * 40
  const dashOffset = circumference - (total_ocs / 100) * circumference
  const radarData = RADAR_CATEGORIES.map(({ label, categories }) => {
    const score = activities.filter((a) => categories.includes(a.category)).reduce((sum, a) => sum + (a.base_score ?? 0), 0)
    return { subject: label, score: Math.min(score * 10, 100), fullMark: 100 }
  })
  const top5 = breakdown.slice(0, 5)
  const gpa = profile.gpa ?? 0
  const sat = profile.sat_score ?? 0
  const ielts = profile.ielts_score ?? 0

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Topbar title="Demo — Hồ Sơ Năng Lực" />

      {/* Demo banner */}
      <div className="bg-amber-50 dark:bg-amber-500/10 border-b border-amber-200 dark:border-amber-500/20 px-6 py-2.5 flex items-center justify-between gap-4">
        <p className="text-sm text-amber-700 dark:text-amber-400">
          Bạn đang xem <strong>dữ liệu mẫu</strong>. Đăng ký để lưu hồ sơ thực của bạn.
        </p>
        <Link
          href="/register"
          className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-lg transition-colors"
        >
          Tạo tài khoản <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <main className="flex-1 p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: 'Hoạt động đã nhập', value: activities.length, color: 'text-blue-600 dark:text-blue-400' },
            { label: 'Slot đã dùng', value: `${slottedCount}/10`, color: 'text-green-600 dark:text-green-400' },
            { label: 'OCS Score', value: total_ocs, color: 'text-green-700 dark:text-green-400' },
            { label: 'Trường mục tiêu', value: profile.target_schools.length, color: 'text-purple-600 dark:text-purple-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{label}</p>
              <p className={`text-3xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm flex flex-col items-center justify-center">
            <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-4">OCS Score</h2>
            <div className="relative w-36 h-36">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" strokeWidth="10" className="stroke-gray-200 dark:stroke-gray-700" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#16a34a" strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={circumference} strokeDashoffset={dashOffset} className="transition-all duration-700" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-green-700 dark:text-green-400">{total_ocs}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">/100</span>
              </div>
            </div>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Overall Competency Score</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">T-Shape Radar</h2>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#374151" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar dataKey="score" stroke="#16a34a" fill="#16a34a" fillOpacity={0.25} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm space-y-3">
            <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-300">Hồ sơ cá nhân</h2>
            {[
              { label: 'GPA', value: profile.gpa === null ? 'Chưa cập nhật' : profile.gpa.toFixed(1) },
              { label: 'SAT', value: profile.sat_score === null ? 'Chưa cập nhật' : profile.sat_score.toString() },
              { label: 'IELTS', value: profile.ielts_score === null ? 'Chưa cập nhật' : profile.ielts_score.toFixed(1) },
              { label: 'Trường', value: profile.school_name },
              { label: 'Ngành', value: profile.target_major === 'cntt' ? 'CNTT' : 'Toán & Thống kê' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center text-sm">
                <span className="text-gray-500 dark:text-gray-400">{label}</span>
                <span className="font-semibold text-gray-800 dark:text-gray-100">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-4">Traffic Light — Mức độ phù hợp</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {BIG6_SCHOOLS.map((school) => {
              const { light, pct, label } = computeTrafficLight(gpa, sat, ielts, school)
              const dotColor = light === 'green' ? 'bg-green-500' : light === 'yellow' ? 'bg-yellow-400' : 'bg-red-500'
              const textColor = light === 'green' ? 'text-green-700 dark:text-green-400' : light === 'yellow' ? 'text-yellow-700 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
              return (
                <div key={school.school_id} className="flex items-center justify-between border border-gray-100 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/40">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${dotColor}`} />
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{school.short_name}</p>
                      <p className={`text-xs font-medium ${textColor}`}>{label}</p>
                    </div>
                  </div>
                  <span className={`text-lg font-bold ${textColor}`}>{pct}%</span>
                </div>
              )
            })}
          </div>
        </div>

        {top5.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-4">OCS Breakdown — Top 5 Hoạt động</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 text-left">
                    {['Hoạt động', 'Danh mục', 'Base Score', 'Trust Weight', 'Relevance', 'Final Score'].map((h) => (
                      <th key={h} className="pb-3 pr-4 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {top5.map((item) => {
                    const cat = activities.find((a) => a.activity_id === item.activity_id)?.category ?? 'competition'
                    return (
                      <tr key={item.activity_id}>
                        <td className="py-3 pr-4 font-medium text-gray-800 dark:text-gray-100 max-w-xs truncate">{item.title}</td>
                        <td className="py-3 pr-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[cat as ActivityCategory]}`}>
                            {CATEGORY_LABELS[cat as ActivityCategory]}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">{item.base_score}</td>
                        <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">×{item.trust_weight}</td>
                        <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">×{item.relevance_multiplier}</td>
                        <td className="py-3 pr-4 font-bold text-green-700 dark:text-green-400">{item.final_score.toFixed(2)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
