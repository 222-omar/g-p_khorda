'use client';

import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/components/providers/language-provider';
import { Users, Package, Leaf, MapPin } from 'lucide-react';
import { motion, useInView } from 'framer-motion';
import { generalAPI } from '@/lib/api';
import { staggerContainer, staggerItem } from '@/lib/animations';

// Hook: animate a number counting up when in view
function useCountUp(target: number, duration = 1.5, inView = false) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (!inView || target === 0) return;
        let startTime: number | null = null;
        const step = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
            // easeOut cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }, [target, duration, inView]);
    return count;
}

function StatCard({ icon: Icon, label, value, index }: any) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, margin: '-60px' });
    const numericValue = typeof value === 'number' ? value : parseInt(value) || 0;
    const count = useCountUp(numericValue, 1.6, inView);

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 15 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center py-4 lg:py-0"
        >
            <div className="flex items-center gap-4">
                <div className="text-primary/70 mb-0">
                    <Icon size={22} strokeWidth={2} />
                </div>
                <div className="flex flex-col">
                    <h3 className="text-2xl lg:text-3xl font-black font-noto-kufi text-slate-900 dark:text-white leading-none">
                        {count.toLocaleString()}
                    </h3>
                    <p className="text-slate-400 dark:text-slate-500 text-[10px] lg:text-[11px] font-bold font-tajawal uppercase tracking-wider mt-1">
                        {label}
                    </p>
                </div>
            </div>
        </motion.div>
    );
}

export function Stats() {
    const { dict } = useLanguage();
    const [statsData, setStatsData] = useState({
        total_users: 0,
        products_sold: 0,
        scrap_count: 0,
        active_governorates: 0
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await generalAPI.getGeneralStats();
                setStatsData(data);
            } catch (error) {
                console.error('Failed to fetch stats:', error);
            }
        };
        fetchStats();
    }, []);

    const stats = [
        { icon: Users, label: dict.stats.activeUsers, value: statsData.total_users || 0 },
        { icon: Package, label: dict.stats.productsSold, value: statsData.products_sold || 0 },
        { icon: Leaf, label: dict.stats.scrapTons, value: statsData.scrap_count || 0 },
        { icon: MapPin, label: dict.stats.governorates, value: statsData.active_governorates || 0 },
    ];

    return (
        <section className="relative z-10 -mt-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] border border-slate-200/50 dark:border-slate-800/50 shadow-[0_8px_32px_rgba(0,0,0,0.04)] dark:shadow-none py-8 lg:py-10 px-8">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-0 divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-slate-100 dark:divide-slate-800">
                        {stats.map((stat, index) => (
                            <div key={index} className="flex justify-center first:pt-0 pt-8 lg:pt-0">
                                <StatCard {...stat} index={index} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
