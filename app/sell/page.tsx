'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { useLanguage } from '@/components/providers/language-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { Camera, Sparkles, Upload, X, Loader2, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { productsAPI, classifyAPI } from '@/lib/api';

export default function SellPage() {
    const router = useRouter();
    const { dict } = useLanguage();
    const [step, setStep] = useState(1);
    const [uploadedImages, setUploadedImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        price: '',
        category: '',
        condition: 'good',
        description: '',
        location: '',
        phone_number: '',
        is_auction: false,
        auction_end_time: '',
    });
    const { user, loading: authLoading } = useAuth();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [classifying, setClassifying] = useState(false);
    const [aiCategory, setAiCategory] = useState<{ category: string; category_label: string; confidence: number; detected_class: string | null } | null>(null);

    // Redirect if not authenticated
    if (!authLoading && !user) {
        router.push('/login?redirect=/sell');
        return null;
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        handleFiles(files);
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        handleFiles(files);
    };

    const handleFiles = (files: File[]) => {
        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        setUploadedImages(prev => [...prev, ...imageFiles]);

        imageFiles.forEach((file) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (e.target?.result) {
                    setImagePreviews((prev) => [...prev, e.target!.result as string]);
                }
            };
            reader.readAsDataURL(file);
        });

        // Auto-classify the first image uploaded
        if (imageFiles.length > 0 && uploadedImages.length === 0) {
            setClassifying(true);
            setAiCategory(null);
            classifyAPI.classifyImage(imageFiles[0])
                .then((result) => {
                    setAiCategory(result);
                    if (result.category && result.category !== 'other') {
                        setFormData(prev => ({ ...prev, category: result.category }));
                    }
                })
                .catch((err) => {
                    console.error('AI classification failed:', err);
                })
                .finally(() => {
                    setClassifying(false);
                });
        }
    };

    const removeImage = (index: number) => {
        setUploadedImages((prev) => prev.filter((_, i) => i !== index));
        setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    };

    const getCurrentLocalTime = () => {
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        return new Date(now.getTime() - offset).toISOString().slice(0, 16);
    };

    const validateStep = (currentStep: number) => {
        setError(null);
        if (currentStep === 2) {
            if (!formData.title.trim()) return 'يرجى إدخال اسم المنتج';
            if (!formData.price || Number(formData.price) <= 0) return 'يرجى إدخال سعر صحيح';
            if (!formData.category) return 'يرجى اختيار القسم';
            if (!formData.location.trim()) return 'يرجى إدخال الموقع';
            if (!formData.phone_number.trim()) return 'يرجى إدخال رقم الهاتف للتواصل';
            if (formData.is_auction) {
                if (!formData.auction_end_time) return 'يرجى تحديد وقت وتاريخ انتهاء المزاد';
                if (new Date(formData.auction_end_time) <= new Date()) {
                    return 'تاريخ الانتهاء يجب أن يكون في المستقبل';
                }
            }
            return null;
        }
        return null;
    };

    const handleNextStep = () => {
        const stepError = validateStep(step);
        if (stepError) {
            setError(stepError);
            return;
        }
        setStep(prev => prev + 1);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!formData.description.trim()) {
            setError('يرجى إضافة وصف للمنتج');
            return;
        }

        setSubmitting(true);

        try {
            const formDataToSend = new FormData();
            formDataToSend.append('title', formData.title);
            formDataToSend.append('price', formData.price);
            formDataToSend.append('category', formData.category);
            formDataToSend.append('condition', formData.condition);
            formDataToSend.append('description', formData.description);
            formDataToSend.append('location', formData.location);
            formDataToSend.append('phone_number', formData.phone_number);
            formDataToSend.append('is_auction', formData.is_auction.toString());
            if (formData.is_auction && formData.auction_end_time) {
                formDataToSend.append('auction_end_time', new Date(formData.auction_end_time).toISOString());
            }

            uploadedImages.forEach((file) => {
                formDataToSend.append('uploaded_images', file);
            });

            await productsAPI.create(formDataToSend);

            // Redirect based on product type
            if (formData.is_auction) {
                router.push('/auctions');
            } else {
                router.push('/dashboard');
            }
        } catch (err: any) {
            console.error('Error creating product:', err);
            setError(err.message || 'حدث خطأ في نشر الإعلان');
            setSubmitting(false);
        }
    };

    if (authLoading) {
        return (
            <>
                <Navbar />
                <div className="min-h-screen pt-32 flex justify-center items-start">
                    <Loader2 className="animate-spin text-primary" size={40} />
                </div>
            </>
        );
    }

    return (
        <>
            <Navbar />
            <main className="pt-24 pb-12 min-h-screen px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl mx-auto">
                    <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="mb-8">
                            <h2 className="text-2xl md:text-3xl font-bold mb-2 text-center">{dict.addItem.title}</h2>
                            <div className="flex items-center justify-center gap-2 mt-6">
                                {[1, 2, 3].map((s) => (
                                    <div
                                        key={s}
                                        className={`h-2 rounded-full transition-all ${s <= step ? 'w-12 bg-primary' : 'w-8 bg-slate-200 dark:bg-slate-700'}`}
                                    />
                                ))}
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <AnimatePresence mode="wait">
                                {step === 1 && (
                                    <motion.div
                                        key="step1"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-6"
                                    >
                                        <div
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            onDrop={handleDrop}
                                            className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all ${isDragging ? 'border-primary bg-primary-50 dark:bg-primary-900/20' : 'border-slate-300 dark:border-slate-700 hover:border-primary'}`}
                                        >
                                            <input
                                                type="file"
                                                multiple
                                                accept="image/*"
                                                onChange={handleFileInput}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            />
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="bg-slate-100 dark:bg-slate-700 p-4 rounded-full">
                                                    {isDragging ? <Upload className="text-primary" size={32} /> : <Camera className="text-slate-400" size={32} />}
                                                </div>
                                                <div>
                                                    <p className="font-bold mb-1">{dict.addItem.uploadImages}</p>
                                                    <p className="text-sm text-slate-500 dark:text-slate-400">اسحب الصور هنا أو اضغط للاختيار</p>
                                                </div>
                                            </div>
                                        </div>
                                        {imagePreviews.length > 0 && (
                                            <div className="grid grid-cols-3 gap-3">
                                                {imagePreviews.map((img, index) => (
                                                    <div key={index} className="relative aspect-square rounded-xl overflow-hidden group">
                                                        <img src={img} alt={`Upload ${index + 1}`} className="w-full h-full object-cover" />
                                                        <button
                                                            type="button"
                                                            onClick={() => removeImage(index)}
                                                            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {error && (
                                            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                                                <p className="text-red-600 dark:text-red-400 text-sm text-center">{error}</p>
                                            </div>
                                        )}
                                        {classifying && (
                                            <div className="flex items-center justify-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                                                <Loader2 className="animate-spin text-blue-500" size={18} />
                                                <span className="text-blue-600 dark:text-blue-400 text-sm font-bold">🤖 جاري تحليل الصورة بالذكاء الاصطناعي...</span>
                                            </div>
                                        )}
                                        {aiCategory && !classifying && (
                                            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                                                <Bot className="text-green-500" size={18} />
                                                <span className="text-green-700 dark:text-green-400 text-sm font-bold">
                                                    🤖 تم التصنيف: {aiCategory.category_label} ({Math.round(aiCategory.confidence * 100)}%)
                                                </span>
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setStep(2)}
                                            disabled={imagePreviews.length === 0 || classifying}
                                            className="w-full bg-primary hover:bg-primary-700 text-white py-4 rounded-xl font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            التالي
                                        </button>
                                    </motion.div>
                                )}

                                {step === 2 && (
                                    <motion.div
                                        key="step2"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-4"
                                    >
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">{dict.addItem.productName}</label>
                                            <input
                                                type="text"
                                                value={formData.title}
                                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                                placeholder={dict.addItem.productNamePlaceholder}
                                                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white dark:bg-slate-900"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">{dict.addItem.expectedPrice}</label>
                                                <input
                                                    type="number"
                                                    value={formData.price}
                                                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                                    placeholder="٠٠٠"
                                                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white dark:bg-slate-900"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
                                                    {dict.addItem.category}
                                                    {aiCategory && (
                                                        <span className="mr-2 text-green-600 dark:text-green-400 text-[10px]">🤖 AI</span>
                                                    )}
                                                </label>
                                                <select
                                                    value={formData.category}
                                                    onChange={(e) => {
                                                        setFormData({ ...formData, category: e.target.value });
                                                    }}
                                                    className={`w-full border rounded-xl p-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white dark:bg-slate-900 ${aiCategory && formData.category === aiCategory.category
                                                            ? 'border-green-300 dark:border-green-700'
                                                            : 'border-slate-200 dark:border-slate-700'
                                                        }`}
                                                >
                                                    <option value="">اختر التصنيف</option>
                                                    <option value="scrap_metals">خردة ومعادن</option>
                                                    <option value="electronics">إلكترونيات وأجهزة</option>
                                                    <option value="furniture">أثاث وديكور</option>
                                                    <option value="cars">سيارات للبيع</option>
                                                    <option value="real_estate">عقارات</option>
                                                    <option value="books">كتب</option>
                                                    <option value="other">أخرى</option>
                                                </select>
                                            </div>
                                        </div>


                                        {/* Phone Number */}
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">رقم الهاتف للتواصل</label>
                                            <input
                                                type="tel"
                                                value={formData.phone_number}
                                                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                                                placeholder="مثلاً: 010xxxxxxxx"
                                                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white dark:bg-slate-900"
                                            />
                                        </div>

                                        {/* Listing Type Toggle */}
                                        <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-700">
                                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">نوع الإعلان</label>
                                            <div className="flex bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, is_auction: false })}
                                                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${!formData.is_auction
                                                        ? 'bg-primary text-white shadow-sm'
                                                        : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
                                                        }`}
                                                >
                                                    بيع مباشر
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, is_auction: true })}
                                                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${formData.is_auction
                                                        ? 'bg-primary text-white shadow-sm'
                                                        : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
                                                        }`}
                                                >
                                                    مزاد علني
                                                </button>
                                            </div>

                                            {/* Auction Dates */}
                                            {formData.is_auction && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    className="mt-4"
                                                >
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">تاريخ ووقت انتهاء المزاد</label>
                                                        <input
                                                            type="datetime-local"
                                                            value={formData.auction_end_time}
                                                            onChange={(e) => setFormData({ ...formData, auction_end_time: e.target.value })}
                                                            min={getCurrentLocalTime()}
                                                            className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white dark:bg-slate-900 ltr-input"
                                                        />
                                                        <p className="text-xs text-slate-400 mt-2">⏱️ المزاد سيبدأ فوراً بعد نشر الإعلان</p>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">الموقع</label>
                                            <input
                                                type="text"
                                                value={formData.location}
                                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                                placeholder="مثلاً: القاهرة، مدينة نصر"
                                                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white dark:bg-slate-900"
                                            />
                                        </div>
                                        {error && (
                                            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                                                <p className="text-red-600 dark:text-red-400 text-sm text-center">{error}</p>
                                            </div>
                                        )}
                                        <div className="flex gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setStep(1)}
                                                className="flex-1 border-2 border-slate-300 dark:border-slate-700 py-4 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                                            >
                                                السابق
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleNextStep}
                                                className="flex-1 bg-primary hover:bg-primary-700 text-white py-4 rounded-xl font-bold transition-all shadow-md hover:shadow-lg"
                                            >
                                                التالي
                                            </button>
                                        </div>
                                    </motion.div>
                                )}

                                {step === 3 && (
                                    <motion.div
                                        key="step3"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-4"
                                    >
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">الحالة</label>
                                            <select
                                                value={formData.condition}
                                                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                                                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white dark:bg-slate-900"
                                            >
                                                <option value="new">جديد</option>
                                                <option value="like-new">كالجديد</option>
                                                <option value="good">جيد</option>
                                                <option value="fair">مقبول</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">الوصف</label>
                                            <textarea
                                                value={formData.description}
                                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                placeholder="اكتب وصف مفصل للمنتج..."
                                                rows={5}
                                                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white dark:bg-slate-900 resize-none"
                                            />
                                        </div>
                                        <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-xl flex items-start gap-3 border border-primary-200 dark:border-primary-800">
                                            <Sparkles className="text-primary flex-shrink-0 mt-1" size={20} />
                                            <p className="text-xs text-primary-800 dark:text-primary-300 leading-relaxed">
                                                {dict.addItem.aiNotice}
                                            </p>
                                        </div>
                                        {error && (
                                            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                                                <p className="text-red-600 dark:text-red-400 text-sm text-center">{error}</p>
                                            </div>
                                        )}
                                        <div className="flex gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setStep(2)}
                                                className="flex-1 border-2 border-slate-300 dark:border-slate-700 py-4 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                                            >
                                                السابق
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={submitting}
                                                className="flex-1 bg-primary hover:bg-primary-700 text-white py-4 rounded-xl font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                            >
                                                {submitting && <Loader2 className="animate-spin" size={20} />}
                                                {submitting ? 'جار النشر...' : dict.addItem.publish}
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </form>
                    </div>
                </div>
            </main >
            <Footer />
        </>
    );
}
