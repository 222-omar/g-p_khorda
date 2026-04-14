'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/components/providers/language-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { Leaf, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/animations';

export default function LoginPage() {
    const router = useRouter();
    const { dict } = useLanguage();
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await login(username, password);
            const urlParams = new URLSearchParams(window.location.search);
            const redirectUrl = urlParams.get('redirect') || '/dashboard';
            // Use full page navigation to ensure auth cookie is properly read
            window.location.href = redirectUrl;
        } catch (err: any) {
            console.error('Login error:', err);
            const errMsg = err.message || '';
            if (errMsg.includes('No active account found') || errMsg.includes('credentials') || err.status === 401) {
                setError('اسم المستخدم أو كلمة المرور غير صحيحة');
            } else {
                setError(errMsg || 'فشل تسجيل الدخول. تحقق من بيانات الاعتماد الخاصة بك.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-black overflow-hidden relative">
            {/* Background blobs */}
            <motion.div
                className="absolute top-10 left-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"
                animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
                className="absolute bottom-10 right-10 w-80 h-80 bg-green-400/10 rounded-full blur-3xl pointer-events-none"
                animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
            />

            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-md relative z-10"
            >
                {/* Logo */}
                <motion.div
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
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
                </motion.div>

                {/* Login Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.5 }}
                    className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl"
                >
                    <motion.h2
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                        className="text-2xl md:text-3xl font-bold mb-6 text-center"
                    >
                        {dict.login.title}
                    </motion.h2>

                    {/* Error Message */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                                transition={{ duration: 0.3 }}
                                className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2"
                            >
                                <AlertCircle size={16} className="text-red-500 shrink-0" />
                                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <motion.form
                        onSubmit={handleSubmit}
                        className="space-y-4"
                        variants={staggerContainer}
                        initial="hidden"
                        animate="visible"
                    >
                        {/* Username */}
                        <motion.div variants={staggerItem}>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                اسم المستخدم أو البريد الإلكتروني
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="username or email"
                                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white dark:bg-slate-900 transition-all font-sans text-left"
                                dir="ltr"
                                required
                                disabled={loading}
                            />
                        </motion.div>

                        {/* Password */}
                        <motion.div variants={staggerItem}>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                {dict.login.password}
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 pr-11 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white dark:bg-slate-900 transition-all font-sans text-left"
                                    dir="ltr"
                                    required
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute top-1/2 -translate-y-1/2 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </motion.div>

                        {/* Forgot Password */}
                        <motion.div variants={staggerItem} className="text-left">
                            <Link href="/forgot-password" className="text-sm text-primary hover:text-teal-700 font-semibold transition-colors cursor-pointer inline-block">
                                نسيت كلمة المرور؟
                            </Link>
                        </motion.div>

                        {/* Submit */}
                        <motion.div variants={staggerItem}>
                            <motion.button
                                type="submit"
                                disabled={loading}
                                whileHover={!loading ? { scale: 1.02, boxShadow: '0 6px 20px rgba(22,163,74,0.35)' } : {}}
                                whileTap={!loading ? { scale: 0.97 } : {}}
                                transition={{ type: 'spring', stiffness: 380, damping: 20 }}
                                className="w-full bg-primary hover:bg-primary-700 text-white py-4 rounded-xl font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                            >
                                {loading && <Loader2 className="animate-spin" size={20} />}
                                {loading ? 'جار تسجيل الدخول...' : dict.login.submit}
                            </motion.button>
                        </motion.div>
                    </motion.form>

                    {/* Sign Up Link */}
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6 font-semibold"
                    >
                        {dict.login.noAccount}{' '}
                        <Link href="/register" className="text-primary hover:text-primary-700 font-bold transition-colors">
                            {dict.login.createAccount || 'سجل حساب جديد'}
                        </Link>
                    </motion.p>
                </motion.div>

                {/* Back to Home */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="text-center mt-6"
                >
                    <Link href="/" className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary font-semibold transition-colors">
                        ← العودة للرئيسية
                    </Link>
                </motion.div>
            </motion.div>
        </div>
    );
}
