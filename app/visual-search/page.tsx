'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { useLanguage } from '@/components/providers/language-provider';
import { visualSearchAPI } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, Search, Loader2, Sparkles, X, ImageIcon, Eye } from 'lucide-react';

interface SearchResult {
    id: number;
    title: string;
    price: string;
    category: string;
    condition: string;
    primary_image: string | null;
    owner_name: string;
    seller: {
        id: number;
        name: string;
        avatar_url: string | null;
        is_verified: boolean;
    };
    similarity_score: number;
    location: string;
    is_auction: boolean;
}

const categoryLabels: Record<string, string> = {
    scrap_metals: 'خردة ومعادن',
    electronics: 'إلكترونيات',
    furniture: 'أثاث وديكور',
    cars: 'سيارات',
    real_estate: 'عقارات',
    books: 'كتب',
    other: 'أخرى',
};

const conditionLabels: Record<string, string> = {
    new: 'جديد',
    'like-new': 'شبه جديد',
    good: 'جيد',
    fair: 'مقبول',
};

export default function VisualSearchPage() {
    const { dict } = useLanguage();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [searched, setSearched] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = useCallback((file: File) => {
        if (!file.type.startsWith('image/')) {
            setError('يرجى اختيار ملف صورة صالح (JPG, PNG, WebP)');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setError('حجم الصورة كبير جداً. الحد الأقصى 10 ميجابايت');
            return;
        }
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setError(null);
        setResults([]);
        setSearched(false);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileSelect(file);
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFileSelect(file);
    }, [handleFileSelect]);

    const handleSearch = async () => {
        if (!selectedFile) return;
        setLoading(true);
        setError(null);
        try {
            const data = await visualSearchAPI.searchByImage(selectedFile);
            setResults(data.results?.slice(0, 3) || []);
            setSearched(true);
        } catch (err: any) {
            setError(err.message || 'حدث خطأ أثناء البحث');
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleClear = () => {
        setSelectedFile(null);
        setPreviewUrl(null);
        setResults([]);
        setError(null);
        setSearched(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <>
            <Navbar />
            <main className="pt-24 pb-16 min-h-screen px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">

                    {/* ── Page Header ── */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="text-center mb-10"
                    >
                        <div className="inline-flex items-center gap-3 mb-3">
                            <div className="bg-primary/10 text-primary p-3 rounded-2xl">
                                <Camera size={28} />
                            </div>
                            <h1 className="text-3xl md:text-4xl font-black">
                                البحث بالصورة
                            </h1>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-base max-w-lg mx-auto">
                            ارفع صورة والذكاء الاصطناعي هيوصفها ويلاقيلك أقرب المنتجات المشابهة
                        </p>
                    </motion.div>

                    {/* ── Upload Area ── */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                    >
                        <div
                            onDrop={handleDrop}
                            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                            onDragLeave={() => setIsDragOver(false)}
                            onClick={() => !previewUrl && fileInputRef.current?.click()}
                            className={`
                                relative rounded-2xl border-2 border-dashed transition-all duration-300
                                ${previewUrl
                                    ? 'border-primary/30 bg-white dark:bg-slate-800/50'
                                    : isDragOver
                                        ? 'border-primary bg-primary/5 dark:bg-primary/10'
                                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-primary/50 hover:bg-primary/[0.02] cursor-pointer'
                                }
                            `}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleInputChange}
                                className="hidden"
                            />

                            {previewUrl ? (
                                <div className="p-6">
                                    <div className="flex flex-col sm:flex-row items-center gap-6">
                                        {/* Preview Image */}
                                        <div className="relative group">
                                            <img
                                                src={previewUrl}
                                                alt="الصورة المرفوعة"
                                                className="w-48 h-48 object-contain rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm"
                                            />
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleClear(); }}
                                                className="absolute -top-2 -left-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>

                                        {/* Info + Actions */}
                                        <div className="flex-1 text-center sm:text-right">
                                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                                                {selectedFile?.name}
                                            </p>
                                            <p className="text-xs text-slate-400 dark:text-slate-500 mb-5">
                                                {((selectedFile?.size || 0) / 1024).toFixed(0)} كيلوبايت
                                            </p>
                                            <div className="flex flex-col sm:flex-row gap-3 justify-center sm:justify-start">
                                                <motion.button
                                                    whileHover={{ scale: 1.03 }}
                                                    whileTap={{ scale: 0.97 }}
                                                    onClick={(e) => { e.stopPropagation(); handleSearch(); }}
                                                    disabled={loading}
                                                    className="bg-primary hover:bg-primary/90 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition-all"
                                                >
                                                    {loading ? (
                                                        <>
                                                            <Loader2 size={18} className="animate-spin" />
                                                            جاري التحليل...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Search size={18} />
                                                            ابحث عن منتجات مشابهة
                                                        </>
                                                    )}
                                                </motion.button>
                                                <motion.button
                                                    whileHover={{ scale: 1.03 }}
                                                    whileTap={{ scale: 0.97 }}
                                                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                                                    className="border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-5 py-3 rounded-xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all flex items-center justify-center gap-2"
                                                >
                                                    <Upload size={16} />
                                                    تغيير الصورة
                                                </motion.button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-16 px-6 text-center">
                                    <motion.div
                                        animate={{ y: [0, -6, 0] }}
                                        transition={{ duration: 2.5, repeat: Infinity }}
                                        className="inline-block"
                                    >
                                        <div className="bg-primary/10 text-primary p-5 rounded-2xl inline-block mb-4">
                                            <ImageIcon size={40} />
                                        </div>
                                    </motion.div>
                                    <p className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                                        اسحب صورة هنا أو اضغط للاختيار
                                    </p>
                                    <p className="text-sm text-slate-400 dark:text-slate-500">
                                        يدعم JPG, PNG, WebP — حتى 10 ميجابايت
                                    </p>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* ── Error ── */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                className="mt-4 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 text-sm text-center"
                            >
                                ⚠️ {error}
                            </motion.div>
                        )}
                    </AnimatePresence>


                    {/* ── Results (Top 3) ── */}
                    <AnimatePresence>
                        {results.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.4, delay: 0.15 }}
                                className="mt-10"
                            >
                                {/* Section Header */}
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 p-2.5 rounded-xl">
                                        <Eye size={22} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black">أقرب المنتجات</h3>
                                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">أعلى 3 منتجات تشابهاً مع صورتك</p>
                                    </div>
                                    <div className="flex-1 h-px bg-gradient-to-l from-transparent to-slate-200 dark:to-slate-700 ml-2" />
                                </div>

                                {/* Cards Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                                    {results.map((product, index) => (
                                        <motion.div
                                            key={product.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.35, delay: index * 0.1 }}
                                        >
                                            <Link href={`/product/${product.id}`}>
                                                <div className="group relative bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl border border-slate-100 dark:border-slate-700/60 transition-all hover:-translate-y-1 duration-300">
                                                    {/* Image */}
                                                    <div className="relative h-48 overflow-hidden bg-slate-100 dark:bg-slate-700">
                                                        {product.primary_image ? (
                                                            <img
                                                                src={product.primary_image}
                                                                alt={product.title}
                                                                className="w-full h-full object-cover group-hover:scale-[1.07] transition-transform duration-500"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <ImageIcon size={40} className="text-slate-300 dark:text-slate-600" />
                                                            </div>
                                                        )}
                                                        {/* Similarity Badge */}
                                                        <div className={`
                                                            absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-bold text-white shadow-md
                                                            ${product.similarity_score >= 0.7
                                                                ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                                                                : product.similarity_score >= 0.5
                                                                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                                                                    : 'bg-gradient-to-r from-slate-400 to-slate-500'
                                                            }
                                                        `}>
                                                            تشابه {Math.round(product.similarity_score * 100)}%
                                                        </div>
                                                        {/* Category */}
                                                        <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-md">
                                                            {categoryLabels[product.category] || product.category}
                                                        </div>
                                                        {/* Hover overlay */}
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>

                                                    {/* Content */}
                                                    <div className="p-4">
                                                        <h4 className="font-bold text-sm line-clamp-1 mb-2.5 group-hover:text-primary transition-colors">
                                                            {product.title}
                                                        </h4>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-primary font-black text-lg">
                                                                {Number(product.price).toLocaleString()} <span className="text-xs text-slate-400">{dict.currency}</span>
                                                            </span>
                                                            <span className="text-[11px] bg-primary/10 text-primary font-bold px-2.5 py-1 rounded-lg group-hover:bg-primary group-hover:text-white transition-all">
                                                                {conditionLabels[product.condition] || product.condition}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                                                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                                                {product.seller?.name || product.owner_name}
                                                            </span>
                                                            <span className="text-[11px] text-slate-400">
                                                                📍 {product.location}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ── No Results ── */}
                    <AnimatePresence>
                        {searched && results.length === 0 && !loading && !error && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-center py-16 mt-8"
                            >
                                <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 2.5, repeat: Infinity }}>
                                    <ImageIcon size={56} className="mx-auto text-slate-300 dark:text-slate-600" />
                                </motion.div>
                                <p className="text-slate-500 text-lg font-medium mt-4">
                                    لم يتم العثور على منتجات مشابهة
                                </p>
                                <p className="text-slate-400 text-sm mt-2">
                                    جرب صورة مختلفة أو أوضح
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                </div>
            </main>
            <Footer />
        </>
    );
}
