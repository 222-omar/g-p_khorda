'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, Package, LogOut, Settings, ArrowLeft } from 'lucide-react';
import { authAPI } from '@/lib/api';

const SidebarLink = ({ href, icon: Icon, label, active }: { href: string, icon: any, label: string, active: boolean }) => (
    <Link
        href={href}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 scale-[1.02]' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-100'}`}
    >
        <Icon className={`w-5 h-5 ${active ? 'text-white' : ''}`} />
        <span className="font-medium">{label}</span>
        {active && <div className="mr-auto w-1.5 h-6 bg-white rounded-full" />}
    </Link>
);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = () => {
        authAPI.logout();
        window.location.href = '/login';
    };

    return (
        // Force dark mode context inside the admin layout
        <div className="flex h-screen bg-slate-950 text-slate-100 font-sans" dir="rtl">
            {/* Sidebar */}
            <aside className="w-64 border-l border-slate-800 bg-slate-900 flex flex-col h-full z-10 hidden md:flex">
                <div className="p-6 border-b border-slate-800 flex items-center justify-center">
                    <h1 className="text-2xl font-black text-indigo-400 tracking-tight">
                        4Sale <span className="text-slate-500 font-medium">Admin</span>
                    </h1>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    <SidebarLink
                        href="/admin-dashboard"
                        icon={LayoutDashboard}
                        label="نظرة عامة"
                        active={pathname === '/admin-dashboard' || pathname === '/admin-dashboard/'}
                    />
                    <SidebarLink
                        href="/admin-dashboard/users"
                        icon={Users}
                        label="المستخدمين"
                        active={pathname.includes('/admin-dashboard/users')}
                    />
                    <SidebarLink
                        href="/admin-dashboard/products"
                        icon={Package}
                        label="المنتجات"
                        active={pathname.includes('/admin-dashboard/products')}
                    />
                </div>

                <div className="p-4 border-t border-slate-800 space-y-2">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">تسجيل الخروج</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950">
                {/* Topbar for mobile & quick actions */}
                <header className="h-16 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-6 z-10">
                    <div className="md:hidden">
                        <h1 className="text-xl font-black text-indigo-400 tracking-tight">
                            4Sale <span className="text-slate-500 font-medium">Admin</span>
                        </h1>
                    </div>
                    <div className="hidden md:block">
                        <h2 className="text-lg font-semibold text-slate-100 tracking-tight">لوحة تحكم الإدارة</h2>
                    </div>
                </header>

                <div className="flex-1 overflow-auto scrollbar-hide p-6">
                    {children}
                </div>
            </main>
        </div>
    );
}
