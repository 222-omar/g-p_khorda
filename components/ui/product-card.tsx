'use client';

import Link from 'next/link';
import { Product } from '@/lib/types';
import { Clock, Heart, MapPin, BadgeCheck, MessageCircle, Edit3, Trash2, User, Tag } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/components/providers/language-provider';
import { wishlistAPI, productsAPI } from '@/lib/api';
import { useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';

const categoryLabels: Record<string, { label: string; color: string; bg: string }> = {
    scrap_metals: { label: 'خردة ومعادن', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800' },
    electronics: { label: 'إلكترونيات وأجهزة', color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800' },
    furniture: { label: 'أثاث وديكور', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800' },
    cars: { label: 'سيارات للبيع', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800' },
    real_estate: { label: 'عقارات', color: 'text-purple-700 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800' },
    books: { label: 'كتب', color: 'text-teal-700 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-900/30 border-teal-200 dark:border-teal-800' },
    other: { label: 'أخرى', color: 'text-slate-700 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800' },
};

// ── Arabic relative time ──
function timeAgo(dateStr?: string): string | null {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;

    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return 'منذ لحظات';
    if (seconds < 120) return 'منذ دقيقة';
    if (seconds < 3600) return `منذ ${Math.floor(seconds / 60)} دقيقة`;
    if (seconds < 7200) return 'منذ ساعة';
    if (seconds < 86400) return `منذ ${Math.floor(seconds / 3600)} ساعات`;
    if (seconds < 172800) return 'منذ يوم';
    if (seconds < 2592000) return `منذ ${Math.floor(seconds / 86400)} أيام`;
    if (seconds < 5184000) return 'منذ شهر';
    if (seconds < 31536000) return `منذ ${Math.floor(seconds / 2592000)} أشهر`;
    if (seconds < 63072000) return 'منذ سنة';
    return `منذ ${Math.floor(seconds / 31536000)} سنوات`;
}

interface ProductCardProps {
    product: Product;
    isWishlisted?: boolean;
    onWishlistChange?: (productId: string, isWishlisted: boolean) => void;
    isLoggedIn?: boolean;
    /** If true, the wishlist heart button is hidden (product owner can't wishlist their own product) */
    isOwner?: boolean;
}

export function ProductCard({
    product,
    isWishlisted = false,
    onWishlistChange,
    isLoggedIn = false,
    isOwner = false,
}: ProductCardProps) {
    const { dict } = useLanguage();
    const catInfo = categoryLabels[product?.category] || categoryLabels.other;
    const [wishlisted, setWishlisted] = useState(isWishlisted);
    const [toggling, setToggling] = useState(false);
    
    // Safely get auth context
    let isAdmin = false;
    try {
        const auth = useAuth();
        isAdmin = auth.isAdmin;
    } catch {
        // Ignore if not in context
    }

    const relativeTime = timeAgo(product?.createdAt);

    const handleToggleWishlist = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isLoggedIn || toggling || isOwner) return;

        setToggling(true);
        try {
            const result = await wishlistAPI.toggle(parseInt(product.id));
            setWishlisted(result.is_wishlisted);
            onWishlistChange?.(product.id, result.is_wishlisted);
        } catch (err) {
            console.error('Error toggling wishlist:', err);
        } finally {
            setToggling(false);
        }
    };

    const showWishlistBtn = isLoggedIn && !isOwner && !isAdmin;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.25 }}
            className="group relative bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 border border-slate-100 dark:border-slate-700/60 flex flex-col h-full"
        >
            {/* Absolute Link overlay for broad click target without HTML violations */}
            <Link href={`/product/${product.id}`} className="absolute inset-0 z-0" aria-label={`View ${product.title}`} />

            {/* Wishlist button */}
            {showWishlistBtn && (
                <motion.button
                    onClick={handleToggleWishlist}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.88 }}
                    className={`absolute top-3 left-3 z-20 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 shadow-sm ${
                        wishlisted
                            ? 'bg-red-500 text-white scale-110'
                            : 'bg-white/80 dark:bg-slate-800/80 backdrop-blur-md text-slate-400 hover:text-red-500 hover:bg-white'
                    }`}
                    disabled={toggling}
                    title={wishlisted ? 'إزالة من المفضلة' : 'أضف للمفضلة'}
                >
                    <Heart size={16} fill={wishlisted ? 'currentColor' : 'none'} />
                </motion.button>
            )}

            {/* Image Section */}
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-700 pointer-events-none z-10">
                <img
                    src={product.image || 'https://images.unsplash.com/photo-1562989108-7261a8ef1fdb'}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-500 ease-out"
                />

                {/* Auction badge & Sold badge */}
                <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
                    {product.isAuction && (
                        <div className="bg-orange-500/90 backdrop-blur-md text-white text-[11px] px-2.5 py-1 rounded-full font-bold shadow-md flex items-center gap-1">
                            <Clock size={11} />
                            {dict.dashboard.activeAuction}
                        </div>
                    )}
                    {product.status === 'sold' && (
                        <div className="bg-red-600/90 backdrop-blur-md text-white text-[11px] px-2.5 py-1 rounded-full font-bold shadow-md flex items-center gap-1">
                            <Tag size={11} />
                            تم البيع
                        </div>
                    )}
                </div>

                {/* Category badge */}
                <div className="absolute bottom-3 right-3">
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border backdrop-blur-md ${catInfo.bg} ${catInfo.color}`}>
                        {catInfo.label}
                    </span>
                </div>

                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>

            {/* Content Section */}
            <div className="flex-1 flex flex-col p-4 pointer-events-none z-10">
                <h3 className="font-bold text-[15px] mb-2 line-clamp-1 leading-relaxed group-hover:text-primary transition-colors duration-200" title={product.title}>
                    {product.title}
                </h3>

                <div className="flex justify-between items-end mb-4">
                    {/* Price */}
                    <div className="flex flex-col">
                        <div className="flex items-baseline gap-1">
                            <span className="text-primary font-black text-xl leading-none">
                                {Number(product.price).toLocaleString()}
                            </span>
                            <span className="text-slate-400 text-xs font-semibold">{dict.currency}</span>
                        </div>
                    </div>

                    {/* Time & Location */}
                    <div className="flex flex-col items-end gap-1.5 pl-1">
                        {relativeTime && (
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1 font-medium">
                                <Clock size={10} className="flex-shrink-0" />
                                {relativeTime}
                            </span>
                        )}
                        {product.location && (
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1 font-medium max-w-[100px] truncate">
                                <MapPin size={10} className="flex-shrink-0" />
                                <span className="truncate">{product.location}</span>
                            </span>
                        )}
                    </div>
                </div>

                {/* Seller Footer */}
                <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between pointer-events-auto">
                    {product.seller?.id ? (
                        <Link href={`/user/${product.seller.id}`} className="flex items-center gap-2 max-w-[70%] group/seller">
                            {product.seller.avatar_url ? (
                                <img src={product.seller.avatar_url} alt={product.seller.name} className="w-8 h-8 rounded-full object-cover group-hover/seller:ring-2 ring-primary transition-all" />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 flex-shrink-0 group-hover/seller:text-primary transition-colors">
                                    <User size={14} />
                                </div>
                            )}
                            <div className="flex items-center gap-1 truncate">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate group-hover/seller:text-primary transition-colors">
                                    {product.seller.name || 'مستخدم'}
                                </span>
                                {product.seller.is_verified && (
                                    <BadgeCheck size={14} className="text-blue-500 flex-shrink-0" title="بائع موثوق" />
                                )}
                            </div>
                        </Link>
                    ) : (
                        <div className="flex items-center gap-2 max-w-[70%]">
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 flex-shrink-0">
                                <User size={14} />
                            </div>
                            <div className="flex items-center gap-1 truncate">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">مستخدم</span>
                            </div>
                        </div>
                    )}
                    
                    {/* Actions Area */}
                    {isAdmin ? (
                        <div className="flex gap-1">
                            <button 
                                onClick={async (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (window.confirm('هل أنت متأكد من حذف المنتج؟')) {
                                        try {
                                            await productsAPI.delete(product.id);
                                            window.location.reload();
                                        } catch (err) {
                                            console.error('Failed to delete product', err);
                                            alert('حدث خطأ أثناء الحذف');
                                        }
                                    }
                                }}
                                className="p-1.5 text-xs bg-red-50 text-red-500 dark:bg-red-500/10 rounded-lg hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center"
                                title="حذف"
                            >
                                <Trash2 size={14} />
                            </button>
                            <button 
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    window.location.href = '/admin-dashboard';
                                }}
                                className="p-1.5 text-xs bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10 rounded-lg hover:bg-emerald-500 hover:text-white transition-colors flex items-center justify-center"
                                title="تعديل"
                            >
                                <Edit3 size={14} />
                            </button>
                        </div>
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors" title="تواصل مع البائع">
                            <MessageCircle size={14} />
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
