'use client'

import { useMemo, useState } from 'react'
import { Topbar } from '@/components/shared/Topbar'
import { DEMO_MENTORS } from '@/shared/constants'
import { useProfileStore } from '@/store/useProfileStore'
import { Star, ShieldCheck, MessageSquareShare, Search } from 'lucide-react'

export default function MentorPage() {
  const { profile } = useProfileStore()

  const [query, setQuery] = useState('')
  const [schoolFilter, setSchoolFilter] = useState<'all' | string>('all')
  const [onlyVerified, setOnlyVerified] = useState(true)
  const [notice, setNotice] = useState('')

  const schools = useMemo(
    () => Array.from(new Set(DEMO_MENTORS.map((mentor) => mentor.school))),
    []
  )

  const mentors = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return DEMO_MENTORS
      .filter((mentor) => (onlyVerified ? mentor.verified : true))
      .filter((mentor) => (schoolFilter === 'all' ? true : mentor.school === schoolFilter))
      .filter((mentor) => {
        if (!normalizedQuery) return true
        return (
          mentor.display_name.toLowerCase().includes(normalizedQuery) ||
          mentor.major.toLowerCase().includes(normalizedQuery) ||
          mentor.expertise_tags.some((tag) => tag.toLowerCase().includes(normalizedQuery))
        )
      })
      .sort((a, b) => b.rating - a.rating)
  }, [query, schoolFilter, onlyVerified])

  const handleConnect = (mentorName: string) => {
    setNotice(`Da gui yeu cau ket noi toi ${mentorName}. Mentor se phan hoi trong 24h.`)
    setTimeout(() => setNotice(''), 3000)
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <Topbar title="Mentor Connection" />

      <main className="flex-1 p-4 sm:p-6 space-y-5">
        {notice && (
          <section className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {notice}
          </section>
        )}

        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Ket noi mentor phu hop</h2>
            <p className="text-sm text-gray-500 mt-1">
              Ho so hien tai:
              {' '}
              <span className="font-medium text-gray-700">
                {profile.display_name} · Lop {profile.grade} · {profile.target_major === 'cntt' ? 'CNTT' : 'Toan & Thong ke'}
              </span>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="md:col-span-2 relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tim theo ten, major, expertise..."
                className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm"
              />
            </label>

            <select
              value={schoolFilter}
              onChange={(event) => setSchoolFilter(event.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="all">Tat ca truong</option>
              {schools.map((school) => (
                <option key={school} value={school}>
                  {school}
                </option>
              ))}
            </select>
          </div>

          <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-gray-700">
            <input
              type="checkbox"
              checked={onlyVerified}
              onChange={(event) => setOnlyVerified(event.target.checked)}
              className="h-4 w-4"
            />
            Chi hien mentor da verified
          </label>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {mentors.map((mentor) => (
            <article
              key={mentor.mentor_id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">{mentor.display_name}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {mentor.school} · {mentor.major}
                  </p>
                </div>

                <div className="flex items-center gap-1 text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 text-xs font-semibold">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {mentor.rating.toFixed(1)}
                </div>
              </div>

              <p className="text-sm text-gray-600 leading-6">{mentor.bio}</p>

              <div className="flex flex-wrap gap-2">
                {mentor.expertise_tags.map((tag) => (
                  <span
                    key={`${mentor.mentor_id}-${tag}`}
                    className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  {mentor.verified ? (
                    <span className="inline-flex items-center gap-1 text-green-700">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Verified
                    </span>
                  ) : (
                    <span>Chua xac minh</span>
                  )}
                  <span>•</span>
                  <span>{mentor.is_active ? 'Dang hoat dong' : 'Tam nghi'}</span>
                </div>

                <button
                  onClick={() => handleConnect(mentor.display_name)}
                  className="inline-flex items-center gap-1.5 text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  <MessageSquareShare className="h-4 w-4" />
                  Ket noi
                </button>
              </div>
            </article>
          ))}
        </section>

        {mentors.length === 0 && (
          <section className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <p className="text-sm text-gray-600">
              Khong tim thay mentor phu hop voi bo loc hien tai.
            </p>
          </section>
        )}
      </main>
    </div>
  )
}
