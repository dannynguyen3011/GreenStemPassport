'use client'

import { useMemo, useState } from 'react'
import { Topbar } from '@/components/shared/Topbar'
import { DEMO_OPPORTUNITIES } from '@/lib/constants'
import { useProfileStore } from '@/store/useProfileStore'
import type { Opportunity } from '@/types'
import { ExternalLink } from 'lucide-react'

type TypeFilter = 'all' | Opportunity['type']
type ScopeFilter = 'all' | Opportunity['scope']

const TYPE_LABELS: Record<Opportunity['type'], string> = {
  competition: 'Competition',
  scholarship: 'Scholarship',
  workshop: 'Workshop',
  summer_program: 'Summer Program',
}

const SCOPE_LABELS: Record<Opportunity['scope'], string> = {
  international: 'International',
  national: 'National',
  regional: 'Regional',
}

function daysUntil(deadline: string) {
  const now = new Date()
  const target = new Date(`${deadline}T23:59:59`)
  const diffMs = target.getTime() - now.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

function deadlineTone(days: number) {
  if (days < 0) return { text: 'Da het han', className: 'bg-gray-100 text-gray-600' }
  if (days <= 3) return { text: `Con ${days} ngay`, className: 'bg-red-100 text-red-700' }
  if (days <= 10) return { text: `Con ${days} ngay`, className: 'bg-amber-100 text-amber-700' }
  return { text: `Con ${days} ngay`, className: 'bg-green-100 text-green-700' }
}

export default function OpportunitiesPage() {
  const { profile } = useProfileStore()

  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all')
  const [onlineOnly, setOnlineOnly] = useState(false)
  const [freeOnly, setFreeOnly] = useState(false)

  const majorTag = profile.target_major

  const filtered = useMemo(() => {
    return DEMO_OPPORTUNITIES
      .filter((opportunity) =>
        opportunity.field_tags.includes(majorTag) || opportunity.field_tags.includes('stem')
      )
      .filter((opportunity) => (typeFilter === 'all' ? true : opportunity.type === typeFilter))
      .filter((opportunity) => (scopeFilter === 'all' ? true : opportunity.scope === scopeFilter))
      .filter((opportunity) => (onlineOnly ? opportunity.is_online : true))
      .filter((opportunity) => (freeOnly ? opportunity.is_free : true))
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
  }, [majorTag, typeFilter, scopeFilter, onlineOnly, freeOnly])

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Topbar title="Kho Co Hoi STEM" />

      <main className="flex-1 p-4 sm:p-6 space-y-5">
        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-gray-800">Danh sach co hoi theo nganh muc tieu</h2>
              <p className="text-sm text-gray-500 mt-1">
                Dang uu tien co hoi phu hop voi nganh:
                {' '}
                <span className="font-semibold text-gray-700">
                  {majorTag === 'cntt' ? 'CNTT' : 'Toan & Thong ke'}
                </span>
              </p>
            </div>
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              {filtered.length} co hoi phu hop
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Loai co hoi</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setTypeFilter('all')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                    typeFilter === 'all'
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Tat ca
                </button>
                {(Object.keys(TYPE_LABELS) as Opportunity['type'][]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setTypeFilter(type)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                      typeFilter === type
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Pham vi</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setScopeFilter('all')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                    scopeFilter === 'all'
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Tat ca
                </button>
                {(Object.keys(SCOPE_LABELS) as Opportunity['scope'][]).map((scope) => (
                  <button
                    key={scope}
                    onClick={() => setScopeFilter(scope)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                      scopeFilter === scope
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {SCOPE_LABELS[scope]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 text-sm">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={onlineOnly}
                onChange={(event) => setOnlineOnly(event.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-gray-700">Chi online</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={freeOnly}
                onChange={(event) => setFreeOnly(event.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-gray-700">Chi mien phi</span>
            </label>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filtered.map((opportunity) => {
            const days = daysUntil(opportunity.deadline)
            const tone = deadlineTone(days)

            return (
              <article
                key={opportunity.opp_id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-semibold text-gray-800 leading-5">{opportunity.name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${tone.className}`}>
                    {tone.text}
                  </span>
                </div>

                <p className="text-sm text-gray-600">{opportunity.description}</p>

                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
                    {TYPE_LABELS[opportunity.type]}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700">
                    {SCOPE_LABELS[opportunity.scope]}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                    {opportunity.is_online ? 'Online' : 'Offline'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                    {opportunity.is_free ? 'Mien phi' : 'Co phi'}
                  </span>
                  {opportunity.admin_verified && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                      Admin verified
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Deadline: {opportunity.deadline}</span>
                  <a
                    href={opportunity.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-800 font-medium"
                  >
                    Nguon chinh thuc
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </article>
            )
          })}
        </section>

        {filtered.length === 0 && (
          <section className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
            <p className="text-sm text-gray-600">
              Khong tim thay co hoi phu hop voi bo loc hien tai. Thu mo rong bo loc de xem them.
            </p>
          </section>
        )}
      </main>
    </div>
  )
}
