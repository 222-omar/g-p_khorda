'use client';

import { useState, useEffect, useRef } from 'react';
import { chatAPI } from '@/lib/api';
import { Conversation, ChatMessage } from '@/lib/types';
import { MessageCircle, Send, ArrowLeft, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

export default function MessagesPage() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [showMobileChat, setShowMobileChat] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Load conversations
    useEffect(() => {
        loadConversations();
    }, []);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

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

            // Update unread count in list
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

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) {
            return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
        } else if (days === 1) {
            return 'أمس';
        } else if (days < 7) {
            return date.toLocaleDateString('ar-EG', { weekday: 'long' });
        }
        return date.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
    };

    const getCurrentUserId = () => {
        if (!selectedConversation) return null;
        // The current user is either buyer or seller
        return selectedConversation.buyer?.id || null;
    };

    return (
        <>
            <Navbar />
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-20 pb-12">
                <div className="max-w-6xl mx-auto px-4" style={{ height: 'calc(100vh - 10rem)' }}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 h-full overflow-hidden flex">

                        {/* Conversations List */}
                        <div className={`w-full md:w-96 border-r border-slate-200 dark:border-slate-800 flex flex-col ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>
                            {/* Header */}
                            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-emerald-500/10 to-teal-500/10">
                                <h1 className="text-xl font-bold flex items-center gap-2">
                                    <MessageCircle className="text-emerald-500" size={24} />
                                    المحادثات
                                </h1>
                            </div>

                            {/* Conversation List */}
                            <div className="flex-1 overflow-y-auto">
                                {loading ? (
                                    <div className="flex items-center justify-center h-40">
                                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent"></div>
                                    </div>
                                ) : conversations.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center p-8">
                                        <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                                            <MessageCircle size={32} className="text-slate-400" />
                                        </div>
                                        <h3 className="font-bold text-lg mb-2">لا توجد محادثات</h3>
                                        <p className="text-sm text-slate-500">ابدأ محادثة مع بائع من صفحة أي منتج</p>
                                    </div>
                                ) : (
                                    conversations.map(conv => (
                                        <motion.div
                                            key={conv.id}
                                            whileHover={{ backgroundColor: 'rgba(16, 185, 129, 0.05)' }}
                                            onClick={() => selectConversation(conv)}
                                            className={`p-4 border-b border-slate-100 dark:border-slate-800 cursor-pointer transition-colors ${selectedConversation?.id === conv.id ? 'bg-emerald-50 dark:bg-emerald-900/20 border-l-4 border-l-emerald-500' : ''}`}
                                        >
                                            <div className="flex items-start gap-3">
                                                {/* Avatar */}
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
                                                    {conv.other_participant?.username?.[0]?.toUpperCase() || '?'}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start">
                                                        <h3 className="font-bold text-sm truncate">
                                                            {conv.other_participant?.username || 'Unknown'}
                                                        </h3>
                                                        <span className="text-xs text-slate-400 shrink-0 ml-2">
                                                            {conv.last_message ? formatTime(conv.last_message.created_at) : ''}
                                                        </span>
                                                    </div>

                                                    <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                                                        <Package size={12} />
                                                        {conv.product_title}
                                                    </p>

                                                    <div className="flex justify-between items-center mt-1">
                                                        <p className="text-sm text-slate-500 truncate">
                                                            {conv.last_message?.content || 'ابدأ المحادثة...'}
                                                        </p>
                                                        {conv.unread_count > 0 && (
                                                            <span className="bg-emerald-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0 ml-2">
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

                        {/* Chat Area */}
                        <div className={`flex-1 flex flex-col ${showMobileChat ? 'flex' : 'hidden md:flex'}`}>
                            {selectedConversation ? (
                                <>
                                    {/* Chat Header */}
                                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-white dark:bg-slate-900">
                                        <button
                                            onClick={() => setShowMobileChat(false)}
                                            className="md:hidden p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                                        >
                                            <ArrowLeft size={20} />
                                        </button>
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold">
                                            {selectedConversation.buyer?.username?.[0]?.toUpperCase() || selectedConversation.seller?.username?.[0]?.toUpperCase() || '?'}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-sm">
                                                {selectedConversation.buyer?.username || selectedConversation.seller?.username}
                                            </h3>
                                            <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                <Package size={12} />
                                                {selectedConversation.product_title}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Messages */}
                                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-950/50">
                                        {messages.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-full text-center">
                                                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
                                                    <MessageCircle size={24} className="text-emerald-500" />
                                                </div>
                                                <p className="text-slate-500 text-sm">ابدأ المحادثة الآن!</p>
                                            </div>
                                        ) : (
                                            <AnimatePresence>
                                                {messages.map((msg) => {
                                                    const isMine = msg.sender_name === selectedConversation.buyer?.username
                                                        ? selectedConversation.buyer?.id === getCurrentUserId()
                                                        : selectedConversation.seller?.id === getCurrentUserId();
                                                    // Simpler: check if sender_name matches the buyer
                                                    const isFromBuyer = msg.sender === selectedConversation.buyer?.id;

                                                    return (
                                                        <motion.div
                                                            key={msg.id}
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            className={`flex ${isFromBuyer ? 'justify-start' : 'justify-end'}`}
                                                        >
                                                            <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${isFromBuyer
                                                                ? 'bg-white dark:bg-slate-800 rounded-bl-md'
                                                                : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-br-md'
                                                                }`}>
                                                                <p className="text-sm leading-relaxed">{msg.content}</p>
                                                                <div className={`flex items-center gap-1 mt-1 ${isFromBuyer ? 'text-slate-400' : 'text-emerald-100'}`}>
                                                                    <span className="text-[10px]">
                                                                        {formatTime(msg.created_at)}
                                                                    </span>
                                                                    {!isFromBuyer && msg.is_read && (
                                                                        <span className="text-[10px]">✓✓</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })}
                                            </AnimatePresence>
                                        )}
                                        <div ref={messagesEndRef} />
                                    </div>

                                    {/* Message Input */}
                                    <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={newMessage}
                                                onChange={(e) => setNewMessage(e.target.value)}
                                                placeholder="اكتب رسالتك..."
                                                className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                                disabled={sending}
                                            />
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                type="submit"
                                                disabled={!newMessage.trim() || sending}
                                                className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-opacity shadow-lg shadow-emerald-500/25"
                                            >
                                                <Send size={18} />
                                            </motion.button>
                                        </div>
                                    </form>
                                </>
                            ) : (
                                /* Empty State */
                                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 flex items-center justify-center mb-6">
                                        <MessageCircle size={40} className="text-emerald-500" />
                                    </div>
                                    <h2 className="text-xl font-bold mb-2">مرحباً بك في المحادثات</h2>
                                    <p className="text-slate-500 max-w-sm">
                                        اختر محادثة من القائمة أو ابدأ محادثة جديدة من صفحة أي منتج
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </>
    );
}
