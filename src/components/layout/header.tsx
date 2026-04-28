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
    <header className="bg-[#1C2028] border-b border-[#948979]/15 px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-40">
      <div className="md:hidden">
        <h1 className="font-semibold text-[#F0E6D3] text-[15px] tracking-tight">UPSC Tracker</h1>
      </div>
      <div className="hidden md:block">
        <p className="text-[13px] text-[#948979] font-medium tracking-[-0.01em]">
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
        className="text-[#948979] hover:text-[#E85D5D] hover:bg-[#E85D5D]/10"
      >
        <LogOut className="w-4 h-4 mr-1" />
        <span className="hidden sm:inline">Logout</span>
      </Button>
    </header>
  );
}
