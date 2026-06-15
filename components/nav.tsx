import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import LogoutButton from './logout-button';
import ThemeToggle from './theme-toggle';

export default async function Nav() {
  const user = await getCurrentUser();

  return (
    <nav className="bg-primary text-primary-foreground shadow-md">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight shrink-0">
          <span>⚽</span>
          <span>WC2026 Picks</span>
        </Link>

        <div className="flex items-center gap-3 text-sm font-medium overflow-x-auto">
          {user ? (
            <>
              <Link href="/matches" className="opacity-90 hover:opacity-100 transition-opacity whitespace-nowrap">
                Matches
              </Link>
              <Link href="/bracket" className="opacity-90 hover:opacity-100 transition-opacity whitespace-nowrap">
                Bracket
              </Link>
              <Link href="/leaderboard" className="opacity-90 hover:opacity-100 transition-opacity whitespace-nowrap">
                Leaderboard
              </Link>
              <Link href="/settings" className="opacity-90 hover:opacity-100 transition-opacity whitespace-nowrap">
                Settings
              </Link>
              <Link href="/profile" className="opacity-90 hover:opacity-100 transition-opacity whitespace-nowrap">
                {user.displayName}
              </Link>
              <ThemeToggle />
              <LogoutButton />
            </>
          ) : (
            <>
              <ThemeToggle />
              <Link href="/login" className="opacity-90 hover:opacity-100 transition-opacity">
                Log in
              </Link>
              <Link
                href="/signup"
                className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-md transition-colors"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
