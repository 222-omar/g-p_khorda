'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useLanguage } from '@/components/providers/language-provider';
import { 
    Moon, Sun, Languages, Menu, X, LogOut, MessageCircle, Bot, Sparkles, Shield,
    LayoutDashboard, Gavel, Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from '@/components/ui/logo';
import { usePathname } from 'next/navigation';
import { useAuth } from '../providers/auth-provider';

// ─────────────────────────────────────────────
// DESKTOP NAV LINK
// ─────────────────────────────────────────────
function NavLink({
  href,
  children,
  isActive
}: {
  href: string;
  children: React.ReactNode;
  isActive?: boolean;
}) {
  return (
    <a
      href={href}
      className={`relative font-tajawal text-[15px] transition-all duration-300 py-1 group focus-visible:outline-none font-medium ${
        isActive ? 'text-primary' : 'text-slate-600 dark:text-slate-300 hover:text-primary'
      }`}
    >
      {children}
      <span className={`absolute bottom-0 right-0 h-[2px] bg-primary rounded-full transition-all duration-300 ${
        isActive ? 'w-full' : 'w-0 group-hover:w-full'
      }`} />
    </a>
  );
}

// ─────────────────────────────────────────────
// MAIN NAVBAR
// ─────────────────────────────────────────────
export function Navbar() {
  const { theme, setTheme } = useTheme();
  const { dict, toggleLanguage, isRtl } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, loading, logout, isAdmin } = useAuth();
  const pathname = usePathname();

  const [activeSection, setActiveSection] = useState('home');

  // Scroll effect & Active section tracking
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });

    // Intersection Observer for active section
    const observerOptions = {
      root: null,
      rootMargin: '-40% 0px -40% 0px', // Center-ish triggers
      threshold: 0
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    const sections = ['home', 'how-it-works', 'categories', 'why-us', 'faq'];
    sections.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => {
      window.removeEventListener('scroll', onScroll);
      observer.disconnect();
    };
  }, []);

  // Close menu on navigate
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const navLinks = [
    { name: 'الرئيسية',       href: '#home' },
    { name: 'الفئات',         href: '#categories' },
    { name: 'كيف يعمل؟',     href: '#how-it-works' },
    { name: 'لماذا 4Sale؟',  href: '#why-us' },
    { name: 'الأسئلة الشائعة', href: '#faq' },
  ];

  const appLinks = [
    { name: 'الرئيسية',        href: '/',         icon: <Sparkles size={16} /> },
    { name: dict.nav.shop,       href: '/dashboard', icon: <LayoutDashboard size={16} /> },
    { name: dict.nav.auctions,   href: '/auctions',  icon: <Gavel size={16} /> },
    ...(user ? [
      { name: 'الوكيل الذكي', href: '/agent',  icon: <Bot size={16} /> },
      { name: 'الرسائل',      href: '/messages', icon: <MessageCircle size={16} /> },
      { name: 'بوت ذكي',      href: '/search', icon: <Sparkles size={16} /> }
    ] : []),
    ...(isAdmin ? [
      { name: 'لوحة الإدارة', href: '/admin-dashboard', icon: <Shield size={16} />, color: 'text-amber-600' }
    ] : []),
  ];

  const isLoggedIn   = !!user;
  const isLandingPage = pathname === '/';
  const activeLinks  = isLandingPage ? navLinks : appLinks;

  const avatarUrl = user?.avatar ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.user?.username || 'default'}`;
  const fullUserName = user?.user?.first_name
    ? `${user.user.first_name} ${user.user.last_name || ''}`.trim()
    : user?.user?.username?.split('@')[0] || '';

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-[100] transition-all duration-300 ease-[0.22,1,0.36,1] ${
          scrolled
            ? 'py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-3xl saturate-[1.6] border-b border-black/[0.05] dark:border-white/[0.1] shadow-[0_20px_70px_-20px_rgba(0,0,0,0.12)]'
            : 'py-5 bg-transparent'
        }`}
      >
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-[1240px]">
          <div className="flex items-center justify-between gap-4">

            {/* ── Logo ── */}
            <Logo />

            {/* ── Desktop Links (centered) ── */}
            <div className="hidden lg:flex items-center gap-7 flex-1 justify-center">
              {activeLinks.map((link) => {
                const isActive = isLandingPage 
                  ? activeSection === link.href.replace('#', '')
                  : (pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href)));

                return isLandingPage ? (
                  <NavLink key={link.name} href={link.href} isActive={isActive}>
                    {link.name}
                  </NavLink>
                ) : (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`font-tajawal text-[15px] font-bold flex items-center gap-2 transition-all duration-300 ${
                      isActive 
                        ? 'text-primary' 
                        // @ts-ignore
                        : (link.color || 'text-slate-600 dark:text-slate-300 hover:text-primary')
                    }`}
                  >
                     {/* @ts-ignore */}
                    {link.icon}
                    {link.name}
                  </Link>
                );
              })}
            </div>

            {/* ── Actions ── */}
            <div className="flex items-center gap-1.5 flex-shrink-0">


              {/* Theme toggle */}
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                aria-label="تبديل المظهر"
                className="w-9 h-9 items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors hidden sm:flex"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={theme}
                    initial={{ opacity: 0, rotate: -30, scale: 0.8 }}
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    exit={{ opacity: 0, rotate: 30, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                  >
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                  </motion.div>
                </AnimatePresence>
              </button>

              {/* Language toggle */}
              <button
                onClick={toggleLanguage}
                aria-label={isRtl ? 'Switch to English' : 'التبديل للعربية'}
                className="hidden sm:flex w-9 h-9 items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.07] transition-colors duration-200"
              >
                <Languages size={18} strokeWidth={2} />
              </button>

              <div className="hidden sm:block w-px h-5 bg-slate-200 dark:bg-white/10 mx-1.5" />

              {!loading && (
                <>
                  {!isLoggedIn ? (
                    <div className="hidden md:flex items-center gap-2">
                      <Link href="/login">
                        <button className="font-tajawal text-[14px] font-bold text-slate-600 dark:text-slate-300 hover:text-primary pe-3 me-1 border-e border-slate-200 dark:border-slate-700 py-2 transition-colors">
                          {dict.nav.login}
                        </button>
                      </Link>
                      <Link href="/register">
                        <button
                          className="bg-primary text-white font-tajawal font-semibold text-[13.5px] px-4 py-[7px] rounded-lg border border-primary/10 transition-all transform hover:-translate-y-0.5 active:scale-[0.98]"
                          style={{ boxShadow: '0 2px 8px rgba(1,105,111,0.22)' }}
                        >
                          {dict.nav.register}
                        </button>
                      </Link>
                    </div>
                  ) : (
                    <div className="hidden md:flex items-center gap-3">
                      <Link href="/profile" className="flex items-center gap-3 group">
                        <div className="relative">
                           <img
                            src={avatarUrl}
                            alt={fullUserName}
                            className="w-9 h-9 rounded-full border-2 border-primary/30 object-cover transition-transform group-hover:scale-105"
                          />
                          {isAdmin && (
                            <div className="absolute -top-1 -right-1 bg-amber-500 w-3 h-3 rounded-full border-2 border-white dark:border-[#0f172a]" />
                          )}
                        </div>
                        <div className="hidden xl:flex flex-col text-right">
                          <span className="font-tajawal text-[10px] text-slate-400 leading-none mb-0.5">أهلاً بك</span>
                          <span className="font-tajawal text-[14px] font-bold text-slate-800 dark:text-white leading-none">
                            {fullUserName}
                          </span>
                        </div>
                      </Link>
                      <button
                        onClick={logout}
                        className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                      >
                        <LogOut size={18} />
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Hamburger */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-white/[0.08] text-slate-700 dark:text-slate-200 transition-colors"
              >
                {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>

            </div>
          </div>
        </nav>
      </header>

      {/* ── Mobile Menu ── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[98] bg-black/40 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />

            {/* Floating Card Panel */}
            <motion.div
              id="mobile-menu"
              role="dialog"
              aria-label="قائمة التنقل"
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0,   scale: 1    }}
              exit={{ opacity: 0,    y: -12, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="fixed top-[72px] inset-x-4 z-[99] lg:hidden bg-white dark:bg-[#0f172a] border border-black/[0.07] dark:border-white/[0.09] rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Nav links */}
              <nav className="p-2 space-y-1">
                {activeLinks.map((link, i) => {
                  const isActive = isLandingPage 
                    ? activeSection === link.href.replace('#', '')
                    : (pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href)));
                    
                  return (
                    <motion.div
                      key={link.name}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0  }}
                      transition={{ delay: i * 0.045, duration: 0.2 }}
                    >
                      <Link
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-4 w-full px-4 py-3.5 rounded-xl font-tajawal text-[15px] transition-all font-semibold group ${
                          isActive 
                            ? 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20' 
                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-primary'
                        }`}
                      >
                        <span className={`${isActive ? 'text-primary' : 'text-primary/70 group-hover:text-primary'} transition-colors`}>
                          {/* @ts-ignore */}
                          {link.color && !isActive ? <span className={link.color}>{link.icon}</span> : (link.icon || <Sparkles size={18} />)}
                        </span>
                        <span>{link.name}</span>
                      </Link>
                    </motion.div>
                  );
                })}
              </nav>

              {/* Divider */}
              <div className="mx-4 h-px bg-slate-100 dark:bg-white/[0.07]" />

              {/* Auth Buttons */}
              <div className="p-4 pt-2 space-y-2">
                {!loading && (
                  !isLoggedIn ? (
                    <div className="grid grid-cols-2 gap-3">
                      <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="w-full">
                        <button className="w-full py-3 font-tajawal text-[14px] font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 rounded-xl hover:bg-slate-50 transition-colors">
                          {dict.nav.login}
                        </button>
                      </Link>
                      <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="w-full">
                        <button
                          className="w-full py-3 font-tajawal text-[14px] font-bold text-white bg-primary rounded-xl hover:bg-primary-light transition-colors shadow-lg shadow-primary/20"
                        >
                          {dict.nav.register}
                        </button>
                      </Link>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between px-3 py-2.5 bg-slate-50 dark:bg-white/[0.04] rounded-xl">
                      <Link
                        href="/profile"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3"
                      >
                        <img
                          src={avatarUrl}
                          alt={fullUserName}
                          className="w-10 h-10 rounded-full border-2 border-primary/25 object-cover"
                        />
                        <div className="flex flex-col">
                          <span className="font-tajawal text-[11px] text-slate-400 leading-none">أهلاً بك</span>
                          <span className="font-tajawal text-[14px] font-bold text-slate-800 dark:text-white leading-none">{fullUserName}</span>
                        </div>
                      </Link>
                      <button
                        onClick={() => { logout(); setMobileMenuOpen(false); }}
                        className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <LogOut size={18} />
                      </button>
                    </div>
                  )
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
