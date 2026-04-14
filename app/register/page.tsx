'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/components/providers/language-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { Leaf, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { authAPI } from '@/lib/api';

export default function RegisterPage() {
    const router = useRouter();
    const { dict } = useLanguage();
    const { refreshUser } = useAuth();

    // Form state
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        password2: '',
        first_name: '',
        last_name: '',
        city: '',
        phone: ''
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string[] | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        // Basic validation
        if (formData.password !== formData.password2) {
            setError(['كلمات المرور غير متطابقة']);
            setLoading(false);
            return;
        }

        try {
            await authAPI.register(formData);
            // Successful registration - authAPI.register automatically sets tokens
            // Refresh the auth context so the user state is populated
            await refreshUser();
            
            setLoading(false); // Clear loading state immediately upon success
            setSuccessMessage('تم إنشاء الحساب بنجاح! جاري تحويلك...');
            setTimeout(() => {
                router.push('/login');
            }, 2000);
        } catch (err: any) {
            console.error('Detailed Registration Error:', err);
            let errorList: string[] = [];
            
            // Extract and map specific errors from Django JSON payload
            if (err.response?.data && typeof err.response.data === 'object') {
                const arabicMap: Record<string, string> = {
                    'A user with that username already exists.': 'اسم المستخدم هذا مسجل مسبقاً',
                    'user with this email already exists.': 'هذا البريد الإلكتروني مسجل بالفعل',
                    'Enter a valid email address.': 'يرجى إدخال بريد إلكتروني صحيح',
                    'This password is too short.': 'كلمة المرور قصيرة جداً',
                    'The password is too similar to the username.': 'كلمة المرور متشابهة جداً مع اسم المستخدم',
                    'This password is too common.': 'كلمة المرور شائعة جداً (سهلة التخمين)',
                    'This password is entirely numeric.': 'يجب ألا تتكون كلمة المرور من أرقام فقط',
                    'This field is required.': 'مطلوب إدخال هذا الحقل',
                    'This field may not be blank.': 'لا يمكن ترك هذا الحقل فارغاً'
                };
                
                const fieldMap: Record<string, string> = {
                    username: 'اسم المستخدم',
                    email: 'البريد الإلكتروني',
                    password: 'كلمة المرور',
                    password2: 'تأكيد كلمة المرور',
                    phone: 'رقم الهاتف',
                    first_name: 'الاسم الأول',
                    last_name: 'الاسم الأخير',
                    city: 'المدينة'
                };

                for (const [field, messages] of Object.entries(err.response.data)) {
                    const msgArray = Array.isArray(messages) ? messages : [messages];
                    
                    msgArray.forEach((msg: any) => {
                        let text = String(msg);
                        // Translate exact matches
                        for (const [eng, ara] of Object.entries(arabicMap)) {
                            if (text.includes(eng)) {
                                text = text.replace(eng, ara);
                            }
                        }
                        
                        if (field === 'non_field_errors' || field === 'detail') {
                            errorList.push(text);
                        } else {
                            const arabicField = fieldMap[field] || field;
                            errorList.push(`${arabicField}: ${text}`);
                        }
                    });
                }
            }
            
            // Fallback generic error formatting if mapped empty
            if (errorList.length === 0) {
                const rawMsg = err.message;
                if (rawMsg && rawMsg.includes(' | ')) {
                    errorList = rawMsg.split(' | ');
                } else {
                    errorList = [rawMsg || 'فشل إنشاء الحساب. تأكد من صحة البيانات.'];
                }
            }
            
            setError(errorList);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-black overflow-hidden relative">
            {/* Background blobs */}
            <motion.div
                className="absolute top-10 right-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"
                animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
                className="absolute bottom-10 left-10 w-80 h-80 bg-green-400/10 rounded-full blur-3xl pointer-events-none"
                animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
            />
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-lg relative z-10"
            >
                {/* Logo */}
                <Link href="/" className="flex items-center justify-center gap-2 mb-8">
                    <motion.div
                        whileHover={{ scale: 1.1, rotate: 8 }}
                        transition={{ type: 'spring', stiffness: 360, damping: 18 }}
                        className="bg-primary p-3 rounded-xl text-white"
                    >
                        <Leaf size={28} />
                    </motion.div>
                    <span className="text-2xl font-bold">
                        <span className="text-primary">4</span>Sale
                    </span>
                </Link>

                {/* Register Card */}
                <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl">
                    <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center">إنشاء حساب جديد</h2>

                    <AnimatePresence mode="wait">
                        {error && error.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: -10, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                                transition={{ duration: 0.3 }}
                                className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3"
                            >
                                <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
                                <div className="text-red-600 dark:text-red-400 text-sm font-bold flex flex-col gap-1 w-full">
                                    {error.map((errItem, idx) => (
                                        <p key={idx}>• {errItem}</p>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                        
                        {successMessage && (
                            <motion.div
                                initial={{ opacity: 0, y: -10, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                                transition={{ duration: 0.3 }}
                                className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-3"
                            >
                                <CheckCircle2 size={20} className="text-green-500 shrink-0" />
                                <div className="text-green-600 dark:text-green-400 text-md font-bold w-full">
                                    {successMessage}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* First Name */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    الاسم الأول
                                </label>
                                <input
                                    type="text"
                                    name="first_name"
                                    value={formData.first_name}
                                    onChange={handleChange}
                                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white dark:bg-slate-900 transition-all"
                                />
                            </div>

                            {/* Last Name */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    الاسم الأخير
                                </label>
                                <input
                                    type="text"
                                    name="last_name"
                                    value={formData.last_name}
                                    onChange={handleChange}
                                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white dark:bg-slate-900 transition-all"
                                />
                            </div>
                        </div>

                        {/* Username */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                اسم المستخدم
                            </label>
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                placeholder="username"
                                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white dark:bg-slate-900 transition-all"
                                required
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                البريد الإلكتروني
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="email@example.com"
                                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white dark:bg-slate-900 transition-all"
                                required
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                {dict.login?.password || 'كلمة المرور'}
                            </label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="••••••••"
                                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white dark:bg-slate-900 transition-all"
                                required
                            />
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                تأكيد كلمة المرور
                            </label>
                            <input
                                type="password"
                                name="password2"
                                value={formData.password2}
                                onChange={handleChange}
                                placeholder="••••••••"
                                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white dark:bg-slate-900 transition-all"
                                required
                                minLength={8}
                            />
                        </div>

                        {/* City */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                المدينة
                            </label>
                            <input
                                type="text"
                                name="city"
                                value={formData.city}
                                onChange={handleChange}
                                placeholder="القاهرة"
                                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white dark:bg-slate-900 transition-all"
                                required
                            />
                        </div>

                        {/* Phone */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                رقم الهاتف
                            </label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="01xxxxxxxxx"
                                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white dark:bg-slate-900 transition-all font-sans text-left"
                                dir="ltr"
                                required
                            />
                        </div>

                        {/* Submit Button */}
                        <motion.button
                            type="submit"
                            disabled={loading}
                            whileHover={!loading ? { scale: 1.02, boxShadow: '0 6px 20px rgba(22,163,74,0.35)' } : {}}
                            whileTap={!loading ? { scale: 0.97 } : {}}
                            transition={{ type: 'spring', stiffness: 380, damping: 20 }}
                            className="w-full bg-primary hover:bg-primary-700 text-white py-4 rounded-xl font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6 transition-colors"
                        >
                            {loading && <Loader2 className="animate-spin" size={20} />}
                            {loading ? 'جار إنشاء الحساب...' : 'إنشاء حساب جديد'}
                        </motion.button>
                    </form>

                    {/* Login Link */}
                    <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6 font-semibold">
                        لديك حساب بالفعل؟{' '}
                        <Link href="/login" className="text-primary hover:text-primary-700 font-bold">
                            {dict.login?.submit || 'تسجيل الدخول'}
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
