'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Target,
  CalendarDays,
  BarChart3,
  History,
  BookOpen,
  Bot,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/history', label: 'History', icon: History },
  { href: '/mcp-setup', label: 'MCP Setup', icon: Bot },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 bg-white border-r border-gray-100 min-h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h1 className="font-semibold text-gray-900 text-[17px] tracking-tight leading-tight">UPSC Tracker</h1>
            <p className="text-[11px] text-gray-400 tracking-wide uppercase font-medium mt-0.5">Study Together</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-[13.5px] font-medium tracking-[-0.01em] transition-colors',
                isActive
                  ? 'bg-orange-50 text-orange-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon className={cn('w-5 h-5', isActive ? 'text-orange-600' : 'text-gray-400')} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer quote */}
      <div className="p-4 m-4 bg-orange-50 rounded-lg">
        <p className="text-[11.5px] text-orange-700/80 italic leading-relaxed">
          &ldquo;Success is the sum of small efforts, repeated day in and day out.&rdquo;
        </p>
        <p className="text-[11px] text-orange-500/70 mt-1.5 font-medium not-italic">&mdash; Robert Collier</p>
      </div>
    </aside>
  );
}
