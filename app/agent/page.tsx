'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { useAuth } from '@/components/providers/auth-provider';
import { agentAPI, notificationsAPI } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bot, Plus, Trash2, Power, PowerOff, Loader2, Bell,
    Target, Wallet, ChevronDown, CheckCircle2, XCircle, Sparkles,
    BarChart3, X, CheckCheck, Trash, ThumbsUp, ThumbsDown, ExternalLink
} from 'lucide-react';
import { useLanguage } from '@/components/providers/language-provider';

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
    related_product: number | null;
    related_auction: number | null;
    notification_type: 'info' | 'bid_approval';
    is_approved: boolean | null;
    suggested_bid: string | null;
    created_at: string;
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function AgentPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const { dict, isRtl, locale } = useLanguage();

    // State
    const [agents, setAgents] = useState<UserAgent[]>([]);
    const [targets, setTargets] = useState<AgentTarget[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const notifRef = useRef<HTMLDivElement>(null);

    // Form state
    const [selectedTarget, setSelectedTarget] = useState('');
    const [maxBudget, setMaxBudget] = useState('');
    const [requirementsPrompt, setRequirementsPrompt] = useState('');
    const [formError, setFormError] = useState('');
    const [respondingId, setRespondingId] = useState<number | null>(null);

    // Close notifications dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
            setFormError(err.message || 'Error');
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

    // Delete all notifications
    const handleDeleteAll = async () => {
        try {
            await notificationsAPI.deleteAll();
            setNotifications([]);
        } catch (err) {
            console.error('Delete all failed:', err);
        }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;
    const pendingApprovals = notifications.filter(n => n.notification_type === 'bid_approval' && n.is_approved === null).length;

    // Handle approve/reject notification
    const handleRespond = async (notifId: number, action: 'approve' | 'reject') => {
        try {
            setRespondingId(notifId);
            const result = await notificationsAPI.respond(notifId, action);
            // Update local state
            setNotifications(prev =>
                prev.map(n =>
                    n.id === notifId
                        ? { ...n, is_approved: action === 'approve', is_read: true }
                        : n
                )
            );
            // Reload to get any new success notification
            await loadData();
        } catch (err: any) {
            console.error('Respond failed:', err);
            alert(err.message || 'حصل خطأ');
        } finally {
            setRespondingId(null);
        }
    };

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
            <main className="pt-24 pb-16 min-h-screen bg-slate-50 dark:bg-slate-950 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">

                    {/* ── Page Header ── */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-10"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex-1" />
                            <div className="inline-flex items-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-6 py-3 rounded-2xl shadow-sm">
                                <Bot size={28} className="text-primary" />
                                <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white">{dict.agent.title}</h1>
                            </div>
                            {/* Bell Icon with dropdown */}
                            <div className="flex-1 flex justify-end">
                                <div className="relative" ref={notifRef}>
                                    <button
                                        onClick={() => setShowNotifications(!showNotifications)}
                                        className={`relative p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm ${pendingApprovals > 0 ? 'ring-2 ring-violet-400 dark:ring-violet-500' : ''}`}
                                    >
                                        <Bell size={22} className={`${pendingApprovals > 0 ? 'text-violet-500' : 'text-slate-600 dark:text-slate-300'}`} />
                                        {pendingApprovals > 0 ? (
                                            <span className="absolute -top-1 -right-1 bg-violet-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                                                {pendingApprovals}
                                            </span>
                                        ) : unreadCount > 0 ? (
                                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                                                {unreadCount}
                                            </span>
                                        ) : null}
                                    </button>

                                    {/* Notifications Dropdown */}
                                    <AnimatePresence>
                                        {showNotifications && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                                                transition={{ duration: 0.15 }}
                                                className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 w-[340px] sm:w-96 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden"
                                            >
                                                {/* Dropdown Header */}
                                                <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                                                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                                        <Bell size={16} className="text-primary" />
                                                        الإشعارات
                                                        {unreadCount > 0 && (
                                                            <span className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>
                                                        )}
                                                    </h3>
                                                    <div className="flex items-center gap-1">
                                                        {unreadCount > 0 && (
                                                            <button onClick={handleMarkAllRead} title="تعليم الكل مقروء" className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-emerald-600 transition-colors">
                                                                <CheckCheck size={16} />
                                                            </button>
                                                        )}
                                                        {notifications.length > 0 && (
                                                            <button onClick={handleDeleteAll} title="حذف الكل" className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-red-500 transition-colors">
                                                                <Trash size={16} />
                                                            </button>
                                                        )}
                                                        <button onClick={() => setShowNotifications(false)} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 transition-colors">
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Dropdown Body */}
                                                <div className="max-h-80 overflow-y-auto">
                                                    {notifications.length === 0 ? (
                                                        <div className="py-10 text-center text-slate-400 text-sm">
                                                            <Bell size={28} className="mx-auto mb-2 opacity-30" />
                                                            مفيش إشعارات
                                                        </div>
                                                    ) : (
                                                        notifications.map((notif) => {
                                                            const isSuccess = notif.title.includes('✅') || notif.title.includes('بنجاح');
                                                            const isRejection = notif.title.includes('تخطى');
                                                            const isBudget = notif.title.includes('⛔') || notif.title.includes('رصيد');
                                                            const isBidApproval = notif.notification_type === 'bid_approval' && notif.is_approved === null;
                                                            const wasApproved = notif.notification_type === 'bid_approval' && notif.is_approved === true;
                                                            const wasRejected = notif.notification_type === 'bid_approval' && notif.is_approved === false;

                                                            let icon = '🤖';
                                                            let accent = 'border-transparent';
                                                            if (isBidApproval) { icon = '🔔'; accent = 'border-violet-400 dark:border-violet-600'; }
                                                            else if (wasApproved) { icon = '✅'; accent = 'border-emerald-300 dark:border-emerald-700'; }
                                                            else if (wasRejected) { icon = '❌'; accent = 'border-slate-300 dark:border-slate-600'; }
                                                            else if (isSuccess) { icon = '✅'; accent = 'border-emerald-300 dark:border-emerald-700'; }
                                                            else if (isRejection) { icon = '⚠️'; accent = 'border-amber-300 dark:border-amber-700'; }
                                                            else if (isBudget) { icon = '⛔'; accent = 'border-red-300 dark:border-red-700'; }

                                                            return (
                                                                <div key={notif.id} className={`p-3.5 border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors border-r-[3px] ${accent} ${!notif.is_read ? 'bg-primary/[0.03]' : ''}`}>
                                                                    <div className="flex items-start gap-2.5">
                                                                        <span className="text-base mt-0.5">{icon}</span>
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className={`text-sm font-bold text-slate-800 dark:text-slate-200 ${!notif.is_read ? '' : 'opacity-70'}`}>
                                                                                {notif.title}
                                                                            </p>
                                                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed whitespace-pre-wrap">{notif.message}</p>
                                                                            
                                                                            {/* Product link for bid_approval notifications */}
                                                                            {notif.related_product && notif.notification_type === 'bid_approval' && (
                                                                                <a
                                                                                    href={`/product/${notif.related_product}`}
                                                                                    className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-primary hover:text-primary-700 transition-colors"
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                >
                                                                                    <ExternalLink size={12} />
                                                                                    شوف صفحة المنتج
                                                                                </a>
                                                                            )}

                                                                            {/* Suggested bid amount */}
                                                                            {isBidApproval && notif.suggested_bid && (
                                                                                <div className="mt-2 px-3 py-1.5 bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 rounded-lg">
                                                                                    <span className="text-xs font-bold text-violet-700 dark:text-violet-300">
                                                                                        💰 المبلغ المقترح: {Number(notif.suggested_bid).toLocaleString()} جنيه
                                                                                    </span>
                                                                                </div>
                                                                            )}

                                                                            {/* Approve / Reject buttons */}
                                                                            {isBidApproval && (
                                                                                <div className="flex items-center gap-2 mt-3">
                                                                                    <button
                                                                                        onClick={(e) => { e.stopPropagation(); handleRespond(notif.id, 'approve'); }}
                                                                                        disabled={respondingId === notif.id}
                                                                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                                                                                    >
                                                                                        {respondingId === notif.id ? (
                                                                                            <Loader2 size={14} className="animate-spin" />
                                                                                        ) : (
                                                                                            <ThumbsUp size={14} />
                                                                                        )}
                                                                                        موافق أزايد
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={(e) => { e.stopPropagation(); handleRespond(notif.id, 'reject'); }}
                                                                                        disabled={respondingId === notif.id}
                                                                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                                                                                    >
                                                                                        <ThumbsDown size={14} />
                                                                                        لا شكراً
                                                                                    </button>
                                                                                </div>
                                                                            )}

                                                                            {/* Show approval status for already responded */}
                                                                            {wasApproved && (
                                                                                <div className="mt-2 flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                                                                    <CheckCircle2 size={14} />
                                                                                    تمت الموافقة والمزايدة
                                                                                </div>
                                                                            )}
                                                                            {wasRejected && (
                                                                                <div className="mt-2 flex items-center gap-1 text-xs font-bold text-slate-400">
                                                                                    <XCircle size={14} />
                                                                                    تم الرفض
                                                                                </div>
                                                                            )}

                                                                            <p className="text-[10px] text-slate-400 mt-1.5">
                                                                                {new Date(notif.created_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                                            </p>
                                                                        </div>
                                                                        {!notif.is_read && <span className="w-2 h-2 bg-primary rounded-full mt-1.5 shrink-0" />}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto text-center mt-4">
                            {dict.agent.desc} 🤖
                        </p>
                    </motion.div>

                    {/* ── Loading Skeleton ── */}
                    {loading && (
                        <div className="flex flex-col gap-4 py-8">
                           {[1,2,3].map(i => (
                               <div key={i} className="animate-pulse bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col sm:flex-row items-start gap-4 shadow-sm">
                                   <div className="w-14 h-14 bg-slate-100 dark:bg-slate-700 rounded-xl shrink-0"></div>
                                   <div className="flex-1 space-y-4 w-full">
                                       <div className="h-5 bg-slate-100 dark:bg-slate-700 rounded w-1/3"></div>
                                       <div className="flex flex-wrap gap-2">
                                           <div className="h-8 bg-slate-100 dark:bg-slate-700 rounded-xl w-28"></div>
                                           <div className="h-8 bg-slate-100 dark:bg-slate-700 rounded-xl w-24"></div>
                                       </div>
                                       <div className="h-12 bg-slate-100 dark:bg-slate-700 rounded-xl w-full mt-4"></div>
                                   </div>
                               </div>
                           ))}
                        </div>
                    )}

                    {/* ── AGENTS LIST ── */}
                    {!loading && (
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
                                className="w-full mb-6 bg-primary hover:bg-primary-700 text-white shadow-md shadow-primary/20 py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
                            >
                                <Plus size={22} className="text-white" />
                                {dict.agent.add}
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
                                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-200">
                                                <Sparkles size={20} className="text-primary" />
                                                {dict.agent.newAgent}
                                            </h3>

                                            {/* Target Selection */}
                                            <div className="mb-4">
                                                <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">
                                                    <Target size={14} className="inline ml-1" />
                                                    {dict.agent.target}
                                                </label>
                                                <div className="relative">
                                                    <select
                                                        value={selectedTarget}
                                                        onChange={(e) => setSelectedTarget(e.target.value)}
                                                        className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm bg-white dark:bg-slate-700 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 appearance-none cursor-pointer transition-all"
                                                    >
                                                        <option value="">{dict.agent.selectTarget}</option>
                                                        {targets.map((t) => (
                                                            <option key={t.id} value={t.id}>
                                                                {isRtl ? t.label_ar : t.label}
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
                                                    {dict.agent.maxBudget}
                                                </label>
                                                <input
                                                    type="number"
                                                    value={maxBudget}
                                                    onChange={(e) => setMaxBudget(e.target.value)}
                                                    placeholder="5000"
                                                    min="1"
                                                    className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm bg-white dark:bg-slate-700 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                                                />
                                            </div>

                                            {/* Requirements Prompt */}
                                            <div className="mb-5">
                                                <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2">
                                                    {dict.agent.requirements}
                                                </label>
                                                <textarea
                                                    value={requirementsPrompt}
                                                    onChange={(e) => setRequirementsPrompt(e.target.value)}
                                                    placeholder={dict.agent.requirementsPlaceholder}
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
                                            <div className="flex gap-3 mt-6">
                                                <motion.button
                                                    onClick={handleCreate}
                                                    disabled={creating}
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    className="flex-1 bg-primary hover:bg-primary-700 text-white shadow-md shadow-primary/20 py-3 rounded-xl font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2 border border-primary/20"
                                                >
                                                    {creating ? (
                                                        <Loader2 size={18} className="animate-spin text-white/70" />
                                                    ) : (
                                                        <CheckCircle2 size={18} className="text-white" />
                                                    )}
                                                    {creating ? dict.agent.creating : dict.agent.create}
                                                </motion.button>
                                                <button
                                                    onClick={() => { setShowForm(false); setFormError(''); }}
                                                    className="px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                                                >
                                                    {dict.agent.cancel}
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
                                    className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm"
                                >
                                    <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 2.5, repeat: Infinity }}>
                                        <Bot size={56} className="mx-auto text-slate-300 dark:text-slate-600" />
                                    </motion.div>
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-4">{dict.agent.noAgents}</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">{dict.agent.noAgentsDesc}</p>
                                </motion.div>
                            ) : (
                                <motion.div className="space-y-4">
                                    {agents.map((agent, idx) => (
                                        <motion.div
                                            key={agent.id}
                                            initial={{ opacity: 0, y: 16 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.08 }}
                                            className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm transition-all ${agent.is_active
                                                    ? 'opacity-100'
                                                    : 'opacity-60 grayscale'
                                                }`}
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                                <div className="flex items-start gap-4 flex-1">
                                                    {/* Status icon */}
                                                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 text-primary shadow-inner">
                                                        <Bot size={26} />
                                                    </div>

                                                    {/* Info */}
                                                    <div className="flex-1 min-w-0 pt-1">
                                                        <h4 className="font-bold text-xl text-slate-900 dark:text-slate-100 truncate">{agent.target_label}</h4>
                                                        <div className="flex flex-wrap items-center gap-2 mt-3">
                                                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl">
                                                                <Wallet size={14} className="text-slate-400" />
                                                                <span className="text-sm text-slate-700 dark:text-slate-300 font-bold pb-px">{dict.agent.budget}: {Number(agent.max_budget).toLocaleString()}</span>
                                                            </div>
                                                            <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl ${agent.is_active
                                                                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                                                                    : 'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-500 border border-slate-200 dark:border-slate-700'
                                                                }`}>
                                                                {agent.is_active ? (
                                                                    <>
                                                                        <span className="relative flex h-2 w-2">
                                                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                                                                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                                        </span>
                                                                        {dict.agent.active}
                                                                    </>
                                                                ) : dict.agent.paused}
                                                            </span>
                                                        </div>
                                                        {agent.requirements_prompt && (
                                                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 p-4 rounded-xl break-words leading-relaxed shadow-inner">
                                                                <span className="font-bold text-slate-900 dark:text-slate-300 text-xs block mb-1.5">{dict.agent.requirementsLabel}:</span>
                                                                {agent.requirements_prompt}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-2 w-full mt-6 pt-5 border-t border-slate-100 dark:border-slate-700">
                                                <button className="flex-1 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-bold py-3 rounded-xl border border-slate-200 dark:border-slate-600 transition-all text-sm flex items-center justify-center gap-2">
                                                    <BarChart3 size={16} />
                                                    {dict.agent.stats}
                                                </button>
                                                <motion.button
                                                    onClick={() => handleToggle(agent)}
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    title={agent.is_active ? dict.agent.stop : dict.agent.start}
                                                    className={`p-3 rounded-xl border transition-colors ${agent.is_active
                                                            ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20'
                                                            : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20'
                                                        }`}
                                                >
                                                    {agent.is_active ? <PowerOff size={18} /> : <Power size={18} />}
                                                </motion.button>
                                                <motion.button
                                                    onClick={() => handleDelete(agent.id)}
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    title={dict.agent.delete}
                                                    className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                                                >
                                                    <Trash2 size={18} />
                                                </motion.button>
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
