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
    color = 'text-primary',
    bgColor = 'bg-primary/10',
}: {
    icon: any;
    title: string;
    subtitle?: string;
    color?: string;
    bgColor?: string;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="flex items-center gap-3 mb-6"
        >
            <div className={`${bgColor} ${color} p-2.5 rounded-xl`}>
                <Icon size={22} />
            </div>
            <div>
                <h3 className="text-xl font-black">{title}</h3>
                {subtitle && <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{subtitle}</p>}
            </div>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-slate-200 dark:to-slate-700 ml-2" />
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
            whileHover={{ y: -5 }}
            transition={{ duration: 0.3 }}
            className="group relative bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl border border-slate-100 dark:border-slate-700/60 transition-all"
        >
            {/* Wishlist button */}
            {isLoggedIn && !isOwner && (
                <motion.button
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.88 }}
                    onClick={async (e) => {
                        e.preventDefault();
                        try {
                            const r = await wishlistAPI.toggle(parseInt(product.id));
                            onWishlistChange?.(product.id, r.is_wishlisted);
                        } catch { }
                    }}
                    className={`absolute top-3 left-3 z-20 w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-all ${isWishlisted ? 'bg-red-500 text-white' : 'bg-white/80 backdrop-blur-sm text-slate-400 hover:text-red-500'}`}
                >
                    <svg width="16" height="16" fill={isWishlisted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                </motion.button>
            )}

            <Link href={`/product/${product.id}`}>
                <div className="relative h-44 overflow-hidden bg-slate-100 dark:bg-slate-700">
                    <img
                        src={product.image}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-[1.07] transition-transform duration-500"
                    />
                    {product.isAuction && (
                        <div className="absolute top-3 right-3 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[11px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                            <Clock size={10} /> مزاد نشط
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="p-4">
                    <h4 className="font-bold text-sm line-clamp-2 mb-3 group-hover:text-primary transition-colors">{product.title}</h4>
                    <div className="flex items-center justify-between">
                        <span className="text-primary font-black text-lg">{Number(product.price).toLocaleString()} <span className="text-xs text-slate-400">{dict.currency}</span></span>
                        <span className="text-[11px] bg-primary/10 text-primary font-bold px-2.5 py-1 rounded-lg group-hover:bg-primary group-hover:text-white transition-all">عرض</span>
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
            setAllProducts(response.results || []);
        } catch (err: any) {
            setError(err.message || 'Failed to load products');
        } finally {
            setLoading(false);
        }
    }, [searchQuery, filters.category, filters.min_price, filters.max_price, filters.condition]);

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

    const featuredProducts = isFiltering ? [] : allProducts.slice(0, 4);
    const latestProducts = isFiltering ? [] : allProducts.slice(0, 6);
    const auctionProducts = isFiltering ? [] : allProducts.filter(p => p.is_auction);

    if (authLoading || !user) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
                    <Loader2 className="animate-spin text-primary" size={40} />
                </motion.div>
            </div>
        );
    }

    return (
        <>
            <Navbar />
            <main className="pt-24 pb-16 min-h-screen px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">

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

                        <motion.div variants={staggerItem} className="flex gap-2 items-center">
                            {/* Search */}
                            <div className="flex gap-2 max-w-sm w-full">
                                <input
                                    type="text"
                                    placeholder={dict.dashboard.searchPlaceholder}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && fetchProducts()}
                                    className="flex-1 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white dark:bg-slate-800 transition-all"
                                />
                                <motion.button
                                    onClick={fetchProducts}
                                    whileHover={{ scale: 1.08 }}
                                    whileTap={{ scale: 0.93 }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                    className="bg-primary hover:bg-primary-700 text-white p-3 rounded-xl"
                                >
                                    <Search size={20} />
                                </motion.button>
                            </div>

                            <Link href="/sell">
                                <motion.button
                                    whileHover={{ scale: 1.05, boxShadow: '0 4px 16px rgba(22,163,74,0.3)' }}
                                    whileTap={{ scale: 0.96 }}
                                    transition={{ type: 'spring', stiffness: 380, damping: 20 }}
                                    className="bg-primary text-white px-4 py-3 rounded-xl font-bold text-sm shadow-sm flex items-center gap-2 whitespace-nowrap"
                                >
                                    <Plus size={18} />
                                    أضف إعلان
                                </motion.button>
                            </Link>
                        </motion.div>
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
                                            <p className="text-slate-500 text-sm mb-4">
                                                {allProducts.length} نتيجة {searchQuery ? `لـ "${searchQuery}"` : ''}
                                            </p>
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

                                        {/* SECTION 1 — Auctions (if any) */}
                                        {auctionProducts.length > 0 && (
                                            <section>
                                                <SectionHeader
                                                    icon={Gavel}
                                                    title="المزادات النشطة"
                                                    subtitle="شارك الآن قبل انتهاء الوقت"
                                                    color="text-orange-600"
                                                    bgColor="bg-orange-100 dark:bg-orange-900/30"
                                                />
                                                <motion.div
                                                    variants={staggerContainer}
                                                    initial="hidden"
                                                    whileInView="visible"
                                                    viewport={{ once: true }}
                                                    className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5"
                                                >
                                                    {auctionProducts.slice(0, 4).map((p) => (
                                                        <motion.div key={p.id} variants={staggerItem}>
                                                            <FeaturedCard
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
                                        )}

                                        {/* SECTION 2 — مقترح لك */}
                                        <section>
                                            <SectionHeader
                                                icon={Sparkles}
                                                title="مقترح لك"
                                                subtitle="منتجات مختارة قد تعجبك"
                                                color="text-purple-600"
                                                bgColor="bg-purple-100 dark:bg-purple-900/30"
                                            />
                                            <motion.div
                                                variants={staggerContainer}
                                                initial="hidden"
                                                whileInView="visible"
                                                viewport={{ once: true }}
                                                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5"
                                            >
                                                {featuredProducts.map((p) => (
                                                    <motion.div key={p.id} variants={staggerItem}>
                                                        <FeaturedCard
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
                                                {latestProducts.map((p) => (
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
