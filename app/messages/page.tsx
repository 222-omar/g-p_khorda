'use client';

import { useState, useEffect, useRef } from 'react';
import { chatAPI } from '@/lib/api';
import { useAuth } from '@/components/providers/auth-provider';
import { Conversation, ChatMessage } from '@/lib/types';
import { MessageCircle, Send, ArrowLeft, Package, User, MoreVertical, Search, Smile, Paperclip, Trash2, Edit3, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navbar } from '@/components/layout/navbar';
import Link from 'next/link';

export default function MessagesPage() {
    const { user: authUser } = useAuth();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [showMobileChat, setShowMobileChat] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ msgId: number; x: number; y: number } | null>(null);
    const [editingMsg, setEditingMsg] = useState<{ id: number; content: string } | null>(null);
    const [headerMenu, setHeaderMenu] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Current user identification
    const currentUserId = authUser?.user?.id;

    // Load conversations
    useEffect(() => {
        loadConversations();
    }, []);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
        }
    }, [newMessage]);

    // Polling for new messages
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (selectedConversation && authUser) {
            interval = setInterval(async () => {
                try {
                    // Check if token still exists before polling
                    const token = document.cookie.split(';').find(c => c.trim().startsWith('access_token='));
                    if (!token) {
                        clearInterval(interval);
                        return;
                    }

                    const data = await chatAPI.getConversation(selectedConversation.id);
                    // Check if message count increased
                    if (data.messages && data.messages.length > messages.length) {
                        setMessages(data.messages);
                        // Also update last message in conversation list
                        const lastMsg = data.messages[data.messages.length - 1];
                        setConversations(prev =>
                            prev.map(c => c.id === selectedConversation.id
                                ? { ...c, last_message: { content: lastMsg.content, sender_name: lastMsg.sender_name, created_at: lastMsg.created_at, is_read: lastMsg.is_read }, updated_at: lastMsg.created_at }
                                : c
                            ).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                        );
                    }
                } catch (err: any) {
                    // Stop polling on auth errors (401)
                    const status = err?.response?.status || err?.status;
                    if (status === 401) {
                        clearInterval(interval);
                    }
                }
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [selectedConversation, messages.length, authUser]);

    const loadConversations = async () => {
        try {
            setLoading(true);
            const data = await chatAPI.getConversations();
            setConversations(Array.isArray(data) ? data : (data as any)?.results || []);
        } catch (err) {
            console.error('Failed to load conversations:', err);
        } finally {
            setLoading(false);
        }
    };

    const selectConversation = async (conv: Conversation) => {
        try {
            const data = await chatAPI.getConversation(conv.id);
            setSelectedConversation(data);
            setMessages(data.messages || []);
            setShowMobileChat(true);

            // Update unread count in list locally
            setConversations(prev =>
                prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c)
            );
        } catch (err) {
            console.error('Failed to load conversation:', err);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedConversation || sending) return;

        try {
            setSending(true);
            const msg = await chatAPI.sendMessage(selectedConversation.id, newMessage.trim());
            setMessages(prev => [...prev, msg]);
            setNewMessage('');

            // Update last message in conversation list
            setConversations(prev =>
                prev.map(c => c.id === selectedConversation.id
                    ? { ...c, last_message: { content: msg.content, sender_name: msg.sender_name, created_at: msg.created_at, is_read: false }, updated_at: msg.created_at }
                    : c
                ).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
            );
        } catch (err) {
            console.error('Failed to send message:', err);
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(e as any);
        }
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    };

    const formatShortDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return formatTime(dateStr);
        if (days === 1) return 'أمس';
        if (days < 7) return date.toLocaleDateString('ar-EG', { weekday: 'short' });
        return date.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
    };

    const getParticipantAvatar = (participant: any) => {
        if (participant?.avatar) {
            return participant.avatar.startsWith('http') ? participant.avatar : `http://localhost:8000${participant.avatar}`;
        }
        return `https://api.dicebear.com/7.x/avataaars/svg?seed=${participant?.username || 'user'}`;
    };

    // ─── Delete entire conversation ───
    const handleDeleteConversation = async () => {
        if (!selectedConversation) return;
        if (!confirm('هل أنت متأكد من حذف هذه المحادثة بالكامل؟')) return;
        try {
            await chatAPI.deleteConversation(selectedConversation.id);
            setConversations(prev => prev.filter(c => c.id !== selectedConversation.id));
            setSelectedConversation(null);
            setMessages([]);
            setShowMobileChat(false);
            setHeaderMenu(false);
        } catch (err) {
            console.error('Failed to delete conversation:', err);
        }
    };

    // ─── Delete a single message ───
    const handleDeleteMessage = async (msgId: number) => {
        if (!selectedConversation) return;
        if (!confirm('حذف هذه الرسالة؟')) return;
        try {
            await chatAPI.deleteMessage(selectedConversation.id, msgId);
            setMessages(prev => prev.filter(m => m.id !== msgId));
            setContextMenu(null);
        } catch (err) {
            console.error('Failed to delete message:', err);
        }
    };

    // ─── Start editing a message ───
    const startEditing = (msg: ChatMessage) => {
        setEditingMsg({ id: msg.id, content: msg.content });
        setContextMenu(null);
    };

    // ─── Save edited message ───
    const handleEditMessage = async () => {
        if (!editingMsg || !selectedConversation || !editingMsg.content.trim()) return;
        try {
            const updated = await chatAPI.editMessage(selectedConversation.id, editingMsg.id, editingMsg.content.trim());
            const newMessages = messages.map(m => m.id === editingMsg.id ? { ...m, content: updated.content } : m);
            setMessages(newMessages);

            // If the edited message is the last one, update the sidebar preview too
            const lastMsg = newMessages[newMessages.length - 1];
            if (lastMsg && lastMsg.id === editingMsg.id) {
                setConversations(prev =>
                    prev.map(c => c.id === selectedConversation.id && c.last_message
                        ? { ...c, last_message: { ...c.last_message, content: updated.content } }
                        : c
                    )
                );
            }

            setEditingMsg(null);
        } catch (err) {
            console.error('Failed to edit message:', err);
        }
    };

    return (
        <>
            <Navbar />
            <div className="h-screen bg-slate-50 dark:bg-slate-950 pt-[64px] overflow-hidden">
                <style jsx global>{`
                    #messages-container::-webkit-scrollbar { width: 5px; }
                    #messages-container::-webkit-scrollbar-track { background: transparent; }
                    #messages-container::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.3); border-radius: 99px; }
                    #messages-container::-webkit-scrollbar-thumb:hover { background: rgba(148,163,184,0.5); }
                `}</style>

                <div className="max-w-7xl mx-auto h-full flex overflow-hidden">
                    
                    {/* ════════ Sidebar (Conversations) ════════ */}
                    <div className={`w-full md:w-[380px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>
                        {/* Sidebar Header */}
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
                            <div className="flex items-center justify-between mb-4">
                                <h1 className="text-xl font-bold text-slate-800 dark:text-white">المحادثات</h1>
                                <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                                    <MoreVertical size={20} className="text-slate-500" />
                                </button>
                            </div>
                            <div className="relative">
                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input 
                                    type="text" 
                                    placeholder="بحث في المحادثات..." 
                                    className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl py-2 px-10 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    dir="rtl"
                                />
                            </div>
                        </div>

                        {/* List Items */}
                        <div className="flex-1 overflow-y-auto">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center h-40 gap-3">
                                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent"></div>
                                    <p className="text-xs text-slate-400">جاري تحميل المحادثات...</p>
                                </div>
                            ) : conversations.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                                    <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                                        <MessageCircle size={28} className="text-slate-400" />
                                    </div>
                                    <h3 className="font-bold text-slate-800 dark:text-slate-100">لا توجد محادثات</h3>
                                    <p className="text-xs text-slate-500 mt-1">ابدأ محادثة مع بائع من صفحة أي منتج</p>
                                </div>
                            ) : (
                                conversations.map(conv => (
                                    <motion.div
                                        key={conv.id}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => selectConversation(conv)}
                                        className={`p-4 cursor-pointer transition-all border-l-4 ${
                                            selectedConversation?.id === conv.id 
                                                ? 'bg-indigo-50 dark:bg-indigo-900/10 border-l-indigo-600' 
                                                : 'border-l-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {/* Participant Avatar */}
                                            <div className="relative shrink-0">
                                                <img 
                                                    src={getParticipantAvatar(conv.other_participant)}
                                                    className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-slate-800 shadow-sm"
                                                    alt="Avatar"
                                                />
                                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center mb-0.5">
                                                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                                                        {conv.other_participant?.username || 'مستخدم غير معروف'}
                                                    </h3>
                                                    <span className="text-[10px] text-slate-400 shrink-0">
                                                        {conv.last_message ? formatShortDate(conv.last_message.created_at) : ''}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 mb-1 font-medium">
                                                    <Package size={12} />
                                                    <span className="truncate">{conv.product_title}</span>
                                                </div>

                                                <div className="flex justify-between items-center gap-2">
                                                    <p className={`text-xs truncate ${conv.unread_count > 0 ? 'text-slate-900 dark:text-slate-100 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
                                                        {conv.last_message?.content || 'ابدأ المحادثة الآن...'}
                                                    </p>
                                                    {conv.unread_count > 0 && (
                                                        <span className="bg-indigo-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                                                            {conv.unread_count}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* ════════ Chat Main View ════════ */}
                    <div className={`flex-1 flex flex-col h-full bg-white dark:bg-slate-900 ${showMobileChat ? 'flex' : 'hidden md:flex'}`}>
                        {selectedConversation ? (
                            <>
                                {/* Chat Header */}
                                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setShowMobileChat(false)}
                                            className="md:hidden p-2 -mr-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                                        >
                                            <ArrowLeft size={20} className="text-slate-600 dark:text-slate-300" />
                                        </button>
                                        
                                        <div className="relative shrink-0">
                                            <img 
                                                src={getParticipantAvatar(selectedConversation.other_participant)}
                                                className="w-10 h-10 rounded-full object-cover shadow-sm"
                                                alt="Participant"
                                            />
                                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
                                        </div>
                                        
                                        <div>
                                            <h2 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                                                {selectedConversation.other_participant?.username || 'مستخدم'}
                                            </h2>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                                                <span className="text-[10px] text-slate-400">نشط الآن</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right side: Product chip + Actions Menu */}
                                    <div className="flex items-center gap-2">
                                        <Link 
                                            href={`/product/${selectedConversation.product}`}
                                            className="hidden sm:flex items-center gap-2 p-1.5 pr-3 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border border-transparent hover:border-indigo-200 transition-all"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white shadow-sm shrink-0 overflow-hidden">
                                                {selectedConversation.product_image ? (
                                                    <img src={selectedConversation.product_image.startsWith('http') ? selectedConversation.product_image : `http://localhost:8000${selectedConversation.product_image}`} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Package size={16} />
                                                )}
                                            </div>
                                            <div className="max-w-[120px]">
                                                <p className="text-[10px] font-bold text-slate-800 dark:text-slate-100 truncate">{selectedConversation.product_title}</p>
                                                <p className="text-[8px] text-indigo-600 dark:text-indigo-400 uppercase tracking-wider font-semibold">عرض المنتج</p>
                                            </div>
                                        </Link>

                                        {/* Three-dots menu */}
                                        <div className="relative">
                                            <button 
                                                onClick={() => setHeaderMenu(!headerMenu)}
                                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                                            >
                                                <MoreVertical size={18} className="text-slate-500" />
                                            </button>
                                            {headerMenu && (
                                                <>
                                                    <div className="fixed inset-0 z-40" onClick={() => setHeaderMenu(false)} />
                                                    <div className="absolute left-0 top-full mt-1 z-50 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1 min-w-[180px]">
                                                        <button
                                                            onClick={handleDeleteConversation}
                                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                        >
                                                            <Trash2 size={16} />
                                                            حذف المحادثة
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>


                                {/* Messages Area */}
                                <div id="messages-container" dir="ltr" className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/50 dark:bg-slate-950/20 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:20px_20px]">
                                    {loading ? (
                                        <div className="flex items-center justify-center h-full">
                                            <div className="animate-pulse text-slate-400 text-sm">جاري تحميل المحادثة...</div>
                                        </div>
                                    ) : messages.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-center">
                                            <div className="w-20 h-20 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center mb-4 shadow-sm">
                                                <Smile size={32} className="text-indigo-500" />
                                            </div>
                                            <p className="text-slate-500 font-medium tracking-wide">ابدأ المحادثة الآن! رحب بـ {selectedConversation.other_participant?.username}</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <AnimatePresence initial={false}>
                                                {messages.map((msg, idx) => {
                                                    const isMine = msg.sender === currentUserId;
                                                    const showAvatar = !isMine && (idx === 0 || messages[idx - 1].sender !== msg.sender);

                                                    return (
                                                        <motion.div
                                                            key={msg.id}
                                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                                            className={`flex items-end gap-2 group ${isMine ? 'justify-end' : 'justify-start'}`}
                                                        >
                                                            {/* Avatar (only on their messages) */}
                                                            <div className={`w-8 h-8 shrink-0 ${showAvatar ? 'opacity-100' : isMine ? 'hidden' : 'opacity-0'} transition-opacity`}>
                                                                <img 
                                                                    src={isMine ? getParticipantAvatar(authUser) : getParticipantAvatar(selectedConversation.other_participant)} 
                                                                    className="w-full h-full rounded-full object-cover border border-slate-200 dark:border-slate-800 shadow-sm"
                                                                    alt="Avatar"
                                                                />
                                                            </div>

                                                            <div className={`max-w-[80%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                                                                {/* Editing mode */}
                                                                {editingMsg?.id === msg.id ? (
                                                                    <div className="flex items-end gap-2 w-full">
                                                                        <input
                                                                            type="text"
                                                                            value={editingMsg.content}
                                                                            onChange={(e) => setEditingMsg({ ...editingMsg, content: e.target.value })}
                                                                            onKeyDown={(e) => { if (e.key === 'Enter') handleEditMessage(); if (e.key === 'Escape') setEditingMsg(null); }}
                                                                            autoFocus
                                                                            className="flex-1 bg-white dark:bg-slate-700 border-2 border-indigo-500 rounded-xl px-3 py-2 text-sm outline-none"
                                                                            dir="auto"
                                                                        />
                                                                        <button onClick={handleEditMessage} className="p-1.5 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-colors">
                                                                            <Check size={14} />
                                                                        </button>
                                                                        <button onClick={() => setEditingMsg(null)} className="p-1.5 bg-slate-400 text-white rounded-full hover:bg-slate-500 transition-colors">
                                                                            <X size={14} />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <div className="relative">
                                                                            <div className={`px-4 py-2.5 rounded-2xl shadow-sm text-sm border leading-relaxed transition-all ${
                                                                                isMine 
                                                                                    ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-br-sm border-transparent' 
                                                                                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-sm border-slate-100 dark:border-slate-700/50'
                                                                            }`}>
                                                                                <p dir="auto">{msg.content}</p>
                                                                            </div>

                                                                            {/* Hover action buttons (only on own messages) */}
                                                                            {isMine && (
                                                                                <div className={`absolute top-1/2 -translate-y-1/2 ${isMine ? 'left-0 -translate-x-full pr-1' : 'right-0 translate-x-full pl-1'} opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5`}>
                                                                                    <button
                                                                                        onClick={() => startEditing(msg)}
                                                                                        className="p-1.5 rounded-full bg-white dark:bg-slate-700 shadow-md border border-slate-200 dark:border-slate-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                                                                                        title="تعديل"
                                                                                    >
                                                                                        <Edit3 size={12} className="text-indigo-600 dark:text-indigo-400" />
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => handleDeleteMessage(msg.id)}
                                                                                        className="p-1.5 rounded-full bg-white dark:bg-slate-700 shadow-md border border-slate-200 dark:border-slate-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                                                                        title="حذف"
                                                                                    >
                                                                                        <Trash2 size={12} className="text-red-500" />
                                                                                    </button>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-center gap-1.5 mt-1 px-1">
                                                                            <span className="text-[9px] text-slate-400 font-medium">
                                                                                {formatTime(msg.created_at)}
                                                                            </span>
                                                                            {isMine && (
                                                                                <span className={`text-[9px] font-bold ${msg.is_read ? 'text-emerald-500' : 'text-slate-300'}`}>
                                                                                    {msg.is_read ? '✓✓' : '✓'}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </motion.div>

                                                    );
                                                })}
                                            </AnimatePresence>
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Message Input Area */}
                                <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
                                    <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-end gap-2">
                                        <button type="button" className="p-2.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all">
                                            <Paperclip size={20} />
                                        </button>
                                        
                                        <div className="flex-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl flex items-end px-3 py-1.5 border border-transparent focus-within:border-indigo-300 dark:focus-within:border-indigo-700 focus-within:bg-white dark:focus-within:bg-slate-800 transition-all">
                                            <textarea
                                                ref={textareaRef}
                                                rows={1}
                                                value={newMessage}
                                                onChange={(e) => setNewMessage(e.target.value)}
                                                onKeyDown={handleKeyDown}
                                                placeholder="اكتب رسالتك..."
                                                className="w-full bg-transparent border-none focus:ring-0 text-sm py-2 px-1 outline-none resize-none min-h-[40px] text-slate-800 dark:text-slate-100"
                                                dir="rtl"
                                            />
                                            <button type="button" className="p-2 text-slate-400 hover:text-amber-500 transition-colors">
                                                <Smile size={20} />
                                            </button>
                                        </div>

                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            type="submit"
                                            disabled={!newMessage.trim() || sending}
                                            className="w-11 h-11 flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30 disabled:opacity-30 disabled:grayscale transition-all"
                                        >
                                            {sending ? (
                                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                            ) : (
                                                <Send size={18} className="translate-x-[-1px] rotate-180" />
                                            )}
                                        </motion.button>
                                    </form>
                                    <p className="text-[9px] text-center text-slate-400 mt-2 tracking-wide font-medium">مؤمن بتقنية التشفير من 4Sale • محادثة آمنة</p>
                                </div>
                            </>
                        ) : (
                            /* ════════ Empty Chat State ════════ */
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-slate-50/30 dark:bg-slate-950/20">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="w-28 h-28 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-900/20 dark:to-violet-900/20 flex items-center justify-center mb-8 shadow-inner"
                                >
                                    <MessageCircle size={48} className="text-indigo-500" />
                                </motion.div>
                                <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-3">مرحباً بك في المحادثات</h1>
                                <p className="text-slate-500 dark:text-slate-400 max-w-sm text-sm leading-relaxed">
                                    اختر محادثة من القائمة على اليمين لبدء الدردشة مع المشترين أو البائعين. جميع محادثاتك محمية وخاصة.
                                </p>
                                <div className="mt-8 flex gap-3">
                                    <div className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 shadow-sm">
                                        ⚡ سريع وموثوق
                                    </div>
                                    <div className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 shadow-sm">
                                        🔒 آمن تماماً
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
