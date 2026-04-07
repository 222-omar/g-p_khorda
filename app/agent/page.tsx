'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { useAuth } from '@/components/providers/auth-provider';
import { agentAPI, notificationsAPI } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bot, Plus, Trash2, Power, PowerOff, Loader2, Bell,
    Target, Wallet, ChevronDown, CheckCircle2, XCircle, Sparkles
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
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

interface Notification {
    id: number;
    title: string;
    message: string;
    reasoning?: string;
    is_read: boolean;
    product_title: string | null;
    created_at: string;
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function AgentPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    // State
    const [agents, setAgents] = useState<UserAgent[]>([]);
    const [targets, setTargets] = useState<AgentTarget[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [activeTab, setActiveTab] = useState<'agents' | 'notifications'>('agents');

    // Form state
    const [selectedTarget, setSelectedTarget] = useState('');
    const [maxBudget, setMaxBudget] = useState('');
    const [requirementsPrompt, setRequirementsPrompt] = useState('');
    const [formError, setFormError] = useState('');

    // Load data
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
            const [agentsList, targetsList, notifList] = await Promise.all([
                agentAPI.list(),
                agentAPI.getTargets(),
                notificationsAPI.list(),
            ]);
            setAgents(agentsList);
            setTargets(targetsList);
            setNotifications(notifList);
        } catch (err) {
            console.error('Failed to load agent data:', err);
        } finally {
            setLoading(false);
        }
    };

    // Create agent
    const handleCreate = async () => {
        if (!selectedTarget) {
            setFormError('اختر الحاجة اللي عايز الوكيل يدور عليها');
            return;
        }
        if (!maxBudget || parseFloat(maxBudget) <= 0) {
            setFormError('حدد ميزانية صحيحة');
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
            setFormError(err.message || 'حصل خطأ');
        } finally {
            setCreating(false);
        }
    };

    // Toggle agent active/inactive
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

    // Delete agent
    const handleDelete = async (id: number) => {
        try {
            await agentAPI.delete(id);
            setAgents(prev => prev.filter(a => a.id !== id));
        } catch (err) {
            console.error('Delete failed:', err);
        }
    };

    // Mark notifications as read
    const handleMarkAllRead = async () => {
        try {
            await notificationsAPI.markAllRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch (err) {
            console.error('Mark read failed:', err);
        }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    if (authLoading || !user) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={40} />
            </div>
        );
    }

    return (
        <>
            <Navbar />
            <main className="pt-24 pb-16 min-h-screen px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">

                    {/* ── Page Header ── */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-10"
                    >
                        <div className="inline-flex items-center gap-3 bg-gradient-to-r from-violet-500/10 to-cyan-500/10 dark:from-violet-500/20 dark:to-cyan-500/20 px-6 py-3 rounded-2xl mb-4">
                            <Bot size={28} className="text-violet-500" />
                            <h1 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-violet-600 to-cyan-500 bg-clip-text text-transparent">
                                الوكيل الذكي
                            </h1>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                            خلي الذكاء الاصطناعي يزايد نيابة عنك! اختار الحاجة اللي بتدور عليها وحدد ميزانيتك وسيبه عليه 🤖
                        </p>
                    </motion.div>

                    {/* ── Tabs ── */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="flex gap-2 mb-8 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl"
                    >
                        <button
                            onClick={() => setActiveTab('agents')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all ${activeTab === 'agents'
                                    ? 'bg-white dark:bg-slate-700 shadow-sm text-violet-600 dark:text-violet-400'
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                        >
                            <Bot size={18} />
                            الوكلاء ({agents.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('notifications')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all relative ${activeTab === 'notifications'
                                    ? 'bg-white dark:bg-slate-700 shadow-sm text-violet-600 dark:text-violet-400'
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                        >
                            <Bell size={18} />
                            الإشعارات
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                                    {unreadCount}
                                </span>
                            )}
                        </button>
                    </motion.div>

                    {/* ── Loading ── */}
                    {loading && (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="animate-spin text-primary" size={36} />
                        </div>
                    )}

                    {/* ── AGENTS TAB ── */}
                    {!loading && activeTab === 'agents' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}
                        >
                            {/* Create Button */}
                            <motion.button
                                onClick={() => setShowForm(!showForm)}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full mb-6 bg-gradient-to-r from-violet-600 to-cyan-500 text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-shadow"
                            >
                                <Plus size={22} />
                                إنشاء وكيل جديد
                            </motion.button>

                            {/* Create Form */}
                            <AnimatePresence>
                                {showForm && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                        animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-lg">
                                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                                <Sparkles size={20} className="text-violet-500" />
                                                وكيل جديد
                                            </h3>

                                            {/* Target Selection */}
                                            <div className="mb-4">
                                                <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">
                                                    <Target size={14} className="inline ml-1" />
                                                    الحاجة المستهدفة
                                                </label>
                                                <div className="relative">
                                                    <select
                                                        value={selectedTarget}
                                                        onChange={(e) => setSelectedTarget(e.target.value)}
                                                        className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm bg-white dark:bg-slate-700 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 appearance-none cursor-pointer transition-all"
                                                    >
                                                        <option value="">اختر الحاجة اللي بتدور عليها...</option>
                                                        {targets.map((t) => (
                                                            <option key={t.id} value={t.id}>
                                                                {t.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                </div>
                                            </div>

                                            {/* Max Budget */}
                                            <div className="mb-5">
                                                <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">
                                                    <Wallet size={14} className="inline ml-1" />
                                                    أقصى ميزانية (جنيه)
                                                </label>
                                                <input
                                                    type="number"
                                                    value={maxBudget}
                                                    onChange={(e) => setMaxBudget(e.target.value)}
                                                    placeholder="مثلاً: 5000"
                                                    min="1"
                                                    className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm bg-white dark:bg-slate-700 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                                                />
                                            </div>

                                            {/* Requirements Prompt */}
                                            <div className="mb-5">
                                                <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">
                                                    مواصفات إضافية (اختياري)
                                                </label>
                                                <textarea
                                                    value={requirementsPrompt}
                                                    onChange={(e) => setRequirementsPrompt(e.target.value)}
                                                    placeholder="مثال: غسالة توشيبا فوق اوتوماتيك بحالة ممتازة ومفيهاش خدوش"
                                                    rows={3}
                                                    className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm bg-white dark:bg-slate-700 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all resize-none"
                                                />
                                            </div>

                                            {/* Error */}
                                            {formError && (
                                                <p className="text-red-500 text-sm mb-4 flex items-center gap-1">
                                                    <XCircle size={14} /> {formError}
                                                </p>
                                            )}

                                            {/* Submit */}
                                            <div className="flex gap-3">
                                                <motion.button
                                                    onClick={handleCreate}
                                                    disabled={creating}
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    className="flex-1 bg-gradient-to-r from-violet-600 to-cyan-500 text-white py-3 rounded-xl font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                                                >
                                                    {creating ? (
                                                        <Loader2 size={18} className="animate-spin" />
                                                    ) : (
                                                        <CheckCircle2 size={18} />
                                                    )}
                                                    {creating ? 'جاري الإنشاء...' : 'إنشاء الوكيل'}
                                                </motion.button>
                                                <button
                                                    onClick={() => { setShowForm(false); setFormError(''); }}
                                                    className="px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-500 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                                >
                                                    إلغاء
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Agents List */}
                            {agents.length === 0 ? (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="text-center py-20"
                                >
                                    <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 2.5, repeat: Infinity }}>
                                        <Bot size={56} className="mx-auto text-slate-300 dark:text-slate-600" />
                                    </motion.div>
                                    <p className="text-slate-500 text-lg font-medium mt-4">لسه مفيش وكلاء</p>
                                    <p className="text-slate-400 text-sm mt-2">اعمل وكيل جديد وخليه يشتغل بدالك!</p>
                                </motion.div>
                            ) : (
                                <motion.div className="space-y-4">
                                    {agents.map((agent, idx) => (
                                        <motion.div
                                            key={agent.id}
                                            initial={{ opacity: 0, y: 16 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.08 }}
                                            className={`bg-white dark:bg-slate-800 rounded-2xl border p-5 shadow-sm transition-all ${agent.is_active
                                                    ? 'border-violet-200 dark:border-violet-800/50'
                                                    : 'border-slate-200 dark:border-slate-700 opacity-60'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    {/* Status icon */}
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${agent.is_active
                                                            ? 'bg-gradient-to-br from-violet-500 to-cyan-500 text-white'
                                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                                                        }`}>
                                                        <Bot size={24} />
                                                    </div>

                                                    {/* Info */}
                                                    <div>
                                                        <h4 className="font-bold text-base">{agent.target_label}</h4>
                                                        <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                                                            <span className="flex items-center gap-1">
                                                                <Wallet size={12} />
                                                                {Number(agent.max_budget).toLocaleString()} جنيه
                                                            </span>
                                                            <span className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${agent.is_active
                                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                                    : 'bg-slate-100 text-slate-500 dark:bg-slate-700'
                                                                }`}>
                                                                {agent.is_active ? '🟢 شغال' : '⏸ موقف'}
                                                            </span>
                                                        </div>
                                                        {agent.requirements_prompt && (
                                                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 p-2 rounded-lg break-words">
                                                                <span className="font-bold text-violet-500 text-xs block mb-1">مواصفات مطلوب مطابقتها:</span>
                                                                {agent.requirements_prompt}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center gap-2">
                                                    <motion.button
                                                        onClick={() => handleToggle(agent)}
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        title={agent.is_active ? 'وقف الوكيل' : 'شغل الوكيل'}
                                                        className={`p-2.5 rounded-xl transition-colors ${agent.is_active
                                                                ? 'bg-orange-100 text-orange-600 hover:bg-orange-200 dark:bg-orange-900/30 dark:hover:bg-orange-900/50'
                                                                : 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50'
                                                            }`}
                                                    >
                                                        {agent.is_active ? <PowerOff size={18} /> : <Power size={18} />}
                                                    </motion.button>
                                                    <motion.button
                                                        onClick={() => handleDelete(agent.id)}
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        title="حذف الوكيل"
                                                        className="p-2.5 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 transition-colors"
                                                    >
                                                        <Trash2 size={18} />
                                                    </motion.button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            )}
                        </motion.div>
                    )}

                    {/* ── NOTIFICATIONS TAB ── */}
                    {!loading && activeTab === 'notifications' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}
                        >
                            {/* Mark all read button */}
                            {unreadCount > 0 && (
                                <motion.button
                                    onClick={handleMarkAllRead}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="w-full mb-6 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                    <CheckCircle2 size={16} />
                                    تمييز الكل كمقروء ({unreadCount})
                                </motion.button>
                            )}

                            {notifications.length === 0 ? (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="text-center py-20"
                                >
                                    <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 2.5, repeat: Infinity }}>
                                        <Bell size={56} className="mx-auto text-slate-300 dark:text-slate-600" />
                                    </motion.div>
                                    <p className="text-slate-500 text-lg font-medium mt-4">مفيش إشعارات</p>
                                    <p className="text-slate-400 text-sm mt-2">لما الوكيل يزايد هتلاقي الإشعار هنا</p>
                                </motion.div>
                            ) : (
                                <motion.div className="space-y-3">
                                    {notifications.map((notif, idx) => (
                                        <motion.div
                                            key={notif.id}
                                            initial={{ opacity: 0, y: 12 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className={`bg-white dark:bg-slate-800 rounded-2xl border p-5 transition-all ${notif.is_read
                                                    ? 'border-slate-200 dark:border-slate-700'
                                                    : 'border-violet-200 dark:border-violet-800/50 bg-violet-50/50 dark:bg-violet-900/10'
                                                }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${notif.is_read
                                                        ? 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                                                        : 'bg-gradient-to-br from-violet-500 to-cyan-500 text-white'
                                                    }`}>
                                                    <Bot size={20} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-sm">{notif.title}</h4>
                                                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 leading-relaxed">
                                                        {notif.message}
                                                    </p>
                                                    {notif.reasoning && (
                                                        <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700">
                                                            <p className="text-[10px] font-bold text-violet-500 uppercase tracking-wider mb-1">
                                                                تحليل الذكاء الاصطناعي:
                                                            </p>
                                                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic">
                                                                "{notif.reasoning}"
                                                            </p>
                                                        </div>
                                                    )}
                                                    <p className="text-slate-400 text-xs mt-3">
                                                        {new Date(notif.created_at).toLocaleString('ar-EG')}
                                                    </p>
                                                </div>
                                                {!notif.is_read && (
                                                    <div className="w-2.5 h-2.5 rounded-full bg-violet-500 flex-shrink-0 mt-1.5" />
                                                )}
                                            </div>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            )}
                        </motion.div>
                    )}

                </div>
            </main>
            <Footer />
        </>
    );
}
