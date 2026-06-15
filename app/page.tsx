export const dynamic = 'force-dynamic';

import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default async function HomePage() {
  const user = await getCurrentUser();

  if (user) redirect('/matches');

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center px-4">
      <div className="space-y-3">
        <Trophy size={52} className="text-primary mx-auto" />
        <h1 className="text-4xl font-bold tracking-tight">World Cup 2026</h1>
        <p className="text-muted-foreground text-lg">Predict match scores · Earn points · Win glory</p>
        <p className="text-muted-foreground text-sm">48 teams · 104 matches · One champion</p>
      </div>
      <div className="flex gap-3 justify-center pt-2">
        <Button render={<Link href="/signup" />}>Join the game</Button>
        <Button variant="outline" render={<Link href="/login" />}>Log in</Button>
      </div>
      <p className="text-xs text-muted-foreground pt-2">
        First time deploying?{' '}
        <Link href="/setup" className="underline hover:text-foreground transition-colors">
          Set up your game →
        </Link>
      </p>
    </div>
  );
}
