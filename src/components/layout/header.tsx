'use client';

import { signOut } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

interface HeaderProps {
  onLogout: () => void;
}

export default function Header({ onLogout }: HeaderProps) {
  const handleLogout = async () => {
    await signOut();
    onLogout();
  };

  return (
    <header className="bg-white border-b border-gray-100 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-40">
      <div className="md:hidden">
        <h1 className="font-semibold text-gray-900 text-[15px] tracking-tight">UPSC Tracker</h1>
      </div>
      <div className="hidden md:block">
        <p className="text-[13px] text-gray-400 font-medium tracking-[-0.01em]">
          {new Date().toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleLogout}
        className="text-gray-500 hover:text-red-600 hover:bg-red-50"
      >
        <LogOut className="w-4 h-4 mr-1" />
        <span className="hidden sm:inline">Logout</span>
      </Button>
    </header>
  );
}
