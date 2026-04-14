'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Leaf, Loader2, AlertCircle, Phone, Mail, ArrowRight, EyeOff, Eye, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [step, setStep] = useState<1 | 2>(1);
    
    // Step 1: Email
    const [email, setEmail] = useState('');
    const [maskedNumbers, setMaskedNumbers] = useState<string[]>([]);
    
    // Step 2: Verification and Reset
    const [selectedMask, setSelectedMask] = useState<string | null>(null);
    const [fullPhone, setFullPhone] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    
    // UI states
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const API_BASE_URL = 'http://localhost:8000/api';

    const handleVerifyEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;
        
        setLoading(true);
        setError(null);
        
        try {
            const res = await fetch(`${API_BASE_URL}/auth/verify-phone-request/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            
            if (!res.ok) {
                throw new Error(data.error || 'حدث خطأ غير متوقع');
            }
            
            setMaskedNumbers(data.masked_numbers);
            setStep(2);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!selectedMask) {
            setError('الرجاء اختيار أحد الأرقام المموهة المقترحة');
            return;
        }
        
        if (!fullPhone) {
            setError('الرجاء كتابة رقم هاتفك بالكامل');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('كلمات المرور غير متطابقة');
            return;
        }
        
        if (newPassword.length < 6) {
            setError('يجب أن تتكون كلمة المرور من 6 أحرف على الأقل');
            return;
        }
        
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`${API_BASE_URL}/auth/reset-password/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    selected_masked_number: selectedMask,
                    full_phone_number_input: fullPhone,
                    new_password: newPassword
                })
            });
            const data = await res.json();
            
            if (!res.ok) {
                // If it's a specific validation error, display it
                throw new Error(data.error || 'فشل إعادة التعيين');
            }
            
            setSuccess('تم تغيير كلمة المرور بنجاح! جاري تحويلك لصفحة تسجيل الدخول...');
            
            // Redirect after 3 seconds
            setTimeout(() => {
                router.push('/login');
            }, 3000);
            
        } catch (err: any) {
            let msg = err.message;
            if (msg.includes('مطلوبة')) msg = 'تأكد من إدخال جميع البيانات بشكل صحيح';
            if (msg.includes('غير متطابق')) msg = 'رقم الهاتف الذي أدخلته أو الرقم المموّه لا يتطابق مع السجلات';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-black overflow-hidden relative" dir="rtl">
            {/* Background elements */}
            <motion.div
                className="absolute top-10 left-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"
                animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            />
            
            <div className="w-full max-w-lg relative z-10">
                {/* Logo */}
                <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center mb-8">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="bg-primary p-2.5 rounded-xl text-white">
                            <Leaf size={24} />
                        </div>
                        <span className="text-2xl font-bold"><span className="text-primary">4</span>Sale</span>
                    </Link>
                </motion.div>

                {/* Main Card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl"
                >
                    <div className="mb-6">
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                            {step === 1 ? 'نسيت كلمة المرور؟' : 'تأكيد الهوية وتعيين كلمة المرور'}
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium">
                            {step === 1 
                                ? 'أدخل بريدك الإلكتروني المرتبط بالحساب لاستعادة الوصول.'
                                : 'اختر رقماً مموهاً ثم اكتب رقمك بالكامل وأدخل كلمة المرور الجديدة.'}
                        </p>
                    </div>

                    {/* Alerts */}
                    <AnimatePresence mode="wait">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3"
                            >
                                <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
                                <p className="text-sm text-red-600 dark:text-red-400 font-bold">{error}</p>
                            </motion.div>
                        )}
                        
                        {success && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-3"
                            >
                                <CheckCircle2 className="text-green-500 flex-shrink-0" size={20} />
                                <p className="text-sm text-green-600 dark:text-green-400 font-bold">{success}</p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Step 1 Form */}
                    {step === 1 && !success && (
                        <motion.form
                            onSubmit={handleVerifyEmail}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-4"
                        >
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    البريد الإلكتروني
                                </label>
                                <div className="relative">
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="example@mail.com"
                                        className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white dark:bg-slate-900 transition-all font-sans text-left"
                                        dir="ltr"
                                        required
                                        disabled={loading}
                                    />
                                    <Mail className="absolute top-1/2 -translate-y-1/2 right-3 text-slate-400" size={18} />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !email}
                                className="w-full bg-primary hover:bg-primary-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'متابعة'}
                                {!loading && <ArrowRight className="w-4 h-4 mr-1 rotate-180" />}
                            </button>
                        </motion.form>
                    )}

                    {/* Step 2 Form */}
                    {step === 2 && !success && (
                        <motion.form
                            onSubmit={handleResetPassword}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-6"
                        >
                            {/* Masked Numbers Selection */}
                            <div className="space-y-3">
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                                    اختر الرقم الذي يتطابق مع هاتفك المسجل:
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {maskedNumbers.map((mask, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setSelectedMask(mask)}
                                            className={`p-3 rounded-xl border-2 font-black tracking-widest text-center transition-all ${
                                                selectedMask === mask
                                                    ? 'border-primary bg-primary/5 text-primary'
                                                    : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300 dark:hover:border-slate-600'
                                            }`}
                                            dir="ltr"
                                        >
                                            {mask}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Full Phone Verification */}
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
                                    يرجى كتابة رقم هاتفك بالكامل لتأكيد هويتك
                                </label>
                                <div className="relative">
                                    <input
                                        type="tel"
                                        value={fullPhone}
                                        onChange={(e) => setFullPhone(e.target.value)}
                                        placeholder="مثال: 01012345678"
                                        className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-white dark:bg-slate-900 transition-all font-sans text-left"
                                        dir="ltr"
                                        required
                                        disabled={loading}
                                    />
                                    <Phone className="absolute top-1/2 -translate-y-1/2 right-3 text-slate-400" size={16} />
                                </div>
                            </div>

                            {/* New Password Area */}
                            <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                        كلمة المرور الجديدة
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white dark:bg-slate-900 transition-all font-sans text-left pl-11"
                                            dir="ltr"
                                            required
                                            disabled={loading}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute top-1/2 -translate-y-1/2 left-3 text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                        تأكيد كلمة المرور الجديدة
                                    </label>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white dark:bg-slate-900 transition-all font-sans text-left"
                                        dir="ltr"
                                        required
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !selectedMask || !fullPhone || !newPassword || !confirmPassword}
                                className="w-full bg-primary hover:bg-primary-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'تأكيد وحفظ'}
                            </button>
                        </motion.form>
                    )}
                </motion.div>

                {/* Footer Link */}
                {!success && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 text-center">
                        <Link href="/login" className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold transition-colors text-sm">
                            العودة لصفحة تسجيل الدخول
                        </Link>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
