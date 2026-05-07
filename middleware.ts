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

    // Get token and is_admin flag from cookies
    const token = request.cookies.get('access_token')?.value;
    const isAdmin = request.cookies.get('is_admin')?.value === 'true';

    console.log(`[Middleware] Path: ${path} | Protected: ${isProtectedRoute} | HasToken: ${!!token} | IsAdmin: ${isAdmin}`);

    // 1. Redirect unauthenticated users trying to access protected routes
    if (isProtectedRoute && !token) {
        console.log(`[Middleware] Redirecting unauthenticated user from ${path} to /login`);
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', path);
        return NextResponse.redirect(loginUrl);
    }

    // 2. Role-based routing for authenticated users
    if (token) {
        const isAuthPage = cleanPath === '/login' || cleanPath === '/register';
        const isHomePage = cleanPath === '/';
        const isUserDashboard = cleanPath === '/dashboard' || cleanPath.startsWith('/dashboard/');
        const isAdminDashboard = cleanPath === '/admin-dashboard' || cleanPath.startsWith('/admin-dashboard/');

        // If admin tries to access auth pages, home page, or normal user dashboard -> redirect to admin dashboard
        if (isAdmin && (isAuthPage || isHomePage || isUserDashboard)) {
            console.log(`[Middleware] Redirecting ADMIN from ${path} to /admin-dashboard`);
            return NextResponse.redirect(new URL('/admin-dashboard', request.url));
        }

        // If normal user tries to access auth pages, home page, or admin dashboard -> redirect to user dashboard
        if (!isAdmin && (isAuthPage || isHomePage || isAdminDashboard)) {
            console.log(`[Middleware] Redirecting USER from ${path} to /dashboard`);
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }
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
