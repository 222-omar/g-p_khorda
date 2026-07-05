'use client';

import { useState } from 'react';
import { Filter, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { useLanguage } from '@/components/providers/language-provider';

interface SidebarFiltersProps {
    currentFilters: {
        category?: string;
        min_price?: number;
        max_price?: number;
        condition?: string;
    };
    onFilterChange: (filters: {
        category?: string;
        min_price?: number;
        max_price?: number;
        condition?: string;
    }) => void;
}

export function SidebarFilters({ currentFilters, onFilterChange }: SidebarFiltersProps) {
    const [isOpen, setIsOpen] = useState(false);
    const { isRtl, dict } = useLanguage();

    const categories = [
        { id: 'appliances', label: dict.categories?.appliances || (isRtl ? 'أجهزة منزلية' : 'Home Appliances') },
        { id: 'scrap_metals', label: dict.categories?.scrap || (isRtl ? 'خردة ومعادن' : 'Scrap & Metals') },
        { id: 'electronics', label: dict.categories?.electronics || (isRtl ? 'إلكترونيات وأجهزة' : 'Electronics & Devices') },
        { id: 'furniture', label: dict.categories?.furniture || (isRtl ? 'أثاث وديكور' : 'Furniture & Decor') },
        { id: 'cars', label: dict.categories?.cars || (isRtl ? 'سيارات للبيع' : 'Cars for Sale') },
        { id: 'real_estate', label: dict.categories?.real_estate || (isRtl ? 'عقارات' : 'Real Estate') },
        { id: 'books', label: dict.categories?.books || (isRtl ? 'كتب' : 'Books') },
        { id: 'other', label: dict.categories?.other || (isRtl ? 'أخرى' : 'Other') },
    ];

    const priceRanges = [
        { id: 'under-1000', label: isRtl ? `أقل من 1000 ${dict.currency}` : `Under 1000 ${dict.currency}`, min: 0, max: 1000 },
        { id: '1000-5000', label: isRtl ? `1000 - 5000 ${dict.currency}` : `1000 - 5000 ${dict.currency}`, min: 1000, max: 5000 },
        { id: '5000-10000', label: isRtl ? `5000 - 10000 ${dict.currency}` : `5000 - 10000 ${dict.currency}`, min: 5000, max: 10000 },
        { id: 'over-10000', label: isRtl ? `أكثر من 10000 ${dict.currency}` : `Over 10000 ${dict.currency}`, min: 10000, max: Infinity },
    ];

    const conditions = [
        { id: 'new', label: dict.product?.conditionNew || (isRtl ? 'جديد' : 'New') },
        { id: 'like-new', label: dict.product?.conditionLikeNew || (isRtl ? 'كالجديد' : 'Like New') },
        { id: 'good', label: dict.product?.conditionGood || (isRtl ? 'جيد' : 'Good') },
        { id: 'fair', label: dict.product?.conditionFair || (isRtl ? 'مقبول' : 'Fair') },
    ];

    // Derived state from props
    const selectedCategory = currentFilters?.category || null;
    const selectedCondition = currentFilters?.condition || null;
    const selectedPriceRangeId = priceRanges.find(
        (r) => r.min === currentFilters?.min_price && (r.max === Infinity ? !currentFilters?.max_price : r.max === currentFilters?.max_price)
    )?.id || null;

    const toggleCategory = (id: string) => {
        onFilterChange({
            ...currentFilters,
            category: selectedCategory === id ? undefined : id,
        });
    };

    const toggleCondition = (id: string) => {
        onFilterChange({
            ...currentFilters,
            condition: selectedCondition === id ? undefined : id,
        });
    };

    const togglePriceRange = (id: string | null) => {
        const range = priceRanges.find((r) => r.id === id);
        onFilterChange({
            ...currentFilters,
            min_price: range ? range.min : undefined,
            max_price: range && range.max !== Infinity ? range.max : undefined,
        });
    };

    const clearFilters = () => {
        onFilterChange({});
    };

    const hasActiveFilters = !!(selectedCategory || selectedPriceRangeId || selectedCondition);

    const filterContent = (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-4">
                <div className="flex items-center gap-2">
                    <Filter size={22} className="text-[#1F8A3B]" strokeWidth={2.5} />
                    <h3 className="font-black text-xl text-slate-900 dark:text-white">{isRtl ? 'تصفية النتائج' : 'Filter Results'}</h3>
                </div>
                {hasActiveFilters && (
                    <button
                        onClick={clearFilters}
                        className="text-xs text-red-500 hover:text-white transition-all font-bold bg-red-50 hover:bg-red-500 dark:bg-red-900/20 dark:hover:bg-red-500 px-4 py-2 rounded-full shadow-sm"
                    >
                        {isRtl ? 'مسح الكل ✕' : 'Clear All ✕'}
                    </button>
                )}
            </div>

            {/* Active Filters Tags */}
            {hasActiveFilters && (
                <div className="flex flex-wrap gap-2 pb-2">
                    <AnimatePresence>
                        {selectedCategory && (
                            <motion.span
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1F8A3B]/10 text-[#1F8A3B] text-[13px] font-bold rounded-full"
                            >
                                {categories.find((c) => c.id === selectedCategory)?.label}
                                <button onClick={() => toggleCategory(selectedCategory)} className="hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full p-0.5 transition-colors">
                                    <X size={14} strokeWidth={3} />
                                </button>
                            </motion.span>
                        )}
                        {selectedPriceRangeId && (
                            <motion.span
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1F8A3B]/10 text-[#1F8A3B] text-[13px] font-bold rounded-full"
                            >
                                {priceRanges.find((p) => p.id === selectedPriceRangeId)?.label}
                                <button onClick={() => togglePriceRange(null)} className="hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full p-0.5 transition-colors">
                                    <X size={14} strokeWidth={3} />
                                </button>
                            </motion.span>
                        )}
                        {selectedCondition && (
                            <motion.span
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1F8A3B]/10 text-[#1F8A3B] text-[13px] font-bold rounded-full"
                            >
                                {conditions.find((c) => c.id === selectedCondition)?.label}
                                <button onClick={() => toggleCondition(selectedCondition)} className="hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full p-0.5 transition-colors">
                                    <X size={14} strokeWidth={3} />
                                </button>
                            </motion.span>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Categories */}
            <div className="bg-[#F8FAF9] dark:bg-slate-800/40 p-5 rounded-[24px] border border-black/[0.03] dark:border-white/[0.05]">
                <h4 className="font-bold text-[15px] mb-4 text-slate-800 dark:text-slate-200">{dict.categories?.titleHighlight || (isRtl ? 'التصنيفات' : 'Categories')}</h4>
                <div className="space-y-2">
                    {categories.map((category) => (
                        <label
                            key={category.id}
                            className={`flex items-center p-3 rounded-[16px] cursor-pointer group transition-all ${selectedCategory === category.id
                                ? 'bg-[#1F8A3B]/10 shadow-sm'
                                : 'hover:bg-white dark:hover:bg-slate-800'
                                }`}
                        >
                            <div className="flex items-center gap-3 w-full">
                                <div className={`w-5 h-5 rounded-[6px] border-2 flex items-center justify-center transition-all ${selectedCategory === category.id ? 'border-[#1F8A3B] bg-[#1F8A3B]' : 'border-slate-300 dark:border-slate-600 group-hover:border-[#1F8A3B]/50'}`}>
                                    {selectedCategory === category.id && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                </div>
                                <input
                                    type="checkbox"
                                    checked={selectedCategory === category.id}
                                    onChange={() => toggleCategory(category.id)}
                                    className="hidden"
                                />
                                <span className={`text-[14px] transition-colors ${selectedCategory === category.id ? 'text-[#1F8A3B] font-bold' : 'font-medium text-slate-600 dark:text-slate-300 group-hover:text-[#1F8A3B]'
                                    }`}>
                                    {category.label}
                                </span>
                            </div>
                        </label>
                    ))}
                </div>
            </div>

            {/* Price Range */}
            <div className="bg-[#F8FAF9] dark:bg-slate-800/40 p-5 rounded-[24px] border border-black/[0.03] dark:border-white/[0.05]">
                <h4 className="font-bold text-[15px] mb-4 text-slate-800 dark:text-slate-200">{isRtl ? 'النطاق السعري' : 'Price Range'}</h4>
                <div className="space-y-2">
                    {priceRanges.map((range) => (
                        <label
                            key={range.id}
                            className={`flex items-center p-3 rounded-[16px] cursor-pointer group transition-all ${selectedPriceRangeId === range.id
                                ? 'bg-[#1F8A3B]/10 shadow-sm'
                                : 'hover:bg-white dark:hover:bg-slate-800'
                                }`}
                            onClick={(e) => {
                                e.preventDefault();
                                togglePriceRange(selectedPriceRangeId === range.id ? null : range.id);
                            }}
                        >
                            <div className="flex items-center gap-3 w-full">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selectedPriceRangeId === range.id ? 'border-[#1F8A3B]' : 'border-slate-300 dark:border-slate-600 group-hover:border-[#1F8A3B]/50'}`}>
                                    {selectedPriceRangeId === range.id && <div className="w-2.5 h-2.5 rounded-full bg-[#1F8A3B]" />}
                                </div>
                                <input
                                    type="radio"
                                    name="price-range"
                                    checked={selectedPriceRangeId === range.id}
                                    readOnly
                                    className="hidden"
                                />
                                <span className={`text-[14px] transition-colors ${selectedPriceRangeId === range.id ? 'text-[#1F8A3B] font-bold' : 'font-medium text-slate-600 dark:text-slate-300 group-hover:text-[#1F8A3B]'
                                    }`}>
                                    {range.label}
                                </span>
                            </div>
                        </label>
                    ))}
                </div>
            </div>

            {/* Condition */}
            <div className="bg-[#F8FAF9] dark:bg-slate-800/40 p-5 rounded-[24px] border border-black/[0.03] dark:border-white/[0.05]">
                <h4 className="font-bold text-[15px] mb-4 text-slate-800 dark:text-slate-200">{dict.product?.condition || (isRtl ? 'الحالة' : 'Condition')}</h4>
                <div className="space-y-2">
                    {conditions.map((condition) => (
                        <label
                            key={condition.id}
                            className={`flex items-center p-3 rounded-[16px] cursor-pointer group transition-all ${selectedCondition === condition.id
                                ? 'bg-[#1F8A3B]/10 shadow-sm'
                                : 'hover:bg-white dark:hover:bg-slate-800'
                                }`}
                        >
                            <div className="flex items-center gap-3 w-full">
                                <div className={`w-5 h-5 rounded-[6px] border-2 flex items-center justify-center transition-all ${selectedCondition === condition.id ? 'border-[#1F8A3B] bg-[#1F8A3B]' : 'border-slate-300 dark:border-slate-600 group-hover:border-[#1F8A3B]/50'}`}>
                                    {selectedCondition === condition.id && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                </div>
                                <input
                                    type="checkbox"
                                    checked={selectedCondition === condition.id}
                                    onChange={() => toggleCondition(condition.id)}
                                    className="hidden"
                                />
                                <span className={`text-[14px] transition-colors ${selectedCondition === condition.id ? 'text-[#1F8A3B] font-bold' : 'font-medium text-slate-600 dark:text-slate-300 group-hover:text-[#1F8A3B]'
                                    }`}>
                                    {condition.label}
                                </span>
                            </div>
                        </label>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile Filter Button */}
            <div className="lg:hidden mb-4">
                <button
                    onClick={() => setIsOpen(true)}
                    className="w-full flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-3 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                    <Filter size={18} />
                    {isRtl ? 'تصفية النتائج' : 'Filter Results'}
                </button>
            </div>

            {/* Desktop Sidebar */}
            <div className="hidden lg:block w-full bg-white dark:bg-slate-800 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.06)] rounded-[30px] p-6">
                {filterContent}
            </div>

            {/* Mobile Drawer */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                        />

                        {/* Drawer */}
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25 }}
                            className="fixed top-0 right-0 h-full w-80 bg-white dark:bg-slate-900 z-50 lg:hidden overflow-y-auto shadow-2xl"
                        >
                            <div className="p-6">
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="absolute top-4 left-4 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
                                >
                                    <X size={20} />
                                </button>
                                {filterContent}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
