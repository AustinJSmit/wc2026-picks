import bcrypt from 'bcryptjs';
import { getSession } from './session';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session.userId) return null;
  const [user] = await db.select().from(users).where(eq(users.id, session.userId));
  return user ?? null;
}
