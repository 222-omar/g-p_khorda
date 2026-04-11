'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useLanguage } from '@/components/providers/language-provider';
import {
    Moon, Sun, Languages, User, Menu, X, LogOut, MessageCircle, Bot, Sparkles, Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { authAPI, profilesAPI, chatAPI } from '@/lib/api';
import { useRouter, usePathname } from 'next/navigation';

import { useAuth } from '@/components/providers/auth-provider';

export function Navbar() {
    const { theme, setTheme } = useTheme();
    const { dict, toggleLanguage, isRtl } = useLanguage();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { user, loading, logout, isAdmin } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);
    const router = useRouter();
    const pathname = usePathname();

    const getNavItemClass = (path: string) => {
        const isActive = pathname === path || (path !== '/' && pathname.startsWith(path));
        return `text-sm font-bold relative pb-2 transition-all duration-300 flex items-center gap-1.5 ${
            isActive 
                ? 'text-primary' 
                : 'text-slate-600 dark:text-slate-300 hover:text-primary'
        } after:absolute after:bottom-0 after:right-0 after:h-[2px] after:bg-primary after:transition-all after:duration-300 ${
            isActive ? 'after:w-full' : 'after:w-0 hover:after:w-full'
        }`;
    };

    const getMobileNavItemClass = (path: string) => {
        const isActive = pathname === path || (path !== '/' && pathname.startsWith(path));
        return `px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-all duration-300 ${
            isActive 
                ? 'bg-primary/10 text-primary border-r-4 border-primary' 
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary'
        }`;
    };

    // Determine current user display info
    const fullUserName = user?.user?.first_name 
        ? `${user.user.first_name} ${user.user.last_name || ''}`.trim()
        : user?.user?.username?.split('@')[0] || '';
    
    const avatarUrl = user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.user?.username || 'default'}`;

    // Fetch unread count periodically
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (!user) {
            setUnreadCount(0);
            return;
        }

        const fetchUnread = async () => {
            try {
                // Check if token still exists before polling
                const token = document.cookie.split(';').find(c => c.trim().startsWith('access_token='));
                if (!token) {
                    clearInterval(interval);
                    return;
                }
                const data = await chatAPI.getUnreadCount();
                setUnreadCount(data.unread_count);
            } catch (e: any) {
                // If unauthorized, stop polling
                const status = e?.response?.status || e?.status;
                if (status === 401) {
                    clearInterval(interval);
                }
            }
        };

        fetchUnread();
        interval = setInterval(fetchUnread, 60000); // Poll every 60 seconds
        return () => clearInterval(interval);
    }, [user]);

    const handleLogout = () => {
        logout();
    };

    const isLoggedIn = !!user;

    return (
        <nav className="fixed top-0 w-full z-50 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 group">
                        <span className="text-xl font-bold">
                            <span className="text-primary">4</span>Sale
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-6">
                        <Link
                            href="/"
                            className={getNavItemClass('/')}
                        >
                            {dict.nav.home}
                        </Link>
                        <Link
                            href={isLoggedIn ? "/dashboard" : "/login"}
                            className={getNavItemClass('/dashboard')}
                        >
                            {dict.nav.shop}
                        </Link>
                        <Link
                            href={isLoggedIn ? "/auctions" : "/login"}
                            className={getNavItemClass('/auctions')}
                        >
                            {dict.nav.auctions}
                        </Link>
                        {isLoggedIn && (
                            <Link
                                href="/messages"
                                className={getNavItemClass('/messages')}
                            >
                                <MessageCircle size={16} className={pathname.startsWith('/messages') ? "text-primary" : ""} />
                                الرسائل
                                {unreadCount > 0 && (
                                    <span className="bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                        {unreadCount}
                                    </span>
                                )}
                            </Link>
                        )}
                        {isLoggedIn && (
                            <>
                                <Link
                                    href="/agent"
                                    className={getNavItemClass('/agent')}
                                >
                                    <Bot size={16} className={pathname.startsWith('/agent') ? "text-primary" : ""} />
                                    الوكيل الذكي
                                </Link>
                                <Link
                                    href="/search"
                                    className={getNavItemClass('/search')}
                                >
                                    <Sparkles size={16} className={pathname.startsWith('/search') ? "text-primary" : ""} />
                                    بوت ذكي
                                </Link>
                            </>
                        )}
                        {isAdmin && (
                            <Link
                                href="/admin-dashboard"
                                className={getNavItemClass('/admin-dashboard')}
                            >
                                <Shield size={16} className={pathname.startsWith('/admin-dashboard') ? "text-primary" : ""} />
                                لوحة الإدارة
                            </Link>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        {/* Language Toggle */}
                        <button
                            onClick={toggleLanguage}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                            aria-label="Toggle language"
                        >
                            <Languages size={18} />
                        </button>

                        {/* Theme Toggle */}
                        <button
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                            aria-label="Toggle theme"
                        >
                            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                        </button>

                        {/* Auth Buttons / User Menu */}
                        {!loading && (
                            <>
                                {!isLoggedIn ? (
                                    <div className="hidden md:flex items-center gap-2">
                                        <Link href="/login">
                                            <button className="px-4 py-2 text-sm font-bold hover:text-primary transition-colors">
                                                {dict.nav.login}
                                            </button>
                                        </Link>
                                        <Link href="/register">
                                            <button className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm hover:shadow-md">
                                                {dict.nav.register}
                                            </button>
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="hidden md:flex items-center gap-3">
                                        <div className="flex items-center gap-2">
                                            <Link href="/profile">
                                                <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-primary overflow-hidden hover:ring-2 hover:ring-primary transition-all cursor-pointer">
                                                    <img
                                                        src={avatarUrl}
                                                        alt={fullUserName}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            </Link>
                                        <div className="flex flex-col">
                                                <span className="text-sm font-bold flex items-center gap-1.5">
                                                    {fullUserName}
                                                    {isAdmin && (
                                                        <span className="text-[10px] font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white px-1.5 py-0.5 rounded-full leading-none">
                                                            ADMIN
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleLogout}
                                            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors text-red-600 dark:text-red-400"
                                            aria-label="Logout"
                                        >
                                            <LogOut size={18} />
                                        </button>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
                        >
                            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                <AnimatePresence>
                    {mobileMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="md:hidden border-t border-slate-200 dark:border-slate-800 py-4"
                        >
                            <div className="flex flex-col gap-3">
                                <Link
                                    href="/"
                                    className={getMobileNavItemClass('/')}
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    {dict.nav.home}
                                </Link>
                                <Link
                                    href={isLoggedIn ? "/dashboard" : "/login?redirect=/dashboard"}
                                    className={getMobileNavItemClass('/dashboard')}
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    {dict.nav.shop}
                                </Link>
                                <Link
                                    href={isLoggedIn ? "/auctions" : "/login?redirect=/auctions"}
                                    className={getMobileNavItemClass('/auctions')}
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    {dict.nav.auctions}
                                </Link>
                                {isLoggedIn && (
                                    <Link
                                        href="/messages"
                                        className={getMobileNavItemClass('/messages')}
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        <MessageCircle size={18} className={pathname.startsWith('/messages') ? "text-primary" : ""} />
                                        الرسائل
                                        {unreadCount > 0 && (
                                            <span className="bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                                {unreadCount}
                                            </span>
                                        )}
                                    </Link>
                                )}
                                {isLoggedIn && (
                                    <>
                                        <Link
                                            href="/agent"
                                            className={getMobileNavItemClass('/agent')}
                                            onClick={() => setMobileMenuOpen(false)}
                                        >
                                            <Bot size={18} className={pathname.startsWith('/agent') ? "text-primary" : ""} />
                                            الوكيل الذكي
                                        </Link>
                                        <Link
                                            href="/search"
                                            className={getMobileNavItemClass('/search')}
                                            onClick={() => setMobileMenuOpen(false)}
                                        >
                                            <Sparkles size={18} className={pathname.startsWith('/search') ? "text-primary" : ""} />
                                            بوت ذكي
                                        </Link>
                                    </>
                                )}
                                {isAdmin && (
                                    <Link
                                        href="/admin-dashboard"
                                        className={getMobileNavItemClass('/admin-dashboard')}
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        <Shield size={18} className={pathname.startsWith('/admin-dashboard') ? "text-primary" : ""} />
                                        لوحة الإدارة
                                    </Link>
                                )}
                                {!loading && (
                                    <>
                                        {!isLoggedIn ? (
                                            <>
                                                <Link
                                                    href="/login"
                                                    className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-semibold"
                                                    onClick={() => setMobileMenuOpen(false)}
                                                >
                                                    {dict.nav.login}
                                                </Link>
                                                <Link
                                                    href="/login"
                                                    onClick={() => setMobileMenuOpen(false)}
                                                >
                                                    <button className="mx-4 bg-primary text-white py-2 rounded-lg font-bold">
                                                        {dict.nav.register}
                                                    </button>
                                                </Link>
                                            </>
                                        ) : (
                                            <>
                                                <div className="px-4 py-2 flex items-center gap-2">
                                                    <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-primary overflow-hidden">
                                                        <img
                                                            src={avatarUrl}
                                                            alt={fullUserName}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <span className="font-bold flex items-center gap-1.5">
                                                        {fullUserName}
                                                        {isAdmin && (
                                                            <span className="text-[10px] font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white px-1.5 py-0.5 rounded-full leading-none">
                                                                ADMIN
                                                            </span>
                                                        )}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        handleLogout();
                                                        setMobileMenuOpen(false);
                                                    }}
                                                    className="mx-4 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg font-semibold flex items-center gap-2"
                                                >
                                                    <LogOut size={18} />
                                                    تسجيل الخروج
                                                </button>
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </nav>
    );
}
