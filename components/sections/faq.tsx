'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { staggerContainer, staggerItem } from '@/lib/animations';

const faqs = [
    {
        question: 'كيف أبدأ البيع على 4Sale؟',
        answer: 'ببساطة، سجّل حساباً مجانياً، ثم اضغط على "أضف إعلان" وأدخل تفاصيل منتجك مع صور واضحة. يمكنك اختيار البيع المباشر أو عرضه كمزاد.',
    },
    {
        question: 'هل المحفظة الإلكترونية آمنة؟',
        answer: 'نعم، المحفظة الإلكترونية مؤمنة بالكامل بأحدث تقنيات التشفير. جميع المعاملات المالية محمية ومسجلة في سجل المعاملات الخاص بك.',
    },
    {
        question: 'كيف يعمل نظام المزادات؟',
        answer: 'يمكنك إنشاء مزاد لمنتجك بتحديد سعر البداية ومدة المزاد. المشترون يزايدون على المنتج، والفائز يحصل عليه عند انتهاء المزاد. المبلغ يُخصم تلقائياً من محفظة الفائز ويُضاف لمحفظة البائع.',
    },
    {
        question: 'هل يمكنني إرجاع المنتج بعد الشراء؟',
        answer: 'سياسة الإرجاع تعتمد على الاتفاق بين البائع والمشتري. ننصح دائماً بالتواصل مع البائع قبل الشراء ومراجعة تفاصيل المنتج جيداً. يمكنك أيضاً الاطلاع على تقييمات البائع لضمان الجودة.',
    },
    {
        question: 'كيف أشحن محفظتي الإلكترونية؟',
        answer: 'يمكنك شحن محفظتك بسهولة من صفحة "المحفظة" في حسابك. أدخل بيانات الدفع واختر المبلغ المطلوب. الرصيد يظهر فوراً بعد إتمام العملية.',
    },
    {
        question: 'ما هو نظام التقييم والموثوقية؟',
        answer: 'كل بائع ومشتري لديه درجة موثوقية تُحسب تلقائياً بناءً على عدد المعاملات الناجحة والتقييمات. كلما زاد تقييمك، زادت ثقة الآخرين بك وظهرت علامة "موثوق" على حسابك.',
    },
];

function FaqItem({ item, index }: { item: typeof faqs[0]; index: number }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
            className="mb-4"
        >
            <div
                className={`group bg-white dark:bg-slate-900/50 rounded-[1.5rem] border transition-all duration-500 overflow-hidden ${
                    isOpen
                        ? 'border-primary/40 shadow-xl shadow-primary/5 ring-1 ring-primary/10'
                        : 'border-slate-100 dark:border-slate-800 hover:border-primary/20 shadow-sm'
                }`}
            >
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center justify-between p-7 text-right gap-6 outline-none"
                >
                    <span className={`font-bold text-lg font-noto-kufi transition-colors duration-300 ${isOpen ? 'text-primary' : 'text-slate-800 dark:text-slate-100'}`}>
                        {item.question}
                    </span>
                    <div
                        className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                            isOpen ? 'bg-primary text-white rotate-180 shadow-lg shadow-primary/30' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary'
                        }`}
                    >
                        <ChevronDown size={20} strokeWidth={2.5} />
                    </div>
                </button>

                <AnimatePresence initial={false}>
                    {isOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        >
                            <div className="px-7 pb-7 pt-0">
                                <p className="text-slate-500 dark:text-slate-400 font-tajawal leading-loose text-[1.05rem]">
                                    {item.answer}
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}

export function FAQ() {
    return (
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#f8f7f4] dark:bg-[#0d0f14] relative overflow-hidden">
            <div className="max-w-4xl mx-auto relative">
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
                            عندك سؤال؟
                        </span>
                    </motion.div>
                    <motion.h2 
                        variants={staggerItem}
                        className="font-noto-kufi text-3xl md:text-5xl font-black text-slate-900 dark:text-white leading-[1.2] mb-6"
                    >
                        الأسئلة <span className="text-primary">الشائعة</span>
                    </motion.h2>
                    <motion.p 
                        variants={staggerItem}
                        className="font-tajawal text-base md:text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed"
                    >
                        كل ما تود معرفته عن منصة 4Sale وكيفية الاستفادة القصوى منها
                    </motion.p>
                </motion.div>

                {/* FAQ Items */}
                <div className="space-y-2">
                    {faqs.map((faq, index) => (
                        <FaqItem key={index} item={faq} index={index} />
                    ))}
                </div>
                
                {/* Bottom Support Callout */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mt-16 text-center"
                >
                    <p className="text-slate-500 font-tajawal mb-6">لم تجد إجابتك؟ نحن هنا للمساعدة</p>
                    <button className="px-8 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl font-black font-noto-kufi hover:shadow-lg transition-all">
                        تواصل مع الدعم الفني
                    </button>
                </motion.div>
            </div>
        </section>
    );
}
