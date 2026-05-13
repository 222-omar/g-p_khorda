'use client';

import React, { useEffect, useState } from 'react';
import { adminAPI } from '@/lib/api';
import { Trash2, UserCircle, Search, ShieldAlert } from 'lucide-react';
import { useLanguage } from '@/components/providers/language-provider';

export default function AdminUsersPage() {
    const { dict, locale } = useLanguage();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const data = await adminAPI.listUsers();
            setUsers(data);
        } catch (error) {
            console.error("Failed to load users", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number, username: string) => {
        if (!window.confirm(`${dict.adminDashboard.confirmDeleteUser} ${username}? ${dict.adminDashboard.cantUndo}`)) return;
        
        try {
            await adminAPI.deleteUser(id);
            setUsers(users.filter(u => u.id !== id));
            alert(dict.adminDashboard.deletedSuccess);
        } catch (error: any) {
            alert(error.message || dict.adminDashboard.deleteFailed);
        }
    };

    const filteredUsers = users.filter(u => 
        u.username.toLowerCase().includes(search.toLowerCase()) || 
        (u.email && u.email.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-bold text-slate-100">{dict.adminDashboard.manageUsers}</h2>
                
                <div className="relative w-full sm:w-64">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input 
                        type="text" 
                        placeholder={dict.adminDashboard.searchUsers} 
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
                                <th className="p-4 font-medium">{dict.adminDashboard.user}</th>
                                <th className="p-4 font-medium">{dict.adminDashboard.email}</th>
                                <th className="p-4 font-medium">{dict.adminDashboard.walletBalance}</th>
                                <th className="p-4 font-medium">{dict.adminDashboard.joinDate}</th>
                                <th className="p-4 font-medium text-center">{dict.adminDashboard.actions}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-400">
                                        {dict.adminDashboard.loadingUsers}
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-400">
                                        {dict.adminDashboard.noUsers}
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                                    <UserCircle className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-100 flex items-center gap-2">
                                                        {user.username}
                                                        {user.is_superuser && (
                                                            <span className="bg-red-500/10 text-red-400 text-xs px-2 py-0.5 rounded flex items-center gap-1">
                                                                <ShieldAlert className="w-3 h-3"/> {dict.adminDashboard.admin}
                                                            </span>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-slate-400">{user.profile?.city || dict.adminDashboard.notSpecified}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-slate-300">{user.email || '-'}</td>
                                        <td className="p-4 text-sm font-medium text-emerald-400">
                                            {user.profile?.wallet_balance || 0} {dict.currency}
                                        </td>
                                        <td className="p-4 text-sm text-slate-400">
                                            {new Date(user.date_joined).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US')}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex justify-center">
                                                <button 
                                                    onClick={() => handleDelete(user.id, user.username)}
                                                    disabled={user.is_superuser}
                                                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                                                    title={user.is_superuser ? dict.adminDashboard.cantDeleteAdmin : dict.adminDashboard.deleteUser}
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
