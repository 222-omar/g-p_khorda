'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { useLanguage } from '@/components/providers/language-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { Loader2, Save, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { productsAPI } from '@/lib/api';

export default function EditProductPage() {
    const router = useRouter();
    const params = useParams();
    const productId = params.id as string;
    const { dict } = useLanguage();
    const { user, loading: authLoading } = useAuth();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [existingImages, setExistingImages] = useState<{ id: number; image: string }[]>([]);

    const [formData, setFormData] = useState({
        title: '',
        price: '',
        category: '',
        condition: 'good',
        description: '',
        location: '',
        phone_number: '',
    });

    // Load product data
    useEffect(() => {
        if (!productId) return;

        const loadProduct = async () => {
            try {
                const product = await productsAPI.get(productId);
                setFormData({
                    title: product.title || '',
                    price: product.price?.toString() || '',
                    category: product.category || '',
                    condition: product.condition || 'good',
                    description: product.description || '',
                    location: product.location || '',
                    phone_number: product.phone_number || '',
                });
                setExistingImages(product.images || []);
            } catch (err) {
                console.error('Failed to load product:', err);
                setError('فشل في تحميل بيانات المنتج');
            } finally {
                setLoading(false);
            }
        };

        loadProduct();
    }, [productId]);

    // Redirect if not authenticated
    if (!authLoading && !user) {
        router.push('/login');
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!formData.title.trim()) { setError('يرجى إدخال اسم المنتج'); return; }
        if (!formData.price || Number(formData.price) <= 0) { setError('يرجى إدخال سعر صحيح'); return; }
        if (!formData.category) { setError('يرجى اختيار القسم'); return; }
        if (!formData.location.trim()) { setError('يرجى إدخال الموقع'); return; }

        setSubmitting(true);

        try {
            await productsAPI.update(productId, {
                title: formData.title,
                price: formData.price,
                category: formData.category,
                condition: formData.condition,
                description: formData.description,
                location: formData.location,
                phone_number: formData.phone_number,
            });

            setSuccess(true);
            setTimeout(() => {
                router.push(`/product/${productId}`);
            }, 1000);
        } catch (err: any) {
            console.error('Error updating product:', err);
            setError(err.message || 'حدث خطأ في تحديث الإعلان');
            setSubmitting(false);
        }
    };

    if (authLoading || loading) {
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
                        {/* Header */}
                        <div className="mb-8">
                            <div className="flex items-center gap-3 mb-4">
                                <button
                                    onClick={() => router.back()}
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                                >
                                    <ArrowRight size={20} />
                                </button>
                                <h2 className="text-2xl md:text-3xl font-bold">تعديل الإعلان</h2>
                            </div>

                            {/* Existing Images Preview */}
                            {existingImages.length > 0 && (
                                <div className="grid grid-cols-4 gap-2 mt-4">
                                    {existingImages.map((img) => (
                                        <div key={img.id} className="aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                                            <img src={img.image} alt="" className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {success && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl"
                            >
                                <p className="text-green-700 dark:text-green-400 text-sm font-bold text-center">
                                    ✅ تم تحديث الإعلان بنجاح! جاري التحويل...
                                </p>
                            </motion.div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Title */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
                                    {dict.addItem.productName}
                                </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder={dict.addItem.productNamePlaceholder}
                                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white dark:bg-slate-900"
                                />
                            </div>

                            {/* Price + Category */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
                                        {dict.addItem.expectedPrice}
                                    </label>
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
                                    </label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white dark:bg-slate-900"
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

                            {/* Condition */}
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

                            {/* Location */}
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

                            {/* Description */}
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

                            {/* Error */}
                            {error && (
                                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                                    <p className="text-red-600 dark:text-red-400 text-sm text-center">{error}</p>
                                </div>
                            )}

                            {/* Buttons */}
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => router.back()}
                                    className="flex-1 border-2 border-slate-300 dark:border-slate-700 py-4 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting || success}
                                    className="flex-1 bg-primary hover:bg-primary-700 text-white py-4 rounded-xl font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {submitting && <Loader2 className="animate-spin" size={20} />}
                                    {submitting ? 'جار الحفظ...' : (
                                        <>
                                            <Save size={18} />
                                            حفظ التعديلات
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
