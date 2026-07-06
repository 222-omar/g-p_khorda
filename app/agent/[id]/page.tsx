'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { useAuth } from '@/components/providers/auth-provider';
import { agentAPI, notificationsAPI } from '@/lib/api';
import { useLanguage } from '@/components/providers/language-provider';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bot, ArrowRight, Wallet, Target, Clock, AlertTriangle,
    CheckCircle2, XCircle, Trash2, Power, PowerOff, Loader2,
    Sparkles, ExternalLink, MessageSquare, ShieldAlert
} from 'lucide-react';
import Link from 'next/link';

interface UserAgent {
    id: number;
    target_item: string;
    target_label: string;
    max_budget: string;
    requirements_prompt?: string;
    is_active: boolean;
    created_at: string;
}

interface NotificationItem {
    id: number;
    title: string;
    message: string;
    reasoning?: string;
    is_read: boolean;
    related_product?: number;
    product_title?: string;
    product_image?: string;
    product_price?: string;
    related_auction?: number;
    notification_type: 'info' | 'bid_approval';
    is_approved: boolean | null;
    suggested_bid?: string | number;
    agent?: number;
    created_at: string;
}

export default function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: agentId } = use(params);
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const { dict, isRtl } = useLanguage();

    const [agent, setAgent] = useState<UserAgent | null>(null);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<Record<number, 'approve' | 'reject' | null>>({});
    const [toggleLoading, setToggleLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push(`/login?redirect=/agent/${agentId}`);
            return;
        }
        if (user) {
            loadAgentData();
        }
    }, [authLoading, user, router, agentId]);

    const loadAgentData = async () => {
        try {
            setLoading(true);
            // Fetch agent directly
            const agentData = await agentAPI.get(agentId);
            setAgent(agentData);

            // Fetch all notifications and filter client-side for this agent
            const allNotifs = await notificationsAPI.list();
            const agentNotifs = allNotifs.filter(
                (n: any) => n.agent && String(n.agent) === String(agentId)
            );
            setNotifications(agentNotifs);
        } catch (err) {
            console.error('Failed to load agent detail data:', err);
            // Fallback: list and find
            try {
                const agentsList = await agentAPI.list();
                const found = agentsList.find((a: any) => String(a.id) === String(agentId));
                if (found) {
                    setAgent(found);
                    const allNotifs = await notificationsAPI.list();
                    const agentNotifs = allNotifs.filter(
                        (n: any) => n.agent && String(n.agent) === String(agentId)
                    );
                    setNotifications(agentNotifs);
                } else {
                    router.push('/agent');
                }
            } catch (fallbackErr) {
                console.error('Fallback load failed:', fallbackErr);
                router.push('/agent');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async () => {
        if (!agent) return;
        try {
            setToggleLoading(true);
            const updated = await agentAPI.update(agent.id, { is_active: !agent.is_active });
            setAgent(prev => prev ? { ...prev, is_active: updated.is_active } : null);
        } catch (err) {
            console.error('Toggle failed:', err);
        } finally {
            setToggleLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!agent) return;
        if (!confirm(isRtl ? 'هل أنت متأكد من حذف هذا الوكيل؟' : 'Are you sure you want to delete this agent?')) return;
        try {
            setDeleteLoading(true);
            await agentAPI.delete(agent.id);
            router.push('/agent');
        } catch (err) {
            console.error('Delete failed:', err);
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleNotificationRespond = async (notifId: number, action: 'approve' | 'reject') => {
        try {
            setActionLoading(prev => ({ ...prev, [notifId]: action }));
            const response = await notificationsAPI.respond(notifId, action);
            
            // Update local notification state
            setNotifications(prev =>
                prev.map(n => {
                    if (n.id === notifId) {
                        return {
                            ...n,
                            is_approved: action === 'approve',
                            is_read: true,
                            message: action === 'approve' 
                                ? `✅ تمت الموافقة على المزايدة بمبلغ ${n.suggested_bid} جنيه.` 
                                : `❌ تم رفض عرض المزايدة.`
                        };
                    }
                    return n;
                })
            );
            
            // Reload agent data to update current bids if needed
            await loadAgentData();
        } catch (err: any) {
            alert(err.message || 'Error responding to notification');
        } finally {
            setActionLoading(prev => ({ ...prev, [notifId]: null }));
        }
    };

    if (authLoading || !user || loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#FCFDFB] dark:bg-[#0e1015]">
                <Loader2 className="animate-spin text-[#1F8A3B]" size={40} />
            </div>
        );
    }

    if (!agent) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#FCFDFB] dark:bg-[#0e1015]">
                <div className="text-center font-cairo" dir="rtl">
                    <ShieldAlert size={50} className="mx-auto text-red-500 mb-4" />
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">الوكيل غير موجود</h3>
                    <button 
                        onClick={() => router.push('/agent')}
                        className="mt-4 px-6 py-2.5 bg-[#1F8A3B] text-white rounded-xl text-sm"
                    >
                        العودة للوكلاء
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            <Navbar />
            
            <main className="pt-32 pb-20 min-h-screen bg-[#FCFDFB] dark:bg-[#0e1015] px-4 sm:px-6 lg:px-8 font-cairo" dir="rtl">
                <div className="max-w-[960px] mx-auto">
                    
                    {/* Back Link */}
                    <div className="mb-6 flex justify-start">
                        <Link 
                            href="/agent"
                            className="inline-flex items-center gap-2 text-slate-500 hover:text-[#1F8A3B] font-bold text-sm transition-colors"
                        >
                            <ArrowRight size={16} className="transform rotate-0" />
                            <span>العودة إلى لوحة الوكلاء</span>
                        </Link>
                    </div>

                    {/* Hero Header Area */}
                    <div className="bg-white dark:bg-slate-800 border border-[#E7ECEA] dark:border-slate-700 rounded-[32px] p-8 shadow-[0_12px_40px_rgba(0,0,0,0.02)] mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4 text-right">
                            <div className="w-16 h-16 bg-[#F2FBF5] dark:bg-green-950/20 border border-[#1F8A3B]/5 rounded-2xl flex items-center justify-center text-[#1F8A3B] flex-shrink-0 shadow-sm">
                                <Bot size={32} className="stroke-[2.2]" />
                            </div>
                            <div>
                                <h1 className="font-black text-2xl text-[#101828] dark:text-white">
                                    تفاصيل الوكيل: {agent.target_label}
                                </h1>
                                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 justify-start">
                                    <Clock size={12} />
                                    تاريخ الإنشاء: {new Date(agent.created_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </p>
                            </div>
                        </div>
                        
                        {/* Status Toggle Banner */}
                        <div className={`px-5 py-2.5 rounded-full border flex items-center gap-2 font-bold text-sm ${
                            agent.is_active 
                                ? 'bg-[#F2FBF5] border-[#1F8A3B]/20 text-[#1F8A3B]' 
                                : 'bg-amber-50/55 border-amber-200 text-amber-600 dark:bg-amber-950/15 dark:border-amber-900/30'
                        }`}>
                            {agent.is_active ? (
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1F8A3B] opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1F8A3B]"></span>
                                </span>
                            ) : (
                                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                            )}
                            <span>{agent.is_active ? 'نشط الآن ومراقب للمزادات' : 'متوقف عن العمل مؤقتاً'}</span>
                        </div>
                    </div>

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        
                        {/* Right Column: Agent Specifications Details (4 cols) */}
                        <div className="lg:col-span-4 flex flex-col gap-6">
                            <div className="bg-white dark:bg-slate-800 border border-[#E7ECEA] dark:border-slate-700 rounded-[30px] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.02)]">
                                <h3 className="font-bold text-lg text-[#101828] dark:text-white border-b border-[#E5E7EB] dark:border-slate-700/50 pb-3 mb-5 flex items-center gap-2 justify-start">
                                    <Target size={18} className="text-[#1F8A3B]" />
                                    <span>مواصفات البحث</span>
                                </h3>

                                <div className="space-y-5">
                                    <div>
                                        <span className="text-[11px] font-bold text-slate-400 block mb-1">الفئة المستهدفة:</span>
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-700/60 rounded-xl px-3 py-2.5 block text-right">
                                            {agent.target_label}
                                        </span>
                                    </div>

                                    <div>
                                        <span className="text-[11px] font-bold text-slate-400 block mb-1">الحد الأقصى للميزانية:</span>
                                        <span className="text-sm font-black text-[#1F8A3B] bg-[#F2FBF5] dark:bg-green-950/20 border border-[#1F8A3B]/10 rounded-xl px-3 py-2.5 block text-right flex items-center gap-2">
                                            <Wallet size={16} />
                                            <span>{Number(agent.max_budget).toLocaleString()} جنيه مصري</span>
                                        </span>
                                    </div>

                                    <div>
                                        <span className="text-[11px] font-bold text-slate-400 block mb-1">مواصفات مطابقة الذكاء الاصطناعي:</span>
                                        <p className="text-sm text-[#101828] dark:text-slate-200 bg-slate-50 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-700/60 rounded-xl p-3 leading-relaxed text-right min-h-[80px]">
                                            {agent.requirements_prompt || 'لم يتم تحديد شروط إضافية. سيطابق أي منتج من هذه الفئة.'}
                                        </p>
                                    </div>
                                </div>

                                {/* Quick Settings Card Bottom */}
                                <div className="mt-8 pt-5 border-t border-[#E5E7EB] dark:border-slate-700/50 flex flex-col gap-3">
                                    <motion.button
                                        onClick={handleToggle}
                                        disabled={toggleLoading}
                                        whileHover={{ scale: 1.015 }}
                                        whileTap={{ scale: 0.985 }}
                                        className={`w-full h-12 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 cursor-pointer transition-all ${
                                            agent.is_active 
                                                ? 'bg-amber-50/40 hover:bg-amber-50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/30 text-[#D4440C]' 
                                                : 'bg-[#F2FBF5]/40 hover:bg-[#F2FBF5] dark:bg-green-950/10 border border-[#1F8A3B]/20 text-[#1F8A3B]'
                                        }`}
                                    >
                                        {toggleLoading ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : agent.is_active ? (
                                            <>
                                                <PowerOff size={16} />
                                                <span>إيقاف مؤقت</span>
                                            </>
                                        ) : (
                                            <>
                                                <Power size={16} />
                                                <span>تشغيل الوكيل</span>
                                            </>
                                        )}
                                    </motion.button>

                                    <motion.button
                                        onClick={handleDelete}
                                        disabled={deleteLoading}
                                        whileHover={{ scale: 1.015 }}
                                        whileTap={{ scale: 0.985 }}
                                        className="w-full h-12 rounded-xl bg-red-50/40 hover:bg-red-50 dark:bg-red-950/10 border border-red-200 dark:border-red-900/30 text-[#D92D20] font-bold text-[14px] flex items-center justify-center gap-2 cursor-pointer transition-all"
                                    >
                                        {deleteLoading ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <>
                                                <Trash2 size={16} />
                                                <span>حذف الوكيل نهائياً</span>
                                            </>
                                        )}
                                    </motion.button>
                                </div>
                            </div>
                        </div>

                        {/* Left Column: Specific Notifications Timeline (8 cols) */}
                        <div className="lg:col-span-8 flex flex-col gap-6">
                            <div className="bg-white dark:bg-slate-800 border border-[#E7ECEA] dark:border-slate-700 rounded-[30px] p-6 sm:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.02)]">
                                <h3 className="font-bold text-lg text-[#101828] dark:text-white border-b border-[#E5E7EB] dark:border-slate-700/50 pb-3 mb-6 flex items-center gap-2 justify-start">
                                    <Clock size={18} className="text-[#1F8A3B]" />
                                    <span>سجل نشاط الوكيل ومطابقات المزاد</span>
                                </h3>

                                {notifications.length === 0 ? (
                                    <div className="text-center py-20">
                                        <Bot size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4 animate-pulse" />
                                        <h4 className="text-md font-bold text-slate-700 dark:text-slate-200">الوكيل قيد المراقبة الآن</h4>
                                        <p className="text-sm text-slate-400 mt-2 max-w-[360px] mx-auto">
                                            الوكيل يراقب المنصة بشكل مستمر. عند ظهور أي منتج يطابق ميزانيتك وشروطك في المزاد، ستظهر هنا جميع الإشعارات والتحليلات بالتفصيل.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="relative border-r border-[#E5E7EB] dark:border-slate-700/60 pr-6 space-y-8 mr-2">
                                        {notifications.map((notif) => {
                                            const isPendingApproval = notif.notification_type === 'bid_approval' && notif.is_approved === null;
                                            
                                            // Color coding based on type/state
                                            let cardBg = "bg-white dark:bg-slate-900 border-[#E7ECEA] dark:border-slate-700";
                                            let iconColor = "bg-slate-100 dark:bg-slate-700 text-slate-500";
                                            
                                            if (notif.notification_type === 'bid_approval') {
                                                if (notif.is_approved === null) {
                                                    cardBg = "bg-amber-50/15 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900/30";
                                                    iconColor = "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400";
                                                } else if (notif.is_approved === true) {
                                                    cardBg = "bg-green-50/15 dark:bg-green-950/10 border-green-200 dark:border-green-900/30";
                                                    iconColor = "bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400";
                                                } else {
                                                    cardBg = "bg-red-50/15 dark:bg-red-950/10 border-red-200 dark:border-red-900/30";
                                                    iconColor = "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400";
                                                }
                                            } else if (notif.title.includes('تخطى')) {
                                                cardBg = "bg-slate-50/40 dark:bg-slate-900/40 border-[#E7ECEA] dark:border-slate-800";
                                                iconColor = "bg-slate-100 dark:bg-slate-800 text-slate-400";
                                            } else if (notif.title.includes('رصيد غير كافي')) {
                                                cardBg = "bg-red-50/15 dark:bg-red-950/10 border-red-200 dark:border-red-900/30";
                                                iconColor = "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400";
                                            } else if (notif.title.includes('نجاح') || notif.title.includes('موافقة')) {
                                                cardBg = "bg-green-50/15 dark:bg-green-950/10 border-green-200 dark:border-green-900/30";
                                                iconColor = "bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400";
                                            }

                                            return (
                                                <div key={notif.id} className="relative">
                                                    
                                                    {/* Timeline Bullet Dot */}
                                                    <span className={`absolute -right-[33px] top-6 w-3.5 h-3.5 rounded-full border-4 border-white dark:border-slate-800 ${
                                                        notif.notification_type === 'bid_approval' && notif.is_approved === null 
                                                            ? 'bg-amber-500 ring-4 ring-amber-100 dark:ring-amber-950' 
                                                            : 'bg-[#1F8A3B]'
                                                    }`} />

                                                    {/* Notification Card */}
                                                    <div className={`border rounded-[24px] p-6 shadow-sm ${cardBg} transition-all`}>
                                                        
                                                        {/* Notification Header */}
                                                        <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconColor}`}>
                                                                    {notif.notification_type === 'bid_approval' ? (
                                                                        <Bot size={18} />
                                                                    ) : (
                                                                        <Clock size={18} />
                                                                    )}
                                                                </div>
                                                                <h4 className="font-bold text-md text-[#101828] dark:text-white text-right">
                                                                    {notif.title}
                                                                </h4>
                                                            </div>
                                                            <span className="text-[11px] text-slate-400">
                                                                {new Date(notif.created_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>

                                                        {/* Full Notification Text (Un-truncated) */}
                                                        <p className="text-sm text-[#475467] dark:text-slate-300 leading-relaxed text-right whitespace-pre-line mb-4">
                                                            {notif.message}
                                                        </p>

                                                        {/* Rich Product Preview (if product exists) */}
                                                        {notif.related_product && notif.product_title && (
                                                            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-4 flex items-center justify-between gap-4 mb-4 hover:border-slate-200 transition-colors">
                                                                <div className="flex items-center gap-3 min-w-0">
                                                                    {notif.product_image ? (
                                                                        <img 
                                                                            src={notif.product_image} 
                                                                            alt={notif.product_title} 
                                                                            className="w-14 h-14 rounded-xl object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0"
                                                                        />
                                                                    ) : (
                                                                        <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-850 flex items-center justify-center text-slate-400 flex-shrink-0">
                                                                            <Bot size={20} />
                                                                        </div>
                                                                    )}
                                                                    <div className="text-right min-w-0">
                                                                        <h5 className="font-bold text-sm text-[#101828] dark:text-white truncate">
                                                                            {notif.product_title}
                                                                        </h5>
                                                                        {notif.product_price && (
                                                                            <span className="text-xs font-semibold text-[#1F8A3B] block mt-1">
                                                                                القيمة: {Number(notif.product_price).toLocaleString()} جنيه
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                
                                                                <Link 
                                                                    href={`/product/${notif.related_product}`}
                                                                    className="h-10 px-3 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors flex-shrink-0"
                                                                >
                                                                    <span>عرض الإعلان</span>
                                                                    <ExternalLink size={12} />
                                                                </Link>
                                                            </div>
                                                        )}

                                                        {/* AI Reasoning Section */}
                                                        {notif.reasoning && (
                                                            <div className="bg-indigo-50/30 dark:bg-indigo-950/10 border border-indigo-100/60 dark:border-indigo-900/30 rounded-2xl p-4 flex items-start gap-3">
                                                                <Sparkles className="text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" size={16} />
                                                                <div className="text-right">
                                                                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 block mb-1">
                                                                        📋 تحليل وتقييم الوكيل الذكي:
                                                                    </span>
                                                                    <p className="text-xs text-[#101828] dark:text-slate-200 leading-relaxed">
                                                                        {notif.reasoning}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Pending Bid Actions */}
                                                        {isPendingApproval && (
                                                            <div className="flex gap-3 mt-5 pt-4 border-t border-amber-200/40 dark:border-amber-900/20">
                                                                <motion.button
                                                                    onClick={() => handleNotificationRespond(notif.id, 'approve')}
                                                                    disabled={actionLoading[notif.id] !== null}
                                                                    whileHover={{ scale: 1.015 }}
                                                                    whileTap={{ scale: 0.985 }}
                                                                    className="flex-1 h-12 bg-gradient-to-r from-[#1F8A3B] to-[#43A047] hover:from-[#176a2c] hover:to-[#388e3c] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all shadow-sm"
                                                                >
                                                                    {actionLoading[notif.id] === 'approve' ? (
                                                                        <Loader2 size={16} className="animate-spin" />
                                                                    ) : (
                                                                        <CheckCircle2 size={16} />
                                                                    )}
                                                                    <span>موافق، زايد بـ {Number(notif.suggested_bid).toLocaleString()} جنيه</span>
                                                                </motion.button>

                                                                <motion.button
                                                                    onClick={() => handleNotificationRespond(notif.id, 'reject')}
                                                                    disabled={actionLoading[notif.id] !== null}
                                                                    whileHover={{ scale: 1.015 }}
                                                                    whileTap={{ scale: 0.985 }}
                                                                    className="px-5 h-12 bg-white hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-950/20 border border-slate-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-900/30 text-slate-500 hover:text-red-500 rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
                                                                >
                                                                    {actionLoading[notif.id] === 'reject' ? (
                                                                        <Loader2 size={16} className="animate-spin" />
                                                                    ) : (
                                                                        <XCircle size={16} />
                                                                    )}
                                                                    <span>تخطى المنتج</span>
                                                                </motion.button>
                                                            </div>
                                                        )}

                                                        {/* Approved State Banner */}
                                                        {notif.notification_type === 'bid_approval' && notif.is_approved === true && (
                                                            <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30 rounded-xl text-green-700 dark:text-green-400 text-xs font-bold flex items-center gap-1.5 justify-start">
                                                                <CheckCircle2 size={14} />
                                                                <span>تمت الموافقة على المزايدة وتم تقديم العرض للمزاد بنجاح.</span>
                                                            </div>
                                                        )}

                                                        {/* Rejected State Banner */}
                                                        {notif.notification_type === 'bid_approval' && notif.is_approved === false && (
                                                            <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-xl text-red-700 dark:text-red-400 text-xs font-bold flex items-center gap-1.5 justify-start">
                                                                <XCircle size={14} />
                                                                <span>تم رفض المزايدة وتخطي هذا المنتج.</span>
                                                            </div>
                                                        )}

                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </main>
            
            <Footer />
        </>
    );
}
