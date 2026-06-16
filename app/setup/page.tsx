import { Card, CardContent } from '@/components/ui/card';
import { Trophy } from 'lucide-react';
import Link from 'next/link';
import SetupButton from './setup-button';

export default function SetupPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-sm w-full">
        <CardContent className="pt-8 pb-8 space-y-6 text-center">
          <div className="flex flex-col items-center gap-2">
            <Trophy size={44} className="text-primary" />
            <h1 className="text-2xl font-bold">World Cup 2026</h1>
            <p className="text-muted-foreground text-sm">
              One-time setup — initializes your database.
              <br />After signing up, create your own private lobby and invite friends with a code.
            </p>
          </div>
          <SetupButton />
          <p className="text-xs text-muted-foreground">
            Already set up?{' '}
            <Link href="/login" className="underline hover:text-foreground transition-colors">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
