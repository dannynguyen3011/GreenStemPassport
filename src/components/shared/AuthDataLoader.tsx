'use client'

/**
 * AuthDataLoader — mounts invisibly inside (app)/layout.
 * If a real Supabase session exists, fetches the user's profile and
 * activities from the API and syncs them into the Zustand store.
 * In demo mode (no session) it does nothing.
 */
import { useEffect } from 'react'
import { getSupabaseBrowser } from '@/shared/supabase-browser'
import { useProfileStore } from '@/store/useProfileStore'
import type { UserProfile, Activity, ActivityCategory, TargetMajor, TrustTier } from '@/types'

function mapProfile(row: Record<string, unknown>): UserProfile {
  return {
    user_id: row.user_id as string,
    display_name: row.display_name as string,
    grade: (row.grade as number) as 10 | 11 | 12,
    school_name: row.school_name as string,
    province: row.province as string,
    gpa: row.gpa != null ? parseFloat(row.gpa as string) : null,
    sat_score: (row.sat_score as number | null) ?? null,
    ielts_score: row.ielts_score != null ? parseFloat(row.ielts_score as string) : null,
    target_major: (row.target_major as TargetMajor) ?? 'cntt',
    target_schools: (row.target_schools as string[]) ?? [],
  }
}

function mapActivity(row: Record<string, unknown>): Activity {
  return {
    activity_id: row.activity_id as string,
    user_id: row.user_id as string,
    category: row.category as ActivityCategory,
    title: row.title as string,
    star_situation: row.star_situation as string,
    star_task: row.star_task as string,
    star_action: row.star_action as string,
    star_result: row.star_result as string,
    trust_tier: (row.trust_tier as number) as TrustTier,
    trust_verified_by: (row.trust_verified_by as string | null) ?? null,
    tech_tags: (row.tech_tags as string[]) ?? [],
    base_score: row.base_score != null ? parseFloat(row.base_score as string) : 3,
    slot_order: (row.slot_order as number | null) ?? null,
    artifact_url: (row.artifact_url as string | null) ?? null,
    created_at: row.created_at as string,
  }
}

export function AuthDataLoader() {
  const setAuthenticatedUser = useProfileStore((s) => s.setAuthenticatedUser)

  useEffect(() => {
    async function load() {
      const supabase = getSupabaseBrowser()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return // demo mode — don't touch the store

      const token = session.access_token
      const headers = { Authorization: `Bearer ${token}` }

      let profileRes = await fetch('/api/profile', { headers })

      // Email-confirmation flow: profile chưa được tạo lúc register vì
      // signUp trả về session=null. Bootstrap ngay bằng user_metadata.
      if (profileRes.status === 404) {
        const md = session.user.user_metadata ?? {}
        const bootstrap = await fetch('/api/profile', {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            display_name: md.display_name,
            grade: md.grade,
            school_name: md.school_name,
            province: md.province,
            target_major: md.target_major,
          }),
        })
        if (!bootstrap.ok) {
          console.error(
            '[AuthDataLoader] profile bootstrap failed:',
            bootstrap.status,
            await bootstrap.text().catch(() => '')
          )
          return
        }
        profileRes = await fetch('/api/profile', { headers })
      }

      if (!profileRes.ok) return

      const activitiesRes = await fetch('/api/activities', { headers })
      const profileRow = await profileRes.json()
      const activitiesRows: Record<string, unknown>[] = activitiesRes.ok
        ? await activitiesRes.json()
        : []

      setAuthenticatedUser(
        mapProfile(profileRow),
        activitiesRows.map(mapActivity)
      )
    }

    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
