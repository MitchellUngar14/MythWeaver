import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/signup'];
  const isPublicRoute = publicRoutes.includes(nextUrl.pathname);

  // API routes that don't require authentication
  const publicApiRoutes = ['/api/auth'];
  const isPublicApiRoute = publicApiRoutes.some(route =>
    nextUrl.pathname.startsWith(route)
  );

  // If it's a public route or public API, allow access
  if (isPublicRoute || isPublicApiRoute) {
    // Redirect logged-in users away from auth pages
    if (isLoggedIn && (nextUrl.pathname === '/login' || nextUrl.pathname === '/signup')) {
      return NextResponse.redirect(new URL('/dashboard', nextUrl));
    }
    return NextResponse.next();
  }

  // Redirect unauthenticated users to login
  if (!isLoggedIn) {
    const loginUrl = new URL('/login', nextUrl);
    loginUrl.searchParams.set('callbackUrl', nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check role-based access
  const user = req.auth?.user;

  // DM-only routes
  const dmRoutes = ['/dm', '/world'];
  const isDmRoute = dmRoutes.some(route => nextUrl.pathname.startsWith(route));

  if (isDmRoute && !user?.isDm) {
    return NextResponse.redirect(new URL('/dashboard', nextUrl));
  }

  // Player-only routes
  const playerRoutes = ['/characters', '/character'];
  const isPlayerRoute = playerRoutes.some(route => nextUrl.pathname.startsWith(route));

  if (isPlayerRoute && !user?.isPlayer) {
    return NextResponse.redirect(new URL('/dashboard', nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
