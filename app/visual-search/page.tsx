'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { useLanguage } from '@/components/providers/language-provider';
import { visualSearchAPI } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, Search, Loader2, Sparkles, X, ImageIcon, Eye, Zap, Target, Rocket, CheckCircle2, Scan } from 'lucide-react';

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
    const [searchStep, setSearchStep] = useState(0);
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
        setSearchStep(1);
        
        const timers = [
            setTimeout(() => setSearchStep(2), 800),
            setTimeout(() => setSearchStep(3), 1600),
            setTimeout(() => setSearchStep(4), 2400),
        ];

        try {
            const data = await visualSearchAPI.searchByImage(selectedFile);
            setResults(data.results?.slice(0, 3) || []);
            setSearched(true);
        } catch (err: any) {
            setError(err.message || 'حدث خطأ أثناء البحث');
            setResults([]);
        } finally {
            timers.forEach(clearTimeout);
            setLoading(false);
            setSearchStep(0);
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
            <main className="pt-32 pb-20 min-h-screen relative overflow-hidden bg-[#FCFDFB] dark:bg-[#0e1015]">
                {/* Subtle Radial Gradients */}
                <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-green-500/[0.03] dark:bg-green-500/[0.05] rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-emerald-500/[0.02] dark:bg-emerald-500/[0.04] rounded-full blur-[100px] pointer-events-none" />

                <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    
                    <div className="flex flex-col items-center max-w-[800px] mx-auto mb-20">
                        {/* Text & Upload Area */}
                        <div className="w-full">
                            {/* ── Page Header ── */}
                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                                className="mb-12 flex flex-col items-center text-center"
                            >
                                <h1 className="text-[36px] md:text-[48px] font-black text-slate-900 dark:text-white leading-tight flex items-center justify-center gap-4">
                                    <div className="bg-[#1F8A3B]/10 text-[#1F8A3B] p-3 rounded-[20px] shadow-sm">
                                        <Scan size={36} strokeWidth={2.5} />
                                    </div>
                                    البحث بالذكاء الاصطناعي
                                </h1>
                                <p className="text-slate-500 dark:text-slate-400 text-[18px] mt-4 max-w-lg font-medium leading-relaxed">
                                    ارفع صورة لأي منتج وسيقوم الذكاء الاصطناعي بتحليلها والعثور على أقرب المنتجات المشابهة خلال ثوانٍ.
                                </p>
                            </motion.div>

                            {/* ── Upload Card ── */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.1 }}
                                className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-3xl rounded-[32px] p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.06)] border border-white/40 dark:border-slate-700/50"
                            >
                                <div
                                    onDrop={handleDrop}
                                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                                    onDragLeave={() => setIsDragOver(false)}
                                    onClick={() => !previewUrl && fileInputRef.current?.click()}
                                    className={`
                                        relative rounded-[24px] border-2 border-dashed transition-all duration-300 h-[400px] flex flex-col items-center justify-center overflow-hidden
                                        ${previewUrl
                                            ? 'border-transparent bg-[#F4FBF6] dark:bg-[#1F8A3B]/5'
                                            : isDragOver
                                                ? 'border-[#1F8A3B] bg-[#1F8A3B]/10 shadow-[0_0_40px_rgba(31,138,59,0.15)] scale-[1.02]'
                                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-[#1F8A3B]/50 hover:bg-[#F4FBF6] dark:hover:bg-[#1F8A3B]/5 cursor-pointer'
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
                                        <div className="absolute inset-0 flex flex-col">
                                            {/* Preview Image with Scanning Animation if loading */}
                                            <div className="relative flex-1 overflow-hidden group w-full h-full">
                                                <img
                                                    src={previewUrl}
                                                    alt="الصورة المرفوعة"
                                                    className="w-full h-full object-contain p-6"
                                                />
                                                {loading && (
                                                    <motion.div 
                                                        animate={{ top: ['0%', '100%', '0%'] }}
                                                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                                        className="absolute left-0 w-full h-1 bg-[#1F8A3B] shadow-[0_0_20px_rgba(31,138,59,0.8)] z-10"
                                                    />
                                                )}
                                                {!loading && (
                                                    <div className="absolute top-4 left-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                                                            className="w-10 h-10 bg-white/90 text-slate-700 rounded-full flex items-center justify-center shadow-lg hover:bg-white hover:text-[#1F8A3B] transition-colors backdrop-blur-sm"
                                                        >
                                                            <Upload size={18} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleClear(); }}
                                                            className="w-10 h-10 bg-white/90 text-red-500 rounded-full flex items-center justify-center shadow-lg hover:bg-white hover:text-red-600 transition-colors backdrop-blur-sm"
                                                        >
                                                            <X size={18} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action Bar inside Preview */}
                                            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-t border-slate-100 dark:border-slate-700/50 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 absolute bottom-0 w-full z-20">
                                                <div className="text-right flex-1">
                                                    <p className="text-[14px] font-bold text-slate-800 dark:text-white truncate max-w-[200px]">
                                                        {selectedFile?.name}
                                                    </p>
                                                    <p className="text-[12px] text-slate-500 font-medium">
                                                        {((selectedFile?.size || 0) / 1024).toFixed(0)} كيلوبايت
                                                    </p>
                                                </div>
                                                <motion.button
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={(e) => { e.stopPropagation(); handleSearch(); }}
                                                    disabled={loading}
                                                    className="bg-gradient-to-r from-[#1F8A3B] to-[#186a2c] disabled:opacity-50 text-white px-8 h-[48px] rounded-[16px] font-bold text-[14px] shadow-[0_8px_20px_rgba(31,138,59,0.25)] flex items-center justify-center gap-2 transition-all w-full sm:w-auto"
                                                >
                                                    {loading ? (
                                                        <>
                                                            <Loader2 size={18} className="animate-spin" />
                                                            جاري التحليل...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Search size={18} strokeWidth={2.5} />
                                                            بحث
                                                        </>
                                                    )}
                                                </motion.button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center p-8 w-full h-full flex flex-col items-center justify-center">
                                            <motion.div
                                                animate={{ y: [0, -8, 0] }}
                                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                                className="bg-gradient-to-b from-[#F4FBF6] to-[#E7F5EB] dark:from-[#1F8A3B]/10 dark:to-[#1F8A3B]/5 w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-sm border border-[#1F8A3B]/10"
                                            >
                                                <Upload size={36} className="text-[#1F8A3B]" strokeWidth={2} />
                                            </motion.div>
                                            <h3 className="text-[20px] font-black text-slate-800 dark:text-white mb-2">
                                                اسحب الصورة هنا أو اضغط للرفع
                                            </h3>
                                            
                                            {/* Formats Chips */}
                                            <div className="flex gap-2 justify-center mt-6 flex-wrap">
                                                {['PNG', 'JPG', 'JPEG', 'WEBP', 'Max 10MB'].map(format => (
                                                    <span key={format} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[11px] font-bold rounded-lg border border-slate-200/60 dark:border-slate-700">
                                                        {format}
                                                    </span>
                                                ))}
                                            </div>
                                            
                                            {/* Actions */}
                                            <div className="flex flex-wrap justify-center gap-3 mt-8">
                                                <button className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 h-[48px] rounded-[16px] font-bold text-[14px] shadow-md hover:scale-105 transition-transform flex items-center gap-2">
                                                    <ImageIcon size={18} /> اختر صورة
                                                </button>
                                                <button className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-6 h-[48px] rounded-[16px] font-bold text-[14px] shadow-sm hover:scale-105 transition-transform flex items-center gap-2">
                                                    <Camera size={18} /> استخدم الكاميرا
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Search Progress Steps */}
                                <AnimatePresence>
                                    {loading && (
                                        <motion.div 
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="mt-6 border-t border-slate-100 dark:border-slate-700/50 pt-6"
                                        >
                                            <div className="flex flex-col gap-3">
                                                {[
                                                    { num: 1, text: 'جاري رفع الصورة...' },
                                                    { num: 2, text: 'تحليل الصورة بالذكاء الاصطناعي...' },
                                                    { num: 3, text: 'استخراج الميزات العميقة...' },
                                                    { num: 4, text: 'جاري البحث في قاعدة البيانات...' },
                                                ].map(step => (
                                                    <div key={step.num} className={`flex items-center gap-3 transition-opacity duration-300 ${searchStep >= step.num ? 'opacity-100' : 'opacity-30'}`}>
                                                        {searchStep > step.num ? (
                                                            <CheckCircle2 size={20} className="text-[#1F8A3B]" />
                                                        ) : searchStep === step.num ? (
                                                            <Loader2 size={20} className="animate-spin text-[#1F8A3B]" />
                                                        ) : (
                                                            <div className="w-5 h-5 rounded-full border-2 border-slate-200 dark:border-slate-700" />
                                                        )}
                                                        <span className={`text-[14px] font-bold ${searchStep === step.num ? 'text-slate-800 dark:text-white' : 'text-slate-500'}`}>
                                                            {step.text}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>

                            {/* ── AI Features ── */}
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                                className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8"
                            >
                                <div className="bg-white dark:bg-slate-800 rounded-[24px] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100 dark:border-slate-700/50 flex flex-col items-start gap-3">
                                    <div className="bg-[#F4FBF6] dark:bg-[#1F8A3B]/10 p-3 rounded-2xl text-[#1F8A3B]">
                                        <Zap size={22} />
                                    </div>
                                    <span className="font-bold text-[14px] text-slate-800 dark:text-slate-200">التعرف الذكي</span>
                                </div>
                                <div className="bg-white dark:bg-slate-800 rounded-[24px] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100 dark:border-slate-700/50 flex flex-col items-start gap-3">
                                    <div className="bg-orange-50 dark:bg-orange-500/10 p-3 rounded-2xl text-orange-500">
                                        <Target size={22} />
                                    </div>
                                    <span className="font-bold text-[14px] text-slate-800 dark:text-slate-200">دقة مطابقة عالية</span>
                                </div>
                                <div className="bg-white dark:bg-slate-800 rounded-[24px] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100 dark:border-slate-700/50 flex flex-col items-start gap-3">
                                    <div className="bg-blue-50 dark:bg-blue-500/10 p-3 rounded-2xl text-blue-500">
                                        <Rocket size={22} />
                                    </div>
                                    <span className="font-bold text-[14px] text-slate-800 dark:text-slate-200">بحث فائق السرعة</span>
                                </div>
                            </motion.div>
                        </div>
                    </div>

                    {/* ── Error ── */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                className="mt-4 p-4 rounded-[16px] bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 text-[14px] text-center font-medium"
                            >
                                ⚠️ {error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ── Results Skeleton ── */}
                    <AnimatePresence>
                        {loading && searchStep >= 2 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="mt-20 border-t border-slate-200/50 dark:border-slate-700/50 pt-16"
                            >
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="bg-white dark:bg-slate-800 rounded-[24px] p-4 shadow-sm border border-slate-100 dark:border-slate-700/50 flex flex-col h-[350px]">
                                            <div className="w-full h-48 bg-slate-100 dark:bg-slate-700 rounded-[16px] animate-pulse mb-4" />
                                            <div className="h-5 bg-slate-100 dark:bg-slate-700 rounded-md w-3/4 animate-pulse mb-3" />
                                            <div className="h-5 bg-slate-100 dark:bg-slate-700 rounded-md w-1/2 animate-pulse mb-auto" />
                                            <div className="flex justify-between mt-4">
                                                <div className="h-8 bg-slate-100 dark:bg-slate-700 rounded-lg w-1/3 animate-pulse" />
                                                <div className="h-8 bg-slate-100 dark:bg-slate-700 rounded-lg w-1/4 animate-pulse" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ── Results (Top 3) ── */}
                    <AnimatePresence>
                        {results.length > 0 && !loading && (
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.1 }}
                                className="mt-20 border-t border-slate-200/50 dark:border-slate-700/50 pt-16"
                            >
                                {/* Section Header */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-[#1F8A3B]/10 text-[#1F8A3B] p-3 rounded-[20px]">
                                            <Sparkles size={28} />
                                        </div>
                                        <div>
                                            <h3 className="text-[28px] font-black text-slate-900 dark:text-white">تطابق عالي</h3>
                                            <p className="text-slate-500 dark:text-slate-400 text-[15px] mt-1 font-medium">أعلى 3 منتجات تشابهاً مع صورتك</p>
                                        </div>
                                    </div>
                                    <div className="hidden sm:block flex-1 h-px bg-gradient-to-l from-transparent to-slate-200 dark:to-slate-700 mx-8" />
                                </div>

                                {/* Premium Cards Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                    {results.map((product, index) => (
                                        <motion.div
                                            key={product.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.4, delay: index * 0.1 }}
                                        >
                                            <Link href={`/product/${product.id}`}>
                                                <div className="group relative bg-white dark:bg-slate-800 rounded-[24px] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] border border-slate-100/80 dark:border-slate-700/50 transition-all hover:-translate-y-2 duration-300 flex flex-col h-full">
                                                    {/* Image */}
                                                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-700 rounded-t-[24px]">
                                                        {product.primary_image ? (
                                                            <img
                                                                src={product.primary_image}
                                                                alt={product.title}
                                                                className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-700"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <ImageIcon size={40} className="text-slate-300 dark:text-slate-600" />
                                                            </div>
                                                        )}
                                                        {/* Similarity Badge */}
                                                        <div className={`
                                                            absolute top-4 left-4 px-4 py-1.5 rounded-full text-[12px] font-bold text-white shadow-[0_4px_12px_rgba(31,138,59,0.25)] backdrop-blur-md flex items-center gap-1.5
                                                            ${product.similarity_score >= 0.7
                                                                ? 'bg-gradient-to-r from-[#1F8A3B] to-[#186a2c]'
                                                                : product.similarity_score >= 0.5
                                                                    ? 'bg-gradient-to-r from-orange-500 to-red-500'
                                                                    : 'bg-slate-800/80'
                                                            }
                                                        `}>
                                                            <Target size={14} />
                                                            مطابقة {Math.round(product.similarity_score * 100)}%
                                                        </div>
                                                        
                                                        {/* Hover overlay */}
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>

                                                    {/* Content */}
                                                    <div className="p-6 flex-1 flex flex-col">
                                                        <h4 className="font-bold text-[16px] line-clamp-2 mb-4 group-hover:text-[#1F8A3B] transition-colors text-slate-800 dark:text-white leading-relaxed">
                                                            {product.title}
                                                        </h4>
                                                        
                                                        <div className="flex items-end justify-between mt-auto pt-4 border-t border-slate-100 dark:border-slate-700/50">
                                                            <div>
                                                                <span className="text-[12px] text-slate-400 block mb-1 font-medium">السعر</span>
                                                                <div className="flex items-baseline gap-1">
                                                                    <span className="text-[#1F8A3B] font-black text-[22px] leading-none">
                                                                        {Number(product.price).toLocaleString()}
                                                                    </span>
                                                                    <span className="text-slate-400 text-[13px] font-bold">{dict.currency}</span>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="text-[11px] bg-[#F4FBF6] dark:bg-[#1F8A3B]/10 text-[#1F8A3B] font-bold px-3 py-1.5 rounded-[10px] inline-block mb-1.5">
                                                                    {conditionLabels[product.condition] || product.condition}
                                                                </span>
                                                                <p className="text-[11px] text-slate-400 font-medium">
                                                                    {categoryLabels[product.category] || product.category}
                                                                </p>
                                                            </div>
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
                                className="text-center py-20 mt-12 bg-white/50 dark:bg-slate-800/50 backdrop-blur-lg rounded-[32px] border border-slate-200/50 dark:border-slate-700/50"
                            >
                                <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 2.5, repeat: Infinity }} className="bg-slate-100 dark:bg-slate-800 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <ImageIcon size={40} className="text-slate-400 dark:text-slate-500" />
                                </motion.div>
                                <p className="text-slate-800 dark:text-white text-[20px] font-black mb-2">
                                    لم يتم العثور على منتجات مشابهة
                                </p>
                                <p className="text-slate-500 text-[15px] font-medium">
                                    جرب رفع صورة من زاوية مختلفة أو بإضاءة أوضح
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
