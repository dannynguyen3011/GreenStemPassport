'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/shared/utils'
import {
  LayoutDashboard,
  Compass,
  FolderOpen,
  Trophy,
  MessageCircle,
  Users,
  Leaf,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/compass', label: 'Compass Engine', icon: Compass },
  { href: '/portfolio', label: 'Portfolio 10-Slot', icon: FolderOpen },
  { href: '/opportunities', label: 'Kho Cơ Hội', icon: Trophy },
  { href: '/chatbot', label: 'Cố Vấn AI', icon: MessageCircle },
  { href: '/mentor', label: 'Mentor', icon: Users },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 transition-colors">

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full bg-gray-900 flex flex-col z-40 transition-all duration-300',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        {/* Logo */}
        <div className={cn('border-b border-gray-700 flex items-center', collapsed ? 'p-3 justify-center' : 'p-5')}>
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            title="Green STEM Compass"
          >
            <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center shrink-0">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <div>
                <div className="text-white font-bold text-sm leading-tight">Green STEM</div>
                <div className="text-green-400 text-xs">Compass</div>
              </div>
            )}
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-1 overflow-hidden">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className={cn(
                  'flex items-center rounded-lg text-sm font-medium transition-colors',
                  collapsed ? 'justify-center py-2.5' : 'gap-3 px-3 py-2.5',
                  active
                    ? 'bg-green-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!collapsed && label}
              </Link>
            )
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="p-2 border-t border-gray-700">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              'w-full flex items-center rounded-lg py-2 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors text-xs font-medium',
              collapsed ? 'justify-center' : 'gap-2 px-3'
            )}
            title={collapsed ? 'Mở rộng' : 'Thu gọn'}
          >
            {collapsed
              ? <ChevronRight className="w-4 h-4" />
              : <><ChevronLeft className="w-4 h-4" />Thu gọn</>
            }
          </button>
        </div>
      </aside>

      {/* Main content — margin matches sidebar width */}
      <div
        className={cn(
          'flex-1 flex flex-col overflow-hidden transition-all duration-300',
          collapsed ? 'ml-16' : 'ml-60'
        )}
      >
        {children}
      </div>
    </div>
  )
}
