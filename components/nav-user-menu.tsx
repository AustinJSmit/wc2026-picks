'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import ThemeToggle from './theme-toggle';
import LogoutButton from './logout-button';

export default function NavUserMenu({ isHost }: { isHost: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  const close = () => setOpen(false);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 opacity-90 hover:opacity-100 transition-opacity text-sm font-medium whitespace-nowrap"
        aria-expanded={open}
      >
        <span className="hidden md:inline">Settings</span>
        <span className="md:hidden">Menu</span>
        <ChevronDown size={14} className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border bg-card text-card-foreground shadow-lg z-50 py-1 overflow-hidden">
          <div className="md:hidden">
            <Link href="/matches" onClick={close} className="block px-4 py-3 text-sm hover:bg-muted transition-colors">Matches</Link>
            <Link href="/bracket" onClick={close} className="block px-4 py-3 text-sm hover:bg-muted transition-colors">Bracket</Link>
            <Link href="/leaderboard" onClick={close} className="block px-4 py-3 text-sm hover:bg-muted transition-colors">Leaderboard</Link>
            <Link href="/history" onClick={close} className="block px-4 py-3 text-sm hover:bg-muted transition-colors">History</Link>
            <div className="border-t my-1" />
          </div>
          <Link
            href="/settings"
            onClick={close}
            className="block px-4 py-3 text-sm hover:bg-muted transition-colors"
          >
            General
          </Link>
          <Link
            href="/profile"
            onClick={close}
            className="block px-4 py-3 text-sm hover:bg-muted transition-colors"
          >
            Profile
          </Link>
          <Link
            href="/lobby"
            onClick={close}
            className="block px-4 py-3 text-sm hover:bg-muted transition-colors"
          >
            My Lobbies
          </Link>
          {isHost && (
            <Link
              href="/admin"
              onClick={close}
              className="block px-4 py-3 text-sm hover:bg-muted transition-colors"
            >
              Host Panel
            </Link>
          )}
          <div className="border-t my-1" />
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-xs text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
          <div className="border-t my-1" />
          <div className="px-4 py-2.5">
            <LogoutButton />
          </div>
        </div>
      )}
    </div>
  );
}
