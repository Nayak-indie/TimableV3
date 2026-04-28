'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, LayoutDashboard, Settings, Sparkles, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Setup', href: '/setup', icon: Wrench },
  { label: 'Timetable', href: '/timetable', icon: CalendarDays },
  { label: 'Events', href: '/changes', icon: Sparkles },
  { label: 'Settings', href: '/settings', icon: Settings },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white/95 backdrop-blur border-t border-indigo-100 z-50">
      <div className="flex items-center justify-around px-2 py-2 pb-safe-bottom">
        {tabs.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-colors',
                isActive ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400'
              )}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
