'use client';

import { useState, useRef, useEffect } from 'react';
import { ragAPI, productsAPI } from '@/lib/api';
import { useAuth } from '@/components/providers/auth-provider';
import { Navbar } from '@/components/layout/navbar';
import Link from 'next/link';
import {
    Bot, Loader2, Sparkles,
    ShoppingBag, Gavel, BarChart3, Settings,
    Send, MapPin, Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface RAGResult {
    answer: {
        summary: string;
        items: (number | string)[];
        suggested_action: string;
    };
    meta: {
        latency_ms: number;
        sql_results: number;
        vector_results: number;
        merged_results: number;
    };
}

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    result?: RAGResult;
    products?: any[];
    timestamp: Date;
}

const SUGGESTED_QUERIES = [
    { emoji: '🏠', text: 'عايز غسالة رخيصة' },
    { emoji: '🚗', text: 'ورييني كل العربيات' },
    { emoji: '💻', text: 'لابتوب اقل من 5000 جنيه' },
    { emoji: '🔩', text: 'خردة حديد في القاهرة' },
    { emoji: '📚', text: 'كتب مدرسية مستعملة' },
    { emoji: '❄️', text: 'تلاجة حالة كويسة' },
];

const ACTION_ICONS: Record<string, any> = {
    view_listing: ShoppingBag,
    place_bid: Gavel,
    compare_prices: BarChart3,
    set_agent: Settings,
};

const ACTION_LABELS: Record<string, string> = {
    view_listing: 'عرض المنتجات',
    place_bid: 'المزايدة',
    compare_prices: 'مقارنة الأسعار',
    set_agent: 'إعداد وكيل ذكي',
};

function formatTime(date: Date) {
    return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
}

export default function SmartSearchPage() {
    const { user } = useAuth();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const userName = user?.user?.first_name || user?.user?.username || 'أنت';
    const userAvatar = user?.avatar
        ? (user.avatar.startsWith('http') ? user.avatar : `http://localhost:8000${user.avatar}`)
        : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.user?.username || 'user'}`;

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    // Auto-resize textarea
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
        }
    }, [input]);

    const handleSearch = async (query: string) => {
        if (!query.trim() || loading) return;

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: query,
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const result = await ragAPI.query(query);

            let products: any[] = [];
            if (result.answer.items && result.answer.items.length > 0) {
                const productPromises = result.answer.items.slice(0, 6).map(async (id) => {
                    try {
                        return await productsAPI.get(String(id));
                    } catch {
                        return null;
                    }
                });
                const allProducts = (await Promise.all(productPromises)).filter(p => p && p.id);
                const uniqueIds = new Set();
                products = allProducts.filter(p => {
                    if (uniqueIds.has(p.id)) return false;
                    uniqueIds.add(p.id);
                    return true;
                });
            }

            const assistantMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: result.answer.summary,
                result,
                products,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, assistantMsg]);
        } catch (error) {
            const errorMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'عذراً، حصلت مشكلة. جرب تاني بعد شوية 🙏',
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSearch(input);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSearch(input);
        }
    };

    return (
        <>
            <Navbar />
            <style jsx global>{`
                #chat-scroll::-webkit-scrollbar { width: 4px; }
                #chat-scroll::-webkit-scrollbar-track { background: transparent; }
                #chat-scroll::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.3); border-radius: 99px; }
                #chat-scroll::-webkit-scrollbar-thumb:hover { background: rgba(148,163,184,0.5); }
            `}</style>
            <main className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 pt-[64px]">
                <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-64px)]">

                    {/* ─── Chat Messages Area ─── */}
                    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1" id="chat-scroll">

                        {/* Empty State — shown when no messages */}
                        {messages.length === 0 && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.5 }}
                                className="flex flex-col items-center justify-center h-full select-none"
                            >
                                {/* Bot Avatar */}
                                <div className="relative mb-6">
                                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-violet-500/30">
                                        <Bot className="w-12 h-12 text-white" />
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-emerald-500 border-4 border-slate-100 dark:border-slate-950 flex items-center justify-center">
                                        <Sparkles className="w-3.5 h-3.5 text-white" />
                                    </div>
                                </div>

                                <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">
                                   أهلاً {userName} 👋
                                </h1>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">
                                    أنا بوت 4Sale الذكي، اسألني عن أي حاجة عايز تشتريها
                                </p>

                                {/* Suggested Queries */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-md w-full">
                                    {SUGGESTED_QUERIES.map((q, i) => (
                                        <motion.button
                                            key={i}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.07 }}
                                            onClick={() => handleSearch(q.text)}
                                            className="group flex items-center gap-2 px-3 py-2.5 text-xs sm:text-sm rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 hover:border-violet-400 dark:hover:border-violet-500 hover:shadow-lg hover:shadow-violet-500/5 transition-all duration-200 text-slate-600 dark:text-slate-300 text-right"
                                        >
                                            <span className="text-base flex-shrink-0">{q.emoji}</span>
                                            <span className="truncate">{q.text}</span>
                                        </motion.button>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* ─── Messages ─── */}
                        <AnimatePresence>
                            {messages.map((msg) => (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    {msg.role === 'user' ? (
                                        /* ══════ User Bubble ══════ */
                                        <div className="flex items-start gap-2 justify-end mb-4">
                                            <div className="flex flex-col items-end max-w-[75%]">
                                                <div className="bg-gradient-to-br from-violet-600 to-indigo-600 text-white px-4 py-2.5 rounded-2xl rounded-br-md shadow-md shadow-violet-500/10">
                                                    <p className="text-[14px] leading-relaxed">{msg.content}</p>
                                                </div>
                                                <span className="text-[10px] text-slate-400 mt-1 mr-1">{formatTime(msg.timestamp)}</span>
                                            </div>
                                            <img
                                                src={userAvatar}
                                                alt={userName}
                                                className="w-8 h-8 rounded-full object-cover border-2 border-white dark:border-slate-800 shadow-sm flex-shrink-0"
                                            />
                                        </div>
                                    ) : (
                                        /* ══════ Bot Bubble ══════ */
                                        <div className="flex items-start gap-2 justify-start mb-4">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm border-2 border-white dark:border-slate-800">
                                                <Bot className="w-4 h-4 text-white" />
                                            </div>
                                            <div className="flex flex-col items-start max-w-[85%] space-y-2">
                                                {/* Main text bubble */}
                                                <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm border border-slate-200/60 dark:border-slate-700/60">
                                                    <p className="text-[14px] text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                                                    {/* Suggested Action pill */}
                                                    {msg.result?.answer.suggested_action && (
                                                        <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-700/60">
                                                            {(() => {
                                                                const action = msg.result!.answer.suggested_action;
                                                                const Icon = ACTION_ICONS[action] || ShoppingBag;
                                                                const label = ACTION_LABELS[action] || action;
                                                                return (
                                                                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 px-3 py-1.5 rounded-full">
                                                                        <Icon className="w-3.5 h-3.5" />
                                                                        {label}
                                                                    </span>
                                                                );
                                                            })()}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Product Cards */}
                                                {msg.products && msg.products.length > 0 && (
                                                    <div className="w-full space-y-1.5">
                                                        {msg.products.map((product: any) => (
                                                            <Link
                                                                key={product.id}
                                                                href={`/product/${product.id}`}
                                                            >
                                                                <motion.div
                                                                    whileHover={{ scale: 1.01 }}
                                                                    whileTap={{ scale: 0.99 }}
                                                                    className="group flex gap-3 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 hover:border-violet-300 dark:hover:border-violet-600 hover:shadow-md transition-all duration-200 cursor-pointer"
                                                                >
                                                                    {/* Product Image */}
                                                                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700 flex-shrink-0">
                                                                        {product.images?.[0] ? (
                                                                            <img
                                                                                src={product.images[0].image?.startsWith('http') ? product.images[0].image : `http://localhost:8000${product.images[0].image}`}
                                                                                alt={product.title}
                                                                                className="w-full h-full object-cover"
                                                                            />
                                                                        ) : (
                                                                            <div className="w-full h-full flex items-center justify-center">
                                                                                <ShoppingBag className="w-5 h-5 text-slate-400" />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    {/* Product Info */}
                                                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                                                                            {product.title}
                                                                        </p>
                                                                        <div className="flex items-center gap-2 mt-0.5">
                                                                            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                                                                {Number(product.price).toLocaleString('ar-EG')} جنيه
                                                                            </span>
                                                                            {product.location && (
                                                                                <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
                                                                                    <MapPin className="w-2.5 h-2.5" />
                                                                                    {product.location}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        {product.condition && (
                                                                            <span className="flex items-center gap-0.5 text-[10px] text-slate-400 mt-0.5">
                                                                                <Tag className="w-2.5 h-2.5" />
                                                                                {product.condition === 'new' ? 'جديد' : product.condition === 'like-new' ? 'كالجديد' : product.condition === 'good' ? 'جيد' : 'مقبول'}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </motion.div>
                                                            </Link>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Timestamp */}
                                                <span className="text-[10px] text-slate-400 ml-1">{formatTime(msg.timestamp)}</span>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {/* ─── Typing Indicator ─── */}
                        {loading && (
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-start gap-2 justify-start mb-4"
                            >
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm border-2 border-white dark:border-slate-800">
                                    <Bot className="w-4 h-4 text-white" />
                                </div>
                                <div className="bg-white dark:bg-slate-800 px-5 py-3.5 rounded-2xl rounded-bl-md shadow-sm border border-slate-200/60 dark:border-slate-700/60">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* ─── Input Bar ─── */}
                    <div className="flex-shrink-0 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
                        <form onSubmit={handleSubmit} className="flex items-end gap-2 max-w-3xl mx-auto">
                            <div className="flex-1 relative">
                                <textarea
                                    ref={inputRef}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="اكتب رسالتك..."
                                    rows={1}
                                    className="w-full resize-none bg-slate-100 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none rounded-2xl px-4 py-3 pr-4 border border-transparent focus:border-violet-300 dark:focus:border-violet-600 focus:bg-white dark:focus:bg-slate-800 transition-all duration-200"
                                    disabled={loading}
                                    dir="rtl"
                                    style={{ maxHeight: '120px' }}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading || !input.trim()}
                                className="w-11 h-11 flex items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 flex-shrink-0 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 active:scale-95"
                            >
                                {loading ? (
                                    <Loader2 className="w-4.5 h-4.5 animate-spin" />
                                ) : (
                                    <Send className="w-4.5 h-4.5 rotate-180" />
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </main>
        </>
    );
}
