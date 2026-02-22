'use client';

import Link from 'next/link';
import { Product } from '@/lib/types';
import { Clock, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/components/providers/language-provider';
import { wishlistAPI } from '@/lib/api';
import { useState } from 'react';

const categoryLabels: Record<string, { label: string; color: string; bg: string }> = {
    scrap_metals: { label: 'خردة ومعادن', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800' },
    electronics: { label: 'إلكترونيات وأجهزة', color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800' },
    furniture: { label: 'أثاث وديكور', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800' },
    cars: { label: 'سيارات للبيع', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800' },
    real_estate: { label: 'عقارات', color: 'text-purple-700 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800' },
    books: { label: 'كتب', color: 'text-teal-700 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-900/30 border-teal-200 dark:border-teal-800' },
    other: { label: 'أخرى', color: 'text-slate-700 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800' },
};

interface ProductCardProps {
    product: Product;
    isWishlisted?: boolean;
    onWishlistChange?: (productId: string, isWishlisted: boolean) => void;
    isLoggedIn?: boolean;
}

export function ProductCard({ product, isWishlisted = false, onWishlistChange, isLoggedIn = false }: ProductCardProps) {
    const { dict } = useLanguage();
    const catInfo = categoryLabels[product.category] || categoryLabels.other;
    const [wishlisted, setWishlisted] = useState(isWishlisted);
    const [toggling, setToggling] = useState(false);

    const handleToggleWishlist = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isLoggedIn || toggling) return;

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

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.25 }}
            className="group relative bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-slate-100 dark:border-slate-700/60"
        >
            {/* Wishlist heart button - positioned absolutely, OUTSIDE the Link */}
            {isLoggedIn && (
                <button
                    onClick={handleToggleWishlist}
                    className={`absolute top-3 left-3 z-20 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 shadow-md ${wishlisted
                        ? 'bg-red-500 text-white scale-110'
                        : 'bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-400 hover:text-red-500 hover:bg-white'
                        }`}
                    disabled={toggling}
                >
                    <Heart size={16} fill={wishlisted ? 'currentColor' : 'none'} />
                </button>
            )}

            <Link href={`/product/${product.id}`}>
                {/* Image */}
                <div className="relative h-52 overflow-hidden bg-slate-100 dark:bg-slate-700">
                    <img
                        src={product.image}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-500 ease-out"
                    />

                    {/* Top badges row */}
                    <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
                        {/* Auction Badge */}
                        {product.isAuction && (
                            <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-[11px] px-2.5 py-1 rounded-full font-bold shadow-md flex items-center gap-1">
                                <Clock size={11} />
                                {dict.dashboard.activeAuction}
                            </div>
                        )}
                    </div>

                    {/* Category badge - bottom left of image */}
                    <div className="absolute bottom-3 right-3">
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border backdrop-blur-sm ${catInfo.bg} ${catInfo.color}`}>
                            {catInfo.label}
                        </span>
                    </div>

                    {/* Subtle gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>

                {/* Content */}
                <div className="p-4">
                    <h3 className="font-bold text-[15px] mb-3 line-clamp-2 leading-relaxed group-hover:text-primary transition-colors duration-200">
                        {product.title}
                    </h3>

                    <div className="flex justify-between items-end">
                        <div className="flex flex-col">
                            <span className="text-[11px] text-slate-400 font-medium mb-0.5">السعر</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-primary font-black text-xl leading-none">
                                    {product.price.toLocaleString()}
                                </span>
                                <span className="text-slate-400 text-xs font-semibold">{dict.currency}</span>
                            </div>
                        </div>

                        <div className="bg-primary/10 text-primary text-xs font-bold px-3 py-1.5 rounded-lg group-hover:bg-primary group-hover:text-white transition-all duration-200">
                            عرض التفاصيل
                        </div>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}
