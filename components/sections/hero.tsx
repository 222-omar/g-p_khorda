'use client';

import Link from 'next/link';
import { useLanguage } from '@/components/providers/language-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { Sparkles, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export function Hero() {
    const { dict, isRtl } = useLanguage();
    const { user } = useAuth();

    return (
        <section className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="grid md:grid-cols-2 gap-10 lg:gap-16 items-center">
                    {/* Text Content */}
                    <motion.div
                        initial={{ opacity: 0, x: isRtl ? 50 : -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        {/* Heading */}
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight"
                        >
                            {dict.hero.title}
                            <br />
                            <span className="text-primary bg-gradient-to-r from-primary to-green-400 bg-clip-text text-transparent">
                                {dict.hero.titleHighlight}
                            </span>
                        </motion.h1>

                        {/* Description */}
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="text-slate-600 dark:text-slate-400 mb-8 text-lg leading-relaxed"
                        >
                            {dict.hero.description}
                        </motion.p>

                        {/* CTA Buttons */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="flex flex-col sm:flex-row gap-4"
                        >
                            <Link href={user ? "/dashboard" : "/login?redirect=/dashboard"}>
                                <button className="w-full sm:w-auto bg-primary hover:bg-primary-700 text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 group">
                                    {dict.hero.browseProducts}
                                    <ArrowRight
                                        size={20}
                                        className={`group-hover:translate-x-1 transition-transform ${isRtl ? 'rotate-180' : ''}`}
                                    />
                                </button>
                            </Link>

                            <Link href={user ? "/sell" : "/login?redirect=/sell"}>
                                <button className="w-full sm:w-auto border-2 border-slate-300 dark:border-slate-700 hover:border-primary dark:hover:border-primary px-8 py-4 rounded-xl font-bold transition-all hover:bg-primary-50 dark:hover:bg-primary-900/20">
                                    {dict.hero.addListing}
                                </button>
                            </Link>
                        </motion.div>
                    </motion.div>

                    {/* Hero Image */}
                    <motion.div
                        initial={{ opacity: 0, x: isRtl ? -50 : 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6 }}
                        className="relative"
                    >
                        <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                            <img
                                src="/hero-bg.jpg"
                                alt="4Sale marketplace"
                                className="w-full h-auto"
                            />

                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
