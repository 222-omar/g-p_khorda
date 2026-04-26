'use client';

import { useState, useRef, useEffect } from 'react';
import { ragAPI, productsAPI } from '@/lib/api';
import { useAuth } from '@/components/providers/auth-provider';
import Link from 'next/link';
import {
    Bot, Loader2, Sparkles, X,
    ShoppingBag, Gavel, BarChart3, Settings,
    Send, MapPin, Tag, ThumbsUp, ThumbsDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface RAGResult {
    answer: {
        summary: string;
        items: (number | string)[];
        suggested_action: string;
    };
    meta?: {
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
    { emoji: '🚗', text: 'عربيات أقل من 200 ألف' },
    { emoji: '💻', text: 'لابتوب ألعاب' },
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

export function FloatingBotWidget() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const userName = user?.user?.first_name || user?.user?.username || 'ضيف';
    const userAvatar = user?.avatar
        ? (user.avatar.startsWith('http') ? user.avatar : `http://localhost:8000${user.avatar}`)
        : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.user?.username || 'user'}`;

    // Only show the bot if the user is authenticated (or allow guest if backend supports it - but safe to hide for now if null)

    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, loading, isOpen]);

    // Auto-resize textarea
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 100) + 'px';
        }
    }, [input]);

    if (!user) return null;

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
            // Build history from last 3 messages for context, injecting product details
            const chatHistory = messages.slice(-3).map(m => {
                let text = m.content;
                if (m.role === 'assistant' && m.products && m.products.length > 0) {
                    const productsInfo = m.products.map(p => {
                        const seller = p.owner_name || p.owner?.username || 'غير معروف';
                        return `- ${p.title} (${p.price} EGP, البائع: ${seller})`;
                    }).join('\n');
                    text += `\n\n[معلومات إضافية في الواجهة للمنتجات المعروضة:\n${productsInfo}]`;
                }
                return {
                    role: m.role,
                    content: text,
                };
            });
            const result = await ragAPI.query(query, chatHistory);

            let products: any[] = [];
            // Use pre-built products_data if available (0 extra API calls)
            if (result.products_data && result.products_data.length > 0) {
                products = result.products_data;
            } else if (result.answer.items && result.answer.items.length > 0) {
                // Fallback: fetch individually (N+1)
                const productPromises = result.answer.items.slice(0, 4).map(async (id) => {
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
        <div className="fixed bottom-6 left-6 z-[999] flex flex-col items-start font-tajawal" dir="rtl">
            <style jsx global>{`
                #bot-scroll::-webkit-scrollbar { width: 4px; }
                #bot-scroll::-webkit-scrollbar-track { background: transparent; }
                #bot-scroll::-webkit-scrollbar-thumb { background: rgba(51,65,85,0.4); border-radius: 99px; }
                #bot-scroll::-webkit-scrollbar-thumb:hover { background: rgba(51,65,85,0.7); }
                .dark #bot-scroll::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.3); }
                .dark #bot-scroll::-webkit-scrollbar-thumb:hover { background: rgba(148,163,184,0.5); }

                @keyframes bounce-subtle {
                    0%, 100% { transform: translateY(0); scale: 1; }
                    50% { transform: translateY(-8px); scale: 1; }
                }
            `}</style>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        className="mb-4 bg-white dark:bg-slate-800 w-[360px] sm:w-[400px] h-[550px] max-h-[80vh] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden"
                    >
                        {/* ─── Bot Header ─── */}
                        <div className="flex-shrink-0 bg-primary/5 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shadow-sm">
                                    <Bot className="w-5 h-5 text-primary" />
                                </div>
                                <div className="leading-tight">
                                    <h3 className="text-slate-900 dark:text-white font-black text-base">مساعدك الذكي</h3>
                                    <p className="text-[10px] text-primary font-bold flex items-center gap-1.5 mt-0.5">
                                        <span className="relative flex h-1.5 w-1.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
                                        </span>
                                        نشط حالياً
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* ─── Chat Messages Area ─── */}
                        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-1 bg-slate-50 dark:bg-slate-900/50" id="bot-scroll">
                            {/* Empty State */}
                            {messages.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full select-none py-8">
                                    <div className="w-20 h-20 mb-4 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center shadow-inner">
                                        <Bot className="w-10 h-10 text-slate-400 dark:text-slate-300" />
                                    </div>
                                    <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-1">
                                        أهلاً {userName} 👋
                                    </h4>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs mb-6 text-center px-4">
                                        أنا بوت 4Sale الذكي، اسألني عن أي حاجة عايز تشتريها
                                    </p>

                                    <div className="grid grid-cols-1 gap-2 w-full max-w-[280px]">
                                        {SUGGESTED_QUERIES.map((q, i) => (
                                            <button
                                                key={i}
                                                onClick={() => handleSearch(q.text)}
                                                className="flex items-center gap-2 px-4 py-2.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 hover:border-primary dark:hover:border-primary hover:shadow-sm transition-all text-slate-700 dark:text-slate-200 text-right font-semibold w-full"
                                            >
                                                <span className="text-sm flex-shrink-0">{q.emoji}</span>
                                                <span className="truncate">{q.text}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Messages */}
                            <AnimatePresence>
                                {messages.map((msg) => (
                                    <motion.div
                                        key={msg.id}
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        {msg.role === 'user' ? (
                                            <div className="flex items-start gap-2 justify-end mb-5">
                                                <div className="flex flex-col items-end max-w-[85%]">
                                                    <div className="bg-primary text-white px-4 py-3 rounded-2xl rounded-tr-sm shadow-sm">
                                                        <p className="text-[14px] leading-relaxed font-medium">{msg.content}</p>
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 mt-1 mr-1 font-bold">{formatTime(msg.timestamp)}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-start gap-2 justify-start mb-5 w-full">
                                                <div className="w-8 h-8 mt-1 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20">
                                                    <Bot className="w-4 h-4 text-primary" />
                                                </div>
                                                <div className="flex flex-col items-start max-w-[88%] w-full">
                                                    {/* Main text bubble */}
                                                    <div className="bg-white dark:bg-slate-800 px-4 py-3.5 rounded-2xl rounded-tl-sm shadow-sm border border-slate-200 dark:border-slate-700 w-full">
                                                        <p className="text-[14px] font-medium text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                                                        {msg.result?.answer?.suggested_action && (
                                                            <>
                                                                <div className="my-2 border-b border-slate-100 dark:border-slate-700/50 w-full" />
                                                                <div className="mb-1">
                                                                    {(() => {
                                                                        const action = msg.result!.answer!.suggested_action;
                                                                        const Icon = ACTION_ICONS[action] || ShoppingBag;
                                                                        const label = ACTION_LABELS[action] || action;
                                                                        return (
                                                                            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20">
                                                                                <Icon className="w-3 h-3" />
                                                                                {label}
                                                                            </span>
                                                                        );
                                                                    })()}
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>

                                                    {/* Product Cards Container - Mini Version */}
                                                    {msg.products && msg.products.length > 0 && (
                                                        <div className="w-full space-y-1.5 mt-1.5">
                                                            {msg.products.map((product: any) => (
                                                                <Link key={product.id} href={`/product/${product.id}`}>
                                                                    <div className="flex gap-3 p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-primary transition-colors cursor-pointer shadow-sm">
                                                                        <div className="w-12 h-12 rounded-lg py-0 overflow-hidden bg-slate-100 flex-shrink-0">
                                                                            {product.images?.[0] ? (
                                                                                <img src={product.images[0].image?.startsWith('http') ? product.images[0].image : `http://localhost:8000${product.images[0].image}`} className="w-full h-full object-cover" />
                                                                            ) : (
                                                                                <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-5 h-5 text-slate-300" /></div>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                                            <p className="text-xs font-bold text-slate-900 dark:text-slate-200 truncate">{product.title}</p>
                                                                            <span className="text-xs font-black text-primary mt-0.5">{Number(product.price).toLocaleString('ar-EG')} ج.م</span>
                                                                        </div>
                                                                    </div>
                                                                </Link>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Timestamp & Feedback */}
                                                    <div className="flex items-center gap-3 ml-2 mt-1.5 w-full">
                                                        <span className="text-[10px] text-slate-400 font-bold">{formatTime(msg.timestamp)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            {/* Typing Indicator */}
                            {loading && (
                                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-2 justify-start mb-5">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20">
                                        <Bot className="w-4 h-4 text-primary" />
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm border border-slate-200 dark:border-slate-700">
                                        <div className="flex items-baseline gap-0.5 text-slate-400 font-black tracking-[0.2em]">
                                            <span className="animate-[pulse_1s_infinite]">.</span>
                                            <span className="animate-[pulse_1s_infinite_150ms]">.</span>
                                            <span className="animate-[pulse_1s_infinite_300ms]">.</span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* ─── Input Bar ─── */}
                        <div className="flex-shrink-0 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
                            <form onSubmit={handleSubmit} className="flex items-end gap-2 relative">
                                <textarea
                                    ref={inputRef}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="اكتب استفسارك..."
                                    rows={1}
                                    className="flex-1 resize-none bg-slate-50 dark:bg-slate-900 text-sm font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none rounded-xl px-4 py-3 border border-slate-200 dark:border-slate-700 focus:border-primary transition-colors shadow-inner"
                                    disabled={loading}
                                    dir="rtl"
                                    style={{ maxHeight: '100px' }}
                                />
                                <button
                                    type="submit"
                                    disabled={loading || !input.trim()}
                                    className="w-[46px] h-[46px] flex items-center justify-center rounded-xl bg-primary text-white hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-md active:scale-95 flex-shrink-0"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4 rotate-180 -ml-1" />}
                                </button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Floating Trigger Button ─── */}
            <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className="w-14 h-14 rounded-full bg-teal-600 hover:bg-teal-700 text-white shadow-[0_8px_30px_rgb(13,148,136,0.3)] flex items-center justify-center transition-colors shadow-2xl z-50 border-2 border-white/20"
                style={{
                    animation: !isOpen ? 'bounce-subtle 3s infinite' : 'none'
                }}
            >
                {isOpen ? <X size={26} /> : <Bot size={28} />}
                {!isOpen && messages.length > 0 && (
                    <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full"></span>
                )}
            </motion.button>
        </div>
    );
}
