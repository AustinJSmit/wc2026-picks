import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { users, passwordResetTokens } from '@/db/schema';
import { eq, and, isNull, gt } from 'drizzle-orm';
import { hashPassword } from '@/lib/auth';
import { hashToken } from '@/lib/resetToken';
import { resetPasswordIpLimiter, getClientIp, checkRateLimit, rateLimitResponse } from '@/lib/rateLimit';

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const ipCheck = await checkRateLimit(resetPasswordIpLimiter, ip);
  if (!ipCheck.success) return rateLimitResponse(ipCheck.reset);

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request' },
      { status: 400 }
    );
  }

  const { token, password } = parsed.data;
  const tokenHash = hashToken(token);
  const now = new Date();

  const [record] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, now)
      )
    );

  if (!record) {
    return NextResponse.json(
      { error: 'This reset link is invalid or has expired.' },
      { status: 400 }
    );
  }

  const newHash = await hashPassword(password);

  await db.update(users)
    .set({ passwordHash: newHash })
    .where(eq(users.id, record.userId));

  await db.update(passwordResetTokens)
    .set({ usedAt: now })
    .where(eq(passwordResetTokens.id, record.id));

  return NextResponse.json({ message: 'Password updated successfully.' });
}
