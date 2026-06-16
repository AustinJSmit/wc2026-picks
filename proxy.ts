import { NextRequest, NextResponse } from 'next/server';
import { baselineIpLimiter, getClientIp, checkRateLimit, rateLimitResponse } from '@/lib/rateLimit';

const protectedPaths = ['/matches', '/match', '/profile'];

export async function proxy(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/api/')) {
    const { success, reset } = await checkRateLimit(baselineIpLimiter, getClientIp(req));
    if (!success) return rateLimitResponse(reset);
    return NextResponse.next();
  }

  const sessionCookie = req.cookies.get('wc2026_session');
  const isProtected = protectedPaths.some(p => req.nextUrl.pathname.startsWith(p));

  if (isProtected && !sessionCookie) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('from', req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/matches/:path*', '/match/:path*', '/profile/:path*', '/api/:path*'],
};
