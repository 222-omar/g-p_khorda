'use client';

import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { staggerContainer, staggerItem } from '@/lib/animations';

export function CTA() {
    const { user } = useAuth();

    return (
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-900/50">
            <motion.div
                className="max-w-4xl mx-auto relative"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6 }}
            >
                <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 rounded-3xl p-12 md:p-16 text-center overflow-hidden border border-slate-700/50">
                    {/* Decorative elements */}
                    <div className="absolute top-0 left-0 w-40 h-40 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 right-0 w-40 h-40 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

                    {/* Grid pattern overlay */}
                    <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

                    <div className="relative z-10">
                        <motion.div
                            variants={staggerContainer}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                        >
                            <motion.div variants={staggerItem} className="flex items-center justify-center gap-2 mb-6">
                                <Sparkles className="text-primary" size={24} />
                                <span className="text-primary font-bold text-sm uppercase tracking-wider">ابدأ الآن</span>
                            </motion.div>

                            <motion.h2
                                variants={staggerItem}
                                className="text-3xl md:text-5xl font-black text-white mb-6 leading-tight"
                            >
                                جاهز تبدأ رحلتك
                                <br />
                                مع <span className="bg-gradient-to-r from-primary to-green-400 bg-clip-text text-transparent">4Sale</span>؟
                            </motion.h2>

                            <motion.p
                                variants={staggerItem}
                                className="text-slate-400 max-w-lg mx-auto mb-10 text-lg"
                            >
                                انضم لآلاف المستخدمين الذين يثقون بنا في البيع والشراء كل يوم
                            </motion.p>

                            <motion.div variants={staggerItem} className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <Link href={user ? '/dashboard' : '/register'}>
                                    <motion.button
                                        whileHover={{ scale: 1.04, boxShadow: '0 8px 30px rgba(22,163,74,0.4)' }}
                                        whileTap={{ scale: 0.97 }}
                                        className="bg-primary hover:bg-primary-600 text-white px-10 py-4 rounded-xl font-bold shadow-lg shadow-primary/30 transition-colors flex items-center gap-2 text-lg"
                                    >
                                        {user ? 'تصفح المتجر' : 'سجّل مجاناً'}
                                        <ArrowRight size={20} className="rtl:rotate-180" />
                                    </motion.button>
                                </Link>

                                <Link href={user ? '/sell' : '/login?redirect=/sell'}>
                                    <motion.button
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.97 }}
                                        className="border-2 border-slate-600 hover:border-primary text-slate-300 hover:text-white px-10 py-4 rounded-xl font-bold transition-all"
                                    >
                                        أضف إعلانك الأول
                                    </motion.button>
                                </Link>
                            </motion.div>
                        </motion.div>
                    </div>
                </div>
            </motion.div>
        </section>
    );
}
