'use client';

import Link from 'next/link';
import { useLanguage } from '@/components/providers/language-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { ArrowRight } from 'lucide-react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/animations';
import { useState, useEffect, useRef } from 'react';

import { generalAPI } from '@/lib/api';

// ─── Looping Typewriter Hook ────────────────────────────────────────────────────────
function useLoopingTypewriter(words: string[], typingSpeed = 60, erasingSpeed = 40, pauseTime = 2000) {
    const [displayed, setDisplayed] = useState('');
    const [wordIndex, setWordIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const timeout = setTimeout(() => {
            const currentWord = words[wordIndex];

            if (!isDeleting) {
                // Typing
                setDisplayed(currentWord.slice(0, displayed.length + 1));
                if (displayed === currentWord) {
                    setTimeout(() => setIsDeleting(true), pauseTime);
                }
            } else {
                // Deleting
                setDisplayed(currentWord.slice(0, displayed.length - 1));
                if (displayed === '') {
                    setIsDeleting(false);
                    setWordIndex((prev) => (prev + 1) % words.length);
                }
            }
        }, isDeleting ? erasingSpeed : typingSpeed);

        return () => clearTimeout(timeout);
    }, [displayed, isDeleting, wordIndex, words, typingSpeed, erasingSpeed, pauseTime]);

    return displayed;
}

// ─── Cursor Blink ────────────────────────────────────────────────────────────
function BlinkCursor({ visible }: { visible: boolean }) {
    return (
        <motion.span
            className="inline-block w-[3px] h-[1em] bg-primary align-middle ml-1 rounded-sm"
            animate={visible ? { opacity: [1, 0, 1] } : { opacity: 0 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
        />
    );
}

// ─── Hero ────────────────────────────────────────────────────────────────────
export function Hero() {
    const { dict, isRtl } = useLanguage();
    const { user } = useAuth();
    const [statsData, setStatsData] = useState({
        total_users: 0,
        products_sold: 0,
        scrap_count: 0
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await generalAPI.getGeneralStats();
                setStatsData(data);
            } catch (error) {
                console.error('Failed to fetch hero stats:', error);
            }
        };
        fetchStats();
    }, []);

    // Format helper for display
    const formatStat = (val: number, fallback: string) => {
        if (!val || val === 0) return fallback;
        if (val >= 1000000) return `+${(val / 1000000).toFixed(1)} مليون`;
        if (val >= 1000) return `+${(val / 1000).toFixed(0)} ألف`;
        return `+${val}`;
    };

    // Typewriter: loop through different phrases
    const animatedText = useLoopingTypewriter([
        "سوقك الذكي لبيع وشراء المستعمل والخردة في مصر",
        "ابحث، زايد، واشترِ بأفضل الأسعار",
        "منصتك الموثوقة للمزادات والتجارة"
    ], 60, 30, 2500);

    const textSide = {
        hidden: { opacity: 0, x: isRtl ? 50 : -50 },
        visible: {
            opacity: 1,
            x: 0,
            transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
        },
    };

    const imageSide = {
        hidden: { opacity: 0, x: isRtl ? -50 : 50 },
        visible: {
            opacity: 1,
            x: 0,
            transition: {
                duration: 0.65,
                ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
                delay: 0.1,
            },
        },
    };

    return (
        <section className="min-h-screen flex flex-col pt-[88px] pb-0 px-4 sm:px-6 lg:px-8 overflow-hidden relative bg-page dark:bg-[#0e1015]">
            <div className="container mx-auto max-w-[1280px] flex flex-col flex-1">
                <div className="grid grid-cols-1 lg:grid-cols-[55fr_45fr] gap-12 lg:gap-16 items-center flex-1 py-8">

                    {/* RIGHT column — Text content (comes first in DOM for RTL) */}
                    <motion.div
                        variants={textSide}
                        initial="hidden"
                        animate="visible"
                        className="flex flex-col justify-center gap-0 lg:py-10"
                    >
                        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="w-full">
                            {/* Badge */}
                            <motion.div
                                variants={staggerItem}
                                className="inline-flex items-center gap-2 bg-primary/5 text-primary px-3.5 py-1.5 rounded-full text-[12px] font-tajawal font-bold mb-4 border border-primary/10"
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                مرحباً بك في 4Sale
                            </motion.div>

                            {/* Heading with Looping Typewriter */}
                            <motion.h1
                                variants={staggerItem}
                                className="text-4xl md:text-5xl lg:text-[clamp(2rem,3.8vw,3.2rem)] font-noto-kufi font-[800] mb-3 leading-[1.4] text-slate-900 dark:text-white w-full max-w-[700px] min-h-[100px] md:min-h-[120px]"
                            >
                                <span className="inline-block text-primary">
                                    {animatedText}
                                </span>
                            </motion.h1>

                            {/* Description */}
                            <motion.p
                                variants={staggerItem}
                                className="text-slate-600 dark:text-slate-400 mb-0 text-[17px] leading-[1.85] w-full max-w-[620px]"
                            >
                                {dict.hero.description}
                            </motion.p>

                            {/* CTA Buttons */}
                            <motion.div
                                variants={staggerItem}
                                className="flex flex-wrap sm:flex-nowrap items-center gap-4 mt-6"
                            >
                                <Link href={user ? '/dashboard' : '/login?redirect=/dashboard'}>
                                    <motion.button
                                        whileHover={{ scale: 1.02, y: -1 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="w-full sm:w-auto bg-primary text-white px-8 py-3 rounded-xl font-bold text-[15px] shadow-[0_6px_20px_rgba(1,105,111,0.28)] transition-all flex items-center justify-center gap-2"
                                    >
                                        <span>{dict.hero.browseProducts}</span>
                                        <ArrowRight size={18} className={`${isRtl ? 'rotate-180' : ''}`} />
                                    </motion.button>
                                </Link>

                                <Link href={user ? '/sell' : '/login?redirect=/sell'}>
                                    <motion.button
                                        whileHover={{ scale: 1.02, y: -1, backgroundColor: 'rgba(255,255,255,0.9)' }}
                                        whileTap={{ scale: 0.98 }}
                                        className="w-full sm:w-auto bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 px-8 py-3 rounded-xl font-bold text-[15px] transition-all"
                                    >
                                        {dict.hero.addListing}
                                    </motion.button>
                                </Link>
                            </motion.div>
                        </motion.div>
                    </motion.div>

                    {/* LEFT column — Image (comes second in DOM for RTL) */}
                    <motion.div
                        variants={imageSide}
                        initial="hidden"
                        animate="visible"
                        className="relative h-full flex items-center justify-center lg:justify-end"
                    >
                        <div
                            className="relative rounded-[24px] overflow-hidden aspect-[4/3] w-full shadow-[0_15px_40px_-10px_rgba(0,0,0,0.08)] border border-black/[0.04] dark:border-white/[0.04]"
                        >
                            <img
                                src="/hero-bg.jpg"
                                alt="4Sale marketplace"
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </motion.div>

                </div>

                {/* --- Stats strip — anchored to bottom of 100vh --- */}
                <div className="mt-auto pt-6 pb-8 border-t border-slate-200/40 dark:border-white/[0.05]">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                        {[
                            { value: formatStat(statsData.total_users, '+٢٠٠ ألف'), label: 'مستخدم نشط' },
                            { value: formatStat(statsData.products_sold, '+٥٠٠ ألف'), label: 'إعلان منشور' },
                            { value: '٩٨٪', label: 'رضا العملاء' },
                            { value: '٢٤/٧', label: 'دعم متاح' },
                        ].map((stat, idx) => (
                            <div
                                key={stat.label}
                                className={`text-center flex flex-col items-center justify-center ${idx !== 3 ? 'lg:border-e lg:border-slate-200 dark:lg:border-white/10 lg:pe-6 lg:me-6' : ''
                                    }`}
                            >
                                <p className="font-noto-kufi text-[1.4rem] font-black text-primary leading-none tracking-tight">
                                    {stat.value}
                                </p>
                                <p className="font-tajawal text-[11px] text-slate-400 mt-1 font-medium">
                                    {stat.label}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
