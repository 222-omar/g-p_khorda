import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;
    
    // Normalize path by removing multiple slashes and ensuring consistent trailing comparison
    // Since trailingSlash: true is set, most paths will have a trailing slash
    const cleanPath = path.replace(/\/+$/, '') || '/';
    
    // Define protected routes
    const protectedRoutes = ['/create-listing', '/profile', '/sell', '/settings', '/search', '/admin-dashboard', '/dashboard'];
    const isProtectedRoute = protectedRoutes.some(route => cleanPath === route || cleanPath.startsWith(`${route}/`));

    // Get token from cookies
    const token = request.cookies.get('access_token')?.value;

    console.log(`[Middleware] Path: ${path} | Clean Path: ${cleanPath} | Protected: ${isProtectedRoute} | HasToken: ${!!token}`);

    // 1. Redirect unauthenticated users trying to access protected routes
    if (isProtectedRoute && !token) {
        console.log(`[Middleware] Redirecting unauthenticated user from ${path} to /login`);
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', path);
        return NextResponse.redirect(loginUrl);
    }

    // 2. Redirect authenticated users away from auth pages AND homepage to dashboard
    const isAuthPage = cleanPath === '/login' || cleanPath === '/register';
    const isHomePage = cleanPath === '/';
    
    if ((isAuthPage || isHomePage) && token) {
        console.log(`[Middleware] Redirecting authenticated user from ${path} to /dashboard`);
        return NextResponse.redirect(new URL('/dashboard', request.url));
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
