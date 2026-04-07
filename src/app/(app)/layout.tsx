import { AppShell } from '@/components/shared/AppShell'
import { AuthDataLoader } from '@/components/shared/AuthDataLoader'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <AuthDataLoader />
      {children}
    </AppShell>
  )
}
