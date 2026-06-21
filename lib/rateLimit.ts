import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';

const hasRedis = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
if (!hasRedis) console.warn('Upstash env vars not set — rate limiting disabled.');

const redis = hasRedis ? Redis.fromEnv() : null;

function makeLimiter(limiter: Ratelimit['limiter'], prefix: string): Ratelimit | null {
  if (!redis) return null;
  return new Ratelimit({ redis, limiter, prefix });
}

export const loginIpLimiter          = makeLimiter(Ratelimit.slidingWindow(10, '5 m'), 'rl:login:ip');
export const loginEmailLimiter       = makeLimiter(Ratelimit.slidingWindow(5,  '5 m'), 'rl:login:email');
export const signupIpLimiter         = makeLimiter(Ratelimit.slidingWindow(5,  '1 h'), 'rl:signup:ip');
export const joinIpLimiter           = makeLimiter(Ratelimit.slidingWindow(10, '1 m'), 'rl:join:ip');
export const createLobbyUserLimiter  = makeLimiter(Ratelimit.slidingWindow(5,  '1 h'), 'rl:lobby-create:user');
export const baselineIpLimiter       = makeLimiter(Ratelimit.slidingWindow(60, '1 m'), 'rl:baseline:ip');
export const forgotPasswordIpLimiter = makeLimiter(Ratelimit.slidingWindow(3,  '1 h'), 'rl:forgot-pw:ip');
export const resetPasswordIpLimiter  = makeLimiter(Ratelimit.slidingWindow(5,  '1 h'), 'rl:reset-pw:ip');

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || 'unknown';
}

export async function checkRateLimit(limiter: Ratelimit | null, key: string) {
  if (!limiter) return { success: true, remaining: 0, reset: Date.now() };
  try {
    const { success, remaining, reset } = await limiter.limit(key);
    return { success, remaining, reset };
  } catch (err) {
    // Fail open if Upstash is unreachable or not yet configured — rate limiting
    // is defense-in-depth, not something that should take the whole app down.
    console.error('Rate limit check failed, allowing request through:', err);
    return { success: true, remaining: 0, reset: Date.now() };
  }
}

export function rateLimitResponse(reset: number) {
  const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } }
  );
}
