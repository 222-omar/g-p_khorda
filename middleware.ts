import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;

    // Define protected routes
    const protectedRoutes = ['/create-listing', '/profile', '/sell', '/settings', '/search'];
    const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route));

    // Get token from cookies
    // api.ts sets 'access_token'
    const token = request.cookies.get('access_token')?.value;

    // 1. Redirect unauthenticated users trying to access protected routes
    if (isProtectedRoute && !token) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', path);
        return NextResponse.redirect(loginUrl);
    }

    // 2. Redirect authenticated users away from auth pages (login/register) — NOT from homepage
    const isAuthPage = path === '/login' || path === '/register';
    if (isAuthPage && token) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
