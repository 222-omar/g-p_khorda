'use client';

import { useState, useEffect, useRef } from 'react';
import { chatAPI } from '@/lib/api';
import { useAuth } from '@/components/providers/auth-provider';
import { Conversation, ChatMessage } from '@/lib/types';
import {
    MessageCircle, Send, ArrowLeft, Package, User, MoreVertical, Search,
    Smile, Paperclip, Trash2, Edit3, X, Check, Zap, Lock, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navbar } from '@/components/layout/navbar';
import Link from 'next/link';
import { useLanguage } from '@/components/providers/language-provider';
import { useWebSocket } from '@/hooks/use-websocket';

export default function MessagesPage() {
    const { dict, isRtl, locale } = useLanguage();
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
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<'all' | 'unread' | 'favorites'>('all');
    
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

    // WebSocket for real-time messaging
    const wsEndpoint = selectedConversation ? `/ws/chat/${selectedConversation.id}/` : null;
    const { lastMessage: wsMessage, sendMessage: sendWsMessage } = useWebSocket(wsEndpoint);

    useEffect(() => {
        if (wsMessage && wsMessage.type === 'chat_message') {
            const msg = wsMessage.message;
            // Only process if it belongs to the current conversation
            if (msg.conversation === selectedConversation?.id) {
                setMessages(prev => {
                    // Prevent duplicates
                    if (prev.find(m => m.id === msg.id)) return prev;
                    return [...prev, msg];
                });
                
                // Update conversation list with the new message
                setConversations(prev =>
                    prev.map(c => c.id === selectedConversation?.id
                        ? { ...c, last_message: { content: msg.content, sender_name: msg.sender_name, created_at: msg.created_at, is_read: msg.is_read }, updated_at: msg.created_at }
                        : c
                    ).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                );
            }
        }
    }, [wsMessage, selectedConversation]);

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
            const content = newMessage.trim();
            const success = sendWsMessage({ message: content });
            
            if (success) {
                setNewMessage('');
                // The message will be appended and conversation list updated when it's broadcasted back via WebSocket
            } else {
                // Fallback to REST API if WebSocket is not OPEN
                const msg = await chatAPI.sendMessage(selectedConversation.id, content);
                setMessages(prev => {
                    if (prev.find(m => m.id === msg.id)) return prev;
                    return [...prev, msg];
                });
                setNewMessage('');

                setConversations(prev =>
                    prev.map(c => c.id === selectedConversation.id
                        ? { ...c, last_message: { content: msg.content, sender_name: msg.sender_name, created_at: msg.created_at, is_read: false }, updated_at: msg.created_at }
                        : c
                    ).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                );
            }
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
        return date.toLocaleTimeString(locale === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const formatShortDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return formatTime(dateStr);
        if (days === 1) return dict.messages.yesterday;
        if (days < 7) return date.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'short' });
        return date.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' });
    };

    const getParticipantAvatar = (participant: any) => {
        if (participant?.avatar) {
            return participant.avatar.startsWith('http') ? participant.avatar : `http://localhost:8000${participant.avatar}`;
        }
        return `https://api.dicebear.com/7.x/avataaars/svg?seed=${participant?.username || 'user'}`;
    };

    const handleDeleteConversation = async () => {
        if (!selectedConversation) return;
        if (!confirm(dict.messages.confirmDelete)) return;
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

    const handleDeleteMessage = async (msgId: number) => {
        if (!selectedConversation) return;
        if (!confirm(dict.messages.confirmDeleteMsg)) return;
        try {
            await chatAPI.deleteMessage(selectedConversation.id, msgId);
            setMessages(prev => prev.filter(m => m.id !== msgId));
            setContextMenu(null);
        } catch (err) {
            console.error('Failed to delete message:', err);
        }
    };

    const startEditing = (msg: ChatMessage) => {
        setEditingMsg({ id: msg.id, content: msg.content });
        setContextMenu(null);
    };

    const handleEditMessage = async () => {
        if (!editingMsg || !selectedConversation || !editingMsg.content.trim()) return;
        try {
            const updated = await chatAPI.editMessage(selectedConversation.id, editingMsg.id, editingMsg.content.trim());
            const newMessages = messages.map(m => m.id === editingMsg.id ? { ...m, content: updated.content } : m);
            setMessages(newMessages);

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

    const filteredConversations = conversations.filter(c => {
        const matchesSearch = c.other_participant?.username?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              c.product_title?.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesSearch) return false;
        
        if (filter === 'unread') return c.unread_count > 0;
        if (filter === 'favorites') return c.id % 2 === 0; // simulated favorites
        return true;
    });

    return (
        <div className="h-screen bg-[#FCFDFB] dark:bg-[#0e1015] pt-32 overflow-hidden flex flex-col font-cairo" dir="rtl">
            <Navbar />
            
            <style jsx global>{`
                #messages-container::-webkit-scrollbar { width: 5px; }
                #messages-container::-webkit-scrollbar-track { background: transparent; }
                #messages-container::-webkit-scrollbar-thumb { background: rgba(31,138,59,0.15); border-radius: 99px; }
                #messages-container::-webkit-scrollbar-thumb:hover { background: rgba(31,138,59,0.3); }
                #conversations-scroll::-webkit-scrollbar { width: 4px; }
                #conversations-scroll::-webkit-scrollbar-track { background: transparent; }
                #conversations-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 99px; }
                
                @keyframes bounce-subtle {
                    0%, 100% { transform: translateY(0) rotate(0deg); }
                    50% { transform: translateY(-8px) rotate(2deg); }
                }
                .animate-bounce-subtle {
                    animation: bounce-subtle 4s ease-in-out infinite;
                }
                .animate-pulse-slow {
                    animation: pulse 3.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
            `}</style>

            <div className="max-w-[1400px] w-full mx-auto flex-1 flex gap-6 px-6 pb-6 overflow-hidden min-h-0">
                
                {/* ════════ LEFT SIDEBAR: Conversation View (takes 65-70%) ════════ */}
                <div className={`flex-1 h-full flex flex-col min-w-0 ${showMobileChat ? 'flex' : 'hidden md:flex'}`}>
                    
                    {selectedConversation ? (
                        /* Active Conversation Window */
                        <div className="flex-grow bg-white dark:bg-slate-800 rounded-[30px] shadow-[0_15px_45px_rgba(0,0,0,0.03)] border border-[#E7ECEA] dark:border-slate-700 flex flex-col h-full overflow-hidden">
                            {/* Chat Header */}
                            <div className="px-6 py-4 border-b border-[#E7ECEA] dark:border-slate-700 flex items-center justify-between shrink-0 bg-white dark:bg-slate-800">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setShowMobileChat(false)}
                                        className="md:hidden p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-full transition-colors"
                                    >
                                        <ArrowLeft size={20} className="text-slate-600 dark:text-slate-300" />
                                    </button>
                                    
                                    <div className="relative shrink-0">
                                        <img 
                                            src={getParticipantAvatar(selectedConversation.other_participant)}
                                            className="w-10 h-10 rounded-full object-cover shadow-sm border border-slate-100"
                                            alt="Participant"
                                        />
                                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full animate-pulse"></div>
                                    </div>
                                    
                                    <div className="text-right">
                                        <h2 className="font-cairo font-bold text-base text-slate-800 dark:text-slate-100 leading-tight">
                                            {selectedConversation.other_participant?.username || dict.messages.unknownUser}
                                        </h2>
                                        <div className="flex items-center gap-1.5 mt-0.5 justify-end">
                                            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">{dict.messages.activeNow}</span>
                                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                                        </div>
                                    </div>
                                </div>

                                {/* Header Right Controls: Product details & Action Menu */}
                                <div className="flex items-center gap-3">
                                    <Link 
                                        href={`/product/${selectedConversation.product}`}
                                        className="hidden sm:flex items-center gap-2.5 p-1 pr-3 rounded-full bg-[#F4FBF6] hover:bg-[#E8F5E9] dark:bg-slate-700 dark:hover:bg-slate-600 border border-[#1F8A3B]/10 transition-all"
                                    >
                                        <div className="w-7 h-7 rounded-full bg-[#1F8A3B] flex items-center justify-center text-white shadow-sm shrink-0 overflow-hidden">
                                            {selectedConversation.product_image ? (
                                                <img src={selectedConversation.product_image.startsWith('http') ? selectedConversation.product_image : `http://localhost:8000${selectedConversation.product_image}`} className="w-full h-full object-cover" />
                                            ) : (
                                                <Package size={14} />
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-slate-800 dark:text-slate-100 truncate max-w-[140px] leading-tight">{selectedConversation.product_title}</p>
                                            <p className="text-[9px] text-[#1F8A3B] font-extrabold uppercase leading-tight mt-0.5">{dict.messages.viewProduct}</p>
                                        </div>
                                    </Link>

                                    <div className="relative">
                                        <button 
                                            onClick={() => setHeaderMenu(!headerMenu)}
                                            className="w-10 h-10 rounded-full hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500"
                                        >
                                            <MoreVertical size={18} />
                                        </button>
                                        {headerMenu && (
                                            <>
                                                <div className="fixed inset-0 z-40" onClick={() => setHeaderMenu(false)} />
                                                <div className="absolute left-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-[#E7ECEA] dark:border-slate-700 py-1.5 min-w-[180px]">
                                                    <button
                                                        onClick={handleDeleteConversation}
                                                        className="w-full flex items-center justify-end gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                                                    >
                                                        <span>{dict.messages.deleteConversation}</span>
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Chat Messages Scrolling viewport */}
                            <div id="messages-container" dir="ltr" className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/20 dark:bg-slate-900/10 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:20px_20px]">
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
                                                    className={`flex items-end gap-2.5 group ${isMine ? 'justify-end' : 'justify-start'}`}
                                                >
                                                    {/* Other Avatar */}
                                                    <div className={`w-8 h-8 shrink-0 ${showAvatar ? 'opacity-100' : isMine ? 'hidden' : 'opacity-0'} transition-opacity`}>
                                                        <img 
                                                            src={isMine ? getParticipantAvatar(authUser) : getParticipantAvatar(selectedConversation.other_participant)} 
                                                            className="w-full h-full rounded-full object-cover border border-slate-200 dark:border-slate-800 shadow-sm"
                                                            alt="Avatar"
                                                        />
                                                    </div>

                                                    <div className={`max-w-[75%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                                                        {editingMsg?.id === msg.id ? (
                                                            <div className="flex items-end gap-2 w-full">
                                                                <input
                                                                    type="text"
                                                                    value={editingMsg.content}
                                                                    onChange={(e) => setEditingMsg({ ...editingMsg, content: e.target.value })}
                                                                    onKeyDown={(e) => { if (e.key === 'Enter') handleEditMessage(); if (e.key === 'Escape') setEditingMsg(null); }}
                                                                    autoFocus
                                                                    className="flex-1 bg-white dark:bg-slate-700 border-2 border-[#1F8A3B] rounded-xl px-3 py-2 text-sm outline-none"
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
                                                                    <div className={`px-4.5 py-3 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] text-sm leading-relaxed border transition-all ${
                                                                        isMine 
                                                                            ? 'bg-gradient-to-br from-[#1F8A3B] to-[#43A047] text-white rounded-tr-none border-transparent' 
                                                                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none border-slate-100 dark:border-slate-700/50'
                                                                    }`}>
                                                                        <p dir="auto">{msg.content}</p>
                                                                    </div>

                                                                    {isMine && (
                                                                        <div className="absolute top-1/2 -translate-y-1/2 left-0 -translate-x-full pr-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 z-10">
                                                                            <button
                                                                                onClick={() => startEditing(msg)}
                                                                                className="p-1.5 rounded-full bg-white dark:bg-slate-700 shadow-md border border-slate-200 dark:border-slate-600 hover:bg-slate-50 transition-colors"
                                                                            >
                                                                                <Edit3 size={11} className="text-[#1F8A3B]" />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleDeleteMessage(msg.id)}
                                                                                className="p-1.5 rounded-full bg-white dark:bg-slate-700 shadow-md border border-slate-200 dark:border-slate-600 hover:bg-red-50 transition-colors"
                                                                            >
                                                                                <Trash2 size={11} className="text-red-500" />
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-1.5 mt-1 px-1">
                                                                    <span className="text-[9px] text-slate-400 font-semibold">
                                                                        {formatTime(msg.created_at)}
                                                                    </span>
                                                                    {isMine && (
                                                                        <span className={`text-[9px] font-bold ${msg.is_read ? 'text-[#1F8A3B]' : 'text-slate-300'}`}>
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
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Chat bottom message entry form */}
                            <div className="p-4 bg-white dark:bg-slate-800 border-t border-[#E7ECEA] dark:border-slate-700 shrink-0">
                                <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-center gap-3">
                                    <button type="button" className="p-2.5 text-slate-400 hover:text-[#1F8A3B] hover:bg-slate-50 dark:hover:bg-slate-700 rounded-full transition-all">
                                        <Paperclip size={20} />
                                    </button>
                                    
                                    <div className="flex-1 bg-slate-100 dark:bg-slate-900 border border-transparent focus-within:border-[#1F8A3B] focus-within:bg-white dark:focus-within:bg-slate-900 rounded-2xl flex items-center px-4 py-1.5 transition-all">
                                        <textarea
                                            ref={textareaRef}
                                            rows={1}
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            placeholder={dict.messages.typePlaceholder}
                                            className="w-full bg-transparent border-none focus:ring-0 text-sm py-2 px-1 outline-none resize-none min-h-[40px] text-slate-800 dark:text-slate-100 font-cairo"
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
                                        className="w-11 h-11 flex items-center justify-center rounded-full bg-gradient-to-r from-[#1F8A3B] to-[#43A047] text-white shadow-md shadow-[#1F8A3B]/20 disabled:opacity-30 disabled:grayscale transition-all shrink-0 cursor-pointer"
                                    >
                                        {sending ? (
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                        ) : (
                                            <Send size={18} className="rotate-180" />
                                        )}
                                    </motion.button>
                                </form>
                            </div>
                        </div>
                    ) : (
                        /* Empty Chat Dashboard state (Matches layout exactly) */
                        <div className="flex-grow bg-white dark:bg-slate-800 rounded-[30px] shadow-[0_15px_45px_rgba(0,0,0,0.02)] border border-[#E7ECEA] dark:border-slate-700 flex flex-col justify-center items-center p-8 relative min-h-[680px] select-none">
                            {/* Glowing circular illustration */}
                            <div className="relative flex items-center justify-center w-52 h-52 mb-8">
                                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#F4FBF6] to-[#E8F5E9] dark:from-green-950/10 dark:to-emerald-950/15 filter blur-[3px] opacity-70 animate-pulse-slow"></div>
                                
                                {/* Outline Message Icon */}
                                <MessageCircle size={84} className="text-[#1F8A3B] stroke-[1.2] relative z-10 animate-bounce-subtle" />
                                
                                {/* Sparkles & Spark icons around */}
                                <div className="absolute top-2 right-4 text-[#43A047]/40"><Sparkles size={16} /></div>
                                <div className="absolute bottom-6 left-2 text-[#1F8A3B]/30"><Sparkles size={14} /></div>
                                <div className="absolute top-12 left-4 text-[#1F8A3B]/20"><Send size={16} className="rotate-12" /></div>
                            </div>

                            {/* Headline */}
                            <h2 className="font-cairo font-black text-2xl md:text-[32px] text-[#101828] dark:text-white text-center leading-none">
                                {dict.messages.welcomeTitle}
                            </h2>
                            
                            {/* Subtitle */}
                            <p className="font-cairo text-[#667085] dark:text-slate-400 text-[14px] md:text-[15px] leading-[1.8] text-center mt-4 max-w-[460px]">
                                {dict.messages.welcomeDesc}
                            </p>

                            {/* Bottom tag pills */}
                            <div className="flex flex-wrap gap-3.5 justify-center mt-10">
                                <div className="bg-[#F2FBF5] dark:bg-green-950/20 text-[#1F8A3B] border border-[#1F8A3B]/10 rounded-full px-5 py-2.5 text-xs md:text-sm font-bold flex items-center gap-1.5 shadow-sm">
                                    <Zap size={14} className="fill-current text-[#43A047]" />
                                    {dict.messages.fast}
                                </div>
                                <div className="bg-[#F2FBF5] dark:bg-green-950/20 text-[#1F8A3B] border border-[#1F8A3B]/10 rounded-full px-5 py-2.5 text-xs md:text-sm font-bold flex items-center gap-1.5 shadow-sm">
                                    <Lock size={14} className="fill-current text-[#1F8A3B]" />
                                    {dict.messages.secure}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ════════ RIGHT SIDEBAR: Conversations List (takes 30-35%) ════════ */}
                <div className={`w-full md:w-[380px] lg:w-[420px] bg-white dark:bg-slate-800 border border-[#E7ECEA] dark:border-slate-700 rounded-[30px] shadow-[0_15px_45px_rgba(0,0,0,0.03)] flex flex-col h-full overflow-hidden ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>
                    
                    {/* Header: Title & Actions */}
                    <div className="px-6 pt-6 pb-3 flex-shrink-0 flex items-center justify-between">
                        <h2 className="font-cairo font-black text-2xl text-[#101828] dark:text-white">{dict.messages.title}</h2>
                        <button className="w-10 h-10 rounded-full hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 transition-colors">
                            <MoreVertical size={18} />
                        </button>
                    </div>

                    {/* Search Field */}
                    <div className="px-6 pb-4 flex-shrink-0">
                        <div className="relative bg-[#F3F4F6] dark:bg-slate-900 rounded-2xl flex items-center px-4 py-3 border border-transparent focus-within:border-[#1F8A3B]/30 transition-all">
                            <Search className="text-slate-400 flex-shrink-0" size={16} />
                            <input 
                                type="text" 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={dict.messages.searchPlaceholder} 
                                className="w-full bg-transparent border-none focus:ring-0 text-sm px-2.5 outline-none font-cairo text-[#101828] dark:text-white"
                                dir="rtl"
                            />
                        </div>
                    </div>

                    {/* Filter Chips */}
                    <div className="px-6 pb-4 flex-shrink-0 flex gap-2 border-b border-[#E7ECEA] dark:border-slate-700/50">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                                filter === 'all'
                                    ? 'bg-[#1F8A3B] text-white shadow-sm'
                                    : 'bg-slate-50 dark:bg-slate-700/50 text-[#667085] hover:bg-slate-100 hover:text-[#101828]'
                            }`}
                        >
                            {dict.messages.all}
                        </button>
                        <button
                            onClick={() => setFilter('unread')}
                            className={`px-4.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                                filter === 'unread'
                                    ? 'bg-[#1F8A3B] text-white shadow-sm'
                                    : 'bg-slate-50 dark:bg-slate-700/50 text-[#667085] hover:bg-slate-100 hover:text-[#101828]'
                            }`}
                        >
                            {dict.messages.unread}
                        </button>
                        <button
                            onClick={() => setFilter('favorites')}
                            className={`px-4.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                                filter === 'favorites'
                                    ? 'bg-[#1F8A3B] text-white shadow-sm'
                                    : 'bg-slate-50 dark:bg-slate-700/50 text-[#667085] hover:bg-slate-100 hover:text-[#101828]'
                            }`}
                        >
                            {dict.messages.favorites}
                        </button>
                    </div>

                    {/* Conversations list container */}
                    <div className="flex-grow overflow-y-auto px-4 py-4 space-y-3" id="conversations-scroll">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-3">
                                <Loader2 className="animate-spin text-[#1F8A3B]" size={28} />
                                <p className="text-xs text-slate-400 font-cairo">{dict.messages.loading}</p>
                            </div>
                        ) : filteredConversations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                                <MessageCircle size={36} className="text-slate-300 dark:text-slate-600 mb-3" />
                                <h3 className="font-bold text-sm text-[#101828] dark:text-slate-200">{dict.messages.noConversations}</h3>
                                <p className="text-xs text-slate-500 mt-1">{dict.messages.noConversationsDesc}</p>
                            </div>
                        ) : (
                            filteredConversations.map(conv => {
                                const isSelected = selectedConversation?.id === conv.id;
                                return (
                                    <button
                                        key={conv.id}
                                        onClick={() => selectConversation(conv)}
                                        className={`w-full h-[84px] text-right p-4 rounded-2xl flex items-center justify-between gap-3 border transition-all cursor-pointer group ${
                                            isSelected 
                                                ? 'bg-[#F4FBF6] dark:bg-green-950/15 border-r-4 border-r-[#1F8A3B] border-y-transparent border-l-transparent shadow-sm' 
                                                : 'bg-white border-transparent hover:bg-slate-50/50 hover:border-slate-100'
                                        }`}
                                    >
                                        {/* Left Side: timestamp & unread badge */}
                                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                            <span className="text-[10px] text-slate-400">
                                                {conv.last_message ? formatShortDate(conv.last_message.created_at) : ''}
                                            </span>
                                            {conv.unread_count > 0 && (
                                                <span className="bg-indigo-600 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center px-1 shadow-sm shadow-indigo-600/20">
                                                    {conv.unread_count}
                                                </span>
                                            )}
                                        </div>

                                        {/* Center Text Column: Username & last message & product preview */}
                                        <div className="flex-1 min-w-0 flex flex-col justify-center text-right">
                                            <div className="flex justify-between items-center mb-0.5">
                                                <h3 className="font-cairo font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                                                    {conv.other_participant?.username || dict.messages.unknownUser}
                                                </h3>
                                            </div>

                                            <div className="flex items-center justify-end gap-1 text-[10px] text-[#1F8A3B] font-bold mb-0.5">
                                                <span className="truncate">{conv.product_title}</span>
                                                <Package size={10} />
                                            </div>

                                            <p className={`text-xs truncate ${conv.unread_count > 0 ? 'text-[#101828] dark:text-white font-extrabold' : 'text-slate-500 dark:text-slate-400'}`}>
                                                {conv.last_message?.content || dict.messages.startChat}
                                            </p>
                                        </div>

                                        {/* Right Side: Participant Avatar */}
                                        <div className="relative flex-shrink-0">
                                            <img 
                                                src={getParticipantAvatar(conv.other_participant)}
                                                className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-slate-800 shadow-sm"
                                                alt="Avatar"
                                            />
                                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}

// Simple missing loader component
function Loader2({ className, size }: { className?: string; size?: number }) {
    return (
        <svg
            className={`animate-spin ${className}`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            width={size || 24}
            height={size || 24}
        >
            <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
            ></circle>
            <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
        </svg>
    );
}
