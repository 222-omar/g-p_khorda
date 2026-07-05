'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { useAuth } from '@/components/providers/auth-provider';
import { agentAPI } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bot, Plus, Trash2, Power, PowerOff, Loader2,
    Target, Wallet, ChevronDown, CheckCircle2, XCircle, Sparkles, X, MoreVertical
} from 'lucide-react';
import { useLanguage } from '@/components/providers/language-provider';

interface AgentTarget {
    id: string;
    label: string;
    label_ar: string;
    category: string;
}

interface UserAgent {
    id: number;
    target_item: string;
    target_label: string;
    max_budget: string;
    requirements_prompt?: string;
    is_active: boolean;
    created_at: string;
}

export default function AgentPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const { dict, isRtl } = useLanguage();

    const [agents, setAgents] = useState<UserAgent[]>([]);
    const [targets, setTargets] = useState<AgentTarget[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [showForm, setShowForm] = useState(false);

    // Form state
    const [selectedTarget, setSelectedTarget] = useState('');
    const [maxBudget, setMaxBudget] = useState('');
    const [requirementsPrompt, setRequirementsPrompt] = useState('');
    const [formError, setFormError] = useState('');

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login?redirect=/agent');
            return;
        }
        if (user) {
            loadData();
        }
    }, [authLoading, user, router]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [agentsList, targetsList] = await Promise.all([
                agentAPI.list(),
                agentAPI.getTargets(),
            ]);
            setAgents(agentsList);
            setTargets(targetsList);
        } catch (err) {
            console.error('Failed to load agent data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!selectedTarget) {
            setFormError(isRtl ? 'اختر الحاجة اللي عايز الوكيل يدور عليها' : 'Select target item');
            return;
        }
        if (!maxBudget || parseFloat(maxBudget) <= 0) {
            setFormError(isRtl ? 'حدد ميزانية صحيحة' : 'Enter valid budget');
            return;
        }

        try {
            setCreating(true);
            setFormError('');
            await agentAPI.create({
                target_item: selectedTarget,
                max_budget: parseFloat(maxBudget),
                requirements_prompt: requirementsPrompt.trim(),
            });
            setSelectedTarget('');
            setMaxBudget('');
            setRequirementsPrompt('');
            setShowForm(false);
            await loadData();
        } catch (err: any) {
            setFormError(err.message || 'Error');
        } finally {
            setCreating(false);
        }
    };

    const handleToggle = async (agent: UserAgent) => {
        try {
            await agentAPI.update(agent.id, { is_active: !agent.is_active });
            setAgents(prev =>
                prev.map(a => a.id === agent.id ? { ...a, is_active: !a.is_active } : a)
            );
        } catch (err) {
            console.error('Toggle failed:', err);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm(isRtl ? 'هل أنت متأكد من حذف هذا الوكيل؟' : 'Are you sure you want to delete this agent?')) return;
        try {
            await agentAPI.delete(id);
            setAgents(prev => prev.filter(a => a.id !== id));
        } catch (err) {
            console.error('Delete failed:', err);
        }
    };

    if (authLoading || !user) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#FCFDFB] dark:bg-slate-950">
                <Loader2 className="animate-spin text-[#1F8A3B]" size={40} />
            </div>
        );
    }

    return (
        <>
            <Navbar />
            
            <main className="pt-32 pb-20 min-h-screen bg-[#FCFDFB] dark:bg-[#0e1015] px-4 sm:px-6 lg:px-8 font-cairo" dir="rtl">
                
                {/* ─── Hero Content Grid ─── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-[960px] mx-auto mb-10 pt-6">
                    
                    {/* Right column: Text card & Subtitle (comes first visually in RTL) */}
                    <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-right">
                        {/* Title Card (Glassmorphic, Rounded 32px) */}
                        <div className="bg-white dark:bg-slate-800 border border-[#E7ECEA] dark:border-slate-700 rounded-[32px] px-8 py-4 flex items-center gap-3.5 shadow-[0_12px_40px_rgba(0,0,0,0.03)] hover:shadow-[0_15px_45px_rgba(0,0,0,0.05)] transition-all">
                            <h1 className="font-cairo font-black text-2xl lg:text-[32px] text-[#101828] dark:text-white leading-none">{dict.agent?.title || (isRtl ? 'الوكيل الذكي' : 'Smart Agent')}</h1>
                            <div className="w-11 h-11 bg-[#F2FBF5] dark:bg-[#1F8A3B]/10 rounded-[14px] flex items-center justify-center text-[#1F8A3B] border border-[#1F8A3B]/5 flex-shrink-0">
                                <Bot size={22} className="stroke-[2.2]" />
                            </div>
                        </div>
                        
                        {/* Subtitle */}
                        <p className="text-[#667085] dark:text-slate-400 font-cairo text-[15px] sm:text-[16px] leading-[1.8] mt-6 max-w-[480px] lg:max-w-none text-center lg:text-right">
                            {dict.agent?.desc || (isRtl ? 'فعل وكيلك الذكي وخليه يراقب المزادات ويزايد تلقائي على المنتجات اللي بتدور عليها.' : 'Activate your smart agent to monitor auctions and auto-bid on products you are looking for.')}
                        </p>
                    </div>
                    
                    {/* Left column: 3D Robot Illustration (comes second in DOM) */}
                    <div className="lg:col-span-5 relative flex justify-center items-center">
                        <div className="relative w-full max-w-[280px]">
                            {/* Sparkles */}
                            <motion.div 
                                animate={{ scale: [1, 1.15, 1], rotate: [0, 15, 0] }}
                                transition={{ duration: 4.5, repeat: Infinity }}
                                className="absolute -top-4 -right-4 text-[#43A047]"
                            >
                                <Sparkles size={24} className="fill-current" />
                            </motion.div>
                            <motion.div 
                                animate={{ scale: [1, 0.85, 1], rotate: [0, -15, 0] }}
                                transition={{ duration: 4, repeat: Infinity, delay: 0.5 }}
                                className="absolute -bottom-4 -left-4 text-[#1F8A3B]"
                            >
                                <Sparkles size={18} className="fill-current" />
                            </motion.div>
                            
                            {/* 3D Robot illustration */}
                            <motion.img
                                animate={{ y: [0, -6, 0] }}
                                transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                                src="/robot.png"
                                alt="AI Waving Robot"
                                className="w-full h-auto object-contain select-none pointer-events-none drop-shadow-xl"
                            />
                        </div>
                    </div>
                    
                </div>

                {/* ─── Add Agent CTA Button (Height 72px, Radius 24px) ─── */}
                <div className="max-w-[960px] mx-auto mb-10">
                    <motion.button
                        onClick={() => setShowForm(true)}
                        whileHover={{ scale: 1.015 }}
                        whileTap={{ scale: 0.985 }}
                        className="w-full h-[72px] bg-gradient-to-r from-[#1F8A3B] to-[#43A047] hover:from-[#186a2c] hover:to-[#388e3c] text-white shadow-[0_10px_30px_rgba(31,138,59,0.2)] rounded-[24px] font-bold text-[18px] flex items-center justify-center gap-3 transition-all cursor-pointer font-cairo"
                    >
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white">
                            <Plus size={18} className="stroke-[2.5]" />
                        </div>
                        <span>{dict.agent?.addAgent || (isRtl ? 'إضافة وكيل جديد' : 'Add New Agent')}</span>
                    </motion.button>
                </div>

                {/* ─── Skeleton Loading ─── */}
                {loading && (
                    <div className="max-w-[960px] mx-auto flex flex-col gap-6 py-6">
                        {[1, 2].map(i => (
                            <div key={i} className="animate-pulse bg-white dark:bg-slate-800 rounded-[30px] border border-[#E5E7EB] dark:border-slate-700 p-8 flex flex-col items-start gap-4 shadow-sm">
                                <div className="h-6 bg-slate-100 dark:bg-slate-700 rounded w-1/3"></div>
                                <div className="h-14 bg-slate-100 dark:bg-slate-700 rounded-2xl w-full mt-2"></div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ─── Agent Cards List ─── */}
                {!loading && (
                    <div className="max-w-[960px] mx-auto">
                        {agents.length === 0 ? (
                            <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-[30px] border border-[#E7ECEA] dark:border-slate-700 shadow-[0_12px_40px_rgba(0,0,0,0.02)]">
                                <Bot size={52} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                                <h3 className="text-lg font-bold text-[#101828] dark:text-slate-200">{dict.agent?.noAgents || (isRtl ? 'لا يوجد وكلاء حالياً' : 'No agents currently')}</h3>
                                <p className="text-[#667085] dark:text-slate-400 text-sm mt-2">{dict.agent?.noAgentsDesc || (isRtl ? 'أنشئ وكيلك الذكي الأول وخليه يشتغل عنك!' : 'Create your first smart agent and let it work for you!')}</p>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {agents.map((agent) => (
                                    <div
                                        key={agent.id}
                                        className={`bg-white dark:bg-slate-800 rounded-[30px] border border-[#E7ECEA] dark:border-slate-700 p-8 shadow-[0_12px_45px_rgba(0,0,0,0.02)] transition-all ${
                                            agent.is_active ? 'opacity-100' : 'opacity-70 dark:opacity-60'
                                        }`}
                                    >
                                        {/* Card Top Area */}
                                        <div className="flex items-center justify-between gap-4">
                                            
                                            {/* Right Column: Bot Icon + Title stack */}
                                            <div className="flex items-center gap-4 flex-grow min-w-0">
                                                {/* Agent bot icon (Rightmost) */}
                                                <div className="w-14 h-14 bg-[#F2FBF5] dark:bg-green-950/20 border border-[#1F8A3B]/5 rounded-2xl flex items-center justify-center text-[#1F8A3B] flex-shrink-0 shadow-sm">
                                                    <Bot size={26} className="stroke-[2.2]" />
                                                </div>
                                                
                                                {/* Title & Badges stack (Middle) */}
                                                <div className="flex flex-col min-w-0 text-right">
                                                    <h4 className="font-cairo font-bold text-xl text-[#101828] dark:text-white truncate">
                                                        {agent.target_label}
                                                    </h4>
                                                    
                                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                                        {/* Status Badge */}
                                                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1 rounded-full border ${
                                                            agent.is_active
                                                                ? 'bg-[#F2FBF5] text-[#1F8A3B] border-[#1F8A3B]/10'
                                                                : 'bg-slate-50 text-[#667085] dark:bg-slate-700/50 dark:text-slate-400 border-slate-200 dark:border-slate-600'
                                                        }`}>
                                                            {agent.is_active && (
                                                                <span className="relative flex h-1.5 w-1.5">
                                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1F8A3B] opacity-75"></span>
                                                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#1F8A3B]"></span>
                                                                </span>
                                                            )}
                                                            {agent.is_active ? 'نشط' : 'متوقف'}
                                                        </span>

                                                        {/* Budget Badge */}
                                                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#667085] dark:text-slate-300 bg-slate-50 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-700/60 rounded-full px-3.5 py-1.5">
                                                            <Wallet size={12} className="text-[#667085] dark:text-slate-400" />
                                                            الموازنة: {Number(agent.max_budget).toLocaleString()} جنيه
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Left Column: Menu Button (Leftmost) */}
                                            <button className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[#667085] hover:text-[#101828] hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                                <MoreVertical size={18} />
                                            </button>
                                        </div>

                                        {/* Card Middle Area: Soft Green Requirements Container */}
                                        <div className="bg-[#F2FBF5] dark:bg-green-950/15 border border-[#1F8A3B]/10 rounded-[22px] p-5 mt-6">
                                            <div className="flex items-start gap-4">
                                                {/* Left column (RTL: renders leftmost) — Text stack */}
                                                <div className="flex-grow flex flex-col text-right">
                                                    <span className="font-cairo font-bold text-[13px] text-[#1F8A3B] mb-1.5">مواصفات مطلوبة مطابقة:</span>
                                                    <p className="font-cairo text-sm text-[#101828] dark:text-slate-200 leading-relaxed">
                                                        {agent.requirements_prompt || 'لا توجد مواصفات إضافية'}
                                                    </p>
                                                </div>
                                                
                                                {/* Right column (RTL: renders rightmost) — Icon Container */}
                                                <div className="w-11 h-11 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-[#1F8A3B] flex-shrink-0 border border-[#1F8A3B]/10 shadow-sm mt-0.5">
                                                    <Target size={20} className="stroke-[2.2]" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card Bottom Area: Actions */}
                                        <div className="flex items-center gap-3 mt-6 pt-5 border-t border-[#E5E7EB] dark:border-slate-700/50">
                                            {/* Delete button (حذف) */}
                                            <motion.button
                                                onClick={() => handleDelete(agent.id)}
                                                whileHover={{ scale: 1.015 }}
                                                whileTap={{ scale: 0.985 }}
                                                className="flex-1 h-[60px] rounded-[20px] bg-red-50/40 hover:bg-red-50 dark:bg-red-950/10 border border-red-200 dark:border-red-900/30 text-[#D92D20] font-cairo font-bold text-[15px] flex items-center justify-center gap-2 transition-all cursor-pointer"
                                            >
                                                <Trash2 size={16} />
                                                <span>{dict.agent?.delete || (isRtl ? 'حذف' : 'Delete')}</span>
                                            </motion.button>
                                            
                                            {/* Pause Agent (وقف الوكيل) */}
                                            <motion.button
                                                onClick={() => handleToggle(agent)}
                                                whileHover={{ scale: 1.015 }}
                                                whileTap={{ scale: 0.985 }}
                                                className={`flex-1 h-[60px] rounded-[20px] font-cairo font-bold text-[15px] flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                                    agent.is_active
                                                        ? 'bg-amber-50/40 hover:bg-amber-50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/30 text-[#D4440C]'
                                                        : 'bg-[#F2FBF5]/40 hover:bg-[#F2FBF5] dark:bg-green-950/10 border border-[#1F8A3B]/20 text-[#1F8A3B]'
                                                }`}
                                            >
                                                {agent.is_active ? (
                                                    <>
                                                        <PowerOff size={16} />
                                                        <span>{dict.agent?.stop || (isRtl ? 'وقف الوكيل' : 'Pause Agent')}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Power size={16} />
                                                        <span>{dict.agent?.start || (isRtl ? 'تشغيل الوكيل' : 'Activate Agent')}</span>
                                                    </>
                                                )}
                                            </motion.button>
                                        </div>

                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ─── Premium AI Creation Modal (Apple Quality) ─── */}
                <AnimatePresence>
                    {showForm && (
                        <div className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                                className="bg-[#FCFDFB] dark:bg-slate-800 w-full max-w-[520px] rounded-[32px] border border-[#E7ECEA] dark:border-slate-700 shadow-2xl p-8 flex flex-col relative gap-6"
                            >
                                <button
                                    onClick={() => { setShowForm(false); setFormError(''); }}
                                    className="absolute left-6 top-6 w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200 transition-colors flex items-center justify-center"
                                >
                                    <X size={18} />
                                </button>

                                <div className="text-right">
                                    <h3 className="font-cairo font-black text-xl text-[#101828] dark:text-white flex items-center gap-2 justify-end">
                                        <span>إضافة وكيل جديد</span>
                                        <Bot size={22} className="text-[#1F8A3B]" />
                                    </h3>
                                    <p className="text-sm text-[#667085] dark:text-slate-400 mt-1">حدد تفاصيل الوكيل الذكي ليراقب المزاد بالنيابة عنك.</p>
                                </div>

                                {/* Target Select */}
                                <div className="text-right">
                                    <label className="block text-sm font-bold text-[#101828] dark:text-slate-200 mb-2">
                                        المنتج أو الفئة المستهدفة
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={selectedTarget}
                                            onChange={(e) => setSelectedTarget(e.target.value)}
                                            className="w-full bg-white dark:bg-slate-900 border border-[#E7ECEA] dark:border-slate-700 rounded-2xl px-4 py-3.5 text-sm outline-none focus:border-[#1F8A3B] transition-colors shadow-inner font-cairo text-[#101828] dark:text-white appearance-none cursor-pointer"
                                        >
                                            <option value="">اختر الحاجة اللي بتدور عليها...</option>
                                            {targets.map((t) => (
                                                <option key={t.id} value={t.id}>
                                                    {isRtl ? t.label_ar : t.label}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>

                                {/* Max Budget */}
                                <div className="text-right">
                                    <label className="block text-sm font-bold text-[#101828] dark:text-slate-200 mb-2">
                                        أقصى ميزانية (جنيه)
                                    </label>
                                    <input
                                        type="number"
                                        value={maxBudget}
                                        onChange={(e) => setMaxBudget(e.target.value)}
                                        placeholder="مثال: 9000"
                                        min="1"
                                        className="w-full bg-white dark:bg-slate-900 border border-[#E7ECEA] dark:border-slate-700 rounded-2xl px-4 py-3.5 text-sm outline-none focus:border-[#1F8A3B] transition-colors shadow-inner font-cairo text-[#101828] dark:text-white"
                                    />
                                </div>

                                {/* Requirements */}
                                <div className="text-right">
                                    <label className="block text-sm font-bold text-[#101828] dark:text-slate-200 mb-2">
                                        مواصفات مطلوبة مطابقة
                                    </label>
                                    <textarea
                                        value={requirementsPrompt}
                                        onChange={(e) => setRequirementsPrompt(e.target.value)}
                                        placeholder="مثال: عايز ميكروويف توشيبا يكون استعمال خفيف"
                                        rows={3}
                                        className="w-full bg-white dark:bg-slate-900 border border-[#E7ECEA] dark:border-slate-700 rounded-2xl px-4 py-3.5 text-sm outline-none focus:border-[#1F8A3B] transition-colors shadow-inner font-cairo text-[#101828] dark:text-white resize-none"
                                    />
                                </div>

                                {formError && (
                                    <p className="text-red-500 text-sm flex items-center gap-1 justify-end">
                                        <span>{formError}</span>
                                        <XCircle size={14} />
                                    </p>
                                )}

                                <div className="flex gap-3 mt-4">
                                    <motion.button
                                        onClick={handleCreate}
                                        disabled={creating}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="flex-grow h-[54px] rounded-2xl bg-gradient-to-r from-[#1F8A3B] to-[#43A047] hover:from-[#176a2c] hover:to-[#388e3c] text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-md"
                                    >
                                        {creating ? (
                                            <Loader2 size={18} className="animate-spin text-white/70" />
                                        ) : (
                                            <CheckCircle2 size={18} />
                                        )}
                                        {creating ? 'جاري الإنشاء...' : 'إنشاء وكيل'}
                                    </motion.button>
                                    <button
                                        onClick={() => { setShowForm(false); setFormError(''); }}
                                        className="px-6 h-[54px] rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-500 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                                    >
                                        إلغاء
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

            </main>
            <Footer />
        </>
    );
}
