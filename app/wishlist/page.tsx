'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { ProductCard } from '@/components/ui/product-card';
import { useLanguage } from '@/components/providers/language-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { Loader2, Heart } from 'lucide-react';
import { wishlistAPI } from '@/lib/api';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/animations';

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
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
                    <Loader2 className="animate-spin text-primary" size={40} />
                </motion.div>
            </div>
        );
    }

    return (
        <>
            <Navbar />
            <main className="pt-24 pb-12 min-h-screen px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    {/* Page Header */}
                    <motion.div
                        variants={staggerContainer}
                        initial="hidden"
                        animate="visible"
                        className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8"
                    >
                        <motion.div variants={staggerItem} className="flex items-center gap-3">
                            <motion.div
                                whileHover={{ scale: 1.1, rotate: -8 }}
                                transition={{ type: 'spring', stiffness: 350, damping: 18 }}
                                className="bg-gradient-to-r from-red-500 to-pink-500 p-2.5 rounded-xl text-white"
                            >
                                <Heart size={24} />
                            </motion.div>
                            <div>
                                <h2 className="text-2xl md:text-3xl font-bold">المفضلة</h2>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                                    المنتجات اللي حفظتها عشان ترجعلها بعدين
                                </p>
                            </div>
                        </motion.div>
                    </motion.div>

                    <AnimatePresence mode="wait">
                        {loading && (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center justify-center py-20 gap-4"
                            >
                                <Loader2 className="animate-spin text-primary" size={40} />
                                <p className="text-slate-500 text-sm font-medium animate-pulse">جاري تحميل المفضلة...</p>
                            </motion.div>
                        )}

                        {error && !loading && (
                            <motion.div
                                key="error"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-center py-20"
                            >
                                <p className="text-red-500 text-lg mb-4">{error}</p>
                                <motion.button
                                    onClick={fetchWishlist}
                                    whileHover={{ scale: 1.04 }}
                                    whileTap={{ scale: 0.96 }}
                                    className="bg-primary hover:bg-primary-700 text-white px-6 py-3 rounded-xl font-bold"
                                >
                                    إعادة المحاولة
                                </motion.button>
                            </motion.div>
                        )}

                        {!loading && !error && (
                            <motion.div
                                key="content"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.3 }}
                            >
                                {products.length === 0 ? (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.93 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.4 }}
                                        className="text-center py-24"
                                    >
                                        <motion.div
                                            animate={{ scale: [1, 1.12, 1] }}
                                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                                            className="text-6xl mb-4 inline-block"
                                        >
                                            💔
                                        </motion.div>
                                        <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">
                                            لسه مضفتش حاجة للمفضلة
                                        </p>
                                        <p className="text-slate-400 dark:text-slate-500 text-sm mt-2 mb-6">
                                            دوس على ❤️ على أي منتج عشان تحفظه هنا
                                        </p>
                                        <Link href="/dashboard">
                                            <motion.button
                                                whileHover={{ scale: 1.05, boxShadow: '0 6px 20px rgba(22,163,74,0.3)' }}
                                                whileTap={{ scale: 0.96 }}
                                                className="bg-primary hover:bg-primary-700 text-white px-6 py-3 rounded-xl font-bold"
                                            >
                                                تصفح المتجر
                                            </motion.button>
                                        </Link>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        variants={staggerContainer}
                                        initial="hidden"
                                        animate="visible"
                                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                                    >
                                        {products.map((product) => (
                                            <motion.div key={product.id} variants={staggerItem}>
                                                <ProductCard
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
                                            </motion.div>
                                        ))}
                                    </motion.div>
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
