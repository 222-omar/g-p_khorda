'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { adminAPI, productsAPI } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
    Loader2,
    Users,
    Package,
    Clock,
    TrendingUp,
    ShieldCheck,
    LayoutDashboard,
    UserCog,
    PackageSearch,
    CircleDollarSign,
    Settings,
    Activity,
    ChevronLeft,
    Trash2,
    Eye,
    AlertTriangle,
    Gavel,
    LogOut,
    RefreshCw,
    ArrowUpRight,
} from 'lucide-react';

// ── Sidebar nav items ────────────────────────────────────────────────────────
const sidebarItems = [
    { id: 'overview', label: 'نظرة عامة', icon: LayoutDashboard, href: '#' },
    { id: 'users', label: 'إدارة المستخدمين', icon: UserCog, href: '#' },
    { id: 'products', label: 'مراجعة المنتجات', icon: PackageSearch, href: '#' },
    { id: 'finance', label: 'التقارير المالية', icon: CircleDollarSign, href: '#' },
    { id: 'settings', label: 'إعدادات المنصة', icon: Settings, href: '#' },
];

// ── Arabic relative time ─────────────────────────────────────────────────────
function timeAgo(dateStr?: string): string {
    if (!dateStr) return '—';
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'منذ لحظات';
    if (seconds < 3600) return `منذ ${Math.floor(seconds / 60)} دقيقة`;
    if (seconds < 86400) return `منذ ${Math.floor(seconds / 3600)} ساعة`;
    if (seconds < 604800) return `منذ ${Math.floor(seconds / 86400)} يوم`;
    return `منذ ${Math.floor(seconds / 604800)} أسبوع`;
}

// ── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { label: string; cls: string }> = {
        active: { label: 'نشط', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
        pending: { label: 'بانتظار المراجعة', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
        sold: { label: 'مباع', cls: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' },
        rejected: { label: 'مرفوض', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
    };
    const info = map[status] || { label: status, cls: 'bg-gray-100 text-gray-600' };
    return (
        <span className={`inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full ${info.cls}`}>
            {info.label}
        </span>
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function AdminDashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('overview');
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const isAdmin = user?.user?.role === 'ADMIN';

    const fetchStats = useCallback(async () => {
        try {
            setError(null);
            const data = await adminAPI.getDashboardStats();
            setStats(data);
        } catch (err: any) {
            setError(err.message || 'فشل في تحميل البيانات');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login?redirect=/admin');
            return;
        }
        if (!authLoading && user && !isAdmin) {
            router.push('/dashboard');
            return;
        }
        if (user && isAdmin) {
            fetchStats();
        }
    }, [authLoading, user, isAdmin, router, fetchStats]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchStats();
    };

    const handleDeleteProduct = async (id: number) => {
        if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
        try {
            await adminAPI.deleteProduct(id);
            fetchStats();
        } catch {
            alert('حدث خطأ أثناء الحذف');
        }
    };

    // ── Loading / Guard ──────────────────────────────────────────────────────
    if (authLoading || !user || !isAdmin) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-950">
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
                    <Loader2 className="animate-spin text-indigo-400" size={44} />
                </motion.div>
            </div>
        );
    }

    const kpiCards = stats
        ? [
              {
                  label: 'إجمالي المستخدمين',
                  value: stats.total_users,
                  sub: `+${stats.new_users_week} هذا الأسبوع`,
                  icon: Users,
                  gradient: 'from-indigo-500 to-purple-600',
                  shadow: 'shadow-indigo-500/20',
              },
              {
                  label: 'الإعلانات النشطة',
                  value: stats.active_products,
                  sub: `${stats.total_products} إجمالي`,
                  icon: Package,
                  gradient: 'from-emerald-500 to-teal-600',
                  shadow: 'shadow-emerald-500/20',
              },
              {
                  label: 'بانتظار المراجعة',
                  value: stats.pending_products,
                  sub: stats.pending_products > 0 ? 'يتطلب إجراء' : 'لا يوجد',
                  icon: Clock,
                  gradient:
                      stats.pending_products > 0
                          ? 'from-amber-500 to-orange-600'
                          : 'from-slate-500 to-slate-600',
                  shadow:
                      stats.pending_products > 0
                          ? 'shadow-amber-500/20'
                          : 'shadow-slate-500/10',
                  highlight: stats.pending_products > 0,
              },
              {
                  label: 'المنتجات المباعة',
                  value: stats.sold_products,
                  sub: `${stats.active_auctions} مزاد نشط`,
                  icon: TrendingUp,
                  gradient: 'from-sky-500 to-blue-600',
                  shadow: 'shadow-sky-500/20',
              },
          ]
        : [];

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-[#0c0f1a] text-white font-sans" dir="rtl">

            {/* ━━━ STICKY HEADER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
            <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0c0f1a]/80 backdrop-blur-xl">
                <div className="max-w-[1440px] mx-auto flex items-center justify-between px-6 h-16">
                    {/* Left: Title */}
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                            <ShieldCheck size={18} />
                        </div>
                        <div>
                            <h1 className="text-sm font-black tracking-wide">لوحة تحكم الإدارة</h1>
                            <p className="text-[11px] text-slate-400 -mt-0.5">Admin Control Panel</p>
                        </div>
                    </div>

                    {/* Center: System Status */}
                    <div className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                        </span>
                        <span className="text-[12px] font-semibold text-emerald-400">النظام يعمل بكفاءة</span>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-3">
                        <motion.button
                            onClick={handleRefresh}
                            whileHover={{ rotate: 180 }}
                            transition={{ duration: 0.4 }}
                            disabled={refreshing}
                            className="w-9 h-9 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] flex items-center justify-center transition-colors disabled:opacity-50"
                            title="تحديث البيانات"
                        >
                            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                        </motion.button>
                        <Link href="/dashboard">
                            <button className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold rounded-xl bg-white/[0.05] hover:bg-white/[0.1] transition-colors">
                                <ChevronLeft size={16} />
                                العودة للمتجر
                            </button>
                        </Link>
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold ring-2 ring-indigo-500/30">
                            {user?.user?.username?.charAt(0)?.toUpperCase() || 'A'}
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-[1440px] mx-auto flex">

                {/* ━━━ SIDEBAR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <aside className="hidden lg:flex flex-col w-64 border-l border-white/[0.06] min-h-[calc(100vh-4rem)] sticky top-16 p-4 gap-1">
                    {sidebarItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200
                                ${activeTab === item.id
                                    ? 'bg-indigo-500/15 text-indigo-400 shadow-sm shadow-indigo-500/10'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                                }`}
                        >
                            <item.icon size={18} />
                            {item.label}
                        </button>
                    ))}

                    {/* Divider */}
                    <div className="my-3 border-t border-white/[0.06]" />

                    {/* Logout */}
                    <button
                        onClick={() => { router.push('/profile'); }}
                        className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold
                                   text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                        <LogOut size={18} />
                        تسجيل الخروج
                    </button>

                    {/* Version */}
                    <div className="mt-auto pt-6 px-4">
                        <p className="text-[11px] text-slate-600">الإصدار 1.0.0</p>
                        <p className="text-[10px] text-slate-700 mt-0.5">4Sale Admin Panel</p>
                    </div>
                </aside>

                {/* ━━━ MAIN CONTENT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
                <main className="flex-1 p-6 lg:p-8 min-h-[calc(100vh-4rem)]">

                    {/* Error */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-semibold flex items-center gap-2"
                            >
                                <AlertTriangle size={18} />
                                {error}
                                <button onClick={handleRefresh} className="mr-auto text-red-300 hover:text-white underline text-[12px]">
                                    إعادة المحاولة
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-32 gap-4">
                            <Loader2 className="animate-spin text-indigo-400" size={40} />
                            <p className="text-slate-500 text-sm animate-pulse">جاري تحميل لوحة التحكم...</p>
                        </div>
                    ) : stats ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-8"
                        >
                            {/* ── Page Title ── */}
                            <div>
                                <h2 className="text-2xl font-black">نظرة عامة</h2>
                                <p className="text-slate-500 text-sm mt-1">إحصائيات المنصة في لمحة واحدة</p>
                            </div>

                            {/* ── KPI Cards ── */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                                {kpiCards.map((card, i) => (
                                    <motion.div
                                        key={card.label}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.08 }}
                                        className={`relative overflow-hidden rounded-2xl p-5
                                                    bg-gradient-to-br ${card.gradient}
                                                    shadow-xl ${card.shadow}
                                                    ${card.highlight ? 'ring-2 ring-amber-400/40 animate-pulse-slow' : ''}`}
                                    >
                                        {/* BG pattern */}
                                        <div className="absolute top-0 right-0 w-28 h-28 rounded-full bg-white/[0.07] -translate-y-8 translate-x-8" />

                                        <div className="relative z-10 flex items-start justify-between">
                                            <div>
                                                <p className="text-sm font-semibold text-white/80 mb-1">{card.label}</p>
                                                <p className="text-3xl font-black">{card.value.toLocaleString('ar-EG')}</p>
                                                <p className="text-[12px] text-white/60 mt-1.5 flex items-center gap-1">
                                                    {card.highlight && <AlertTriangle size={12} />}
                                                    {card.sub}
                                                </p>
                                            </div>
                                            <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                                                <card.icon size={22} />
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {/* ── Quick Stats Row ── */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {[
                                    { label: 'إجمالي الإعلانات', value: stats.total_products, icon: Package },
                                    { label: 'إجمالي المزادات', value: stats.total_auctions, icon: Gavel },
                                    { label: 'مزادات نشطة', value: stats.active_auctions, icon: Activity },
                                    { label: 'مستخدمين جدد (أسبوع)', value: stats.new_users_week, icon: ArrowUpRight },
                                ].map((item, i) => (
                                    <motion.div
                                        key={item.label}
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 + i * 0.06 }}
                                        className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 flex items-center gap-3"
                                    >
                                        <div className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center text-slate-400">
                                            <item.icon size={18} />
                                        </div>
                                        <div>
                                            <p className="text-lg font-black">{item.value.toLocaleString('ar-EG')}</p>
                                            <p className="text-[11px] text-slate-500">{item.label}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {/* ── TABLES ── */}
                            <div className="grid lg:grid-cols-2 gap-6">

                                {/* Recent Products Table */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                    className="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden"
                                >
                                    <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                                        <div className="flex items-center gap-2">
                                            <PackageSearch size={18} className="text-indigo-400" />
                                            <h3 className="font-bold text-sm">أحدث المنتجات</h3>
                                        </div>
                                        <span className="text-[11px] text-slate-500">{stats.recent_products.length} عنصر</span>
                                    </div>

                                    <div className="divide-y divide-white/[0.04]">
                                        {stats.recent_products.length === 0 ? (
                                            <p className="text-center text-slate-500 text-sm py-8">لا توجد منتجات</p>
                                        ) : (
                                            stats.recent_products.map((p: any) => (
                                                <div
                                                    key={p.id}
                                                    className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors"
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold truncate">{p.title}</p>
                                                        <p className="text-[11px] text-slate-500 mt-0.5">
                                                            {p.owner_name} · {timeAgo(p.created_at)}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <span className="text-sm font-bold text-emerald-400">
                                                            {Number(p.price).toLocaleString('ar-EG')}
                                                        </span>
                                                        <StatusBadge status={p.status} />
                                                        <Link href={`/product/${p.id}`}>
                                                            <button className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-indigo-500/20 hover:text-indigo-400 flex items-center justify-center transition-colors" title="عرض">
                                                                <Eye size={14} />
                                                            </button>
                                                        </Link>
                                                        <button
                                                            onClick={() => handleDeleteProduct(p.id)}
                                                            className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center transition-colors"
                                                            title="حذف"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </motion.div>

                                {/* Recent Users Table */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.6 }}
                                    className="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden"
                                >
                                    <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                                        <div className="flex items-center gap-2">
                                            <UserCog size={18} className="text-purple-400" />
                                            <h3 className="font-bold text-sm">أحدث المستخدمين</h3>
                                        </div>
                                        <span className="text-[11px] text-slate-500">{stats.recent_users.length} مستخدم</span>
                                    </div>

                                    <div className="divide-y divide-white/[0.04]">
                                        {stats.recent_users.length === 0 ? (
                                            <p className="text-center text-slate-500 text-sm py-8">لا يوجد مستخدمين</p>
                                        ) : (
                                            stats.recent_users.map((u: any) => (
                                                <div
                                                    key={u.id}
                                                    className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors"
                                                >
                                                    {/* Avatar */}
                                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/[0.08] flex items-center justify-center text-sm font-bold text-indigo-300 shrink-0">
                                                        {u.username?.charAt(0)?.toUpperCase() || '?'}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-sm font-semibold truncate">{u.username}</p>
                                                            {u.is_staff && (
                                                                <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded">
                                                                    مسؤول
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[11px] text-slate-500 truncate">{u.email}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <span className="text-[11px] text-slate-500 whitespace-nowrap">
                                                            {timeAgo(u.date_joined)}
                                                        </span>
                                                        <span className={`w-2 h-2 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-red-500'}`}
                                                            title={u.is_active ? 'نشط' : 'محظور'} />
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </motion.div>
                            </div>

                        </motion.div>
                    ) : null}
                </main>
            </div>

            {/* ── Mobile Bottom Nav ── */}
            <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-[#0c0f1a]/95 backdrop-blur-xl border-t border-white/[0.06]">
                <div className="flex justify-around py-2">
                    {sidebarItems.slice(0, 4).map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl text-[10px] font-semibold transition-colors
                                ${activeTab === item.id ? 'text-indigo-400' : 'text-slate-500'}`}
                        >
                            <item.icon size={20} />
                            {item.label.split(' ')[0]}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
