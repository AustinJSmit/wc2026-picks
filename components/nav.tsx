import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { getCurrentLobby } from '@/lib/lobby';
import ThemeToggle from './theme-toggle';
import NavUserMenu from './nav-user-menu';

function SoccerBall() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="10" cy="10" r="9" />
      <polygon points="10,7 12.85,9.07 11.76,12.43 8.24,12.43 7.15,9.07" fill="currentColor" stroke="none" />
      <line x1="10" y1="7" x2="10" y2="1" />
      <line x1="12.85" y1="9.07" x2="18.55" y2="7.21" />
      <line x1="11.76" y1="12.43" x2="15.28" y2="17.29" />
      <line x1="8.24" y1="12.43" x2="4.72" y2="17.29" />
      <line x1="7.15" y1="9.07" x2="1.45" y2="7.21" />
    </svg>
  );
}

export default async function Nav() {
  const user = await getCurrentUser();
  const lobby = user ? await getCurrentLobby() : null;

  return (
    <nav className="bg-primary text-primary-foreground shadow-md">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight shrink-0">
          <SoccerBall />
          <span>World Cup 2026</span>
        </Link>

        <div className="flex items-center gap-4 text-sm font-medium">
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
              <Link href="/history" className="opacity-90 hover:opacity-100 transition-opacity whitespace-nowrap">
                History
              </Link>
              <NavUserMenu isHost={lobby?.isHost ?? false} />
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
