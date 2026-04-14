'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Shield, Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { authAPI } from '@/lib/api';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    userProfile: { user: any; phone: string; city: string } | null;
    onSuccess: () => void;
}

export function SettingsModal({ isOpen, onClose, userProfile, onSuccess }: SettingsModalProps) {
    const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errors, setErrors] = useState<any>({});

    const [profileForm, setProfileForm] = useState({
        first_name: '',
        last_name: '',
        phone: '',
        city: ''
    });

    const [securityForm, setSecurityForm] = useState({
        old_password: '',
        new_password: '',
        confirm_new_password: ''
    });

    const [showOldPass, setShowOldPass] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);

    useEffect(() => {
        if (isOpen && userProfile) {
            setProfileForm({
                first_name: userProfile.user?.first_name || '',
                last_name: userProfile.user?.last_name || '',
                phone: userProfile.phone || '',
                city: userProfile.city || ''
            });
            setSecurityForm({ old_password: '', new_password: '', confirm_new_password: '' });
            setErrors({});
            setSuccessMessage(null);
            setActiveTab('profile');
        }
    }, [isOpen, userProfile]);

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrors({});
        setSuccessMessage(null);

        try {
            await authAPI.updateProfile(profileForm);
            setSuccessMessage('تم تحديث البيانات الشخصية بنجاح!');
            onSuccess();
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (err: any) {
            if (err.response?.data && typeof err.response.data === 'object') {
                setErrors(err.response.data);
            } else {
                setErrors({ non_field: 'حدث خطأ غير متوقع.' });
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSecuritySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrors({});
        setSuccessMessage(null);

        try {
            await authAPI.changePassword(securityForm);
            setSuccessMessage('تم تغيير كلمة المرور بنجاح!');
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (err: any) {
            if (err.response?.data && typeof err.response.data === 'object') {
                setErrors(err.response.data);
            } else {
                setErrors({ non_field: 'حدث خطأ غير متوقع. تأكد من صحة البيانات.' });
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={onClose}
                    />
                    
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                            <h2 className="text-2xl font-black text-slate-800 dark:text-white">تعديل الحساب</h2>
                            <button
                                onClick={onClose}
                                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex px-6 border-b border-slate-100 dark:border-slate-800 pt-2 gap-6 relative">
                            <button
                                onClick={() => setActiveTab('profile')}
                                className={`pb-4 px-2 font-bold flex items-center gap-2 transition-colors relative ${activeTab === 'profile' ? 'text-primary' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                            >
                                <User size={18} /> البيانات الشخصية
                                {activeTab === 'profile' && (
                                    <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('security')}
                                className={`pb-4 px-2 font-bold flex items-center gap-2 transition-colors relative ${activeTab === 'security' ? 'text-primary' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                            >
                                <Shield size={18} /> الأمان
                                {activeTab === 'security' && (
                                    <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />
                                )}
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto">
                            <AnimatePresence mode="wait">
                                {successMessage && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="mb-6 p-4 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 rounded-2xl flex items-center gap-3 font-semibold border border-green-200 dark:border-green-900/50"
                                    >
                                        <CheckCircle2 size={24} />
                                        <p>{successMessage}</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {errors.non_field_errors && (
                                <div className="mb-6 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-200">
                                    {errors.non_field_errors[0]}
                                </div>
                            )}
                            
                            {errors.non_field && (
                                <div className="mb-6 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-200">
                                    {errors.non_field}
                                </div>
                            )}

                            {activeTab === 'profile' ? (
                                <motion.form
                                    key="profile-form"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                    onSubmit={handleProfileSubmit}
                                    className="space-y-5"
                                >
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">الاسم الأول</label>
                                            <input
                                                type="text"
                                                value={profileForm.first_name}
                                                onChange={e => setProfileForm(p => ({ ...p, first_name: e.target.value }))}
                                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-semibold"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">الاسم الأخير</label>
                                            <input
                                                type="text"
                                                value={profileForm.last_name}
                                                onChange={e => setProfileForm(p => ({ ...p, last_name: e.target.value }))}
                                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-semibold"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">رقم الهاتف</label>
                                        <input
                                            type="tel"
                                            value={profileForm.phone}
                                            onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                                            dir="ltr"
                                            className="w-full text-left bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-sans font-semibold"
                                        />
                                        {errors.phone && <p className="text-red-500 text-xs font-bold mt-1.5">{errors.phone[0]}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">المدينة</label>
                                        <input
                                            type="text"
                                            value={profileForm.city}
                                            onChange={e => setProfileForm(p => ({ ...p, city: e.target.value }))}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-semibold"
                                        />
                                    </div>
                                    
                                    <button
                                        type="submit"
                                        disabled={isLoading || !!successMessage}
                                        className="w-full mt-8 bg-primary hover:bg-primary-700 text-white font-bold py-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isLoading && <Loader2 className="animate-spin" size={20} />}
                                        حفظ التعديلات
                                    </button>
                                </motion.form>
                            ) : (
                                <motion.form
                                    key="security-form"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                    onSubmit={handleSecuritySubmit}
                                    className="space-y-5"
                                >
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">كلمة المرور الحالية</label>
                                        <div className="relative">
                                            <input
                                                type={showOldPass ? 'text' : 'password'}
                                                value={securityForm.old_password}
                                                onChange={e => setSecurityForm(s => ({ ...s, old_password: e.target.value }))}
                                                dir="ltr"
                                                required
                                                className="w-full text-left bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-sans font-semibold pr-12"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowOldPass(!showOldPass)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                {showOldPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                        {errors.old_password && <p className="text-red-500 text-xs font-bold mt-1.5">{errors.old_password[0]}</p>}
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">كلمة المرور الجديدة</label>
                                        <div className="relative">
                                            <input
                                                type={showNewPass ? 'text' : 'password'}
                                                value={securityForm.new_password}
                                                onChange={e => setSecurityForm(s => ({ ...s, new_password: e.target.value }))}
                                                dir="ltr"
                                                required
                                                className="w-full text-left bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-sans font-semibold pr-12"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPass(!showNewPass)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                        {errors.new_password && <p className="text-red-500 text-xs font-bold mt-1.5">{errors.new_password[0]}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">تأكيد كلمة المرور الجديدة</label>
                                        <div className="relative">
                                            <input
                                                type={showNewPass ? 'text' : 'password'}
                                                value={securityForm.confirm_new_password}
                                                onChange={e => setSecurityForm(s => ({ ...s, confirm_new_password: e.target.value }))}
                                                dir="ltr"
                                                required
                                                className="w-full text-left bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-sans font-semibold pr-12"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPass(!showNewPass)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                        {errors.confirm_new_password && <p className="text-red-500 text-xs font-bold mt-1.5">{errors.confirm_new_password[0]}</p>}
                                    </div>
                                    
                                    <button
                                        type="submit"
                                        disabled={isLoading || !!successMessage}
                                        className="w-full mt-8 bg-slate-800 hover:bg-slate-900 dark:bg-white dark:text-black dark:hover:bg-slate-200 text-white font-bold py-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isLoading && <Loader2 className="animate-spin" size={20} />}
                                        تغيير كلمة المرور
                                    </button>
                                </motion.form>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
