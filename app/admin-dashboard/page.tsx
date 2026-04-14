'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { useAuth } from '@/components/providers/auth-provider';
import { adminAPI, productsAPI } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/animations';
import {
    Shield, Package, Users, Gavel, TrendingUp,
    Trash2, Edit3, Loader2, AlertCircle, X, Check,
    Search, ChevronDown,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────
interface AdminProduct {
    id: number;
    title: string;
    price: string;
    category: string;
    condition: string;
    status: string;
    is_auction: boolean;
    owner_name: string;
    primary_image: string | null;
    created_at: string;
}

interface AdminUser {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    is_staff: boolean;
    is_admin: boolean;
    date_joined: string;
    city: string;
    phone: string;
    trust_score: number;
    is_verified: boolean;
    total_sales: number;
}

// ─── Status Badge ───────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        sold: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        inactive: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
    };
    const labels: Record<string, string> = {
        active: 'نشط',
        sold: 'مباع',
        pending: 'معلق',
        inactive: 'غير نشط',
    };
    return (
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${styles[status] || styles.inactive}`}>
            {labels[status] || status}
        </span>
    );
}

// ─── Category Label ─────────────────────────────────────────────────────────
const CATEGORY_LABELS: Record<string, string> = {
    scrap_metals: 'خردة ومعادن',
    electronics: 'إلكترونيات',
    furniture: 'أثاث وديكور',
    cars: 'سيارات',
    real_estate: 'عقارات',
    books: 'كتب',
    other: 'أخرى',
};

// ─── Stat Card ──────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, bgColor }: {
    icon: any; label: string; value: number | string;
    color: string; bgColor: string;
}) {
    return (
        <motion.div
            variants={staggerItem}
            className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow"
        >
            <div className="flex items-center gap-4">
                <div className={`${bgColor} ${color} p-3 rounded-xl`}>
                    <Icon size={24} />
                </div>
                <div>
                    <p className="text-2xl font-black">{value}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{label}</p>
                </div>
            </div>
        </motion.div>
    );
}

// ─── Confirm Dialog ─────────────────────────────────────────────────────────
function ConfirmDialog({ open, title, message, onConfirm, onCancel, loading }: {
    open: boolean; title: string; message: string;
    onConfirm: () => void; onCancel: () => void; loading?: boolean;
}) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl border border-slate-200 dark:border-slate-700"
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-xl">
                        <AlertCircle size={22} className="text-red-500" />
                    </div>
                    <h3 className="text-lg font-bold">{title}</h3>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">{message}</p>
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-semibold rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                    >
                        إلغاء
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-bold rounded-xl bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading && <Loader2 size={14} className="animate-spin" />}
                        حذف
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// ─── Edit Product Modal ─────────────────────────────────────────────────────
function EditProductModal({ product, open, onClose, onSave }: {
    product: AdminProduct | null; open: boolean;
    onClose: () => void; onSave: (id: number, data: any) => Promise<void>;
}) {
    const [title, setTitle] = useState('');
    const [price, setPrice] = useState('');
    const [status, setStatus] = useState('');
    const [condition, setCondition] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (product) {
            setTitle(product.title);
            setPrice(product.price);
            setStatus(product.status);
            setCondition(product.condition);
        }
    }, [product]);

    if (!open || !product) return null;

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(product.id, { title, price: parseFloat(price), status, condition });
            onClose();
        } catch (err) {
            console.error('Save failed:', err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl border border-slate-200 dark:border-slate-700"
            >
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Edit3 size={18} className="text-primary" />
                        تعديل المنتج
                    </h3>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">اسم المنتج</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white dark:bg-slate-900 transition-all"
                        />
                    </div>

                    {/* Price */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">السعر (جنيه)</label>
                        <input
                            type="number"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white dark:bg-slate-900 transition-all"
                        />
                    </div>

                    {/* Status */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">الحالة</label>
                        <div className="relative">
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white dark:bg-slate-900 transition-all appearance-none"
                            >
                                <option value="active">نشط</option>
                                <option value="sold">مباع</option>
                                <option value="pending">معلق</option>
                                <option value="inactive">غير نشط</option>
                            </select>
                            <ChevronDown size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Condition */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">حالة المنتج</label>
                        <div className="relative">
                            <select
                                value={condition}
                                onChange={(e) => setCondition(e.target.value)}
                                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white dark:bg-slate-900 transition-all appearance-none"
                            >
                                <option value="new">جديد</option>
                                <option value="like-new">شبه جديد</option>
                                <option value="good">جيد</option>
                                <option value="fair">مقبول</option>
                            </select>
                            <ChevronDown size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 justify-end mt-6">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="px-4 py-2.5 text-sm font-semibold rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                    >
                        إلغاء
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-5 py-2.5 text-sm font-bold rounded-xl bg-primary hover:bg-primary/90 text-white transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
                    >
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        حفظ التعديلات
                    </button>
                </div>
            </motion.div>
        </div>
    );
}


// ═══════════════════════════════════════════════════════════════════════════
// MAIN ADMIN DASHBOARD PAGE
// ═══════════════════════════════════════════════════════════════════════════
export default function AdminDashboardPage() {
    const router = useRouter();
    const { user, loading: authLoading, isAdmin } = useAuth();

    const [activeTab, setActiveTab] = useState<'products' | 'users'>('products');
    const [products, setProducts] = useState<AdminProduct[]>([]);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Confirm delete state
    const [confirmDelete, setConfirmDelete] = useState<{
        type: 'product' | 'user';
        id: number;
        name: string;
    } | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Edit product state
    const [editProduct, setEditProduct] = useState<AdminProduct | null>(null);

    // ── Client-side admin guard ──
    useEffect(() => {
        if (!authLoading && (!user || !isAdmin)) {
            router.push('/');
        }
    }, [authLoading, user, isAdmin, router]);

    // ── Fetch data ──
    const fetchData = useCallback(async () => {
        setLoadingData(true);
        try {
            const [prods, usrs] = await Promise.all([
                adminAPI.listProducts(),
                adminAPI.listUsers(),
            ]);
            setProducts(prods);
            setUsers(usrs);
        } catch (err) {
            console.error('Failed to load admin data:', err);
        } finally {
            setLoadingData(false);
        }
    }, []);

    useEffect(() => {
        if (isAdmin) fetchData();
    }, [isAdmin, fetchData]);

    // ── Handlers ──
    const handleDeleteProduct = async () => {
        if (!confirmDelete || confirmDelete.type !== 'product') return;
        setDeleting(true);
        try {
            await productsAPI.delete(confirmDelete.id.toString());
            setProducts(prev => prev.filter(p => p.id !== confirmDelete.id));
            setConfirmDelete(null);
        } catch (err) {
            console.error('Delete product failed:', err);
        } finally {
            setDeleting(false);
        }
    };

    const handleDeleteUser = async () => {
        if (!confirmDelete || confirmDelete.type !== 'user') return;
        setDeleting(true);
        try {
            await adminAPI.deleteUser(confirmDelete.id);
            setUsers(prev => prev.filter(u => u.id !== confirmDelete.id));
            setConfirmDelete(null);
        } catch (err) {
            console.error('Delete user failed:', err);
        } finally {
            setDeleting(false);
        }
    };

    const handleEditSave = async (id: number, data: any) => {
        await productsAPI.update(id.toString(), data);
        // Refresh list
        setProducts(prev =>
            prev.map(p => p.id === id ? { ...p, title: data.title, price: String(data.price), status: data.status, condition: data.condition } : p)
        );
    };

    // ── Filtered data ──
    const filteredProducts = products.filter(p =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.owner_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const filteredUsers = users.filter(u =>
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // ── Stats ──
    const totalProducts = products.length;
    const totalUsers = users.length;
    const activeAuctions = products.filter(p => p.is_auction).length;
    const soldProducts = products.filter(p => p.status === 'sold').length;

    // ── Loading / Guard ──
    if (authLoading || !user || !isAdmin) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="animate-spin text-primary" size={40} />
            </div>
        );
    }

    return (
        <>
            <Navbar />
            <main className="pt-24 pb-16 min-h-screen px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-950">
                <div className="max-w-7xl mx-auto">

                    {/* ── Header ── */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-2.5 rounded-xl text-white shadow-lg shadow-amber-500/25">
                                <Shield size={24} />
                            </div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-black">لوحة الإدارة</h1>
                                <p className="text-slate-500 dark:text-slate-400 text-sm">إدارة المنتجات والمستخدمين</p>
                            </div>
                        </div>
                    </motion.div>

                    {/* ── Stats Cards ── */}
                    <motion.div
                        variants={staggerContainer}
                        initial="hidden"
                        animate="visible"
                        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
                    >
                        <StatCard icon={Package} label="إجمالي المنتجات" value={totalProducts} color="text-blue-600" bgColor="bg-blue-100 dark:bg-blue-900/30" />
                        <StatCard icon={Users} label="إجمالي المستخدمين" value={totalUsers} color="text-emerald-600" bgColor="bg-emerald-100 dark:bg-emerald-900/30" />
                        <StatCard icon={Gavel} label="المزادات النشطة" value={activeAuctions} color="text-orange-600" bgColor="bg-orange-100 dark:bg-orange-900/30" />
                        <StatCard icon={TrendingUp} label="المنتجات المباعة" value={soldProducts} color="text-purple-600" bgColor="bg-purple-100 dark:bg-purple-900/30" />
                    </motion.div>

                    {/* ── Tabs + Search ── */}
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden"
                    >
                        {/* Tab Bar */}
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6">
                            <div className="flex">
                                <button
                                    onClick={() => setActiveTab('products')}
                                    className={`px-5 py-4 text-sm font-bold transition-colors relative ${activeTab === 'products'
                                        ? 'text-primary'
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                        }`}
                                >
                                    <span className="flex items-center gap-2">
                                        <Package size={16} />
                                        المنتجات ({products.length})
                                    </span>
                                    {activeTab === 'products' && (
                                        <motion.div
                                            layoutId="admin-tab-indicator"
                                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                                        />
                                    )}
                                </button>
                                <button
                                    onClick={() => setActiveTab('users')}
                                    className={`px-5 py-4 text-sm font-bold transition-colors relative ${activeTab === 'users'
                                        ? 'text-primary'
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                        }`}
                                >
                                    <span className="flex items-center gap-2">
                                        <Users size={16} />
                                        المستخدمين ({users.length})
                                    </span>
                                    {activeTab === 'users' && (
                                        <motion.div
                                            layoutId="admin-tab-indicator"
                                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                                        />
                                    )}
                                </button>
                            </div>

                            {/* Search */}
                            <div className="hidden sm:flex items-center gap-2">
                                <div className="relative">
                                    <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="بحث..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-4 pr-10 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-slate-50 dark:bg-slate-900 w-56 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Mobile Search */}
                        <div className="sm:hidden px-4 pt-4">
                            <div className="relative">
                                <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="بحث..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-4 pr-10 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-slate-50 dark:bg-slate-900 transition-all"
                                />
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-4 sm:p-6">
                            {loadingData ? (
                                <div className="flex items-center justify-center py-16">
                                    <Loader2 className="animate-spin text-primary" size={32} />
                                </div>
                            ) : (
                                <AnimatePresence mode="wait">
                                    {activeTab === 'products' ? (
                                        <motion.div
                                            key="products"
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 10 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            {/* ── Products Table ── */}
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="border-b border-slate-200 dark:border-slate-700">
                                                            <th className="text-right py-3 px-3 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">#</th>
                                                            <th className="text-right py-3 px-3 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">المنتج</th>
                                                            <th className="text-right py-3 px-3 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider hidden sm:table-cell">السعر</th>
                                                            <th className="text-right py-3 px-3 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider hidden md:table-cell">التصنيف</th>
                                                            <th className="text-right py-3 px-3 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">الحالة</th>
                                                            <th className="text-right py-3 px-3 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider hidden lg:table-cell">البائع</th>
                                                            <th className="text-center py-3 px-3 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">إجراءات</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {filteredProducts.length === 0 ? (
                                                            <tr>
                                                                <td colSpan={7} className="text-center py-12 text-slate-400">
                                                                    لا توجد منتجات
                                                                </td>
                                                            </tr>
                                                        ) : (
                                                            filteredProducts.map((product, idx) => (
                                                                <motion.tr
                                                                    key={product.id}
                                                                    initial={{ opacity: 0 }}
                                                                    animate={{ opacity: 1 }}
                                                                    transition={{ delay: idx * 0.02 }}
                                                                    className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                                                                >
                                                                    <td className="py-3 px-3 text-slate-400 font-mono text-xs">{idx + 1}</td>
                                                                    <td className="py-3 px-3">
                                                                        <div className="flex items-center gap-3">
                                                                            {product.primary_image && (
                                                                                <img
                                                                                    src={product.primary_image}
                                                                                    alt={product.title}
                                                                                    className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700 hidden sm:block"
                                                                                />
                                                                            )}
                                                                            <div>
                                                                                <p className="font-bold text-sm line-clamp-1">{product.title}</p>
                                                                                <p className="text-xs text-slate-400 sm:hidden">{Number(product.price).toLocaleString()} جنيه</p>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-3 px-3 font-bold text-primary hidden sm:table-cell">
                                                                        {Number(product.price).toLocaleString()} <span className="text-xs text-slate-400">جنيه</span>
                                                                    </td>
                                                                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400 hidden md:table-cell">
                                                                        {CATEGORY_LABELS[product.category] || product.category}
                                                                    </td>
                                                                    <td className="py-3 px-3">
                                                                        <StatusBadge status={product.status} />
                                                                    </td>
                                                                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400 hidden lg:table-cell">
                                                                        {product.owner_name}
                                                                    </td>
                                                                    <td className="py-3 px-3">
                                                                        <div className="flex items-center justify-center gap-1.5">
                                                                            <motion.button
                                                                                whileHover={{ scale: 1.1 }}
                                                                                whileTap={{ scale: 0.9 }}
                                                                                onClick={() => setEditProduct(product)}
                                                                                className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors text-blue-500"
                                                                                title="تعديل"
                                                                            >
                                                                                <Edit3 size={15} />
                                                                            </motion.button>
                                                                            <motion.button
                                                                                whileHover={{ scale: 1.1 }}
                                                                                whileTap={{ scale: 0.9 }}
                                                                                onClick={() => setConfirmDelete({ type: 'product', id: product.id, name: product.title })}
                                                                                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-red-500"
                                                                                title="حذف"
                                                                            >
                                                                                <Trash2 size={15} />
                                                                            </motion.button>
                                                                        </div>
                                                                    </td>
                                                                </motion.tr>
                                                            ))
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="users"
                                            initial={{ opacity: 0, x: 10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -10 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            {/* ── Users Table ── */}
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="border-b border-slate-200 dark:border-slate-700">
                                                            <th className="text-right py-3 px-3 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">#</th>
                                                            <th className="text-right py-3 px-3 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">المستخدم</th>
                                                            <th className="text-right py-3 px-3 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider hidden sm:table-cell">البريد الإلكتروني</th>
                                                            <th className="text-right py-3 px-3 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider hidden md:table-cell">المدينة</th>
                                                            <th className="text-right py-3 px-3 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider hidden lg:table-cell">تاريخ الانضمام</th>
                                                            <th className="text-center py-3 px-3 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">إجراءات</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {filteredUsers.length === 0 ? (
                                                            <tr>
                                                                <td colSpan={6} className="text-center py-12 text-slate-400">
                                                                    لا يوجد مستخدمين
                                                                </td>
                                                            </tr>
                                                        ) : (
                                                            filteredUsers.map((u, idx) => (
                                                                <motion.tr
                                                                    key={u.id}
                                                                    initial={{ opacity: 0 }}
                                                                    animate={{ opacity: 1 }}
                                                                    transition={{ delay: idx * 0.02 }}
                                                                    className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                                                                >
                                                                    <td className="py-3 px-3 text-slate-400 font-mono text-xs">{idx + 1}</td>
                                                                    <td className="py-3 px-3">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center text-primary font-bold text-xs">
                                                                                {u.username.charAt(0).toUpperCase()}
                                                                            </div>
                                                                            <div>
                                                                                <p className="font-bold text-sm flex items-center gap-1.5">
                                                                                    {u.username}
                                                                                    {u.is_admin && (
                                                                                        <span className="text-[9px] font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white px-1.5 py-0.5 rounded-full leading-none">
                                                                                            ADMIN
                                                                                        </span>
                                                                                    )}
                                                                                </p>
                                                                                <p className="text-xs text-slate-400 sm:hidden">{u.email}</p>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400 hidden sm:table-cell">
                                                                        {u.email}
                                                                    </td>
                                                                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400 hidden md:table-cell">
                                                                        {u.city || '—'}
                                                                    </td>
                                                                    <td className="py-3 px-3 text-slate-500 text-xs hidden lg:table-cell">
                                                                        {new Date(u.date_joined).toLocaleDateString('ar-EG')}
                                                                    </td>
                                                                    <td className="py-3 px-3">
                                                                        <div className="flex items-center justify-center">
                                                                            {u.is_admin ? (
                                                                                <span className="text-xs text-slate-400 font-medium">محمي</span>
                                                                            ) : (
                                                                                <motion.button
                                                                                    whileHover={{ scale: 1.1 }}
                                                                                    whileTap={{ scale: 0.9 }}
                                                                                    onClick={() => setConfirmDelete({ type: 'user', id: u.id, name: u.username })}
                                                                                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-red-500"
                                                                                    title="حذف"
                                                                                >
                                                                                    <Trash2 size={15} />
                                                                                </motion.button>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                </motion.tr>
                                                            ))
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            )}
                        </div>
                    </motion.div>

                </div>
            </main>
            <Footer />

            {/* ── Modals ── */}
            <ConfirmDialog
                open={!!confirmDelete}
                title={confirmDelete?.type === 'product' ? 'حذف المنتج' : 'حذف المستخدم'}
                message={`هل أنت متأكد من حذف "${confirmDelete?.name || ''}"؟ لا يمكن التراجع عن هذا الإجراء.`}
                onConfirm={confirmDelete?.type === 'product' ? handleDeleteProduct : handleDeleteUser}
                onCancel={() => setConfirmDelete(null)}
                loading={deleting}
            />

            <EditProductModal
                product={editProduct}
                open={!!editProduct}
                onClose={() => setEditProduct(null)}
                onSave={handleEditSave}
            />
        </>
    );
}
