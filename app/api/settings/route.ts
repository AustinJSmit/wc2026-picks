import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/session';

const schema = z.object({
  timezone: z.string().refine(tz => {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, 'Invalid timezone').optional(),
  darkMode: z.enum(['dark', 'light', 'system']).optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { timezone, darkMode } = parsed.data;
  const updates: Record<string, string> = {};
  if (timezone) updates.timezone = timezone;
  if (darkMode) updates.darkMode = darkMode;

  if (Object.keys(updates).length > 0) {
    await db.update(users).set(updates).where(eq(users.id, session.userId));
  }

  if (timezone) {
    session.timezone = timezone;
    await session.save();
  }

  const res = NextResponse.json({ ok: true });
  if (darkMode) {
    res.cookies.set('theme', darkMode, { path: '/', maxAge: 365 * 24 * 3600, sameSite: 'lax' });
  }
  return res;
}
