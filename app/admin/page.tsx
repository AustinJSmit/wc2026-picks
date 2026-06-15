export const dynamic = 'force-dynamic';

import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { users, predictions } from '@/db/schema';
import { sql } from 'drizzle-orm';
import AdminPanels from './admin-panels';

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) redirect('/matches');

  const [predCountResult, allUsers] = await Promise.all([
    db.select({ n: sql<number>`count(*)` }).from(predictions),
    db.select({ id: users.id, displayName: users.displayName }).from(users).orderBy(users.displayName),
  ]);

  const predictionCount = Number(predCountResult[0]?.n ?? 0);
  const playerCount = allUsers.length;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Host Panel</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your tournament — resets, new seasons, and host transfer.
        </p>
      </div>
      <AdminPanels
        predictionCount={predictionCount}
        playerCount={playerCount}
        allUsers={allUsers}
        currentUserId={user.id}
      />
    </div>
  );
}
