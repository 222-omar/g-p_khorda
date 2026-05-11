'use client';

import React, { useEffect, useState } from 'react';
import { adminAPI, productsAPI } from '@/lib/api';
import { Trash2, Package, Search, Image as ImageIcon, Gavel, Check, X, Eye } from 'lucide-react';


export default function AdminProductsPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('pending');
    
    const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
    const [selectedProductDetails, setSelectedProductDetails] = useState<any>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        setLoading(true);
        try {
            const data = await adminAPI.listProducts();
            setProducts(data);
        } catch (error) {
            console.error("Failed to load products", error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewProduct = async (id: number) => {
        setSelectedProductId(id);
        setLoadingDetails(true);
        setSelectedProductDetails(null);
        try {
            // Using the public/authenticated product endpoint to get full details
            const details = await productsAPI.get(id.toString());
            setSelectedProductDetails(details);
        } catch (error: any) {
            alert('فشل في تحميل تفاصيل المنتج');
            setSelectedProductId(null);
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleDelete = async (id: number, title: string) => {
        if (!window.confirm(`هل أنت متأكد من حذف المنتج "${title}"؟ لا يمكن التراجع.`)) return;
        
        try {
            await productsAPI.delete(id.toString());
            setProducts(products.filter(p => p.id !== id));
            alert('تم الحذف بنجاح');
        } catch (error: any) {
            alert(error.message || 'فشل في حذف المنتج');
        }
    };

    const handleReview = async (id: number, title: string, action: 'approve' | 'reject') => {
        if (action === 'reject') {
            const reason = window.prompt(`أدخل سبب رفض المنتج "${title}":`);
            if (reason === null) return;
            try {
                await adminAPI.reviewProduct(id, 'reject', reason || 'مخالف لشروط النشر');
                setProducts(products.map(p => p.id === id ? { ...p, status: 'inactive' } : p));
                alert('تم رفض المنتج');
            } catch (error: any) {
                alert(error.message || 'فشل في رفض المنتج');
            }
        } else {
            if (!window.confirm(`هل أنت متأكد من قبول المنتج "${title}"؟`)) return;
            try {
                await adminAPI.reviewProduct(id, 'approve');
                setProducts(products.map(p => p.id === id ? { ...p, status: 'active' } : p));
                alert('تم قبول المنتج بنجاح');
            } catch (error: any) {
                alert(error.message || 'فشل في قبول المنتج');
            }
        }
    };

    const filteredProducts = products
        .filter(p =>
            p.title.toLowerCase().includes(search.toLowerCase()) ||
            (p.owner_name && p.owner_name.toLowerCase().includes(search.toLowerCase()))
        )
        .filter(p => statusFilter === 'all' ? true : p.status === statusFilter);

    const statusCounts = {
        all: products.length,
        pending: products.filter(p => p.status === 'pending').length,
        active: products.filter(p => p.status === 'active').length,
        inactive: products.filter(p => p.status === 'inactive').length,
        sold: products.filter(p => p.status === 'sold').length,
    };

    const getStatusBadge = (status: string, isAuction: boolean) => {
        if (status === 'sold') return <span className="bg-green-500/10 text-green-500 text-xs px-2 py-1 rounded">مباع</span>;
        if (isAuction) return <span className="bg-purple-500/10 text-purple-500 text-xs px-2 py-1 rounded flex items-center gap-1 w-fit"><Gavel className="w-3 h-3"/> مزاد</span>;
        if (status === 'pending') return <span className="bg-amber-500/10 text-amber-500 text-xs px-2 py-1 rounded">قيد المراجعة</span>;
        if (status === 'inactive') return <span className="bg-red-500/10 text-red-500 text-xs px-2 py-1 rounded">مرفوض</span>;
        return <span className="bg-blue-500/10 text-blue-500 text-xs px-2 py-1 rounded">نشط</span>;
    };

    const tabs = [
        { key: 'pending', label: 'قيد المراجعة', count: statusCounts.pending, color: 'amber' },
        { key: 'active', label: 'نشط', count: statusCounts.active, color: 'blue' },
        { key: 'sold', label: 'مباع', count: statusCounts.sold, color: 'green' },
        { key: 'inactive', label: 'مرفوض', count: statusCounts.inactive, color: 'red' },
        { key: 'all', label: 'الكل', count: statusCounts.all, color: 'slate' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-bold text-slate-100">إدارة المنتجات</h2>
                
                <div className="relative w-full sm:w-64">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input 
                        type="text" 
                        placeholder="ابحث باسم المنتج أو البائع..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-4 pr-10 py-2 rounded-lg border border-slate-800 bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-200 placeholder:text-slate-500"
                    />
                </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex flex-wrap gap-2">
                {tabs.map(tab => {
                    const isActive = statusFilter === tab.key;
                    const colorMap: Record<string, string> = {
                        amber: isActive ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' : 'text-slate-400 border-slate-700 hover:border-amber-500/30',
                        blue: isActive ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' : 'text-slate-400 border-slate-700 hover:border-blue-500/30',
                        green: isActive ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'text-slate-400 border-slate-700 hover:border-green-500/30',
                        red: isActive ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'text-slate-400 border-slate-700 hover:border-red-500/30',
                        slate: isActive ? 'bg-slate-500/20 text-slate-300 border-slate-500/50' : 'text-slate-400 border-slate-700 hover:border-slate-500/30',
                    };
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setStatusFilter(tab.key)}
                            className={`px-4 py-2 rounded-lg border text-sm font-bold transition-all ${colorMap[tab.color]}`}
                        >
                            {tab.label}
                            {tab.count > 0 && (
                                <span className={`mr-2 px-1.5 py-0.5 rounded text-[10px] ${isActive ? 'bg-white/10' : 'bg-slate-800'}`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto scrollbar-hide">
                    <table className="w-full text-right">
                        <thead className="bg-slate-800/50 border-b border-slate-800 text-slate-400 text-sm">
                            <tr>
                                <th className="p-4 font-medium">المنتج</th>
                                <th className="p-4 font-medium">البائع</th>
                                <th className="p-4 font-medium">السعر</th>
                                <th className="p-4 font-medium">الحالة</th>
                                <th className="p-4 font-medium">تاريخ النشر</th>
                                <th className="p-4 font-medium text-center">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-400">
                                        جاري تحميل المنتجات...
                                    </td>
                                </tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-400">
                                        لا يوجد منتجات لعرضها
                                    </td>
                                </tr>
                            ) : (
                                filteredProducts.map((product) => (
                                    <tr key={product.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
                                                    {product.primary_image ? (
                                                        <img src={product.primary_image} alt={product.title} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <ImageIcon className="w-6 h-6 text-slate-500" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-100 line-clamp-1 max-w-[200px]" title={product.title}>
                                                        {product.title}
                                                    </p>
                                                    <p className="text-xs text-slate-400">{product.category}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm font-medium text-slate-300">{product.owner_name}</td>
                                        <td className="p-4 text-sm font-bold text-indigo-400">
                                            {product.price} ج.م
                                        </td>
                                        <td className="p-4 text-sm">
                                            {getStatusBadge(product.status, product.is_auction)}
                                        </td>
                                        <td className="p-4 text-sm text-slate-400">
                                            {new Date(product.created_at).toLocaleDateString('ar-EG')}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex justify-center items-center gap-1">
                                                {product.status === 'pending' && (
                                                    <>
                                                        <button 
                                                            onClick={() => handleReview(product.id, product.title, 'approve')}
                                                            className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                                                            title="قبول المنتج"
                                                        >
                                                            <Check className="w-5 h-5" />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleReview(product.id, product.title, 'reject')}
                                                            className="p-2 text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                                                            title="رفض المنتج"
                                                        >
                                                            <X className="w-5 h-5" />
                                                        </button>
                                                    </>
                                                )}
                                                <button 
                                                    onClick={() => handleViewProduct(product.id)}
                                                    className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                                    title="عرض التفاصيل"
                                                >
                                                    <Eye className="w-5 h-5" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(product.id, product.title)}
                                                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    title="حذف المنتج نهائياً"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Product Details Modal */}
            {selectedProductId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                            <h3 className="text-xl font-bold text-slate-100">تفاصيل المنتج</h3>
                            <button 
                                onClick={() => setSelectedProductId(null)}
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            {loadingDetails ? (
                                <div className="flex justify-center items-center h-64 text-slate-400">
                                    جاري تحميل التفاصيل...
                                </div>
                            ) : selectedProductDetails ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Images Column */}
                                    <div className="space-y-4">
                                        <div className="aspect-square rounded-xl overflow-hidden bg-slate-800 border border-slate-700">
                                            {selectedProductDetails.images && selectedProductDetails.images.length > 0 ? (
                                                <img 
                                                    src={selectedProductDetails.images.find((img: any) => img.is_primary)?.image || selectedProductDetails.images[0].image} 
                                                    alt={selectedProductDetails.title} 
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-500">
                                                    <ImageIcon className="w-16 h-16 opacity-50" />
                                                </div>
                                            )}
                                        </div>
                                        {selectedProductDetails.images && selectedProductDetails.images.length > 1 && (
                                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                                {selectedProductDetails.images.map((img: any, idx: number) => (
                                                    <img key={idx} src={img.image} alt="" className="w-20 h-20 rounded-lg object-cover border border-slate-700 shrink-0" />
                                                ))}
                                            </div>
                                        )}
                                        
                                        {/* Status & Actions Box */}
                                        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                                            <div className="flex flex-col gap-3">
                                                <div className="flex justify-between items-center border-b border-slate-700/50 pb-2">
                                                    <span className="text-slate-400">الحالة الحالية:</span>
                                                    {getStatusBadge(selectedProductDetails.status, selectedProductDetails.is_auction)}
                                                </div>
                                                {selectedProductDetails.status === 'pending' && (
                                                    <div className="flex gap-2 pt-2">
                                                        <button 
                                                            onClick={() => {
                                                                handleReview(selectedProductDetails.id, selectedProductDetails.title, 'approve');
                                                                setSelectedProductId(null);
                                                            }}
                                                            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
                                                        >
                                                            <Check className="w-4 h-4" /> قبول
                                                        </button>
                                                        <button 
                                                            onClick={() => {
                                                                handleReview(selectedProductDetails.id, selectedProductDetails.title, 'reject');
                                                                setSelectedProductId(null);
                                                            }}
                                                            className="flex-1 bg-rose-500 hover:bg-rose-600 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
                                                        >
                                                            <X className="w-4 h-4" /> رفض
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Info Column */}
                                    <div className="space-y-6">
                                        <div>
                                            <h2 className="text-2xl font-bold text-white mb-2">{selectedProductDetails.title}</h2>
                                            <p className="text-3xl font-black text-indigo-400">{selectedProductDetails.price} ج.م</p>
                                        </div>

                                        <div className="prose prose-invert max-w-none">
                                            <h4 className="text-slate-300 font-semibold mb-2">الوصف:</h4>
                                            <p className="text-slate-400 whitespace-pre-wrap bg-slate-950 p-4 rounded-lg border border-slate-800/50">
                                                {selectedProductDetails.description || 'لا يوجد وصف.'}
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/50">
                                                <span className="block text-xs text-slate-500 mb-1">القسم</span>
                                                <span className="text-slate-200 font-medium">{selectedProductDetails.category}</span>
                                            </div>
                                            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/50">
                                                <span className="block text-xs text-slate-500 mb-1">الحالة</span>
                                                <span className="text-slate-200 font-medium">{selectedProductDetails.condition}</span>
                                            </div>
                                            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/50">
                                                <span className="block text-xs text-slate-500 mb-1">الموقع</span>
                                                <span className="text-slate-200 font-medium">{selectedProductDetails.location}</span>
                                            </div>
                                            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/50">
                                                <span className="block text-xs text-slate-500 mb-1">رقم التواصل</span>
                                                <span className="text-slate-200 font-medium" dir="ltr">{selectedProductDetails.phone_number || 'غير متوفر'}</span>
                                            </div>
                                        </div>

                                        {selectedProductDetails.owner && (
                                            <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700">
                                                <h4 className="text-sm font-semibold text-slate-300 mb-3">بيانات البائع:</h4>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold uppercase overflow-hidden">
                                                        {selectedProductDetails.owner.avatar ? (
                                                            <img src={selectedProductDetails.owner.avatar} alt={selectedProductDetails.owner.username} className="w-full h-full object-cover" />
                                                        ) : (
                                                            selectedProductDetails.owner.username[0]
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-200">{selectedProductDetails.owner.username}</p>
                                                        <p className="text-xs text-slate-400">انضم: {new Date(selectedProductDetails.owner.date_joined).toLocaleDateString('ar-EG')}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {selectedProductDetails.detected_item && (
                                            <div className="bg-indigo-500/10 p-4 rounded-xl border border-indigo-500/20">
                                                <h4 className="text-sm font-semibold text-indigo-400 mb-1 flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                                    تصنيف الذكاء الاصطناعي (YOLO)
                                                </h4>
                                                <p className="text-slate-300 font-medium">{selectedProductDetails.detected_item}</p>
                                            </div>
                                        )}
                                        
                                        {selectedProductDetails.is_auction && selectedProductDetails.auction && (
                                            <div className="bg-purple-500/10 p-4 rounded-xl border border-purple-500/20">
                                                <h4 className="text-sm font-semibold text-purple-400 mb-3 flex items-center gap-2">
                                                    <Gavel className="w-4 h-4" />
                                                    تفاصيل المزاد
                                                </h4>
                                                <div className="space-y-2 text-sm text-slate-300">
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-400">السعر الابتدائي:</span>
                                                        <span className="font-bold">{selectedProductDetails.auction.starting_price} ج.م</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-400">أعلى سعر حالي:</span>
                                                        <span className="font-bold text-green-400">{selectedProductDetails.auction.current_bid} ج.م</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-400">وقت الانتهاء:</span>
                                                        <span className="font-bold">{new Date(selectedProductDetails.auction.end_time).toLocaleString('ar-EG')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-red-400 py-10">
                                    حدث خطأ أثناء تحميل التفاصيل
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
