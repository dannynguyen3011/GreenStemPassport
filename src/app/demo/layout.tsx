import { Sidebar } from '@/components/shared/Sidebar'

// Demo layout — no AuthDataLoader, always uses local demo store data
export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden ml-60">
        {children}
      </div>
    </div>
  )
}
