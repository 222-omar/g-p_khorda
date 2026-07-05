'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { useLanguage } from '@/components/providers/language-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { Search, Loader2, Clock, Gavel, Users, TrendingUp, Plus, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { auctionsAPI } from '@/lib/api';
import { SidebarFilters } from '@/components/ui/sidebar-filters';

function CountdownTimer({ endTime, dict }: { endTime: string, dict: any }) {
    const [timeLeft, setTimeLeft] = useState('');
    const [isUrgent, setIsUrgent] = useState(false);

    useEffect(() => {
        const update = () => {
            const now = new Date().getTime();
            const end = new Date(endTime).getTime();
            const diff = end - now;

            if (diff <= 0) {
                setTimeLeft(dict.auctions.ended);
                setIsUrgent(true);
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setIsUrgent(diff < 1000 * 60 * 60); // Less than 1 hour

            if (days > 0) {
                setTimeLeft(`${days}${dict.auctions.days} ${hours}${dict.auctions.hours} ${minutes}${dict.auctions.minutes}`);
            } else if (hours > 0) {
                setTimeLeft(`${hours}${dict.auctions.hours} ${minutes}${dict.auctions.minutes} ${seconds}${dict.auctions.seconds}`);
            } else {
                setTimeLeft(`${minutes}${dict.auctions.minutes} ${seconds}${dict.auctions.seconds}`);
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
    const INITIAL_COUNT = 6;
    const [showAll, setShowAll] = useState(false);
    const [filters, setFilters] = useState({
        category: '',
        min_price: undefined as number | undefined,
        max_price: undefined as number | undefined,
        condition: '',
    });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            const categoryParam = urlParams.get('category');
            if (categoryParam) {
                setFilters(f => ({ ...f, category: categoryParam }));
            }
        }
    }, []);

    const handleFilterChange = useCallback((newFilters: any) => {
        setFilters({
            category: newFilters.category || '',
            min_price: newFilters.min_price,
            max_price: newFilters.max_price,
            condition: newFilters.condition || '',
        });
    }, []);

    const fetchAuctions = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const params: any = {
                active_only: false,
            };
            if (searchQuery) params.search = searchQuery;
            if (filters.category) params.category = filters.category;
            if (filters.min_price) params.min_price = filters.min_price;
            if (filters.max_price) params.max_price = filters.max_price;
            if (filters.condition) params.condition = filters.condition;

            const response = await auctionsAPI.list(params);
            // Handle both paginated and non-paginated responses
            const results = Array.isArray(response) ? response : (response as any).results || [];
            // Sort inactive/ended auctions to the bottom automatically
            const sorted = results.sort((a: any, b: any) => {
                const isEnded = (auc: any) => {
                    if (!auc.is_active) return true;
                    if (auc.end_time) {
                        return new Date(auc.end_time).getTime() <= Date.now();
                    }
                    return false;
                };
                const aEnded = isEnded(a);
                const bEnded = isEnded(b);
                if (aEnded && !bEnded) return 1;
                if (!aEnded && bEnded) return -1;
                
                const aDate = new Date(a.created_at || 0).getTime();
                const bDate = new Date(b.created_at || 0).getTime();
                return bDate - aDate;
            });
            setAuctions(sorted);
        } catch (err: any) {
            console.error('Error fetching auctions:', err);
            setError(err.message || dict.auctions.loadFailed);
        } finally {
            setLoading(false);
        }
    }, [searchQuery, filters.category, filters.min_price, filters.max_price, filters.condition]);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login?redirect=/auctions');
        } else if (user) {
            fetchAuctions();
        }
    }, [authLoading, user, router, fetchAuctions]);

    // Since backend handles filtering, filteredAuctions is equal to backend auctions
    const filteredAuctions = auctions;

    const visibleAuctions = showAll ? filteredAuctions : filteredAuctions.slice(0, INITIAL_COUNT);

    if (authLoading || !user) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="animate-spin text-accent" size={40} />
            </div>
        );
    }

    return (
        <>
            <Navbar />
            <main className="pt-32 pb-20 min-h-screen relative overflow-hidden bg-[#FCFDFB] dark:bg-[#0e1015]">
                {/* Subtle Radial Gradients for Premium Feel */}
                <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-orange-500/[0.02] dark:bg-orange-500/[0.04] rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-red-500/[0.02] dark:bg-red-500/[0.04] rounded-full blur-[100px] pointer-events-none" />

                <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    {/* ── Premium Hero Header ── */}
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col md:flex-row md:justify-between md:items-center gap-6 mb-12"
                    >
                        <div>
                            <h2 className="text-[32px] md:text-[40px] font-black text-slate-900 dark:text-white leading-tight">
                                {dict.auctions.title}
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 text-[16px] mt-2 font-medium">
                                {dict.auctions.subtitle}
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 items-center">
                            {/* Premium Search */}
                            <div className="relative max-w-md w-full shadow-[0_8px_30px_rgba(0,0,0,0.04)] rounded-[20px]">
                                <input
                                    type="text"
                                    placeholder={dict.auctions.searchPlaceholder}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && fetchAuctions()}
                                    className="w-full h-[56px] bg-[#F4FBF6] dark:bg-[#1F8A3B]/10 border border-[#E7ECEA] dark:border-[#1F8A3B]/20 rounded-[20px] pl-12 pr-4 text-[15px] outline-none focus:border-[#1F8A3B] transition-all font-cairo placeholder:text-[#98A2B3] text-slate-800 dark:text-white"
                                />
                                <button
                                    onClick={fetchAuctions}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1F8A3B] hover:text-[#186a2c] transition-colors"
                                >
                                    <Search size={22} strokeWidth={2.5} />
                                </button>
                            </div>

                            {/* Add Auction CTA */}
                            <Link href="/sell">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-6 h-[56px] rounded-[18px] font-bold text-[15px] shadow-[0_8px_20px_rgba(249,115,22,0.25)] flex items-center gap-2 whitespace-nowrap transition-all"
                                >
                                    <Plus size={20} strokeWidth={2.5} />
                                    أضف مزاد
                                </motion.button>
                            </Link>
                        </div>
                    </motion.div>

                    {loading && (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="animate-spin text-accent" size={40} />
                        </div>
                    )}

                    {error && !loading && (
                        <div className="text-center py-20">
                            <p className="text-red-500 text-lg mb-4">{error}</p>
                            <button
                                onClick={fetchAuctions}
                                className="bg-primary hover:bg-primary-700 text-white px-6 py-3 rounded-xl font-bold transition-all"
                            >
                                {dict.auctions.retryBtn}
                            </button>
                        </div>
                    )}

                    {!loading && !error && (
                        <>
                            <div className="grid lg:grid-cols-4 gap-6">
                                {/* Sidebar Filters */}
                                <motion.div
                                    className="lg:col-span-1"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.45 }}
                                >
                                    <SidebarFilters currentFilters={filters} onFilterChange={handleFilterChange} />
                                </motion.div>

                                <div className="lg:col-span-3">
                                    {/* Premium Sort Bar (Visual Only for now) */}
                                    <div className="flex items-center gap-3 overflow-x-auto pb-6 scrollbar-hide">
                                        {[dict.auctions.sortLatest, dict.auctions.sortEndingSoon, dict.auctions.sortHighestPrice, dict.auctions.sortLowestPrice, dict.auctions.sortMostActive].map((sort, idx) => (
                                            <button
                                                key={idx}
                                                className={`flex items-center gap-2 px-5 h-[42px] rounded-full whitespace-nowrap transition-all font-bold text-[14px] shadow-sm ${
                                                    idx === 0
                                                        ? 'bg-orange-500 text-white shadow-[0_4px_12px_rgba(249,115,22,0.25)]'
                                                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                                                }`}
                                            >
                                                {sort}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                                        {visibleAuctions.map((auction) => (
                                            <motion.div
                                                key={auction.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                whileHover={{ y: -6, scale: 1.02 }}
                                                transition={{ duration: 0.3 }}
                                                className="group relative bg-white dark:bg-slate-800 rounded-[24px] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-300 border border-slate-100/80 dark:border-slate-700/50 flex flex-col h-full"
                                            >
                                                <Link href={`/product/${auction.product}`} className="flex flex-col h-full">
                                                    <div className={`relative aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-700 rounded-t-[24px] ${!auction.is_active ? 'grayscale-[50%]' : ''}`}>
                                                        <img
                                                            src={auction.product_image || '/placeholder.png'}
                                                            alt={auction.product_title}
                                                            className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-500"
                                                        />

                                                        {/* Favorite Button */}
                                                        <div className="absolute top-4 left-4 z-20 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 shadow-[0_8px_20px_rgba(0,0,0,0.08)] bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl text-slate-400 hover:text-red-500 hover:bg-white hover:scale-110">
                                                            <Heart size={20} />
                                                        </div>

                                                        {/* Status Badge */}
                                                        {auction.is_active ? (
                                                            <div className="absolute top-4 right-4 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[12px] px-4 py-1.5 rounded-full font-bold shadow-[0_4px_12px_rgba(249,115,22,0.3)] flex items-center gap-1.5 backdrop-blur-md">
                                                                <Gavel size={14} />
                                                                {dict.auctions.activeBadge}
                                                            </div>
                                                        ) : (
                                                            <div className="absolute top-4 right-4 bg-slate-800/80 dark:bg-black/80 text-white text-[12px] px-4 py-1.5 rounded-full font-bold shadow-md flex items-center gap-1.5 backdrop-blur-md">
                                                                {dict.auctions.endedBadge}
                                                            </div>
                                                        )}

                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>

                                                    <div className="p-5 flex-1 flex flex-col">
                                                        <h3 className="font-bold text-[16px] mb-3 line-clamp-1 group-hover:text-orange-500 transition-colors">
                                                            {auction.product_title}
                                                        </h3>

                                                        {/* Info Row */}
                                                        <div className="flex items-center gap-4 mb-4 pb-4 border-b border-slate-100 dark:border-slate-700/50">
                                                            <div className="flex items-center gap-1.5 text-[12px] text-slate-500 dark:text-slate-400 font-medium bg-slate-50 dark:bg-slate-800 p-2 rounded-lg flex-1 justify-center">
                                                                <Users size={14} className="text-blue-500" />
                                                                {auction.total_bids} {dict.auctions.bidderCount}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-[12px] text-slate-500 dark:text-slate-400 font-medium bg-slate-50 dark:bg-slate-800 p-2 rounded-lg flex-1 justify-center">
                                                                {auction.is_active ? (
                                                                    <CountdownTimer endTime={auction.end_time} dict={dict} />
                                                                ) : (
                                                                    <div className="flex items-center gap-1 text-red-500">
                                                                        <Clock size={12} /> {dict.auctions.ended}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Price Footer */}
                                                        <div className="flex justify-between items-end mt-auto">
                                                            <div>
                                                                <span className="text-[12px] text-slate-400 block mb-1 font-medium">{dict.auctions.currentPrice}</span>
                                                                <div className="flex items-baseline gap-1">
                                                                    <span className="text-orange-500 font-black text-[22px] leading-none">
                                                                        {parseFloat(auction.current_bid).toLocaleString()}
                                                                    </span>
                                                                    <span className="text-slate-400 text-sm font-bold">{dict.currency}</span>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                {!auction.is_active && auction.highest_bidder_name ? (
                                                                    <div className="text-[12px] bg-green-50 text-green-600 dark:bg-green-900/20 px-3 py-1.5 rounded-full font-bold">
                                                                        {dict.auctions.winner} {auction.highest_bidder_name}
                                                                    </div>
                                                                ) : (
                                                                    <div className="bg-orange-50 dark:bg-orange-900/20 p-2.5 rounded-xl group-hover:bg-orange-500 transition-colors">
                                                                        <TrendingUp size={18} className="text-orange-500 group-hover:text-white" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Link>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Show All button - below grid */}
                            {filteredAuctions.length > INITIAL_COUNT && (
                                <div className="flex justify-center mt-8">
                                    <motion.button
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => setShowAll(!showAll)}
                                        className="bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/20 dark:hover:bg-orange-900/40 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 px-8 py-3 rounded-xl font-bold text-sm transition-all shadow-sm"
                                    >
                                        {showAll ? dict.auctions.showLess : `${dict.auctions.showAll} (${filteredAuctions.length}) ▼`}
                                    </motion.button>
                                </div>
                            )}

                            {filteredAuctions.length === 0 && (
                                <div className="text-center py-20">
                                    <div className="bg-slate-100 dark:bg-slate-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Gavel size={32} className="text-slate-400" />
                                    </div>
                                    <p className="text-slate-400 text-lg mb-2">{dict.auctions.noAuctions}</p>
                                    <p className="text-slate-400 text-sm mb-6">{dict.auctions.noAuctionsDesc}</p>
                                    <Link href="/sell">
                                        <button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md hover:shadow-lg">
                                            {dict.auctions.addNewAuctionBtn}
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
