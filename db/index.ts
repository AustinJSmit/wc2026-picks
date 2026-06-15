import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Fallback keeps neon() from throwing at build time when DATABASE_URL isn't set.
// Any real query without a valid URL will still fail at runtime — as expected.
const sql = neon(process.env.DATABASE_URL ?? 'postgresql://build:build@build.neon.tech/build');
export const db = drizzle(sql, { schema });
