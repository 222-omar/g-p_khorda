'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { useLanguage } from '@/components/providers/language-provider';
import { Plus, ShoppingCart, LogOut, Star, TrendingUp, Package, Loader2, Heart, Pencil } from 'lucide-react';
import { motion } from 'framer-motion';
import { profilesAPI, productsAPI, authAPI, wishlistAPI } from '@/lib/api';

export default function ProfilePage() {
    const router = useRouter();
    const { dict } = useLanguage();
    const [profile, setProfile] = useState<any>(null);
    const [myListings, setMyListings] = useState<any[]>([]);
    const [wishlistItems, setWishlistItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [profileData, listingsData, wishlistData] = await Promise.all([
                    profilesAPI.getMe(),
                    productsAPI.getMyListings(),
                    wishlistAPI.list().catch(() => []),
                ]);
                setProfile(profileData);
                setMyListings(listingsData);
                setWishlistItems(wishlistData || []);
            } catch (err) {
                console.error('Failed to fetch profile', err);
                // If unauthorized, redirect might happen in apiFetch, but good to be safe
                // router.push('/login'); 
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleLogout = () => {
        authAPI.logout();
        router.push('/login');
    };

    if (loading) {
        return (
            <>
                <Navbar />
                <div className="min-h-screen pt-32 flex justify-center items-start">
                    <Loader2 className="animate-spin text-primary" size={40} />
                </div>
                <Footer />
            </>
        );
    }

    if (!profile) return null;

    const user = profile.user || {};
    const trustScore = profile.trust_score || 50;

    return (
        <>
            <Navbar />
            <main className="pt-24 pb-12 min-h-screen px-4 sm:px-6 lg:px-8">
                <div className="max-w-6xl mx-auto">
                    <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
                        {/* Sidebar */}
                        <div className="md:col-span-1">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 sticky top-24">
                                {/* User Info */}
                                <div className="flex flex-col items-center mb-6 pb-6 border-b border-slate-200 dark:border-slate-700">
                                    <div className="w-20 h-20 bg-slate-200 dark:bg-slate-700 rounded-full mb-4 border-4 border-primary overflow-hidden">
                                        <img
                                            src={profile.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                                            alt="avatar"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <h3 className="font-bold text-lg mb-1">{user.first_name} {user.last_name || ''} (@{user.username})</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm">{profile.city || 'العنوان غير محدد'}</p>

                                    {/* Trust Score Badge */}
                                    <div className="mt-4 w-full">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">نقاط الثقة</span>
                                            <span className="text-sm font-black text-primary">{trustScore}%</span>
                                        </div>
                                        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full bg-gradient-to-r from-primary to-green-400 rounded-full"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${trustScore}%` }}
                                                transition={{ duration: 1, ease: 'easeOut' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Navigation */}
                                <div className="space-y-2">
                                    <button className="w-full text-right p-3 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl text-sm font-bold flex items-center gap-3 transition-colors group">
                                        <div className="bg-primary-100 dark:bg-primary-900/30 p-2 rounded-lg group-hover:bg-primary group-hover:text-white transition-colors">
                                            <Plus size={16} />
                                        </div>
                                        {dict.profile.myListings} <span className="text-xs bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">{myListings.length}</span>
                                    </button>

                                    <button className="w-full text-right p-3 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl text-sm font-bold flex items-center gap-3 transition-colors group">
                                        <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                            <ShoppingCart size={16} />
                                        </div>
                                        {dict.profile.myPurchases}
                                    </button>

                                    <button className="w-full text-right p-3 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl text-sm font-bold flex items-center gap-3 transition-colors group">
                                        <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-lg group-hover:bg-red-500 group-hover:text-white transition-colors">
                                            <Heart size={16} />
                                        </div>
                                        المفضلة <span className="text-xs bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">{wishlistItems.length}</span>
                                    </button>

                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-right p-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-sm font-bold flex items-center gap-3 transition-colors group"
                                    >
                                        <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-lg group-hover:bg-red-500 group-hover:text-white transition-colors">
                                            <LogOut size={16} />
                                        </div>
                                        {dict.profile.logout}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="md:col-span-2 space-y-6">
                            <h2 className="text-2xl md:text-3xl font-bold">{dict.profile.accountStats}</h2>

                            {/* Stats Grid */}
                            <div className="grid sm:grid-cols-2 gap-6">
                                {/* Wallet Balance */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                    className="bg-gradient-to-br from-primary to-green-600 p-6 rounded-2xl text-white shadow-lg"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                                            <Package size={24} />
                                        </div>
                                    </div>
                                    <p className="text-sm opacity-90 mb-2">{dict.profile.walletBalance}</p>
                                    <p className="text-3xl font-black">
                                        {profile.wallet_balance || 0} <span className="text-base">{dict.currency}</span>
                                    </p>
                                </motion.div>

                                {/* Seller Rating */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-800 p-6 rounded-2xl text-white border border-slate-700 shadow-lg"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                                            <Star className="fill-yellow-400 text-yellow-400" size={24} />
                                        </div>
                                    </div>
                                    <p className="text-sm opacity-90 mb-2">{dict.profile.sellerRating}</p>
                                    <div className="flex items-center gap-3">
                                        <p className="text-3xl font-black">{profile.seller_rating || 0}</p>
                                        <div className="flex gap-0.5">
                                            {[1, 2, 3, 4, 5].map((i) => (
                                                <Star
                                                    key={i}
                                                    size={16}
                                                    className={i <= Math.round(Number(profile.seller_rating || 0)) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-600'}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Total Sales */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-xl">
                                            <TrendingUp className="text-blue-600 dark:text-blue-400" size={24} />
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">إجمالي المبيعات</p>
                                    <p className="text-3xl font-black text-slate-900 dark:text-white">{profile.total_sales || 0}</p>
                                </motion.div>

                                {/* Active Listings */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 }}
                                    className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-xl">
                                            <Package className="text-orange-600 dark:text-orange-400" size={24} />
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">الإعلانات النشطة</p>
                                    <p className="text-3xl font-black text-slate-900 dark:text-white">{myListings.filter(i => i.status === 'active').length}</p>
                                </motion.div>
                            </div>

                            {/* My Listings (Replacing Fake Activity) */}
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                                <h3 className="font-bold text-lg mb-4">{dict.profile.myListings} ({myListings.length})</h3>
                                {myListings.length > 0 ? (
                                    <div className="space-y-3">
                                        {myListings.slice(0, 5).map((item, i) => (
                                            <div
                                                key={item.id || i}
                                                className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                            >
                                                <div
                                                    className="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer"
                                                    onClick={() => router.push(`/product/${item.id}`)}
                                                >
                                                    {item.images?.[0]?.image ? (
                                                        <img src={item.images[0].image} alt={item.title} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Package size={24} className="m-auto mt-3 text-slate-400" />
                                                    )}
                                                </div>
                                                <div className="flex-1 cursor-pointer" onClick={() => router.push(`/product/${item.id}`)}>
                                                    <p className="font-semibold text-sm">{item.title}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">{item.price} {dict.currency}</p>
                                                </div>
                                                <div className={`px-2 py-1 rounded text-xs font-bold ${item.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                                                    }`}>
                                                    {item.status === 'active' ? 'نشط' : item.status}
                                                </div>
                                                <button
                                                    onClick={() => router.push(`/product/edit/${item.id}`)}
                                                    className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                    title="تعديل الإعلان"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-slate-500 text-sm py-4 text-center">لا توجد إعلانات حتى الآن</p>
                                )}
                            </div>

                            {/* Wishlist / Favorites */}
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                    <Heart size={20} className="text-red-500" />
                                    المفضلة ({wishlistItems.length})
                                </h3>
                                {wishlistItems.length > 0 ? (
                                    <div className="space-y-3">
                                        {wishlistItems.map((item: any, i: number) => (
                                            <div
                                                key={item.id || i}
                                                className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                                            >
                                                <div
                                                    className="flex-1 flex items-center gap-3"
                                                    onClick={() => router.push(`/product/${item.id}`)}
                                                >
                                                    <div className="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                                                        {item.primary_image ? (
                                                            <img src={item.primary_image} alt={item.title} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <Package size={24} className="m-auto mt-3 text-slate-400" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-semibold text-sm">{item.title}</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">{item.price} {dict.currency}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        try {
                                                            await wishlistAPI.toggle(item.id);
                                                            setWishlistItems(prev => prev.filter(w => w.id !== item.id));
                                                        } catch (err) {
                                                            console.error(err);
                                                        }
                                                    }}
                                                    className="text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors"
                                                    title="إزالة من المفضلة"
                                                >
                                                    <Heart size={16} fill="currentColor" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-slate-500 text-sm py-4 text-center">لسه مضفتش حاجة للمفضلة ❤️</p>
                                )}
                            </div>

                            {/* Quick Action */}
                            <Link href="/sell">
                                <button className="w-full bg-primary hover:bg-primary-700 text-white py-4 rounded-xl font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2">
                                    <Plus size={20} />
                                    أضف منتج جديد
                                </button>
                            </Link>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
