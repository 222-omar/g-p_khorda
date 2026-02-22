'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { ProductCard } from '@/components/ui/product-card';
import { useLanguage } from '@/components/providers/language-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { Loader2, Heart, Trash2 } from 'lucide-react';
import { wishlistAPI } from '@/lib/api';
import Link from 'next/link';

export default function WishlistPage() {
    const { dict } = useLanguage();
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchWishlist = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await wishlistAPI.list();
            setProducts(data || []);
        } catch (err: any) {
            console.error('Error fetching wishlist:', err);
            setError(err.message || 'فشل في تحميل المفضلة');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login?redirect=/wishlist');
        } else if (user) {
            fetchWishlist();
        }
    }, [authLoading, user, router, fetchWishlist]);

    const handleWishlistChange = (productId: string, isWishlisted: boolean) => {
        if (!isWishlisted) {
            setProducts(prev => prev.filter(p => p.id.toString() !== productId));
        }
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
                        <div className="flex items-center gap-3">
                            <div className="bg-gradient-to-r from-red-500 to-pink-500 p-2.5 rounded-xl text-white">
                                <Heart size={24} />
                            </div>
                            <div>
                                <h2 className="text-2xl md:text-3xl font-bold">المفضلة</h2>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                                    المنتجات اللي حفظتها عشان ترجعلها بعدين
                                </p>
                            </div>
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
                                onClick={fetchWishlist}
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
                                    <div className="text-6xl mb-4">💔</div>
                                    <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">
                                        لسه مضفتش حاجة للمفضلة
                                    </p>
                                    <p className="text-slate-400 dark:text-slate-500 text-sm mt-2 mb-6">
                                        دوس على ❤️ على أي منتج عشان تحفظه هنا
                                    </p>
                                    <Link href="/dashboard">
                                        <button className="bg-primary hover:bg-primary-700 text-white px-6 py-3 rounded-xl font-bold transition-all">
                                            تصفح المتجر
                                        </button>
                                    </Link>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {products.map((product) => (
                                        <ProductCard
                                            key={product.id}
                                            product={{
                                                id: product.id.toString(),
                                                title: product.title,
                                                price: parseFloat(product.price),
                                                image: product.primary_image || '/placeholder.png',
                                                isAuction: product.is_auction || false,
                                                category: product.category,
                                                description: '',
                                            }}
                                            isLoggedIn={true}
                                            isWishlisted={true}
                                            onWishlistChange={handleWishlistChange}
                                        />
                                    ))}
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
