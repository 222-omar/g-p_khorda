'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { ProductCard } from '@/components/ui/product-card';
import { ProductCardSkeleton } from '@/components/ui/product-skeleton';
import { SidebarFilters } from '@/components/ui/sidebar-filters';
import { useLanguage } from '@/components/providers/language-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { Search, Loader2, Plus, PackageOpen, Sparkles, Clock, LayoutGrid, Gavel } from 'lucide-react';
import { productsAPI, wishlistAPI } from '@/lib/api';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/animations';

// ─── Section Header ──────────────────────────────────────────────────────────
function SectionHeader({
    icon: Icon,
    title,
    subtitle,
    color = 'text-[#1F8A3B]',
    bgColor = 'bg-[#1F8A3B]/10',
    action,
}: {
    icon: any;
    title: string;
    subtitle?: string;
    color?: string;
    bgColor?: string;
    action?: React.ReactNode;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="flex items-center gap-4 mb-8"
        >
            <div className={`${bgColor} ${color} w-12 h-12 rounded-[16px] flex items-center justify-center shadow-sm`}>
                <Icon size={24} strokeWidth={2.5} />
            </div>
            <div>
                <h3 className="text-[24px] font-black text-slate-900 dark:text-white leading-tight">{title}</h3>
                {subtitle && <p className="text-slate-500 dark:text-slate-400 text-[15px] mt-1 font-medium">{subtitle}</p>}
            </div>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent via-slate-200 dark:via-slate-700 to-transparent mx-4 opacity-70" />
            {action && <div>{action}</div>}
        </motion.div>
    );
}

// ─── Featured Card (bigger card for "recommended") ────────────────────────────
function FeaturedCard({ product, isWishlisted, onWishlistChange, isLoggedIn, isOwner }: any) {
    const { dict } = useLanguage();
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            whileHover={{ y: -6, scale: 1.02 }}
            transition={{ duration: 0.3 }}
            className="group relative bg-white dark:bg-slate-800 rounded-[24px] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] border border-slate-100/80 dark:border-slate-700/50 transition-all h-full flex flex-col"
        >
            {/* Wishlist button */}
            {isLoggedIn && !isOwner && (
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={async (e) => {
                        e.preventDefault();
                        try {
                            const r = await wishlistAPI.toggle(parseInt(product.id));
                            onWishlistChange?.(product.id, r.is_wishlisted);
                        } catch { }
                    }}
                    className={`absolute top-4 left-4 z-20 w-11 h-11 rounded-full flex items-center justify-center shadow-[0_8px_20px_rgba(0,0,0,0.08)] transition-all ${isWishlisted ? 'bg-red-500 text-white shadow-[0_8px_20px_rgba(239,68,68,0.25)]' : 'bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl text-slate-400 hover:text-red-500'}`}
                >
                    <svg width="20" height="20" fill={isWishlisted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                </motion.button>
            )}

            <Link href={`/product/${product.id}`} className="flex flex-col h-full">
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-700 rounded-t-[24px]">
                    <img
                        src={product.image}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-500"
                    />
                    {product.isAuction && (
                        <div className="absolute top-4 right-4 bg-orange-500/90 backdrop-blur-md text-white text-[12px] px-3 py-1.5 rounded-full font-bold shadow-md flex items-center gap-1.5">
                            <Clock size={12} /> مزاد نشط
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                    <h4 className="font-bold text-[16px] line-clamp-2 mb-4 group-hover:text-[#1F8A3B] transition-colors">{product.title}</h4>
                    <div className="flex items-center justify-between">
                        <span className="text-[#1F8A3B] font-black text-[22px]">{Number(product.price).toLocaleString()} <span className="text-sm text-slate-400 font-bold">{dict.currency}</span></span>
                        <span className="text-[12px] bg-[#1F8A3B]/10 text-[#1F8A3B] font-bold px-3 py-1.5 rounded-full group-hover:bg-[#1F8A3B] group-hover:text-white transition-all shadow-sm">عرض</span>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function DashboardPage() {
    const { dict } = useLanguage();
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [searchQuery, setSearchQuery] = useState('');
    const [allProducts, setAllProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState({
        category: '',
        min_price: undefined as number | undefined,
        max_price: undefined as number | undefined,
        condition: '',
    });
    const [wishlistIds, setWishlistIds] = useState<number[]>([]);

    // "Show more" state for each section
    const INITIAL_AUCTIONS = 4;
    const INITIAL_FEATURED = 4;
    const INITIAL_LATEST = 6;
    const [showAllAuctions, setShowAllAuctions] = useState(false);

    const fetchProducts = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const params: any = {};
            if (searchQuery) params.search = searchQuery;
            if (filters.category) params.category = filters.category;
            if (filters.min_price) params.min_price = filters.min_price;
            if (filters.max_price) params.max_price = filters.max_price;
            if (filters.condition) params.condition = filters.condition;

            const response = await productsAPI.list(params);
            // Sort sold products and ended auctions to the bottom automatically
            const sortedProducts = (response.results || []).sort((a: any, b: any) => {
                const isEndedOrSold = (p: any) => {
                    if (p.status === 'sold') return true;
                    if (p.is_auction && p.auction_end_time) {
                        return new Date(p.auction_end_time).getTime() <= Date.now();
                    }
                    return false;
                };
                const aEnded = isEndedOrSold(a);
                const bEnded = isEndedOrSold(b);
                if (aEnded && !bEnded) return 1;
                if (!aEnded && bEnded) return -1;
                return 0;
            });
            setAllProducts(sortedProducts);
        } catch (err: any) {
            setError(err.message || 'Failed to load products');
        } finally {
            setLoading(false);
        }
    }, [searchQuery, filters.category, filters.min_price, filters.max_price, filters.condition]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            const categoryParam = urlParams.get('category');
            if (categoryParam) {
                setFilters(f => ({ ...f, category: categoryParam }));
            }
        }
    }, []);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login?redirect=/dashboard');
        } else if (user) {
            fetchProducts();
        }
    }, [authLoading, user, router, fetchProducts]);

    useEffect(() => {
        if (user) {
            wishlistAPI.getIds().then(d => setWishlistIds(d.product_ids)).catch(() => { });
        }
    }, [user]);

    const handleWishlistChange = (id: string, w: boolean) => {
        setWishlistIds(prev => w ? [...prev, parseInt(id)] : prev.filter(i => i !== parseInt(id)));
    };

    const handleFilterChange = useCallback((newFilters: any) => {
        setFilters({
            category: newFilters.category || '',
            min_price: newFilters.min_price,
            max_price: newFilters.max_price,
            condition: newFilters.condition || '',
        });
    }, []);

    // Normalise a raw API product → card shape
    const toCard = (p: any) => ({
        id: p.id.toString(),
        title: p.title,
        price: parseFloat(p.price),
        image: p.primary_image || p.images?.[0]?.image || '/placeholder.png',
        isAuction: p.is_auction || false,
        category: p.category,
        description: p.description || '',
        endTime: p.auction?.end_time,
        createdAt: p.created_at,
        status: p.status || 'active',
        seller: p.seller,
    });

    const isOwnerOf = (p: any): boolean => !!(user && p.owner_id === user.id);

    // Derived sections (only when no active filter/search to avoid confusion)
    const isFiltering = !!(searchQuery || filters.category || filters.min_price || filters.max_price || filters.condition);

    // Non-auction products for featured / latest sections
    const nonAuctionProducts = isFiltering ? [] : allProducts.filter(p => !p.is_auction);
    const auctionProducts = isFiltering ? [] : allProducts.filter(p => p.is_auction);

    if (authLoading || !user) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
                    <Loader2 className="animate-spin text-accent" size={40} />
                </motion.div>
            </div>
        );
    }

    return (
        <>
            <Navbar />
            <main className="pt-32 pb-20 min-h-screen relative overflow-hidden bg-[#FCFDFB] dark:bg-[#0e1015]">
                {/* Subtle Radial Gradients for Premium Feel */}
                <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-[#1F8A3B]/[0.025] dark:bg-[#1F8A3B]/[0.05] rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-blue-500/[0.02] dark:bg-blue-500/[0.04] rounded-full blur-[100px] pointer-events-none" />

                <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

                    {/* ── Page Header ── */}
                    <motion.div
                        variants={staggerContainer}
                        initial="hidden"
                        animate="visible"
                        className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-10"
                    >
                        <motion.div variants={staggerItem}>
                            <h2 className="text-2xl md:text-3xl font-black">المتجر</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                                اكتشف أحدث العروض والمزادات
                            </p>
                        </motion.div>

                        <motion.div variants={staggerItem} className="flex flex-col sm:flex-row gap-4 items-center">
                            {/* Premium Search */}
                            <div className="relative max-w-md w-full shadow-[0_8px_30px_rgba(0,0,0,0.04)] rounded-[20px]">
                                <input
                                    type="text"
                                    placeholder={dict.dashboard.searchPlaceholder}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && fetchProducts()}
                                    className="w-full h-[56px] bg-[#F4FBF6] dark:bg-[#1F8A3B]/10 border border-[#E7ECEA] dark:border-[#1F8A3B]/20 rounded-[20px] pl-12 pr-4 text-[15px] outline-none focus:border-[#1F8A3B] transition-all font-cairo placeholder:text-[#98A2B3] text-slate-800 dark:text-white"
                                />
                                <button
                                    onClick={fetchProducts}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1F8A3B] hover:text-[#186a2c] transition-colors"
                                >
                                    <Search size={22} strokeWidth={2.5} />
                                </button>
                            </div>

                            {/* Add Product CTA */}
                            <Link href="/sell">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="bg-gradient-to-r from-[#1F8A3B] to-[#43A047] hover:from-[#186a2c] hover:to-[#388e3c] text-white px-6 h-[56px] rounded-[18px] font-bold text-[15px] shadow-[0_8px_20px_rgba(31,138,59,0.25)] flex items-center gap-2 whitespace-nowrap transition-all"
                                >
                                    <Plus size={20} strokeWidth={2.5} />
                                    أضف إعلان
                                </motion.button>
                            </Link>
                        </motion.div>
                    </motion.div>

                    {/* ── Category Chips ── */}
                    <motion.div variants={staggerItem} className="flex items-center gap-3 overflow-x-auto pb-4 mb-10 scrollbar-hide">
                        {[
                            { id: '', label: 'الكل', icon: '✨' },
                            { id: 'cars', label: 'سيارات', icon: '🚗' },
                            { id: 'real_estate', label: 'عقارات', icon: '🏠' },
                            { id: 'electronics', label: 'إلكترونيات', icon: '💻' },
                            { id: 'phones', label: 'هواتف', icon: '📱' },
                            { id: 'furniture', label: 'أثاث', icon: '🪑' },
                            { id: 'appliances', label: 'أجهزة منزلية', icon: '🧺' },
                        ].map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => handleFilterChange({ ...filters, category: cat.id })}
                                className={`flex items-center gap-2 px-5 h-[42px] rounded-full whitespace-nowrap transition-all font-bold text-[14px] shadow-sm ${
                                    filters.category === cat.id
                                        ? 'bg-[#1F8A3B] text-white shadow-[0_4px_12px_rgba(31,138,59,0.25)]'
                                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                                }`}
                            >
                                <span>{cat.icon}</span>
                                {cat.label}
                            </button>
                        ))}
                    </motion.div>

                    {/* ── Loading ── */}
                    <AnimatePresence mode="wait">
                        {loading && (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 py-8"
                            >
                                {[...Array(8)].map((_, i) => (
                                    <ProductCardSkeleton key={`skeleton-${i}`} />
                                ))}
                            </motion.div>
                        )}

                        {error && !loading && (
                            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-24">
                                <p className="text-red-500 mb-4">{error}</p>
                                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={fetchProducts}
                                    className="bg-primary text-white px-6 py-3 rounded-xl font-bold">
                                    إعادة المحاولة
                                </motion.button>
                            </motion.div>
                        )}

                        {!loading && !error && (
                            <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>

                                {allProducts.length === 0 ? (
                                    /* Empty State */
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.93 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="text-center py-24"
                                    >
                                        <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 2.5, repeat: Infinity }}>
                                            <PackageOpen size={64} className="mx-auto text-slate-300 dark:text-slate-600" />
                                        </motion.div>
                                        <p className="text-slate-500 text-lg font-medium mt-4">لا توجد منتجات حالياً</p>
                                        <p className="text-slate-400 text-sm mt-2">جرب تغيير الفلاتر أو ابحث بكلمات مختلفة</p>
                                    </motion.div>
                                ) : isFiltering ? (
                                    /* ── Search / Filter results (flat grid + sidebar) ── */
                                    <div className="grid lg:grid-cols-4 gap-6">
                                        <motion.div
                                            className="lg:col-span-1"
                                            initial={{ opacity: 0, x: -24 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ duration: 0.45 }}
                                        >
                                            <SidebarFilters currentFilters={filters} onFilterChange={handleFilterChange} />
                                        </motion.div>
                                        <div className="lg:col-span-3">
                                            <div className="flex justify-between items-center mb-4">
                                                <p className="text-slate-500 text-sm">
                                                    {allProducts.length} نتيجة {searchQuery ? `لـ "${searchQuery}"` : ''}
                                                </p>
                                            </div>
                                            <motion.div
                                                variants={staggerContainer}
                                                initial="hidden"
                                                animate="visible"
                                                className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
                                            >
                                                {allProducts.map((p) => (
                                                    <motion.div key={p.id} variants={staggerItem}>
                                                        <ProductCard
                                                            product={toCard(p)}
                                                            isLoggedIn={!!user}
                                                            isOwner={isOwnerOf(p)}
                                                            isWishlisted={wishlistIds.includes(p.id)}
                                                            onWishlistChange={handleWishlistChange}
                                                        />
                                                    </motion.div>
                                                ))}
                                            </motion.div>
                                        </div>
                                    </div>
                                ) : (
                                    /* ── Sectioned view (default) ── */
                                    <div className="space-y-14">



                                        {/* SECTION 3 — أحدث الإضافات */}
                                        <section>
                                            <SectionHeader
                                                icon={Clock}
                                                title="أحدث الإضافات"
                                                subtitle="آخر ما أُضيف للمتجر"
                                                color="text-blue-600"
                                                bgColor="bg-blue-100 dark:bg-blue-900/30"
                                            />
                                            <motion.div
                                                variants={staggerContainer}
                                                initial="hidden"
                                                whileInView="visible"
                                                viewport={{ once: true }}
                                                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                                            >
                                                {nonAuctionProducts.slice(0, INITIAL_LATEST).map((p) => (
                                                    <motion.div key={p.id} variants={staggerItem}>
                                                        <ProductCard
                                                            product={toCard(p)}
                                                            isLoggedIn={!!user}
                                                            isOwner={isOwnerOf(p)}
                                                            isWishlisted={wishlistIds.includes(p.id)}
                                                            onWishlistChange={handleWishlistChange}
                                                        />
                                                    </motion.div>
                                                ))}
                                            </motion.div>
                                        </section>

                                        {/* SECTION 4 — كل المنتجات + Sidebar */}
                                        <section>
                                            <SectionHeader
                                                icon={LayoutGrid}
                                                title="كل المنتجات"
                                                subtitle={`${allProducts.length} منتج متاح`}
                                            />
                                            <div className="grid lg:grid-cols-4 gap-6">
                                                {/* Sidebar */}
                                                <motion.div
                                                    className="lg:col-span-1"
                                                    initial={{ opacity: 0, x: -20 }}
                                                    whileInView={{ opacity: 1, x: 0 }}
                                                    viewport={{ once: true }}
                                                    transition={{ duration: 0.45 }}
                                                >
                                                    <SidebarFilters currentFilters={filters} onFilterChange={handleFilterChange} />
                                                </motion.div>

                                                {/* Products Grid */}
                                                <div className="lg:col-span-3">
                                                    <motion.div
                                                        variants={staggerContainer}
                                                        initial="hidden"
                                                        whileInView="visible"
                                                        viewport={{ once: true }}
                                                        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
                                                    >
                                                        {allProducts.map((p) => (
                                                            <motion.div key={p.id} variants={staggerItem}>
                                                                <ProductCard
                                                                    product={toCard(p)}
                                                                    isLoggedIn={!!user}
                                                                    isOwner={isOwnerOf(p)}
                                                                    isWishlisted={wishlistIds.includes(p.id)}
                                                                    onWishlistChange={handleWishlistChange}
                                                                />
                                                            </motion.div>
                                                        ))}
                                                    </motion.div>
                                                </div>
                                            </div>

                                        </section>

                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>
            <Footer />
        </>
    );
}
