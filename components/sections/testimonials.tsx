'use client';

import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';
import { staggerContainer, staggerItem } from '@/lib/animations';
import { useLanguage } from '@/components/providers/language-provider';

export function Testimonials() {
    const { dict, isRtl } = useLanguage();

    const testimonials = [
        { name: dict.testimonials.t1Name, role: dict.testimonials.t1Role, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ahmed', text: dict.testimonials.t1Text },
        { name: dict.testimonials.t2Name, role: dict.testimonials.t2Role, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=fatma', text: dict.testimonials.t2Text },
        { name: dict.testimonials.t3Name, role: dict.testimonials.t3Role, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mahmoud', text: dict.testimonials.t3Text },
        { name: dict.testimonials.t4Name, role: dict.testimonials.t4Role, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sara', text: dict.testimonials.t4Text },
        { name: dict.testimonials.t5Name, role: dict.testimonials.t5Role, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=khaled', text: dict.testimonials.t5Text },
        { name: dict.testimonials.t6Name, role: dict.testimonials.t6Role, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=noura', text: dict.testimonials.t6Text },
    ];

    return (
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#0a0c10] relative overflow-hidden">
            <div className="absolute top-1/4 -right-20 w-[400px] h-[400px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-1/4 -left-20 w-[400px] h-[400px] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="max-w-7xl mx-auto relative">
                <motion.div className="text-center mb-24 px-4" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }}>
                    <motion.div variants={staggerItem} className="inline-block">
                        <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold tracking-widest uppercase mb-6 font-tajawal shadow-sm">
                            {dict.testimonials.badge}
                        </span>
                    </motion.div>
                    <motion.h2 variants={staggerItem} className="font-noto-kufi text-3xl md:text-5xl font-black text-slate-900 dark:text-white leading-[1.2] mb-6">
                        {dict.testimonials.title} <span className="text-primary">{dict.testimonials.titleHighlight}</span>
                    </motion.h2>
                    <motion.p variants={staggerItem} className="font-tajawal text-base md:text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
                        {dict.testimonials.subtitle}
                    </motion.p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {testimonials.map((testimonial, index) => (
                        <motion.div key={index} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: index * 0.1 }} whileHover={{ y: -8 }} className="relative group h-full">
                            <div className="h-full bg-white dark:bg-slate-900/40 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-[0_10px_30px_rgba(0,0,0,0.02)] group-hover:shadow-[0_20px_50px_rgba(0,105,111,0.08)] transition-all duration-500 relative overflow-hidden flex flex-col">
                                <Quote className={`absolute -top-4 ${isRtl ? '-right-4' : '-left-4'} w-24 h-24 text-primary/5 rotate-180 group-hover:rotate-[192deg] transition-transform duration-700`} />
                                <div className={`relative z-10 flex flex-col h-full ${isRtl ? 'text-right' : 'text-left'}`}>
                                    <div className="flex gap-1 mb-6 justify-start">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} size={14} className="fill-amber-400 text-amber-400" />
                                        ))}
                                    </div>
                                    <p className="text-slate-700 dark:text-slate-200 font-tajawal leading-relaxed text-base mb-8 flex-1 font-medium">
                                        &quot;{testimonial.text}&quot;
                                    </p>
                                    <div className="flex items-center gap-4 pt-8 border-t border-slate-100 dark:border-slate-800 justify-start">
                                        <div className="relative">
                                            <img src={testimonial.avatar} alt={testimonial.name} className="w-12 h-12 rounded-2xl object-cover bg-slate-100 p-1 ring-1 ring-slate-100 dark:ring-slate-800" />
                                            <div className={`absolute -bottom-1 ${isRtl ? '-left-1' : '-right-1'} w-4 h-4 bg-primary rounded-full border-2 border-white dark:border-slate-950`} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold font-noto-kufi text-base text-slate-900 dark:text-white leading-tight">{testimonial.name}</h4>
                                            <p className="text-[13px] font-tajawal text-slate-500 mt-1">{testimonial.role}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
