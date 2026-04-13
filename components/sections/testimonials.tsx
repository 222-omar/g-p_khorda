'use client';

import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';
import { staggerContainer, staggerItem } from '@/lib/animations';

const testimonials = [
    {
        name: 'أحمد محمد',
        role: 'بائع إلكترونيات',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ahmed',
        rating: 5,
        text: 'منصة رائعة جداً! بعت أجهزتي القديمة بسعر ممتاز والتعامل كان سلس وآمن. المحفظة الإلكترونية سهّلت كل شيء.',
    },
    {
        name: 'فاطمة علي',
        role: 'مشترية',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=fatma',
        rating: 5,
        text: 'لقيت كل اللي كنت بدور عليه! التصنيف الذكي والبحث المتقدم ساعدني ألاقي المنتجات بسرعة. أنصح الجميع بالتجربة.',
    },
    {
        name: 'محمود سالم',
        role: 'تاجر أثاث',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mahmoud',
        rating: 5,
        text: 'كمنصة بيع وشراء أونلاين، 4Sale غيّرت شكل التجارة بالنسبة لي. نظام التقييمات بيدي ثقة كبيرة للعملاء.',
    },
    {
        name: 'سارة أحمد',
        role: 'مشترية',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sara',
        rating: 5,
        text: 'تجربتي مع المزادات كانت ممتعة جداً! قدرت أشتري عربية بسعر أقل من السوق بكتير. شكراً 4Sale!',
    },
    {
        name: 'خالد يوسف',
        role: 'بائع خردة',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=khaled',
        rating: 5,
        text: 'أفضل منصة لبيع الخردة والمعادن. التسعير الذكي بيساعدني أحدد سعر عادل والمشترين بيوصلوني بسرعة.',
    },
    {
        name: 'نورا حسن',
        role: 'مشترية',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=noura',
        rating: 5,
        text: 'المراسلة الفورية مع البائع مريحة وسهلة، وحاسة إني محمية بنظام الحماية المتقدم. تجربة ممتازة!',
    },
];

export function Testimonials() {
    return (
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#0a0c10] relative overflow-hidden" dir="rtl">
            
            {/* Background Decor */}
            <div className="absolute top-1/4 -right-20 w-[400px] h-[400px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-1/4 -left-20 w-[400px] h-[400px] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="max-w-7xl mx-auto relative">
                
                {/* Header */}
                <motion.div
                    className="text-center mb-24 px-4"
                    variants={staggerContainer}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.3 }}
                >
                    <motion.div variants={staggerItem} className="inline-block">
                        <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold tracking-widest uppercase mb-6 font-tajawal shadow-sm">
                            قالوا عنا
                        </span>
                    </motion.div>
                    <motion.h2 
                        variants={staggerItem}
                        className="font-noto-kufi text-3xl md:text-5xl font-black text-slate-900 dark:text-white leading-[1.2] mb-6"
                    >
                        ماذا يقول <span className="text-primary">عملاؤنا؟</span>
                    </motion.h2>
                    <motion.p 
                        variants={staggerItem}
                        className="font-tajawal text-base md:text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed"
                    >
                        قصص نجاح وتجارب ملهمة لمستخدمينا الذين وثقوا بنا
                    </motion.p>
                </motion.div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {testimonials.map((testimonial, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: index * 0.1 }}
                            whileHover={{ y: -8 }}
                            className="relative group h-full"
                        >
                            <div className="h-full bg-white dark:bg-slate-900/40 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-[0_10px_30px_rgba(0,0,0,0.02)] group-hover:shadow-[0_20px_50px_rgba(0,105,111,0.08)] transition-all duration-500 relative overflow-hidden flex flex-col">
                                
                                {/* Adjusted Quote Icon for RTL */}
                                <Quote className="absolute -top-4 -right-4 w-24 h-24 text-primary/5 rotate-180 group-hover:rotate-[192deg] transition-transform duration-700" />
                                
                                <div className="relative z-10 flex flex-col h-full text-right">
                                    {/* Stars aligned to start (right in RTL) */}
                                    <div className="flex gap-1 mb-6 justify-start">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} size={14} className="fill-amber-400 text-amber-400" />
                                        ))}
                                    </div>

                                    <p className="text-slate-700 dark:text-slate-200 font-tajawal leading-relaxed text-base mb-8 flex-1 font-medium">
                                        "{testimonial.text}"
                                    </p>

                                    {/* Footer aligned to start (right in RTL) */}
                                    <div className="flex items-center gap-4 pt-8 border-t border-slate-100 dark:border-slate-800 justify-start">
                                        <div className="relative">
                                            <img
                                                src={testimonial.avatar}
                                                alt={testimonial.name}
                                                className="w-12 h-12 rounded-2xl object-cover bg-slate-100 p-1 ring-1 ring-slate-100 dark:ring-slate-800"
                                            />
                                            <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-primary rounded-full border-2 border-white dark:border-slate-950" />
                                        </div>
                                        <div className="text-right">
                                            <h4 className="font-bold font-noto-kufi text-base text-slate-900 dark:text-white leading-tight">
                                                {testimonial.name}
                                            </h4>
                                            <p className="text-[13px] font-tajawal text-slate-500 mt-1">
                                                {testimonial.role}
                                            </p>
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
