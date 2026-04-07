import { AppShell } from '@/components/shared/AppShell'

// Demo layout — no AuthDataLoader, always uses local demo store data
export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      {children}
    </AppShell>
  )
}
