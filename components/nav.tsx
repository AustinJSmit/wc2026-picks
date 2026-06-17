import Link from 'next/link';
import { SoccerBall } from '@phosphor-icons/react/dist/ssr';
import { getCurrentUser } from '@/lib/auth';
import { getCurrentLobby } from '@/lib/lobby';
import ThemeToggle from './theme-toggle';
import NavUserMenu from './nav-user-menu';

export default async function Nav() {
  const user = await getCurrentUser();
  const lobby = user ? await getCurrentLobby() : null;

  return (
    <nav className="bg-primary text-primary-foreground shadow-md">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight shrink-0">
          <SoccerBall size={22} weight="bold" />
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
