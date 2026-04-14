'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { useLanguage } from '@/components/providers/language-provider';
import { Plus, ShoppingCart, LogOut, Star, TrendingUp, Package, Loader2, Heart, Pencil, Wallet, Camera, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SettingsModal } from '@/components/ui/settings-modal';
import { profilesAPI, productsAPI, authAPI, wishlistAPI } from '@/lib/api';
import { useAuth } from '@/components/providers/auth-provider';
import { staggerContainer, staggerItem, fadeUp, scaleIn } from '@/lib/animations';

export default function ProfilePage() {
    const router = useRouter();
    const { dict } = useLanguage();
    const { refreshUser } = useAuth();
    const [profile, setProfile] = useState<any>(null);
    const [myListings, setMyListings] = useState<any[]>([]);
    const [wishlistItems, setWishlistItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [refreshUser]); // Refresh user trigger can re-fetch profile if needed
    
    // Allow SettingsModal to trigger a refresh 
    const handleProfileSuccess = async () => {
        try {
            const [profileData] = await Promise.all([profilesAPI.getMe()]);
            setProfile(profileData);
            await refreshUser();
        } catch(e) {}
    };

    const handleLogout = () => {
        authAPI.logout();
        router.push('/login');
    };

    const handleAvatarUpdate = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;
        
        const file = e.target.files[0];
        const formData = new FormData();
        formData.append('avatar', file);

        try {
            const updatedProfile = await profilesAPI.update(formData);
            setProfile(updatedProfile);
            // Update auth state globally so Navbar reflects the new avatar
            await refreshUser();
        } catch (err) {
            console.error('Failed to update avatar', err);
            alert('تعذر تحديث الصورة الشخصية');
        }
    };

    if (loading) {
        return (
            <>
                <Navbar />
                <div className="min-h-screen pt-32 flex justify-center items-start">
                    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
                        <Loader2 className="animate-spin text-primary" size={40} />
                    </motion.div>
                </div>
                <Footer />
            </>
        );
    }

    if (!profile) return null;

    const user = profile.user || {};
    const trustScore = profile.trust_score || 50;

    const statCards = [
        {
            gradient: 'bg-gradient-to-br from-primary to-green-600',
            icon: Package,
            label: dict.profile.walletBalance,
            value: `${profile.wallet_balance || 0} ${dict.currency}`,
            delay: 0.1,
        },
        {
            gradient: 'bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-800',
            icon: Star,
            iconClass: 'fill-yellow-400 text-yellow-400',
            label: dict.profile.sellerRating,
            value: profile.seller_rating || 0,
            isRating: true,
            delay: 0.2,
        },
        {
            gradient: 'bg-white dark:bg-slate-800',
            icon: TrendingUp,
            iconBg: 'bg-blue-100 dark:bg-blue-900/30',
            iconColor: 'text-blue-600 dark:text-blue-400',
            label: 'إجمالي المبيعات',
            value: profile.total_sales || 0,
            light: true,
            delay: 0.3,
        },
        {
            gradient: 'bg-white dark:bg-slate-800',
            icon: Package,
            iconBg: 'bg-orange-100 dark:bg-orange-900/30',
            iconColor: 'text-orange-600 dark:text-orange-400',
            label: 'الإعلانات النشطة',
            value: myListings.filter(i => i.status === 'active').length,
            light: true,
            delay: 0.4,
        },
    ];

    return (
        <>
            <Navbar />
            <main className="pt-24 pb-12 min-h-screen px-4 sm:px-6 lg:px-8">
                <div className="max-w-6xl mx-auto">
                    <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
                        {/* Sidebar */}
                        <motion.div
                            className="md:col-span-1"
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                        >
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 sticky top-24 relative">
                                {/* Settings Trigger */}
                                <motion.button
                                    whileHover={{ rotate: 90 }}
                                    transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                                    onClick={() => setIsSettingsOpen(true)}
                                    className="absolute top-4 left-4 p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-full transition-colors z-10"
                                >
                                    <Settings size={22} />
                                </motion.button>
                                
                                {/* User Info */}
                                <div className="flex flex-col items-center mb-6 pb-6 border-b border-slate-200 dark:border-slate-700 mt-2">
                                    <motion.div
                                        initial={{ scale: 0.7, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ type: 'spring', stiffness: 280, damping: 18, delay: 0.2 }}
                                        whileHover={{ scale: 1.06 }}
                                        className="w-20 h-20 bg-slate-200 dark:bg-slate-700 rounded-full mb-4 border-4 border-primary overflow-hidden cursor-pointer ring-2 ring-transparent hover:ring-primary/40 transition-all relative group"
                                        onClick={() => document.getElementById('avatar-upload')?.click()}
                                    >
                                        <img
                                            src={profile.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                                            alt="avatar"
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Camera size={20} className="text-white" />
                                        </div>
                                    </motion.div>
                                    <input 
                                        type="file" 
                                        id="avatar-upload" 
                                        className="hidden" 
                                        accept="image/*"
                                        onChange={handleAvatarUpdate}
                                    />
                                    <motion.h3
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 }}
                                        className="font-bold text-lg mb-1 text-center"
                                    >
                                        {user.first_name} {user.last_name || ''} (@{user.username})
                                    </motion.h3>
                                    <motion.p
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.35 }}
                                        className="text-slate-500 dark:text-slate-400 text-sm"
                                    >
                                        {profile.city || 'العنوان غير محدد'}
                                    </motion.p>

                                    {/* Trust Score */}
                                    <div className="mt-4 w-full">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">نقاط الثقة</span>
                                            <motion.span
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: 0.7 }}
                                                className="text-sm font-black text-primary"
                                            >
                                                {trustScore}%
                                            </motion.span>
                                        </div>
                                        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full bg-gradient-to-r from-primary to-green-400 rounded-full"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${trustScore}%` }}
                                                transition={{ duration: 1.2, ease: 'easeOut', delay: 0.5 }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Navigation */}
                                <motion.div
                                    className="space-y-2"
                                    variants={staggerContainer}
                                    initial="hidden"
                                    animate="visible"
                                >
                                    {[
                                        { icon: Plus, bg: 'bg-primary-100 dark:bg-primary-900/30 group-hover:bg-primary', label: `${dict.profile.myListings}`, badge: myListings.length },
                                        { icon: ShoppingCart, bg: 'bg-blue-100 dark:bg-blue-900/30 group-hover:bg-blue-500', label: dict.profile.myPurchases },
                                        { icon: Heart, bg: 'bg-red-100 dark:bg-red-900/30 group-hover:bg-red-500', label: 'المفضلة', badge: wishlistItems.length },
                                    ].map((item, i) => (
                                        <motion.button
                                            key={i}
                                            variants={staggerItem}
                                            whileHover={{ x: -4 }}
                                            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                            className="w-full text-right p-3 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl text-sm font-bold flex items-center gap-3 transition-colors group"
                                        >
                                            <div className={`${item.bg} group-hover:text-white p-2 rounded-lg transition-colors`}>
                                                <item.icon size={16} />
                                            </div>
                                            {item.label}
                                            {item.badge !== undefined && (
                                                <motion.span
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    transition={{ type: 'spring', stiffness: 400, delay: 0.5 + i * 0.1 }}
                                                    className="text-xs bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full"
                                                >
                                                    {item.badge}
                                                </motion.span>
                                            )}
                                        </motion.button>
                                    ))}
                                    <motion.button
                                        variants={staggerItem}
                                        whileHover={{ x: -4 }}
                                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                        onClick={handleLogout}
                                        className="w-full text-right p-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-sm font-bold flex items-center gap-3 transition-colors group"
                                    >
                                        <div className="bg-red-100 dark:bg-red-900/30 group-hover:bg-red-500 group-hover:text-white p-2 rounded-lg transition-colors">
                                            <LogOut size={16} />
                                        </div>
                                        {dict.profile.logout}
                                    </motion.button>
                                </motion.div>
                            </div>
                        </motion.div>

                        {/* Main Content */}
                        <motion.div
                            className="md:col-span-2 space-y-6"
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
                        >
                            <h2 className="text-2xl md:text-3xl font-bold">{dict.profile.accountStats}</h2>

                            {/* Stats Grid */}
                            <div className="grid sm:grid-cols-2 gap-6">
                                {/* Wallet */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                                    className="bg-gradient-to-br from-primary to-green-600 p-6 rounded-2xl text-white shadow-lg cursor-default"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <motion.div
                                            whileHover={{ rotate: 10, scale: 1.1 }}
                                            className="bg-white/20 p-3 rounded-xl backdrop-blur-sm"
                                        >
                                            <Package size={24} />
                                        </motion.div>
                                    </div>
                                    <p className="text-sm opacity-90 mb-2">{dict.profile.walletBalance}</p>
                                    <p className="text-3xl font-black">
                                        {profile.wallet_balance || 0} <span className="text-base">{dict.currency}</span>
                                    </p>
                                    <Link href="/payment">
                                        <motion.button
                                            whileHover={{ scale: 1.04 }}
                                            whileTap={{ scale: 0.96 }}
                                            className="mt-4 w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all border border-white/10"
                                        >
                                            <Wallet size={16} />
                                            {dict.profile.topUpWallet}
                                        </motion.button>
                                    </Link>
                                </motion.div>

                                {/* Seller Rating */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                                    className="bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-800 p-6 rounded-2xl text-white border border-slate-700 shadow-lg cursor-default"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <motion.div
                                            whileHover={{ rotate: -10, scale: 1.1 }}
                                            className="bg-white/10 p-3 rounded-xl backdrop-blur-sm"
                                        >
                                            <Star className="fill-yellow-400 text-yellow-400" size={24} />
                                        </motion.div>
                                    </div>
                                    <p className="text-sm opacity-90 mb-2">{dict.profile.sellerRating}</p>
                                    <div className="flex items-center gap-3">
                                        <p className="text-3xl font-black">{profile.seller_rating || 0}</p>
                                        <div className="flex gap-0.5">
                                            {[1, 2, 3, 4, 5].map((i) => (
                                                <motion.div
                                                    key={i}
                                                    initial={{ opacity: 0, scale: 0 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ type: 'spring', stiffness: 400, delay: 0.3 + i * 0.05 }}
                                                >
                                                    <Star
                                                        size={16}
                                                        className={i <= Math.round(Number(profile.seller_rating || 0)) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-600'}
                                                    />
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Total Sales */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                                    className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 cursor-default"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <motion.div whileHover={{ rotate: 8 }} className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-xl">
                                            <TrendingUp className="text-blue-600 dark:text-blue-400" size={24} />
                                        </motion.div>
                                    </div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">إجمالي المبيعات</p>
                                    <p className="text-3xl font-black text-slate-900 dark:text-white">{profile.total_sales || 0}</p>
                                </motion.div>

                                {/* Active Listings */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 }}
                                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                                    className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 cursor-default"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <motion.div whileHover={{ rotate: -8 }} className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-xl">
                                            <Package className="text-orange-600 dark:text-orange-400" size={24} />
                                        </motion.div>
                                    </div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">الإعلانات النشطة</p>
                                    <p className="text-3xl font-black text-slate-900 dark:text-white">{myListings.filter(i => i.status === 'active').length}</p>
                                </motion.div>
                            </div>

                            {/* My Listings */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700"
                            >
                                <h3 className="font-bold text-lg mb-4">{dict.profile.myListings} ({myListings.length})</h3>
                                {myListings.length > 0 ? (
                                    <motion.div
                                        className="space-y-3"
                                        variants={staggerContainer}
                                        initial="hidden"
                                        animate="visible"
                                    >
                                        {myListings.slice(0, 5).map((item, i) => (
                                            <motion.div
                                                key={item.id || i}
                                                variants={staggerItem}
                                                whileHover={{ x: -4, backgroundColor: 'rgba(0,0,0,0.02)' }}
                                                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                                                className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                            >
                                                <div
                                                    className="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
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
                                                <div className={`px-2 py-1 rounded text-xs font-bold ${item.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                                                    {item.status === 'active' ? 'نشط' : item.status}
                                                </div>
                                                <motion.button
                                                    onClick={() => router.push(`/product/edit/${item.id}`)}
                                                    whileHover={{ scale: 1.15, color: 'var(--color-primary, #16a34a)' }}
                                                    whileTap={{ scale: 0.9 }}
                                                    className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                    title="تعديل الإعلان"
                                                >
                                                    <Pencil size={16} />
                                                </motion.button>
                                            </motion.div>
                                        ))}
                                    </motion.div>
                                ) : (
                                    <p className="text-slate-500 text-sm py-4 text-center">لا توجد إعلانات حتى الآن</p>
                                )}
                            </motion.div>

                            {/* Wishlist */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6 }}
                                className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700"
                            >
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                    <motion.span
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                                    >
                                        <Heart size={20} className="text-red-500" />
                                    </motion.span>
                                    المفضلة ({wishlistItems.length})
                                </h3>
                                {wishlistItems.length > 0 ? (
                                    <motion.div
                                        className="space-y-3"
                                        variants={staggerContainer}
                                        initial="hidden"
                                        animate="visible"
                                    >
                                        {wishlistItems.map((item: any, i: number) => (
                                            <motion.div
                                                key={item.id || i}
                                                variants={staggerItem}
                                                whileHover={{ x: -4 }}
                                                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                                                className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                                            >
                                                <div className="flex-1 flex items-center gap-3" onClick={() => router.push(`/product/${item.id}`)}>
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
                                                <motion.button
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        try {
                                                            await wishlistAPI.toggle(item.id);
                                                            setWishlistItems(prev => prev.filter(w => w.id !== item.id));
                                                        } catch (err) {
                                                            console.error(err);
                                                        }
                                                    }}
                                                    whileHover={{ scale: 1.2 }}
                                                    whileTap={{ scale: 0.85 }}
                                                    transition={{ type: 'spring', stiffness: 400 }}
                                                    className="text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors"
                                                    title="إزالة من المفضلة"
                                                >
                                                    <Heart size={16} fill="currentColor" />
                                                </motion.button>
                                            </motion.div>
                                        ))}
                                    </motion.div>
                                ) : (
                                    <p className="text-slate-500 text-sm py-4 text-center">لسه مضفتش حاجة للمفضلة ❤️</p>
                                )}
                            </motion.div>

                            {/* Quick Action */}
                            <Link href="/sell">
                                <motion.button
                                    whileHover={{ scale: 1.02, boxShadow: '0 8px 24px rgba(22,163,74,0.3)' }}
                                    whileTap={{ scale: 0.97 }}
                                    transition={{ type: 'spring', stiffness: 360, damping: 22 }}
                                    className="w-full bg-primary hover:bg-primary-700 text-white py-4 rounded-xl font-bold shadow-md flex items-center justify-center gap-2"
                                >
                                    <Plus size={20} />
                                    أضف منتج جديد
                                </motion.button>
                            </Link>
                        </motion.div>
                    </div>
                </div>
             </main>
            <Footer />
            <SettingsModal 
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                userProfile={profile}
                onSuccess={handleProfileSuccess}
            />
        </>
    );
}
