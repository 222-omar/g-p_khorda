'use client';

import { useState, useRef, useEffect } from 'react';
import { ragAPI, productsAPI } from '@/lib/api';
import { Navbar } from '@/components/layout/navbar';
import Link from 'next/link';
import {
    Search, Bot, Loader2, Sparkles, ArrowLeft,
    ShoppingBag, Gavel, BarChart3, Settings,
    Clock, Zap, Database, Brain, Send
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
    'عايز غسالة رخيصة',
    'ورييني كل العربيات',
    'لابتوب اقل من 5000 جنيه',
    'خردة حديد في القاهرة',
    'كتب مدرسية مستعملة',
    'تلاجة حالة كويسة',
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

export default function SmartSearchPage() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

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

            // Fetch product details for the returned IDs
            let products: any[] = [];
            if (result.answer.items && result.answer.items.length > 0) {
                const productPromises = result.answer.items.slice(0, 6).map(async (id) => {
                    try {
                        return await productsAPI.getById(Number(id));
                    } catch {
                        return null;
                    }
                });
                products = (await Promise.all(productPromises)).filter(Boolean);
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
                content: 'حصلت مشكلة في البحث. جرب تاني بعد شوية.',
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

    return (
        <>
            <Navbar />
            <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 pt-20">
                <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col" style={{ height: 'calc(100vh - 80px)' }}>

                    {/* Header */}
                    <div className="text-center mb-4 flex-shrink-0">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-500/10 to-indigo-500/10 dark:from-violet-500/20 dark:to-indigo-500/20 border border-violet-200/50 dark:border-violet-700/30 mb-3">
                            <Sparkles className="w-4 h-4 text-violet-500" />
                            <span className="text-sm font-medium text-violet-700 dark:text-violet-300">
                                بحث ذكي بالذكاء الاصطناعي
                            </span>
                        </div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                            اسأل 4Sale أي حاجة
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            اكتب اللي بتدور عليه بالعامي وأنا هلاقيهولك
                        </p>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 overflow-y-auto space-y-4 mb-4 px-1">
                        {/* Empty state */}
                        {messages.length === 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-col items-center justify-center h-full"
                            >
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-6 shadow-xl shadow-violet-500/20">
                                    <Brain className="w-10 h-10 text-white" />
                                </div>
                                <p className="text-slate-500 dark:text-slate-400 mb-6 text-center">
                                    جرب تسأل عن أي حاجة... غسالة، عربية، خردة، كتب
                                </p>
                                <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                                    {SUGGESTED_QUERIES.map((q, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleSearch(q)}
                                            className="px-4 py-2 text-sm rounded-full border border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all text-slate-600 dark:text-slate-300 hover:text-violet-700 dark:hover:text-violet-300"
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* Messages */}
                        <AnimatePresence>
                            {messages.map((msg) => (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    {msg.role === 'user' ? (
                                        /* User Message */
                                        <div className="max-w-[80%] bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl rounded-tr-md px-5 py-3 shadow-lg">
                                            <p className="text-sm">{msg.content}</p>
                                        </div>
                                    ) : (
                                        /* Assistant Message */
                                        <div className="max-w-[90%] space-y-3">
                                            <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-tl-md px-5 py-4 shadow-md border border-slate-100 dark:border-slate-700">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                                                        <Bot className="w-3.5 h-3.5 text-white" />
                                                    </div>
                                                    <span className="text-xs font-semibold text-violet-600 dark:text-violet-400">4Sale AI</span>
                                                </div>
                                                <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{msg.content}</p>

                                                {/* Suggested Action */}
                                                {msg.result?.answer.suggested_action && (
                                                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                                                        {(() => {
                                                            const action = msg.result!.answer.suggested_action;
                                                            const Icon = ACTION_ICONS[action] || ShoppingBag;
                                                            const label = ACTION_LABELS[action] || action;
                                                            return (
                                                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-full">
                                                                    <Icon className="w-3.5 h-3.5" />
                                                                    {label}
                                                                </span>
                                                            );
                                                        })()}
                                                    </div>
                                                )}

                                                {/* Meta Stats */}
                                                {msg.result?.meta && (
                                                    <div className="mt-3 flex gap-3 text-[10px] text-slate-400">
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {(msg.result.meta.latency_ms / 1000).toFixed(1)}s
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Brain className="w-3 h-3" />
                                                            Vector: {msg.result.meta.vector_results}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Database className="w-3 h-3" />
                                                            SQL: {msg.result.meta.sql_results}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Product Cards */}
                                            {msg.products && msg.products.length > 0 && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {msg.products.map((product: any) => (
                                                        <Link
                                                            key={product.id}
                                                            href={`/product/${product.id}`}
                                                            className="group flex gap-3 p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-600 hover:shadow-md transition-all"
                                                        >
                                                            {product.images?.[0] && (
                                                                <img
                                                                    src={product.images[0].image?.startsWith('http') ? product.images[0].image : `http://localhost:8000${product.images[0].image}`}
                                                                    alt={product.title}
                                                                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                                                                />
                                                            )}
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                                                                    {product.title}
                                                                </p>
                                                                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                                                    {Number(product.price).toLocaleString('ar-EG')} جنيه
                                                                </p>
                                                                <p className="text-xs text-slate-400 mt-0.5 truncate">
                                                                    {product.location}
                                                                </p>
                                                            </div>
                                                        </Link>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {/* Loading indicator */}
                        {loading && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex justify-start"
                            >
                                <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-tl-md px-5 py-4 shadow-md border border-slate-100 dark:border-slate-700">
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                                            <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                                        </div>
                                        <div className="flex gap-1">
                                            <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                        <span className="text-xs text-slate-400">بدور في {'>'}30 منتج...</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="flex-shrink-0 pb-4">
                        <form onSubmit={handleSubmit} className="relative">
                            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 focus-within:border-violet-400 dark:focus-within:border-violet-500 shadow-lg transition-all px-4 py-2">
                                <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="اكتب اللي بتدور عليه... مثلاً: غسالة توشيبا رخيصة"
                                    className="flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none py-2"
                                    disabled={loading}
                                    dir="rtl"
                                />
                                <button
                                    type="submit"
                                    disabled={loading || !input.trim()}
                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0 shadow-md"
                                >
                                    {loading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                        </form>
                        <p className="text-center text-[10px] text-slate-400 mt-2">
                            مدعوم بـ Gemini AI • بحث هجين (Vector + SQL)
                        </p>
                    </div>
                </div>
            </main>
        </>
    );
}
