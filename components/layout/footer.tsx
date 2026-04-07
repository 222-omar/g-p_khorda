'use client';

import Link from 'next/link';
import { useLanguage } from '@/components/providers/language-provider';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/animations';
import {
    Facebook, Instagram, Twitter, Youtube, MessageCircle,
    ShieldCheck, Headphones, Newspaper, Store, PlusCircle,
    Gavel, Search, Users, Tag, Mail, MapPin, Phone
} from 'lucide-react';

export function Footer() {
    const { dict, isRtl } = useLanguage();

    const mainSections = [
        {
            title: isRtl ? 'أهم الأقسام' : 'Top Categories',
            links: [
                { label: isRtl ? 'إلكترونيات وأجهزة' : 'Electronics', href: '#', icon: Tag },
                { label: isRtl ? 'أثاث وديكور' : 'Furniture', href: '#', icon: Tag },
                { label: isRtl ? 'خردة ومعادن' : 'Scrap & Metals', href: '#', icon: Tag },
                { label: isRtl ? 'مركبات وسيارات' : 'Vehicles', href: '#', icon: Tag },
                { label: isRtl ? 'ملابس وأزياء' : 'Fashion', href: '#', icon: Tag },
            ],
        },
        {
            title: isRtl ? 'أهم الخدمات' : 'Services',
            links: [
                { label: isRtl ? 'أضف إعلان' : 'Add Listing', href: '#', icon: PlusCircle },
                { label: isRtl ? 'المتجر' : 'Shop', href: '#', icon: Store },
                { label: isRtl ? 'المزادات' : 'Auctions', href: '#', icon: Gavel },
                { label: isRtl ? 'البوت الذكي' : 'Smart Bot', href: '#', icon: Search },
                { label: isRtl ? 'الوكيل الذكي' : 'Smart Agent', href: '#', icon: Users },
            ],
        },
        {
            title: isRtl ? 'قد تهمك' : 'Useful Info',
            links: [
                { label: isRtl ? 'الدعم الفني' : 'Support', href: '#', icon: Headphones },
                { label: isRtl ? 'عن 4Sale' : 'About 4Sale', href: '#', icon: Newspaper },
                { label: isRtl ? 'الشروط والأحكام' : 'Terms & Conditions', href: '#', icon: ShieldCheck },
                { label: isRtl ? 'سياسة الخصوصية' : 'Privacy Policy', href: '#', icon: ShieldCheck },
            ],
        },
    ];

    const socialLinks = [
        { icon: Facebook, href: '#', label: 'Facebook', color: 'hover:bg-blue-600' },
        { icon: Instagram, href: '#', label: 'Instagram', color: 'hover:bg-pink-600' },
        { icon: Twitter, href: '#', label: 'Twitter', color: 'hover:bg-sky-500' },
        { icon: Youtube, href: '#', label: 'YouTube', color: 'hover:bg-red-600' },
        { icon: MessageCircle, href: '#', label: 'WhatsApp', color: 'hover:bg-emerald-600' },
    ];

    return (
        <motion.footer
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            className="bg-gradient-to-b from-slate-800 to-slate-900 dark:from-slate-900 dark:to-slate-950 text-white mt-20"
            dir={isRtl ? 'rtl' : 'ltr'}
        >
            {/* ─── Top Description Bar ─── */}
            <div className="bg-indigo-600 dark:bg-indigo-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
                    <motion.p variants={staggerItem} className="text-center text-sm md:text-base leading-relaxed text-indigo-100">
                        {isRtl
                            ? '4Sale - سوقك الذكي لبيع المستعمل والخردة في مصر. اشتري وبيع بسهولة وأمان مع مزادات مباشرة وبوت ذكي وكيل ذكي.'
                            : '4Sale - Your smart marketplace for used items and scrap in Egypt. Buy and sell with ease, featuring live auctions, smart bot, and AI price analysis.'}
                    </motion.p>
                </div>
            </div>

            {/* ─── Main Footer Grid ─── */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
                    {/* Sections */}
                    {mainSections.map((section, sIdx) => (
                        <motion.div key={sIdx} variants={staggerItem}>
                            <h3 className="text-base font-bold text-white mb-5 pb-2 border-b border-slate-700 inline-block">
                                {section.title}
                            </h3>
                            <ul className="space-y-3">
                                {section.links.map((link, lIdx) => (
                                    <li key={lIdx}>
                                        <span
                                            className="flex items-center gap-2 text-sm text-slate-400 hover:text-indigo-400 transition-colors duration-200 group cursor-default"
                                        >
                                            <link.icon size={14} className="text-slate-500 group-hover:text-indigo-400 transition-colors shrink-0" />
                                            {link.label}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                    ))}

                    {/* Contact & Social Column */}
                    <motion.div variants={staggerItem}>
                        <h3 className="text-base font-bold text-white mb-5 pb-2 border-b border-slate-700 inline-block">
                            {isRtl ? 'تواصل معنا' : 'Contact Us'}
                        </h3>
                        <ul className="space-y-3 mb-6">
                            <li className="flex items-center gap-2 text-sm text-slate-400">
                                <Mail size={14} className="text-slate-500 shrink-0" />
                                support@4sale-eg.com
                            </li>
                            <li className="flex items-center gap-2 text-sm text-slate-400">
                                <Phone size={14} className="text-slate-500 shrink-0" />
                                +20 100 000 0000
                            </li>
                            <li className="flex items-center gap-2 text-sm text-slate-400">
                                <MapPin size={14} className="text-slate-500 shrink-0" />
                                {isRtl ? 'القاهرة، مصر' : 'Cairo, Egypt'}
                            </li>
                        </ul>

                        {/* Social Media */}
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
                            {isRtl ? 'تابعنا على' : 'Follow Us'}
                        </h4>
                        <div className="flex gap-2">
                            {socialLinks.map((social, idx) => (
                                <span
                                    key={idx}
                                    aria-label={social.label}
                                    className={`w-9 h-9 rounded-lg bg-slate-700/60 flex items-center justify-center text-slate-400 hover:text-white ${social.color} transition-all duration-200 cursor-default`}
                                >
                                    <social.icon size={16} />
                                </span>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* ─── Bottom Bar ─── */}
            <div className="border-t border-slate-700/60">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        {/* Logo & Copyright */}
                        <motion.div variants={staggerItem} className="flex items-center gap-3">
                            <span className="font-bold text-xl">
                                <span className="text-emerald-500">4</span>
                                <span className="text-white">Sale</span>
                            </span>
                            <span className="text-slate-500 text-[10px]">|</span>
                            <p className="text-slate-500 text-xs">
                                {isRtl
                                    ? 'جميع الحقوق محفوظة © ٢٠٢٤ — 4Sale'
                                    : '© 2024 — 4Sale. All rights reserved.'}
                            </p>
                        </motion.div>

                        {/* Security Badge */}
                        <motion.div variants={staggerItem} className="flex items-center gap-2 text-slate-500 text-xs">
                            <ShieldCheck size={14} className="text-emerald-500" />
                            {isRtl ? 'مؤمّن بتقنية التشفير — محادثة آمنة' : 'Encrypted & Secure Transactions'}
                        </motion.div>
                    </div>
                </div>
            </div>
        </motion.footer>
    );
}
