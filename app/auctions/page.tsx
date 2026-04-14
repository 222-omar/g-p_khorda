'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { useLanguage } from '@/components/providers/language-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { Search, Loader2, Clock, Gavel, Users, TrendingUp, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { auctionsAPI } from '@/lib/api';

function CountdownTimer({ endTime }: { endTime: string }) {
    const [timeLeft, setTimeLeft] = useState('');
    const [isUrgent, setIsUrgent] = useState(false);

    useEffect(() => {
        const update = () => {
            const now = new Date().getTime();
            const end = new Date(endTime).getTime();
            const diff = end - now;

            if (diff <= 0) {
                setTimeLeft('انتهى');
                setIsUrgent(true);
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setIsUrgent(diff < 1000 * 60 * 60); // Less than 1 hour

            if (days > 0) {
                setTimeLeft(`${days}ي ${hours}س ${minutes}د`);
            } else if (hours > 0) {
                setTimeLeft(`${hours}س ${minutes}د ${seconds}ث`);
            } else {
                setTimeLeft(`${minutes}د ${seconds}ث`);
            }
        };

        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [endTime]);

    return (
        <div className={`flex items-center gap-1.5 text-xs font-bold ${isUrgent ? 'text-red-500' : 'text-orange-600'}`}>
            <Clock size={12} className={isUrgent ? 'animate-pulse' : ''} />
            <span>{timeLeft}</span>
        </div>
    );
}

export default function AuctionsPage() {
    const { dict } = useLanguage();
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [auctions, setAuctions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAuctions = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await auctionsAPI.list(false);
            // Handle both paginated and non-paginated responses
            const results = Array.isArray(response) ? response : (response as any).results || [];
            setAuctions(results);
        } catch (err: any) {
            console.error('Error fetching auctions:', err);
            setError(err.message || 'فشل في تحميل المزادات');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login?redirect=/auctions');
        } else if (user) {
            fetchAuctions();
        }
    }, [authLoading, user, router, fetchAuctions]);

    // Filter auctions by search query (client side)
    const filteredAuctions = auctions.filter((auction) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return auction.product_title?.toLowerCase().includes(q);
    });

    if (authLoading || !user) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={40} />
            </div>
        );
    }

    return (
        <>
            <Navbar />
            <main className="pt-24 pb-12 min-h-screen px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
                        <div>
                            <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
                                <div className="bg-gradient-to-r from-orange-500 to-red-500 p-2 rounded-xl text-white">
                                    <Gavel size={24} />
                                </div>
                                المزادات النشطة
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
                                زايد على المنتجات المميزة واحصل على أفضل الأسعار
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <Link href="/sell">
                                <button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg flex items-center gap-2">
                                    <Plus size={18} />
                                    أضف مزاد جديد
                                </button>
                            </Link>
                        </div>

                        <div className="flex gap-2 max-w-md w-full">
                            <input
                                type="text"
                                placeholder="ابحث في المزادات..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="flex-1 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white dark:bg-slate-800 transition-all"
                            />
                            <button
                                onClick={fetchAuctions}
                                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white p-3 rounded-xl transition-colors shadow-sm hover:shadow-md"
                            >
                                <Search size={20} />
                            </button>
                        </div>
                    </div>

                    {loading && (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="animate-spin text-primary" size={40} />
                        </div>
                    )}

                    {error && !loading && (
                        <div className="text-center py-20">
                            <p className="text-red-500 text-lg mb-4">{error}</p>
                            <button
                                onClick={fetchAuctions}
                                className="bg-primary hover:bg-primary-700 text-white px-6 py-3 rounded-xl font-bold transition-all"
                            >
                                إعادة المحاولة
                            </button>
                        </div>
                    )}

                    {!loading && !error && (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredAuctions.map((auction) => (
                                    <motion.div
                                        key={auction.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        whileHover={{ y: -5 }}
                                        transition={{ duration: 0.3 }}
                                        className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden hover:shadow-xl transition-all"
                                    >
                                        <Link href={`/product/${auction.product}`}>
                                            <div className={`relative h-48 overflow-hidden bg-slate-100 dark:bg-slate-700 ${!auction.is_active ? 'grayscale-[50%]' : ''}`}>
                                                <img
                                                    src={auction.product_image || '/placeholder.png'}
                                                    alt={auction.product_title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                />
                                                {auction.is_active ? (
                                                    <div className="absolute top-3 right-3 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs px-3 py-1 rounded-full font-bold shadow-lg flex items-center gap-1">
                                                        <Gavel size={12} />
                                                        مزاد نشط
                                                    </div>
                                                ) : (
                                                    <div className="absolute top-3 right-3 bg-red-600 text-white text-xs px-3 py-1 rounded-full font-bold shadow-lg flex items-center gap-1">
                                                        🔴 المزاد انتهى
                                                    </div>
                                                )}
                                                {auction.is_active && (
                                                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-1">
                                                        <CountdownTimer endTime={auction.end_time} />
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>

                                            <div className="p-4">
                                                <h3 className="font-bold text-sm mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                                                    {auction.product_title}
                                                </h3>

                                                <div className="flex justify-between items-end">
                                                    <div>
                                                        <span className="text-xs text-slate-500 block mb-1">السعر الحالي</span>
                                                        <span className="text-orange-600 font-black text-lg">
                                                            {parseFloat(auction.current_bid).toLocaleString()}
                                                        </span>
                                                        <span className="text-slate-500 text-xs mr-1">{dict.currency}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center gap-1 text-xs text-slate-500">
                                                            <Users size={14} />
                                                            <span>{auction.total_bids}</span>
                                                        </div>
                                                        {auction.is_active ? (
                                                            <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-lg">
                                                                <TrendingUp size={16} className="text-orange-600" />
                                                            </div>
                                                        ) : (
                                                            auction.highest_bidder_name && (
                                                                <span className="text-xs text-green-600 font-bold">الفائز: {auction.highest_bidder_name}</span>
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    </motion.div>
                                ))}
                            </div>

                            {filteredAuctions.length === 0 && (
                                <div className="text-center py-20">
                                    <div className="bg-slate-100 dark:bg-slate-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Gavel size={32} className="text-slate-400" />
                                    </div>
                                    <p className="text-slate-400 text-lg mb-2">لا توجد مزادات نشطة حالياً</p>
                                    <p className="text-slate-400 text-sm mb-6">يمكنك إضافة منتج كمزاد من صفحة البيع</p>
                                    <Link href="/sell">
                                        <button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md hover:shadow-lg">
                                            أضف مزاد جديد
                                        </button>
                                    </Link>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
            <Footer />
        </>
    );
}
