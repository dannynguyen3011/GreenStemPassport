import { TRUST_LABELS } from '@/lib/constants'
import type { TrustTier } from '@/types'

const TRUST_VARIANT: Record<TrustTier, string> = {
  1: 'bg-gray-100 text-gray-600 border-gray-200',
  2: 'bg-blue-100 text-blue-700 border-blue-200',
  3: 'bg-amber-100 text-amber-700 border-amber-200',
}

const TRUST_ICONS: Record<TrustTier, string> = {
  1: '○',
  2: '◑',
  3: '●',
}

export function TrustBadge({ tier }: { tier: TrustTier }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${TRUST_VARIANT[tier]}`}>
      <span>{TRUST_ICONS[tier]}</span>
      {TRUST_LABELS[tier]}
    </span>
  )
}
