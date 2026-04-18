'use client';

import { useLanguage } from '@/components/providers/language-provider';
import { motion, Variants } from 'framer-motion';
import { Laptop, Sofa, Recycle, Car, Building2, Package, BookOpen, WashingMachine } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { staggerContainer, staggerItem } from '@/lib/animations';

const cardVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95, y: 15 },
    visible: (i: number) => ({
        opacity: 1,
        scale: 1,
        y: 0,
        transition: {
            duration: 0.4,
            delay: i * 0.05,
            ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
        },
    }),
};

export function Categories() {
    const { dict } = useLanguage();
    const router = useRouter();
    const { user } = useAuth();

    const categories = [
        { id: 'cars', name: 'سيارات للبيع', icon: Car, iconColor: 'text-rose-600 dark:text-rose-400', iconBg: 'bg-rose-50 dark:bg-rose-500/10' },
        { id: 'electronics', name: 'إلكترونيات وأجهزة', icon: Laptop, iconColor: 'text-blue-600 dark:text-blue-400', iconBg: 'bg-blue-50 dark:bg-blue-500/10' },
        { id: 'appliances', name: 'أجهزة منزلية', icon: WashingMachine, iconColor: 'text-cyan-600 dark:text-cyan-400', iconBg: 'bg-cyan-50 dark:bg-cyan-500/10' },
        { id: 'real_estate', name: 'عقارات', icon: Building2, iconColor: 'text-violet-600 dark:text-violet-400', iconBg: 'bg-violet-50 dark:bg-violet-500/10' },
        { id: 'furniture', name: 'أثاث وديكور', icon: Sofa, iconColor: 'text-amber-600 dark:text-amber-400', iconBg: 'bg-amber-50 dark:bg-amber-500/10' },
        { id: 'scrap_metals', name: 'خردة ومعادن', icon: Recycle, iconColor: 'text-emerald-600 dark:text-emerald-400', iconBg: 'bg-emerald-50 dark:bg-emerald-500/10' },
        { id: 'books', name: 'كتب', icon: BookOpen, iconColor: 'text-orange-600 dark:text-orange-400', iconBg: 'bg-orange-50 dark:bg-orange-500/10' },
        { id: 'other', name: 'أخرى', icon: Package, iconColor: 'text-slate-600 dark:text-slate-400', iconBg: 'bg-slate-100 dark:bg-slate-500/10' },
    ];

    return (
        <section className="relative py-24 px-4 sm:px-6 lg:px-8 bg-[#f8f7f4] dark:bg-[#0d0f14] overflow-hidden">
            {/* Structural backdrop */}
            <div className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" 
                 style={{ backgroundImage: 'radial-gradient(#01696f 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
            <div className="absolute inset-0 z-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 10%, rgba(1, 105, 111, 0.05) 0%, transparent 50%)' }}></div>
            
            <div className="max-w-7xl mx-auto relative z-10">
                {/* Standardized Header */}
                <motion.div
                    className="text-center mb-20 px-4"
                    variants={staggerContainer}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.3 }}
                >
                    <motion.div variants={staggerItem} className="inline-block">
                        <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold tracking-widest uppercase mb-6 font-tajawal shadow-sm">
                            البحث المتقدم
                        </span>
                    </motion.div>
                    <motion.h2 
                        variants={staggerItem}
                        className="text-3xl md:text-5xl font-black font-noto-kufi text-slate-900 dark:text-white leading-[1.2] mb-6"
                    >
                        تصفح <span className="text-primary">أقسامنا</span>
                    </motion.h2>
                    <motion.p 
                        variants={staggerItem}
                        className="text-slate-500 dark:text-slate-400 font-tajawal text-base md:text-lg max-w-2xl mx-auto leading-relaxed"
                    >
                        آلاف المنتجات المختارة بعناية في مختلف الفئات والقطاعات
                    </motion.p>
                </motion.div>

                {/* Category Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                    {categories.map((category, index) => (
                        <motion.div
                            key={category.id}
                            custom={index}
                            variants={cardVariants}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, amount: 0.2 }}
                        >
                            <motion.div
                                onClick={() => {
                                    const targetUrl = `/dashboard?category=${category.id}`;
                                    if (user) router.push(targetUrl);
                                    else router.push(`/login?redirect=${encodeURIComponent(targetUrl)}`);
                                }}
                                whileHover={{ y: -8 }}
                                whileTap={{ scale: 0.96 }}
                                className="group flex flex-col items-center bg-white dark:bg-[#12141a] rounded-[2.5rem] p-8 cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.02)] dark:shadow-none border border-slate-100 dark:border-slate-800 transition-all duration-300 hover:border-primary/30 hover:shadow-[0_20px_40px_rgba(0,105,111,0.08)] h-full"
                            >
                                <motion.div
                                    className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 ${category.iconBg}`}
                                >
                                    <category.icon className={`w-8 h-8 ${category.iconColor}`} strokeWidth={2.2} />
                                </motion.div>
                                <h3 className="font-tajawal font-bold text-lg text-slate-900 dark:text-white text-center leading-tight transition-colors duration-200 group-hover:text-primary">
                                    {category.name}
                                </h3>
                            </motion.div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
