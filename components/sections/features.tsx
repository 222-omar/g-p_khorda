'use client';

import { useLanguage } from '@/components/providers/language-provider';
import { motion } from 'framer-motion';
import { Brain, Sparkles, ShieldCheck, Gavel, MessageCircle, BarChart3, Bot, Camera, BrainCircuit, ScanSearch } from 'lucide-react';
import { staggerContainer, staggerItem } from '@/lib/animations';

const cardVariants = {
    hidden: { opacity: 0, y: 36, scale: 0.96 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            duration: 0.55,
            delay: i * 0.12,
            ease: [0.22, 1, 0.36, 1],
        },
    }),
};

export function Features() {
    const { dict } = useLanguage();

    const features = [
        {
            icon: Brain,
            title: dict.features.aiPricing.title,
            desc: dict.features.aiPricing.desc,
            color: 'text-primary',
            bg: 'bg-primary-50 dark:bg-primary-900/10',
            glow: 'group-hover:shadow-primary/20',
        },
        {
            icon: Sparkles,
            title: dict.features.smartSearch.title,
            desc: dict.features.smartSearch.desc,
            color: 'text-purple-500',
            bg: 'bg-purple-50 dark:bg-purple-900/10',
            glow: 'group-hover:shadow-purple-500/20',
        },
        {
            icon: Camera,
            title: 'بحث بالصورة',
            desc: 'ارفع صورة أي منتج والنظام هيلاقيلك أقرب المنتجات المشابهة باستخدام تقنيات الذكاء الاصطناعي.',
            color: 'text-indigo-500',
            bg: 'bg-indigo-50 dark:bg-indigo-900/10',
            glow: 'group-hover:shadow-indigo-500/20',
        },
        {
            icon: BrainCircuit,
            title: 'شات بوت ذكي (RAG)',
            desc: 'اسأل الشات بوت بأي سؤال عن المنتجات وهيرد عليك بإجابة ذكية ويعرضلك النتائج فوراً.',
            color: 'text-cyan-500',
            bg: 'bg-cyan-50 dark:bg-cyan-900/10',
            glow: 'group-hover:shadow-cyan-500/20',
        },
        {
            icon: Bot,
            title: 'وكيل مزايدة ذكي (AI Agent)',
            desc: 'فعّل وكيلك الذكي ليراقب المزادات تلقائيًا ويزايد نيابةً عنك للحصول على أفضل الصفقات.',
            color: 'text-teal-500',
            bg: 'bg-teal-50 dark:bg-teal-900/10',
            glow: 'group-hover:shadow-teal-500/20',
        },
        {
            icon: ScanSearch,
            title: 'تصنيف تلقائي بالـ AI',
            desc: 'ارفع صورة منتجك والذكاء الاصطناعي هيتعرف عليه ويصنفه في القسم الصحيح تلقائيًا.',
            color: 'text-amber-500',
            bg: 'bg-amber-50 dark:bg-amber-900/10',
            glow: 'group-hover:shadow-amber-500/20',
        },
        {
            icon: Gavel,
            title: 'مزادات حية',
            desc: 'نظام مزادات متقدم يتيح لك المنافسة على المنتجات والحصول على أفضل الأسعار مع أعلى درجات الشفافية.',
            color: 'text-orange-500',
            bg: 'bg-orange-50 dark:bg-orange-900/10',
            glow: 'group-hover:shadow-orange-500/20',
        },
        {
            icon: ShieldCheck,
            title: dict.features.secure.title,
            desc: dict.features.secure.desc,
            color: 'text-green-500',
            bg: 'bg-green-50 dark:bg-green-900/10',
            glow: 'group-hover:shadow-green-500/20',
        },
        {
            icon: MessageCircle,
            title: 'مراسلة فورية',
            desc: 'تواصل مباشر مع البائعين والمشترين عبر نظام المحادثات المدمج بدون الحاجة لمغادرة المنصة.',
            color: 'text-blue-500',
            bg: 'bg-blue-50 dark:bg-blue-900/10',
            glow: 'group-hover:shadow-blue-500/20',
        },
    ];

    return (
        <section className="py-32 px-4 sm:px-6 lg:px-8 bg-slate-50/50 dark:bg-slate-900/20">
            <div className="max-w-7xl mx-auto">
                {/* Section Header */}
                <motion.div
                    className="text-center mb-24"
                    variants={staggerContainer}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.3 }}
                >
                    <span className="text-primary font-bold uppercase tracking-widest text-[11px] mb-4 bg-primary/10 px-4 py-2 rounded-full inline-block font-tajawal">
                        {dict.features.title}
                    </span>
                    <h2 className="text-4xl md:text-5xl font-black mb-6 font-noto-kufi text-slate-900 dark:text-white leading-tight">
                        مميزات ذكية <br /> <span className="text-primary">بتغير طريقة البيع والشراء</span>
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 font-tajawal max-w-xl mx-auto text-lg">
                        {dict.features.subtitle}
                    </p>
                </motion.div>

                {/* Hierarchical Grid */}
                <div className="grid lg:grid-cols-12 gap-8">
                    {/* Featured Item (AI Pricing) */}
                    <motion.div
                        custom={0}
                        variants={cardVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        className="lg:col-span-12 xl:col-span-4 group relative p-10 rounded-[3rem] bg-slate-900 text-white overflow-hidden border border-slate-800 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/20"
                    >
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[100px] -mr-32 -mt-32" />
                        <div className="relative z-10">
                            <div className="w-16 h-16 bg-primary/20 rounded-[1.5rem] flex items-center justify-center mb-8 border border-white/10 group-hover:scale-110 transition-transform duration-300">
                                <Brain className="w-8 h-8 text-primary" />
                            </div>
                            <h3 className="text-2xl font-bold font-noto-kufi mb-4 leading-tight">
                                {features[0].title}
                            </h3>
                            <p className="text-slate-400 font-tajawal text-lg leading-relaxed mb-8">
                                {features[0].desc}
                            </p>
                            <span className="inline-flex items-center gap-2 text-primary font-bold font-tajawal">
                                اكتشف المزيد <Sparkles size={16} />
                            </span>
                        </div>
                    </motion.div>

                    {/* Secondary Items (3x2 Grid Style) */}
                    <div className="lg:col-span-12 xl:col-span-8 grid md:grid-cols-2 gap-8">
                        {features.slice(1).map((feature, index) => (
                            <motion.div
                                key={index}
                                custom={index + 1}
                                variants={cardVariants}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                className="group p-8 rounded-[2.5rem] bg-white dark:bg-[#12141a] border border-slate-100 dark:border-slate-800 transition-all duration-300 hover:border-primary/30 hover:shadow-[0_20px_40px_rgba(0,0,0,0.04)] dark:hover:shadow-none cursor-default"
                            >
                                <div className={`w-14 h-14 ${feature.bg} rounded-2xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                                    <feature.icon className={`w-7 h-7 ${feature.color}`} strokeWidth={2.2} />
                                </div>
                                <h3 className="text-xl font-bold font-noto-kufi text-slate-900 dark:text-white mb-3 group-hover:text-primary transition-colors duration-200">
                                    {feature.title}
                                </h3>
                                <p className="text-slate-500 dark:text-slate-400 font-tajawal leading-relaxed">
                                    {feature.desc}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
