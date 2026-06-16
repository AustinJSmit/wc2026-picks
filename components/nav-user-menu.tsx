'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import ThemeToggle from './theme-toggle';
import LogoutButton from './logout-button';

export default function NavUserMenu({ isAdmin }: { isAdmin: boolean }) {
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
        Settings
        <ChevronDown size={14} className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border bg-card text-card-foreground shadow-lg z-50 py-1 overflow-hidden">
          <Link
            href="/settings"
            onClick={close}
            className="block px-4 py-2 text-sm hover:bg-muted transition-colors"
          >
            Settings
          </Link>
          <Link
            href="/profile"
            onClick={close}
            className="block px-4 py-2 text-sm hover:bg-muted transition-colors"
          >
            Profile
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              onClick={close}
              className="block px-4 py-2 text-sm hover:bg-muted transition-colors"
            >
              Host Panel
            </Link>
          )}
          <div className="border-t my-1" />
          <div className="flex items-center justify-between px-4 py-2">
            <span className="text-xs text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
          <div className="border-t my-1" />
          <div className="px-4 py-1.5">
            <LogoutButton />
          </div>
        </div>
      )}
    </div>
  );
}
