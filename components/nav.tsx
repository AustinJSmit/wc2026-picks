import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { getCurrentLobby } from '@/lib/lobby';
import ThemeToggle from './theme-toggle';
import NavUserMenu from './nav-user-menu';

function SoccerBall() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <circle cx="10" cy="10" r="8.5" />
      <path d="M1.5 10 Q10 6.5 18.5 10" />
      <path d="M5.75 2.64 C7 6.5 13 13.5 14.25 17.36" />
      <path d="M14.25 2.64 C13 6.5 7 13.5 5.75 17.36" />
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
              <Link href="/matches" className="hidden md:inline opacity-90 hover:opacity-100 transition-opacity whitespace-nowrap">
                Matches
              </Link>
              <Link href="/bracket" className="hidden md:inline opacity-90 hover:opacity-100 transition-opacity whitespace-nowrap">
                Bracket
              </Link>
              <Link href="/leaderboard" className="hidden md:inline opacity-90 hover:opacity-100 transition-opacity whitespace-nowrap">
                Leaderboard
              </Link>
              <Link href="/history" className="hidden md:inline opacity-90 hover:opacity-100 transition-opacity whitespace-nowrap">
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
