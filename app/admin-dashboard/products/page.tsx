'use client';

import React, { useEffect, useState } from 'react';
import { adminAPI, productsAPI } from '@/lib/api';
import { Trash2, Package, Search, Image as ImageIcon, Gavel } from 'lucide-react';

export default function AdminProductsPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

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

    const filteredProducts = products.filter(p => 
        p.title.toLowerCase().includes(search.toLowerCase()) || 
        (p.owner_name && p.owner_name.toLowerCase().includes(search.toLowerCase()))
    );

    const getStatusBadge = (status: string, isAuction: boolean) => {
        if (status === 'sold') return <span className="bg-green-500/10 text-green-500 text-xs px-2 py-1 rounded">مباع</span>;
        if (isAuction) return <span className="bg-purple-500/10 text-purple-500 text-xs px-2 py-1 rounded flex items-center gap-1 w-fit"><Gavel className="w-3 h-3"/> مزاد</span>;
        return <span className="bg-blue-500/10 text-blue-500 text-xs px-2 py-1 rounded">نشط</span>;
    };

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
                                            <div className="flex justify-center">
                                                <button 
                                                    onClick={() => handleDelete(product.id, product.title)}
                                                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    title="حذف المنتج"
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
        </div>
    );
}
