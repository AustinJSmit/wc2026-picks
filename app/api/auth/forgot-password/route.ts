import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Resend } from 'resend';
import { db } from '@/db';
import { users, passwordResetTokens } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { generateResetToken, hashToken, RESET_TOKEN_EXPIRY_MS } from '@/lib/resetToken';
import { resetPasswordEmail } from '@/lib/email/resetPasswordEmail';
import { forgotPasswordIpLimiter, getClientIp, checkRateLimit, rateLimitResponse } from '@/lib/rateLimit';

const resend = new Resend(process.env.RESEND_API_KEY);

const schema = z.object({
  email: z.email(),
});

const SUCCESS_MSG = 'If that email is registered, a reset link has been sent.';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const ipCheck = await checkRateLimit(forgotPasswordIpLimiter, ip);
  if (!ipCheck.success) return rateLimitResponse(ipCheck.reset);

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: SUCCESS_MSG });
  }

  const { email } = parsed.data;

  const [user] = await db.select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.email, email.toLowerCase()));

  if (!user) {
    return NextResponse.json({ message: SUCCESS_MSG });
  }

  const rawToken = generateResetToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

  await db.insert(passwordResetTokens).values({
    userId: user.id,
    tokenHash,
    expiresAt,
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
    to: user.email,
    subject: 'Reset your WC2026 password',
    html: resetPasswordEmail(resetUrl),
  });

  if (error) {
    console.error('[forgot-password] Resend error:', error);
    return NextResponse.json({ message: 'Failed to send reset email. Please try again later.' }, { status: 500 });
  }

  return NextResponse.json({ message: SUCCESS_MSG });
}
