import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';

const redis = Redis.fromEnv();

export const loginIpLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '5 m'),
  prefix: 'rl:login:ip',
});

export const loginEmailLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '5 m'),
  prefix: 'rl:login:email',
});

export const signupIpLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 h'),
  prefix: 'rl:signup:ip',
});

export const joinIpLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  prefix: 'rl:join:ip',
});

export const createLobbyUserLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 h'),
  prefix: 'rl:lobby-create:user',
});

export const baselineIpLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, '1 m'),
  prefix: 'rl:baseline:ip',
});

export const forgotPasswordIpLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '1 h'),
  prefix: 'rl:forgot-pw:ip',
});

export const resetPasswordIpLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 h'),
  prefix: 'rl:reset-pw:ip',
});

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || 'unknown';
}

export async function checkRateLimit(limiter: Ratelimit, key: string) {
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
