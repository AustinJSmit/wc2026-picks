import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { passwordResetTokens } from '@/db/schema';
import { and, eq, isNull, gt } from 'drizzle-orm';
import { hashToken } from '@/lib/resetToken';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ valid: false });
  }

  const tokenHash = hashToken(token);
  const now = new Date();

  const [record] = await db
    .select({ id: passwordResetTokens.id })
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, now)
      )
    );

  return NextResponse.json({ valid: !!record });
}
