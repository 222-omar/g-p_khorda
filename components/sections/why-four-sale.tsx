'use client';

import { motion } from 'framer-motion';
import { ShieldCheck, Sparkles, MessageCircle, BarChart3, ArrowLeft, Gavel, Bot, Camera, BrainCircuit, ScanSearch } from 'lucide-react';

const supportingFeatures = [
    {
        icon: Bot,
        title: 'وكيل ذكاء اصطناعي (AI Agent)',
        desc: 'فعّل وكيلك الذكي ليراقب المزادات تلقائيًا ويزايد نيابةً عنك على المنتجات اللي بتدور عليها.',
        color: 'text-primary',
        bg: 'bg-primary/10',
    },
    {
        icon: Camera,
        title: 'بحث بالصورة (Visual Search)',
        desc: 'ارفع صورة أي منتج وهنلاقيلك أقرب المنتجات المشابهة في المتجر باستخدام الذكاء الاصطناعي.',
        color: 'text-purple-500',
        bg: 'bg-purple-50/50',
    },
    {
        icon: BrainCircuit,
        title: 'شات بوت ذكي (RAG Search)',
        desc: 'اسأل الشات بوت بأي سؤال عن المنتجات وهيرد عليك بإجابة ذكية ويعرضلك المنتجات المناسبة.',
        color: 'text-blue-500',
        bg: 'bg-blue-50/50',
    },
    {
        icon: ScanSearch,
        title: 'تصنيف تلقائي بالذكاء الاصطناعي',
        desc: 'ارفع صورة المنتج والنظام هيتعرف عليه تلقائيًا ويصنفه في القسم الصحيح بدون تدخل منك.',
        color: 'text-amber-500',
        bg: 'bg-amber-50/50',
    },
    {
        icon: ShieldCheck,
        title: 'أمان وموثوقية',
        desc: 'نظام تقييم ومراجعة متطور يضمن حقك في كل عملية بيع وشراء.',
        color: 'text-emerald-500',
        bg: 'bg-emerald-50/50',
    },
    {
        icon: MessageCircle,
        title: 'محادثات فورية',
        desc: 'تواصل مباشر وآمن مع البائعين والمشترين دون مغادرة المنصة.',
        color: 'text-rose-500',
        bg: 'bg-rose-50/50',
    },
];

export function WhyFourSale() {
    return (
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#f8f7f4] dark:bg-[#0d0f14] overflow-hidden">
            <div className="max-w-7xl mx-auto">
                
                {/* Section Header */}
                <div className="text-center mb-16 px-4">
                    <motion.span 
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold tracking-widest uppercase mb-6 font-tajawal shadow-sm"
                    >
                        لماذا 4Sale؟
                    </motion.span>
                    <motion.h2 
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        className="text-3xl md:text-5xl font-black font-noto-kufi text-slate-900 dark:text-white leading-[1.2] mb-6"
                    >
                        مميزات ذكية <span className="text-primary">تغير تجارتك</span>
                    </motion.h2>
                    <motion.p 
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-slate-500 dark:text-slate-400 font-tajawal text-base md:text-lg max-w-2xl mx-auto leading-relaxed"
                    >
                        أدوات ذكية تمنحك القوة لتبيع وتشتري باحترافية وسهولة
                    </motion.p>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                    
                    {/* LEFT: Featured Hero Card */}
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="lg:col-span-4"
                    >
                        <div className="relative h-full min-h-[480px] bg-gradient-to-tr from-[#0c121e] to-[#014c51] rounded-[24px] p-10 flex flex-col justify-between border border-white/5 shadow-2xl group overflow-hidden text-right">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2" />
                            
                            <div className="relative z-10">
                                <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-10 border border-white/10 group-hover:scale-110 transition-transform duration-500">
                                    <Gavel className="w-8 h-8 text-[#4fcfd6]" />
                                </div>
                                <h3 className="text-3xl font-black font-noto-kufi text-white mb-6 leading-tight">
                                    مزادات مباشرة <br /> <span className="opacity-60 text-2xl">🔨</span>
                                </h3>
                                <p className="text-slate-400 font-tajawal text-[16px] leading-relaxed max-w-[260px]">
                                    شارك في مزادات حية وارفع عروضك بكل سهولة وشفافية. النظام الذي يضمن أفضل سعر.
                                </p>
                            </div>

                            <motion.button 
                                whileHover={{ x: -10 }}
                                className="relative z-10 flex items-center gap-2 text-[#4fcfd6] font-bold font-tajawal text-lg group/btn"
                            >
                                اكتشف المزيد
                                <ArrowLeft className="w-5 h-5 group-hover/btn:translate-x-[-4px] transition-transform" />
                            </motion.button>
                        </div>
                    </motion.div>

                    {/* RIGHT: Supporting Cards Grid */}
                    <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {supportingFeatures.map((feature, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 15 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.1 }}
                                className="group bg-white dark:bg-slate-900/50 p-8 rounded-[20px] border border-slate-100 dark:border-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_15px_35px_rgba(0,0,0,0.07)] transition-all duration-300 flex flex-col items-start text-right"
                            >
                                <div className={`w-14 h-14 rounded-2xl ${feature.bg} flex items-center justify-center mb-6 ring-4 ring-white dark:ring-slate-900 transition-all group-hover:scale-110 group-hover:rotate-3`}>
                                    <feature.icon className={`w-7 h-7 ${feature.color}`} />
                                </div>
                                <h4 className="text-xl font-bold font-noto-kufi text-slate-900 dark:text-white mb-3 group-hover:text-primary transition-colors">
                                    {feature.title}
                                </h4>
                                <p className="text-slate-500 dark:text-slate-400 font-tajawal text-[14px] leading-relaxed">
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