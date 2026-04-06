'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useLanguage } from '@/components/providers/language-provider';
import {
    Moon, Sun, Languages, User, Menu, X, LogOut, MessageCircle, Bot, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { authAPI, profilesAPI, chatAPI } from '@/lib/api';
import { useRouter, usePathname } from 'next/navigation';

import { useAuth } from '@/components/providers/auth-provider';

export function Navbar() {
    const { theme, setTheme } = useTheme();
    const { dict, toggleLanguage, isRtl } = useLanguage();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { user, loading, logout } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);
    const router = useRouter();
    const pathname = usePathname();

    // Determine current user display info
    const fullUserName = user?.user?.first_name 
        ? `${user.user.first_name} ${user.user.last_name || ''}`.trim()
        : user?.user?.username?.split('@')[0] || '';
    
    const avatarUrl = user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.user?.username || 'default'}`;

    // Fetch unread count periodically
    useEffect(() => {
        if (!user) {
            setUnreadCount(0);
            return;
        }

        const fetchUnread = async () => {
            try {
                const data = await chatAPI.getUnreadCount();
                setUnreadCount(data.unread_count);
            } catch (e) { /* ignore errors */ }
        };

        fetchUnread();
        const interval = setInterval(fetchUnread, 60000); // Poll every 60 seconds
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
                            className={`text-sm font-semibold transition-colors relative pb-1 ${pathname === '/' ? 'text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:rounded-full' : 'hover:text-primary'
                                }`}
                        >
                            {dict.nav.home}
                        </Link>
                        <Link
                            href={isLoggedIn ? "/dashboard" : "/login"}
                            className={`text-sm font-semibold transition-colors relative pb-1 ${pathname === '/dashboard' ? 'text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:rounded-full' : 'hover:text-primary'
                                }`}
                        >
                            {dict.nav.shop}
                        </Link>
                        <Link
                            href={isLoggedIn ? "/auctions" : "/login"}
                            className={`text-sm font-semibold transition-colors relative pb-1 ${pathname === '/auctions' ? 'text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:rounded-full' : 'hover:text-primary'
                                }`}
                        >
                            {dict.nav.auctions}
                        </Link>
                        {isLoggedIn && (
                            <Link
                                href="/messages"
                                className={`text-sm font-semibold transition-colors relative pb-1 flex items-center gap-1 ${pathname === '/messages' ? 'text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:rounded-full' : 'hover:text-primary'}`}
                            >
                                <MessageCircle size={16} />
                                الرسائل
                                {unreadCount > 0 && (
                                    <span className="bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                        {unreadCount}
                                    </span>
                                )}
                            </Link>
                        )}
                        {isLoggedIn && (
                            <Link
                                href="/agent"
                                className={`text-sm font-semibold transition-colors relative pb-1 flex items-center gap-1 ${pathname === '/agent' ? 'text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:rounded-full' : 'hover:text-primary'}`}
                            >
                                <Bot size={16} />
                                الوكيل الذكي
                            </Link>
                        )}
                        <Link
                            href="/search"
                            className={`text-sm font-semibold transition-colors relative pb-1 flex items-center gap-1 ${pathname === '/search' ? 'text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:rounded-full' : 'hover:text-primary'}`}
                        >
                            <Sparkles size={16} />
                            بحث ذكي
                        </Link>
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
                                                <span className="text-sm font-bold">
                                                    {fullUserName}
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
                                    className={`px-4 py-2 rounded-lg font-semibold ${pathname === '/' ? 'bg-primary/10 text-primary border-r-4 border-primary' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                                        }`}
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    {dict.nav.home}
                                </Link>
                                <Link
                                    href={isLoggedIn ? "/dashboard" : "/login?redirect=/dashboard"}
                                    className={`px-4 py-2 rounded-lg font-semibold ${pathname === '/dashboard' ? 'bg-primary/10 text-primary border-r-4 border-primary' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                                        }`}
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    {dict.nav.shop}
                                </Link>
                                <Link
                                    href={isLoggedIn ? "/auctions" : "/login?redirect=/auctions"}
                                    className={`px-4 py-2 rounded-lg font-semibold ${pathname === '/auctions' ? 'bg-primary/10 text-primary border-r-4 border-primary' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                                        }`}
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    {dict.nav.auctions}
                                </Link>
                                {isLoggedIn && (
                                    <Link
                                        href="/messages"
                                        className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 ${pathname === '/messages' ? 'bg-primary/10 text-primary border-r-4 border-primary' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        <MessageCircle size={18} />
                                        الرسائل
                                        {unreadCount > 0 && (
                                            <span className="bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                                {unreadCount}
                                            </span>
                                        )}
                                    </Link>
                                )}
                                {isLoggedIn && (
                                    <Link
                                        href="/agent"
                                        className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 ${pathname === '/agent' ? 'bg-primary/10 text-primary border-r-4 border-primary' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        <Bot size={18} />
                                        الوكيل الذكي
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
                                                    <span className="font-bold">{fullUserName}</span>
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
