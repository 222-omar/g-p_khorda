'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { useLanguage } from '@/components/providers/language-provider';
import { Plus, ShoppingCart, LogOut, Star, TrendingUp, Package, Loader2, Heart, Pencil, Wallet, Camera, Settings, Eye, ArrowLeft, Calendar } from 'lucide-react';
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
    }, [refreshUser]);

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
            await refreshUser();
        } catch (err) {
            console.error('Failed to update avatar', err);
            alert(dict.profile.avatarUpdateFailed);
        }
    };

    if (loading) {
        return (
            <>
                <Navbar />
                <div className="min-h-screen pt-32 flex justify-center items-start bg-[#FCFDFB] dark:bg-[#0e1015]">
                    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
                        <Loader2 className="animate-spin text-[#1F8A3B]" size={40} />
                    </motion.div>
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
            <main className="pt-32 pb-20 min-h-screen relative overflow-hidden bg-[#FCFDFB] dark:bg-[#0e1015]">
                {/* Background Effects */}
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-green-500/[0.03] rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/[0.03] rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay pointer-events-none" />
                
                <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    
                    {/* Header */}
                    <motion.div 
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="mb-12"
                    >
                        <h1 className="text-[32px] md:text-[40px] font-black text-slate-900 dark:text-white mb-3">{dict.profile.accountStatsTitle}</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-[16px] font-medium">{dict.profile.accountStatsSubtitle}</p>
                    </motion.div>

                    <div className="grid lg:grid-cols-12 gap-8">
                        {/* Sidebar (4 cols) */}
                        <motion.div
                            className="lg:col-span-4"
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                        >
                            <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-3xl p-8 rounded-[32px] border border-white/40 dark:border-slate-700/50 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] sticky top-32">
                                {/* Settings Trigger */}
                                <motion.button
                                    whileHover={{ rotate: 90 }}
                                    transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                                    onClick={() => setIsSettingsOpen(true)}
                                    className="absolute top-6 left-6 p-2 text-slate-400 hover:text-[#1F8A3B] hover:bg-[#1F8A3B]/10 rounded-full transition-colors z-10"
                                >
                                    <Settings size={22} />
                                </motion.button>
                                
                                {/* User Info */}
                                <div className="flex flex-col items-center mb-8">
                                    <div className="relative mb-6">
                                        <svg className="absolute -inset-2 w-[116px] h-[116px] -rotate-90">
                                            <circle cx="58" cy="58" r="56" className="stroke-slate-100 dark:stroke-slate-700/50" strokeWidth="4" fill="none" />
                                            <motion.circle 
                                                cx="58" cy="58" r="56" 
                                                className="stroke-[#1F8A3B]" 
                                                strokeWidth="4" 
                                                fill="none" 
                                                strokeDasharray="351"
                                                initial={{ strokeDashoffset: 351 }}
                                                animate={{ strokeDashoffset: 351 - (351 * trustScore) / 100 }}
                                                transition={{ duration: 1.5, ease: "easeOut" }}
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                        <motion.div
                                            initial={{ scale: 0.7, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ type: 'spring', stiffness: 280, damping: 18, delay: 0.2 }}
                                            whileHover={{ scale: 1.06 }}
                                            className="w-[100px] h-[100px] bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden border-[4px] border-white dark:border-slate-800 shadow-xl cursor-pointer relative group"
                                            onClick={() => document.getElementById('avatar-upload')?.click()}
                                        >
                                            <img
                                                src={profile.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                                                alt="avatar"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Camera size={24} className="text-white" />
                                            </div>
                                        </motion.div>
                                    </div>
                                    <input 
                                        type="file" 
                                        id="avatar-upload" 
                                        className="hidden" 
                                        accept="image/*"
                                        onChange={handleAvatarUpdate}
                                    />
                                    <h3 className="font-black text-[22px] mb-1 text-center text-slate-900 dark:text-white">
                                        {user.first_name} {user.last_name || ''}
                                    </h3>
                                    <p className="text-slate-500 font-medium text-[15px]">@{user.username}</p>
                                    
                                    <div className="mt-4 bg-slate-50 dark:bg-slate-900/50 py-2 px-4 rounded-[16px] flex items-center gap-2 border border-slate-100 dark:border-slate-700/50">
                                        <div className="w-2 h-2 rounded-full bg-[#1F8A3B]" />
                                        <span className="text-[13px] font-bold text-slate-600 dark:text-slate-300">{dict.profile.trustScore} {trustScore}%</span>
                                    </div>
                                </div>

                                {/* Navigation */}
                                <motion.div
                                    className="space-y-3"
                                    variants={staggerContainer}
                                    initial="hidden"
                                    animate="visible"
                                >
                                    {[
                                        { icon: Plus, bg: 'group-hover:bg-[#1F8A3B]/10', color: 'group-hover:text-[#1F8A3B]', label: dict.profile.myListings, badge: myListings.length },
                                        { icon: ShoppingCart, bg: 'group-hover:bg-blue-500/10', color: 'group-hover:text-blue-600', label: dict.profile.myPurchases },
                                        { icon: Heart, bg: 'group-hover:bg-red-500/10', color: 'group-hover:text-red-500', label: dict.profile.wishlist, badge: wishlistItems.length },
                                    ].map((item, i) => (
                                        <motion.button
                                            key={i}
                                            variants={staggerItem}
                                            whileHover={{ x: -4, scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            className="w-full text-right p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 hover:border-slate-200 dark:hover:border-slate-600 rounded-[20px] text-[15px] font-bold flex items-center justify-between transition-all group shadow-[0_4px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.04)]"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`bg-slate-50 dark:bg-slate-900/50 text-slate-500 ${item.bg} ${item.color} p-2.5 rounded-[12px] transition-colors`}>
                                                    <item.icon size={18} strokeWidth={2.5} />
                                                </div>
                                                <span className={`text-slate-700 dark:text-slate-200 ${item.color} transition-colors`}>{item.label}</span>
                                            </div>
                                            {item.badge !== undefined && (
                                                <motion.span
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    transition={{ type: 'spring', stiffness: 400, delay: 0.5 + i * 0.1 }}
                                                    className="text-[12px] bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-[10px] text-slate-600 dark:text-slate-300"
                                                >
                                                    {item.badge}
                                                </motion.span>
                                            )}
                                        </motion.button>
                                    ))}
                                    
                                    <motion.button
                                        variants={staggerItem}
                                        whileHover={{ x: -4, scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={handleLogout}
                                        className="w-full text-right mt-6 p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-[20px] text-[15px] font-bold flex items-center gap-3 transition-all group shadow-[0_4px_12px_rgba(239,68,68,0.05)] text-red-600 dark:text-red-400"
                                    >
                                        <div className="bg-white/50 dark:bg-black/20 text-red-500 group-hover:text-red-600 p-2.5 rounded-xl transition-colors">
                                            <LogOut size={18} strokeWidth={2.5} />
                                        </div>
                                        {dict.profile.logout}
                                    </motion.button>
                                </motion.div>
                            </div>
                        </motion.div>

                        {/* Main Content (8 cols) */}
                        <motion.div
                            className="lg:col-span-8 space-y-6"
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
                        >
                            {/* Quick Actions */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Link href="/sell" className="flex-1">
                                    <button className="w-full h-[72px] bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 hover:border-[#1F8A3B]/30 hover:bg-[#F4FBF6] dark:hover:bg-[#1F8A3B]/5 rounded-[20px] flex items-center justify-center gap-3 transition-all group shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
                                        <div className="bg-slate-50 dark:bg-slate-900/50 group-hover:bg-[#1F8A3B]/10 p-2 rounded-xl text-slate-500 dark:text-slate-400 group-hover:text-[#1F8A3B] transition-colors">
                                            <Plus size={20} strokeWidth={2.5} />
                                        </div>
                                        <span className="font-bold text-[15px] text-slate-700 dark:text-slate-200 group-hover:text-[#1F8A3B] transition-colors">{dict.profile.addListing}</span>
                                    </button>
                                </Link>
                                <Link href="/payment" className="flex-1">
                                    <button className="w-full h-[72px] bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 hover:border-blue-500/30 hover:bg-blue-50 dark:hover:bg-blue-500/5 rounded-[20px] flex items-center justify-center gap-3 transition-all group shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
                                        <div className="bg-slate-50 dark:bg-slate-900/50 group-hover:bg-blue-500/10 p-2 rounded-xl text-slate-500 dark:text-slate-400 group-hover:text-blue-500 transition-colors">
                                            <Wallet size={20} strokeWidth={2.5} />
                                        </div>
                                        <span className="font-bold text-[15px] text-slate-700 dark:text-slate-200 group-hover:text-blue-500 transition-colors">{dict.profile.topUpWallet}</span>
                                    </button>
                                </Link>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid sm:grid-cols-2 gap-4">
                                {/* Wallet */}
                                <motion.div
                                    className="bg-gradient-to-br from-[#1F8A3B] to-[#166534] p-6 rounded-[24px] text-white shadow-[0_20px_40px_-15px_rgba(31,138,59,0.3)] relative overflow-hidden group"
                                >
                                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-colors" />
                                    <div className="relative z-10">
                                        <div className="flex items-start justify-between mb-6">
                                            <div className="bg-white/20 p-4 rounded-[16px] backdrop-blur-md">
                                                <Wallet size={28} className="text-white" />
                                            </div>
                                        </div>
                                        <p className="text-[14px] text-emerald-100 font-medium mb-1">{dict.profile.walletBalance}</p>
                                        <div className="flex items-baseline gap-2 mb-6">
                                            <p className="text-[36px] font-black tracking-tight">{profile.wallet_balance || 0}</p>
                                            <span className="text-[16px] text-emerald-100 font-bold">{dict.currency}</span>
                                        </div>
                                        <Link href="/payment">
                                            <button className="w-full bg-white text-[#166534] hover:bg-emerald-50 py-3.5 rounded-[16px] font-bold text-[15px] flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                                                <Plus size={18} strokeWidth={2.5} />
                                                {dict.profile.topUpWallet}
                                            </button>
                                        </Link>
                                    </div>
                                </motion.div>

                                {/* Seller Rating */}
                                <motion.div
                                    className="bg-white dark:bg-slate-800 p-6 rounded-[24px] border border-slate-100 dark:border-slate-700/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] transition-shadow relative overflow-hidden"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="bg-orange-50 dark:bg-orange-500/10 p-4 rounded-[16px]">
                                            <Star className="fill-orange-500 text-orange-500" size={28} />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[13px] font-bold text-slate-400">{dict.profile.sellerRating}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-baseline gap-3 mb-4">
                                        <p className="text-[36px] font-black text-slate-900 dark:text-white">{profile.seller_rating || 0}</p>
                                        <p className="text-[14px] font-medium text-slate-500">{dict.profile.outOf5}</p>
                                    </div>
                                    <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-3">
                                        <motion.div
                                            className="h-full bg-orange-500 rounded-full"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${((profile.seller_rating || 0) / 5) * 100}%` }}
                                            transition={{ duration: 1, delay: 0.2 }}
                                        />
                                    </div>
                                    <p className="text-[14px] text-slate-500 font-medium">{dict.profile.basedOn} {profile.total_reviews || 0} {dict.profile.reviews}</p>
                                </motion.div>

                                {/* Total Sales */}
                                <motion.div
                                    className="bg-white dark:bg-slate-800 p-6 rounded-[24px] border border-slate-100 dark:border-slate-700/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] transition-shadow"
                                >
                                    <div className="bg-blue-50 dark:bg-blue-500/10 p-4 rounded-[16px] w-fit mb-6">
                                        <TrendingUp className="text-blue-600 dark:text-blue-400" size={28} />
                                    </div>
                                    <p className="text-[14px] font-medium text-slate-500 mb-1">{dict.profile.totalSales}</p>
                                    <p className="text-[36px] font-black text-slate-900 dark:text-white">{profile.total_sales || 0}</p>
                                </motion.div>

                                {/* Active Listings */}
                                <motion.div
                                    className="bg-white dark:bg-slate-800 p-6 rounded-[24px] border border-slate-100 dark:border-slate-700/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] transition-shadow"
                                >
                                    <div className="bg-emerald-50 dark:bg-emerald-500/10 p-4 rounded-[16px] w-fit mb-6">
                                        <Package className="text-[#1F8A3B]" size={28} />
                                    </div>
                                    <p className="text-[14px] font-medium text-slate-500 mb-1">{dict.profile.activeListings}</p>
                                    <p className="text-[36px] font-black text-slate-900 dark:text-white">{myListings.filter(i => i.status === 'active').length}</p>
                                </motion.div>
                            </div>

                            {/* Advertisements */}
                            <motion.div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-3xl p-8 rounded-[32px] border border-white/40 dark:border-slate-700/50 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)]">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="font-black text-[20px] text-slate-900 dark:text-white">{dict.profile.myListings} ({myListings.length})</h3>
                                    <Link href="/sell">
                                        <button className="text-[#1F8A3B] font-bold text-[14px] hover:bg-[#1F8A3B]/10 px-4 py-2 rounded-[12px] transition-colors">
                                            {dict.profile.addListing}
                                        </button>
                                    </Link>
                                </div>
                                
                                {myListings.length > 0 ? (
                                    <div className="grid gap-4">
                                        {myListings.slice(0, 5).map((item, i) => (
                                            <div key={item.id} className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 p-4 rounded-[24px] flex flex-col sm:flex-row items-center gap-5 hover:shadow-[0_12px_30px_rgba(0,0,0,0.04)] hover:border-slate-200 dark:hover:border-slate-600 transition-all group">
                                                <div className="w-full sm:w-[140px] h-[100px] bg-slate-50 dark:bg-slate-900 rounded-[16px] overflow-hidden flex-shrink-0 relative">
                                                    {item.images?.[0]?.image ? (
                                                        <img src={item.images[0].image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                    ) : (
                                                        <Package size={28} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-300" />
                                                    )}
                                                    <div className="absolute top-2 right-2">
                                                        <span className={`px-2.5 py-1 rounded-[10px] text-[11px] font-black backdrop-blur-md shadow-sm border ${
                                                            item.status === 'active' ? 'bg-[#F4FBF6]/95 text-[#1F8A3B] border-[#1F8A3B]/20' : 
                                                            item.status === 'pending' ? 'bg-orange-50/95 text-orange-600 border-orange-200/50' : 
                                                            item.status === 'inactive' ? 'bg-red-50/95 text-red-600 border-red-200/50' : 
                                                            item.status === 'sold' ? 'bg-blue-50/95 text-blue-600 border-blue-200/50' :
                                                            'bg-slate-50/95 text-slate-600 border-slate-200/50'
                                                        }`}>
                                                            {item.status === 'active' ? dict.profile.statusActive : item.status === 'pending' ? dict.profile.statusPending : item.status === 'inactive' ? dict.profile.statusRejected : item.status === 'sold' ? dict.profile.statusSold : item.status}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex-1 w-full text-right">
                                                    <h4 className="font-bold text-[16px] text-slate-900 dark:text-white mb-1.5 line-clamp-1 group-hover:text-[#1F8A3B] transition-colors cursor-pointer" onClick={() => router.push(`/product/${item.id}`)}>{item.title}</h4>
                                                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[13px] font-medium mb-3">
                                                        <Calendar size={14} />
                                                        {dict.profile.publishedOn} {new Date(item.created_at || Date.now()).toLocaleDateString(dict.currency === 'ج.م' ? 'ar-EG' : 'en-US')}
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <span className="font-black text-[18px] text-[#1F8A3B]">{item.price} {dict.currency}</span>
                                                        <div className="flex items-center gap-1.5 text-slate-400 text-[12px] font-bold bg-slate-50 dark:bg-slate-900/50 px-2.5 py-1 rounded-[10px] border border-slate-100 dark:border-slate-800">
                                                            <Eye size={14} />
                                                            {item.views || 0} {dict.profile.views}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex sm:flex-col gap-2 w-full sm:w-auto mt-4 sm:mt-0">
                                                    <button onClick={() => router.push(`/product/edit/${item.id}`)} className="flex-1 sm:flex-none bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 p-3 rounded-[14px] flex items-center justify-center transition-colors">
                                                        <Pencil size={18} />
                                                    </button>
                                                    <button onClick={() => router.push(`/product/${item.id}`)} className="flex-1 sm:flex-none bg-[#1F8A3B]/5 hover:bg-[#1F8A3B]/10 text-[#1F8A3B] p-3 rounded-[14px] flex items-center justify-center transition-colors">
                                                        <ArrowLeft size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 border-dashed rounded-[24px] p-10 flex flex-col items-center justify-center text-center shadow-sm">
                                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-[20px] mb-4 text-[#1F8A3B]/40">
                                            <Package size={32} />
                                        </div>
                                        <p className="text-[16px] font-bold text-slate-900 dark:text-white mb-2">{dict.profile.noListings}</p>
                                        <p className="text-[14px] font-medium text-slate-500 max-w-[250px]">{dict.profile.startSelling}</p>
                                    </div>
                                )}
                            </motion.div>

                            {/* Wishlist */}
                            <motion.div
                                className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-3xl p-8 rounded-[32px] border border-white/40 dark:border-slate-700/50 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)]"
                            >
                                <h3 className="font-black text-[20px] text-slate-900 dark:text-white mb-8 flex items-center gap-3">
                                    <div className="bg-red-50 dark:bg-red-500/10 p-2.5 rounded-[12px] text-red-500">
                                        <Heart size={20} className="fill-red-500" />
                                    </div>
                                    {dict.profile.wishlist} ({wishlistItems.length})
                                </h3>
                                {wishlistItems.length > 0 ? (
                                    <div className="grid gap-4">
                                        {wishlistItems.map((item: any, i: number) => (
                                            <div
                                                key={item.id || i}
                                                className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 p-3 rounded-[20px] flex items-center gap-4 hover:shadow-[0_12px_30px_rgba(0,0,0,0.04)] hover:border-slate-200 dark:hover:border-slate-600 transition-all cursor-pointer group"
                                                onClick={() => router.push(`/product/${item.id}`)}
                                            >
                                                <div className="w-[80px] h-[80px] bg-slate-50 dark:bg-slate-900 rounded-[14px] overflow-hidden flex-shrink-0">
                                                    {item.primary_image ? (
                                                        <img src={item.primary_image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                    ) : (
                                                        <Package size={24} className="m-auto mt-7 text-slate-300" />
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-[15px] text-slate-900 dark:text-white mb-1 group-hover:text-[#1F8A3B] transition-colors">{item.title}</h4>
                                                    <p className="font-black text-[15px] text-[#1F8A3B]">{item.price} {dict.currency}</p>
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
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    className="bg-slate-50 dark:bg-slate-900/50 hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-500 p-3 rounded-[14px] transition-colors ml-2"
                                                    title={dict.profile.removeFromWishlist}
                                                >
                                                    <Heart size={18} fill="currentColor" />
                                                </motion.button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 border-dashed rounded-[24px] p-10 flex flex-col items-center justify-center text-center shadow-sm">
                                        <div className="bg-red-50 dark:bg-red-500/10 p-4 rounded-[20px] mb-4 text-red-400">
                                            <Heart size={32} />
                                        </div>
                                        <p className="text-[16px] font-bold text-slate-900 dark:text-white mb-2">{dict.profile.noWishlist}</p>
                                        <p className="text-[14px] font-medium text-slate-500 max-w-[250px]">{dict.profile.saveAds}</p>
                                    </div>
                                )}
                            </motion.div>
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
