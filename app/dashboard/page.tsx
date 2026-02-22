'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { ProductCard } from '@/components/ui/product-card';
import { SidebarFilters } from '@/components/ui/sidebar-filters';
import { useLanguage } from '@/components/providers/language-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { Search, Loader2, Plus } from 'lucide-react';
import { productsAPI, wishlistAPI } from '@/lib/api';
import Link from 'next/link';

export default function DashboardPage() {
    const { dict } = useLanguage();
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [products, setProducts] = useState<any[]>([]);
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
            setProducts(response.results || []);
        } catch (err: any) {
            console.error('Error fetching products:', err);
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
            wishlistAPI.getIds().then(data => setWishlistIds(data.product_ids)).catch(() => { });
        }
    }, [user]);

    const handleFilterChange = useCallback((newFilters: any) => {
        setFilters({
            category: newFilters.category || '',
            min_price: newFilters.min_price,
            max_price: newFilters.max_price,
            condition: newFilters.condition || '',
        });
    }, []);

    const handleSearch = () => {
        fetchProducts();
    };

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
                        <div className="flex items-center gap-4">
                            <h2 className="text-2xl md:text-3xl font-bold">{dict.dashboard.title}</h2>
                            <Link href="/sell">
                                <button className="bg-primary hover:bg-primary-700 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-sm hover:shadow-md flex items-center gap-2">
                                    <Plus size={18} />
                                    أضف إعلان
                                </button>
                            </Link>
                        </div>

                        <div className="flex gap-2 max-w-md w-full">
                            <input
                                type="text"
                                placeholder={dict.dashboard.searchPlaceholder}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="flex-1 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white dark:bg-slate-800 transition-all"
                            />
                            <button
                                onClick={handleSearch}
                                className="bg-primary hover:bg-primary-700 text-white p-3 rounded-xl transition-colors shadow-sm hover:shadow-md"
                            >
                                <Search size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="grid lg:grid-cols-4 gap-6">
                        <div className="lg:col-span-1">
                            <SidebarFilters
                                onFilterChange={handleFilterChange}
                            />
                        </div>

                        <div className="lg:col-span-3">
                            {loading && (
                                <div className="flex items-center justify-center py-20">
                                    <Loader2 className="animate-spin text-primary" size={40} />
                                </div>
                            )}

                            {error && !loading && (
                                <div className="text-center py-20">
                                    <p className="text-red-500 text-lg mb-4">{error}</p>
                                    <button
                                        onClick={fetchProducts}
                                        className="bg-primary hover:bg-primary-700 text-white px-6 py-3 rounded-xl font-bold transition-all"
                                    >
                                        إعادة المحاولة
                                    </button>
                                </div>
                            )}

                            {!loading && !error && (
                                <>
                                    {products.length === 0 ? (
                                        <div className="text-center py-24">
                                            <div className="text-6xl mb-4">📦</div>
                                            <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">لا توجد منتجات حالياً</p>
                                            <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">جرب تغيير الفلاتر أو ابحث بكلمات مختلفة</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                                            {products.map((product) => (
                                                <ProductCard
                                                    key={product.id}
                                                    product={{
                                                        id: product.id.toString(),
                                                        title: product.title,
                                                        price: parseFloat(product.price),
                                                        image: product.primary_image || product.images?.[0]?.image || product.image || '/placeholder.png',
                                                        isAuction: product.is_auction || false,
                                                        category: product.category,
                                                        description: product.description,
                                                        endTime: product.auction?.end_time,
                                                    }}
                                                    isLoggedIn={!!user}
                                                    isWishlisted={wishlistIds.includes(product.id)}
                                                    onWishlistChange={(id, wishlisted) => {
                                                        setWishlistIds(prev =>
                                                            wishlisted ? [...prev, parseInt(id)] : prev.filter(i => i !== parseInt(id))
                                                        );
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
