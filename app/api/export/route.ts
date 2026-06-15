import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users, predictions } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { getSession } from '@/lib/session';

export async function GET() {
  const session = await getSession();
  if (!session.email || session.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const rows = await db
    .select({
      displayName: users.displayName,
      email: users.email,
      age: users.age,
      gender: users.gender,
      country: users.country,
      favoriteTeam: users.favoriteTeam,
      createdAt: users.createdAt,
      totalPoints: sql<number>`coalesce(sum(${predictions.points}), 0)`.as('total_points'),
      totalPredictions: sql<number>`count(${predictions.id})`.as('total_predictions'),
    })
    .from(users)
    .leftJoin(predictions, eq(predictions.userId, users.id))
    .groupBy(users.id)
    .orderBy(sql`total_points desc`);

  const headers = ['display_name', 'email', 'age', 'gender', 'country', 'favorite_team', 'joined', 'total_points', 'total_predictions'];
  const csvRows = rows.map(r => [
    r.displayName,
    r.email,
    r.age ?? '',
    r.gender ?? '',
    r.country ?? '',
    r.favoriteTeam ?? '',
    r.createdAt.toISOString(),
    r.totalPoints,
    r.totalPredictions,
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));

  const csv = [headers.join(','), ...csvRows].join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="wc2026-picks-export.csv"',
    },
  });
}
