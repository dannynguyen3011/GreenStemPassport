'use client'

/**
 * AuthDataLoader — mounts invisibly inside (app)/layout.
 * If a real Supabase session exists, fetches the user's profile and
 * activities from the API and syncs them into the Zustand store.
 * In demo mode (no session) it does nothing.
 */
import { useEffect } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase-browser'
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

      const [profileRes, activitiesRes] = await Promise.all([
        fetch('/api/profile', { headers }),
        fetch('/api/activities', { headers }),
      ])

      if (!profileRes.ok) return // profile not created yet (shouldn't happen post-register)

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
