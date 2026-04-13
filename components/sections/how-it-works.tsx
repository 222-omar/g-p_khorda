'use client';

import { motion } from 'framer-motion';
import { Search, ShieldCheck, Handshake, Rocket } from 'lucide-react';
import { staggerContainer, staggerItem } from '@/lib/animations';

const steps = [
    {
        icon: Search,
        number: '01',
        title: 'تصفح المنتجات',
        desc: 'اكتشف آلاف الإعلانات المتنوعة في مختلف الفئات بحث ذكي وسريع.',
        color: 'from-blue-400 to-blue-600',
        shadow: 'shadow-blue-500/25',
    },
    {
        icon: ShieldCheck,
        number: '02',
        title: 'تحقق من البائع',
        desc: 'اطلع على تقييمات البائع ودرجة الموثوقية قبل اتخاذ قرار الشراء.',
        color: 'from-emerald-400 to-emerald-600',
        shadow: 'shadow-emerald-500/25',
    },
    {
        icon: Handshake,
        number: '03',
        title: 'تواصل وتفاوض',
        desc: 'تواصل مباشرة مع البائع عبر المراسلة الفورية وتفاوض على أفضل سعر.',
        color: 'from-orange-400 to-orange-600',
        shadow: 'shadow-orange-500/25',
    },
    {
        icon: Rocket,
        number: '04',
        title: 'أتمم الصفقة',
        desc: 'ادفع بأمان واستلم منتجك بكل ثقة واطمئنان.',
        color: 'from-purple-400 to-purple-600',
        shadow: 'shadow-purple-500/25',
    },
];

export function HowItWorks() {
    return (
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#0a0c10] relative overflow-hidden">
            
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            <div className="max-w-7xl mx-auto relative">
                
                {/* Standardized Header */}
                <motion.div
                    className="text-center mb-24 px-4"
                    variants={staggerContainer}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.3 }}
                >
                    <motion.div variants={staggerItem} className="inline-block">
                        <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold tracking-widest uppercase mb-6 font-tajawal shadow-sm">
                            رحلتك معنا تبدأ هنا
                        </span>
                    </motion.div>
                    <motion.h2 
                        variants={staggerItem}
                        className="font-noto-kufi text-3xl md:text-5xl font-black text-slate-900 dark:text-white leading-[1.2] mb-6"
                    >
                        خطوات بسيطة <span className="text-primary">لهدفك</span>
                    </motion.h2>
                    <motion.p 
                        variants={staggerItem}
                        className="font-tajawal text-base md:text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed"
                    >
                        رحلة تبدأ بضغطة زر وتنتهي بصفقة ناجحة ومضمونة
                    </motion.p>
                </motion.div>

                {/* Steps Flow Grid */}
                <div className="relative">
                    {/* Connecting Path */}
                    <div className="hidden lg:block absolute top-[44px] left-[12%] right-[12%] h-[2px] border-t-2 border-dashed border-slate-200 dark:border-slate-800 z-0" />

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 relative z-10">
                        {steps.map((step, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: idx * 0.1 }}
                                className="group flex flex-col items-center text-center"
                            >
                                <div className="relative mb-10">
                                    <div className={`w-[88px] h-[88px] rounded-3xl bg-gradient-to-br ${step.color} ${step.shadow} flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-lg ring-4 ring-white dark:ring-[#0a0c10]`}>
                                        <step.icon className="w-10 h-10 text-white" strokeWidth={2} />
                                    </div>
                                    <div className="absolute -top-3 -right-3 w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-lg">
                                        <span className="text-[12px] font-black font-noto-kufi">
                                            {step.number}
                                        </span>
                                    </div>
                                </div>

                                <div className="px-4 space-y-3">
                                    <h3 className="text-[20px] font-black font-noto-kufi text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                                        {step.title}
                                    </h3>
                                    <p className="text-slate-500 dark:text-slate-400 font-tajawal leading-relaxed text-[14px]">
                                        {step.desc}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
