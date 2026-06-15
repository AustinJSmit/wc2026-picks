import { NextRequest, NextResponse } from 'next/server';

const protectedPaths = ['/matches', '/match', '/profile'];

export function proxy(req: NextRequest) {
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
  matcher: ['/matches/:path*', '/match/:path*', '/profile/:path*'],
};
