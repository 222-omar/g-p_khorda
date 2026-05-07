'use client';

import React, { useEffect, useState } from 'react';
import { Users, ShoppingCart, MapPin, Gavel, BarChart3, TrendingUp } from 'lucide-react';
import { generalAPI } from '@/lib/api';

export default function AdminOverviewPage() {
    const [stats, setStats] = useState({
        total_users: 0,
        products_sold: 0,
        active_auctions: 0,
        active_governorates: 0,
        weekly_activity: [0, 0, 0, 0, 0, 0, 0],
        category_distribution: [] as { name: string; count: number }[]
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await generalAPI.getGeneralStats();
                setStats(data as any);
            } catch (error) {
                console.error("Failed to load admin stats", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const StatCard = ({ title, value, icon: Icon, colorClass, borderClass }: any) => (
        <div className={`bg-slate-900/50 backdrop-blur-xl p-6 rounded-2xl border ${borderClass} shadow-lg relative overflow-hidden group hover:border-indigo-500/50 transition-colors`}>
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${colorClass} opacity-10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:opacity-20 transition-opacity`} />
            <div className="relative z-10 flex items-start justify-between">
                <div>
                    <p className="text-slate-400 text-sm font-medium mb-2">{title}</p>
                    {loading ? (
                        <div className="h-10 w-20 bg-slate-800 animate-pulse rounded-lg"></div>
                    ) : (
                        <h3 className="text-4xl font-black text-slate-100 tracking-tight">{value}</h3>
                    )}
                </div>
                <div className={`p-4 rounded-xl bg-gradient-to-br ${colorClass} text-white shadow-lg`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
        </div>
    );

    // Real data from backend for visualization
    const activityData = stats.weekly_activity || [0, 0, 0, 0, 0, 0, 0];
    const maxActivity = Math.max(...activityData, 1);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold text-slate-100 tracking-tight">نظرة عامة</h2>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="المستخدمين" 
                    value={stats.total_users} 
                    icon={Users} 
                    colorClass="from-blue-600 to-blue-400" 
                    borderClass="border-blue-500/20"
                />
                <StatCard 
                    title="المنتجات المباعة فقط" 
                    value={stats.products_sold} 
                    icon={ShoppingCart} 
                    colorClass="from-emerald-600 to-emerald-400" 
                    borderClass="border-emerald-500/20"
                />
                <StatCard 
                    title="المزادات النشطة" 
                    value={stats.active_auctions} 
                    icon={Gavel} 
                    colorClass="from-amber-600 to-amber-400" 
                    borderClass="border-amber-500/20"
                />
                <StatCard 
                    title="المحافظات" 
                    value={stats.active_governorates} 
                    icon={MapPin} 
                    colorClass="from-purple-600 to-purple-400" 
                    borderClass="border-purple-500/20"
                />
            </div>

            {/* Visualizations Section */}
            <div className="grid grid-cols-1 gap-6">
                {/* Main Activity Chart */}
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-8 shadow-lg">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-bold flex items-center gap-2 text-slate-100">
                                <ShoppingCart className="w-5 h-5 text-indigo-400" />
                                الفئات الأكثر مبيعاً
                            </h3>
                            <p className="text-sm text-slate-400 mt-1">توزيع المبيعات بناءً على تصنيفات المنتجات</p>
                        </div>
                    </div>
                    
                    <div className="space-y-8">
                        {stats.category_distribution && stats.category_distribution.length > 0 ? (
                            stats.category_distribution.map((cat, i) => {
                                const maxCount = Math.max(...stats.category_distribution.map(c => c.count), 1);
                                const percentage = (cat.count / maxCount) * 100;
                                
                                // Beautiful distinct gradients
                                const colors = [
                                    { bar: 'from-indigo-600 to-indigo-400', text: 'text-indigo-400', bg: 'bg-indigo-400/10' },
                                    { bar: 'from-emerald-600 to-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-400/10' },
                                    { bar: 'from-amber-600 to-amber-400', text: 'text-amber-400', bg: 'bg-amber-400/10' },
                                    { bar: 'from-rose-600 to-rose-400', text: 'text-rose-400', bg: 'bg-rose-400/10' },
                                    { bar: 'from-cyan-600 to-cyan-400', text: 'text-cyan-400', bg: 'bg-cyan-400/10' }
                                ];
                                const color = colors[i % colors.length];
                                
                                return (
                                    <div key={i} className="space-y-3 group">
                                        <div className="flex justify-between items-end">
                                            <span className="text-base font-bold text-slate-200 group-hover:text-white transition-colors">
                                                {cat.name}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-sm font-black ${color.text}`}>
                                                    {cat.count} منتج مباع
                                                </span>
                                            </div>
                                        </div>
                                        <div className="h-4 w-full bg-slate-800/40 rounded-full overflow-hidden border border-slate-700/30 p-[2px]">
                                            <div 
                                                className={`h-full bg-gradient-to-r ${color.bar} rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(0,0,0,0.5)]`}
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="flex flex-col items-center justify-center h-48 text-slate-500 gap-4">
                                <div className="w-12 h-12 rounded-full border-2 border-slate-700 border-t-indigo-500 animate-spin" />
                                <p className="italic">جاري تحليل بيانات الفئات...</p>
                            </div>
                        )}
                    </div>
                    
                    <div className="mt-8 pt-6 border-t border-slate-800/50 flex items-center justify-between text-xs text-slate-500 font-medium">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-indigo-500" />
                            <span>تحديث تلقائي بناءً على العمليات الحقيقية</span>
                        </div>
                        <span>آخر 30 يوم</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
