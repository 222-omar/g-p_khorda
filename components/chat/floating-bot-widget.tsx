'use client';

import { useState, useRef, useEffect } from 'react';
import { ragAPI, productsAPI } from '@/lib/api';
import { useAuth } from '@/components/providers/auth-provider';
import { useLanguage } from '@/components/providers/language-provider';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Bot, Loader2, Sparkles, X,
    ShoppingBag, Gavel, BarChart3, Settings,
    Send, MapPin, Tag, ThumbsUp, ThumbsDown, ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface RAGResult {
    products_data?: any[];
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

function formatTime(date: Date, dict: any) {
    return date.toLocaleTimeString(dict.currency === 'ج.م' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' });
}

export function FloatingBotWidget() {
    const { dict } = useLanguage();
    const { user } = useAuth();
    
    const SUGGESTED_QUERIES = [
        { emoji: '🏠', text: dict.chatWidget.q1Text, sub: dict.chatWidget.q1Sub },
        { emoji: '🚗', text: dict.chatWidget.q2Text, sub: dict.chatWidget.q2Sub },
        { emoji: '💻', text: dict.chatWidget.q3Text, sub: dict.chatWidget.q3Sub },
        { emoji: '❄️', text: dict.chatWidget.q4Text, sub: dict.chatWidget.q4Sub },
    ];

    const ACTION_LABELS: Record<string, string> = {
        view_listing: dict.chatWidget.viewListing,
        place_bid: dict.chatWidget.placeBid,
        compare_prices: dict.chatWidget.comparePrices,
        set_agent: dict.chatWidget.setAgent,
    };

    const ACTION_ICONS: Record<string, any> = {
        view_listing: ShoppingBag,
        place_bid: Gavel,
        compare_prices: BarChart3,
        set_agent: Settings,
    };

    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const userName = user?.user?.first_name || user?.user?.username?.split('@')[0] || dict.chatWidget.guest;
    const pathname = usePathname();

    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, loading, isOpen]);

    // Auto-resize textarea is handled by h-[62px] wrapper, keeping it single line scrollable
    if (!user || pathname?.startsWith('/admin')) return null;

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
            const chatHistory = messages.slice(-3).map(m => {
                let text = m.content;
                if (m.role === 'assistant' && m.products && m.products.length > 0) {
                    const productsInfo = m.products.map(p => {
                        const seller = p.owner_name || p.owner?.username || dict.chatWidget.unknownSeller;
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
            if (result.products_data && result.products_data.length > 0) {
                products = result.products_data;
            } else if (result.answer.items && result.answer.items.length > 0) {
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
                content: dict.chatWidget.errorMsg,
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
        <div className={`fixed bottom-6 ${dict.currency === 'ج.م' ? 'right-6' : 'left-6'} z-[999] flex flex-col items-end font-cairo`} dir={dict.currency === 'ج.م' ? 'rtl' : 'ltr'}>
            <style jsx global>{`
                #bot-scroll::-webkit-scrollbar { width: 4px; }
                #bot-scroll::-webkit-scrollbar-track { background: transparent; }
                #bot-scroll::-webkit-scrollbar-thumb { background: rgba(31,138,59,0.2); border-radius: 99px; }
                #bot-scroll::-webkit-scrollbar-thumb:hover { background: rgba(31,138,59,0.4); }
                
                @keyframes bounce-subtle {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-6px); }
                }
                .animate-pulse-slow {
                    animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
            `}</style>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 30, scale: 0.95 }}
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        className="mb-4 bg-[#FCFDFB] dark:bg-slate-800 w-[360px] sm:w-[480px] h-[760px] max-h-[85vh] rounded-[32px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.12)] border border-[#E7ECEA] dark:border-slate-700 flex flex-col overflow-hidden"
                    >
                        {/* ─── Bot Header (90px height) ─── */}
                        <div className="h-[90px] flex-shrink-0 bg-gradient-to-r from-white to-[#F2FBF5] dark:from-slate-800 dark:to-slate-900 border-b border-[#E7ECEA] dark:border-slate-700 px-6 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {/* Circular AI Avatar (56px) */}
                                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#1F8A3B] to-[#43A047] flex items-center justify-center shadow-md shadow-[#1F8A3B]/10 flex-shrink-0">
                                    <Bot className="w-7 h-7 text-white" />
                                </div>
                                <div className="leading-tight text-right">
                                    <h3 className="text-[#101828] dark:text-white font-cairo font-black text-[18px]">{dict.chatWidget.title}</h3>
                                    <p className="text-[12px] text-[#1F8A3B] font-bold flex items-center gap-1.5 mt-0.5 justify-end">
                                        <span className="relative flex h-1.5 w-1.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1F8A3B] opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#1F8A3B]"></span>
                                        </span>
                                        {dict.chatWidget.activeNow}
                                    </p>
                                </div>
                            </div>
                            {/* Close Button */}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-[#667085] hover:text-[#101828] transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* ─── Chat Messages Area ─── */}
                        <div className="flex-1 overflow-y-auto px-6 py-6 bg-[#FCFDFB] dark:bg-slate-900/40" id="bot-scroll">
                            {/* Empty Welcome State */}
                            {messages.length === 0 && (
                                <div className="flex flex-col h-full justify-between py-2 select-none">
                                    
                                    {/* Centered Welcome Header */}
                                    <div className="text-center mt-4">
                                        {/* Large Circular Background with Floating Robot & Sparkles */}
                                        <div className="relative flex items-center justify-center w-36 h-36 mx-auto mb-6">
                                            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#F2FBF5] to-[#E8F5E9] border border-[#1F8A3B]/10 animate-pulse-slow"></div>
                                            
                                            {/* Sparkles */}
                                            <motion.div 
                                                animate={{ scale: [1, 1.2, 1], rotate: [0, 10, 0] }}
                                                transition={{ duration: 4, repeat: Infinity }}
                                                className="absolute top-2 right-2 text-[#43A047]"
                                            >
                                                <Sparkles size={22} className="fill-current" />
                                            </motion.div>
                                            <motion.div 
                                                animate={{ scale: [1, 0.8, 1], rotate: [0, -10, 0] }}
                                                transition={{ duration: 3.5, repeat: Infinity, delay: 0.5 }}
                                                className="absolute bottom-2 left-2 text-[#1F8A3B]"
                                            >
                                                <Sparkles size={16} className="fill-current" />
                                            </motion.div>
                                            
                                            {/* Floating Robot Image Container */}
                                            <motion.div
                                                animate={{ y: [0, -8, 0] }}
                                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                                className="relative z-10 w-24 h-24 rounded-[28px] bg-gradient-to-tr from-[#1F8A3B] to-[#43A047] flex items-center justify-center shadow-lg shadow-[#1F8A3B]/20 border border-white/10"
                                            >
                                                <Bot className="w-12 h-12 text-white" />
                                            </motion.div>
                                        </div>

                                        <h2 className="text-[#101828] dark:text-white font-cairo font-black text-[36px] mb-2 leading-none">
                                            👋 {dict.chatWidget.welcome} {userName}
                                        </h2>
                                        <p className="text-[#667085] dark:text-slate-400 font-cairo text-[16px] leading-relaxed max-w-[340px] mx-auto">
                                            {dict.chatWidget.description1}
                                            <br />
                                            {dict.chatWidget.description2}
                                        </p>
                                    </div>

                                    {/* Premium Suggestion Cards (Height 88px, Radius 24px) */}
                                    <div className="flex flex-col gap-[18px] w-full mt-6 mb-4">
                                        {SUGGESTED_QUERIES.map((q, i) => (
                                            <button
                                                key={i}
                                                onClick={() => handleSearch(q.text)}
                                                className="group w-full h-[88px] bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-[24px] shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:border-[#1F8A3B]/30 hover:shadow-[0_12px_30px_rgba(31,138,59,0.08)] hover:-translate-y-1 transition-all duration-300 px-5 flex items-center justify-between text-right gap-4"
                                            >
                                                {/* Left Column (RTL: Arrow Icon on Left side) */}
                                                <div className="text-[#1F8A3B] transition-transform duration-300 group-hover:-translate-x-1.5 flex-shrink-0">
                                                    <ArrowLeft size={20} className="stroke-[2.5]" />
                                                </div>

                                                {/* Center column (Text Stack) */}
                                                <div className="flex-grow min-w-0 flex flex-col justify-center">
                                                    <span className="font-cairo font-bold text-[16px] text-[#101828] dark:text-white truncate">
                                                        {q.text}
                                                    </span>
                                                    <span className="font-cairo text-[12px] text-[#667085] dark:text-slate-400 truncate mt-0.5">
                                                        {q.sub}
                                                    </span>
                                                </div>

                                                {/* Right column (RTL: Icon Container on Right side 52x52) */}
                                                <div className="w-[52px] h-[52px] rounded-2xl bg-[#F2FBF5] dark:bg-[#1F8A3B]/10 flex items-center justify-center text-[22px] flex-shrink-0 border border-[#1F8A3B]/5">
                                                    {q.emoji}
                                                </div>
                                            </button>
                                        ))}
                                    </div>

                                </div>
                            )}

                            {/* Messages List */}
                            {messages.length > 0 && (
                                <div className="space-y-4">
                                    {messages.map((msg) => (
                                        <div key={msg.id} className="w-full">
                                            {msg.role === 'user' ? (
                                                <div className="flex items-start gap-2 justify-end mb-4">
                                                    <div className="flex flex-col items-end max-w-[85%]">
                                                        <div className="bg-[#1F8A3B] text-white px-4.5 py-3 rounded-[20px] rounded-tr-sm shadow-[0_4px_12px_rgba(31,138,59,0.15)]">
                                                            <p className="text-[15px] leading-relaxed font-semibold">{msg.content}</p>
                                                        </div>
                                                        <span className="text-[10px] text-[#667085] mt-1 mr-1.5 font-bold">{formatTime(msg.timestamp, dict)}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-start gap-3 justify-start mb-4 w-full">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#1F8A3B] to-[#43A047] flex items-center justify-center flex-shrink-0 shadow-sm shadow-[#1F8A3B]/10 border border-white/10">
                                                        <Bot className="w-5 h-5 text-white" />
                                                    </div>
                                                    <div className="flex flex-col items-start max-w-[82%] w-full">
                                                        <div className="bg-white dark:bg-slate-800 px-5 py-4 rounded-[20px] rounded-tl-sm shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-[#E5E7EB] dark:border-slate-700 w-full">
                                                            <p className="text-[15px] font-semibold text-[#101828] dark:text-slate-100 leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                                                            {msg.result?.answer?.suggested_action && (
                                                                <>
                                                                    <div className="my-3 border-b border-slate-100 dark:border-slate-700/50 w-full" />
                                                                    <div className="mb-0.5">
                                                                        {(() => {
                                                                            const action = msg.result!.answer!.suggested_action;
                                                                            const Icon = ACTION_ICONS[action] || ShoppingBag;
                                                                            const label = ACTION_LABELS[action] || action;
                                                                            return (
                                                                                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#1F8A3B] bg-[#F2FBF5] px-2.5 py-1 rounded-md border border-[#1F8A3B]/20">
                                                                                    <Icon className="w-3.5 h-3.5" />
                                                                                    {label}
                                                                                </span>
                                                                            );
                                                                        })()}
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>

                                                        {/* Mini Product Cards */}
                                                        {msg.products && msg.products.length > 0 && (
                                                            <div className="w-full space-y-2 mt-2">
                                                                {msg.products.map((product: any) => (
                                                                    <Link key={product.id} href={`/product/${product.id}`}>
                                                                        <div className="flex gap-3.5 p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 hover:border-[#1F8A3B] transition-colors cursor-pointer shadow-sm group">
                                                                            <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                                                                                {product.images?.[0] ? (
                                                                                    <img src={product.images[0].image?.startsWith('http') ? product.images[0].image : `https://four-sale-backend.onrender.com${product.images[0].image}`} className="w-full h-full object-cover" />
                                                                                ) : (
                                                                                    <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-5 h-5 text-slate-300" /></div>
                                                                                )}
                                                                            </div>
                                                                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                                                <p className="text-sm font-bold text-[#101828] dark:text-slate-200 truncate group-hover:text-[#1F8A3B] transition-colors">{product.title}</p>
                                                                                <span className="text-xs font-black text-[#1F8A3B] mt-1">{Number(product.price).toLocaleString(dict.currency === 'ج.م' ? 'ar-EG' : 'en-US')} {dict.currency}</span>
                                                                            </div>
                                                                        </div>
                                                                    </Link>
                                                                ))}
                                                            </div>
                                                        )}

                                                        <div className="flex items-center gap-3 ml-2 mt-1.5 w-full">
                                                            <span className="text-[10px] text-[#667085] font-bold">{formatTime(msg.timestamp, dict)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Typing Indicator */}
                            {loading && (
                                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3 justify-start mb-4">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#1F8A3B] to-[#43A047] flex items-center justify-center flex-shrink-0 shadow-sm border border-white/10">
                                        <Bot className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 px-5 py-3.5 rounded-[20px] rounded-tl-sm shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-[#E5E7EB] dark:border-slate-700">
                                        <div className="flex items-baseline gap-1 text-[#667085] font-black tracking-[0.2em]">
                                            <span className="animate-[pulse_1s_infinite]">.</span>
                                            <span className="animate-[pulse_1s_infinite_150ms]">.</span>
                                            <span className="animate-[pulse_1s_infinite_300ms]">.</span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* ─── Input Bar (Height 62px area) ─── */}
                        <div className="flex-shrink-0 border-t border-[#E7ECEA] dark:border-slate-700 bg-[#FCFDFB] dark:bg-slate-800 p-4">
                            <form onSubmit={handleSubmit} className="flex items-center gap-3 w-full bg-white dark:bg-slate-900 border border-[#E7ECEA] dark:border-slate-700 rounded-3xl px-4 py-2 shadow-inner focus-within:border-[#1F8A3B] transition-colors h-[62px]">
                                <textarea
                                    ref={inputRef}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={dict.chatWidget.placeholder}
                                    rows={1}
                                    className="flex-grow bg-transparent text-sm font-cairo font-medium text-[#101828] dark:text-slate-100 placeholder-[#667085] outline-none resize-none pt-2.5 h-full align-middle scrollbar-none"
                                    disabled={loading}
                                    dir={dict.currency === 'ج.م' ? 'rtl' : 'ltr'}
                                />
                                <button
                                    type="submit"
                                    disabled={loading || !input.trim()}
                                    className="w-[46px] h-[46px] flex items-center justify-center rounded-2xl bg-gradient-to-r from-[#1F8A3B] to-[#43A047] text-white hover:from-[#176a2c] hover:to-[#388e3c] disabled:opacity-40 disabled:pointer-events-none transition-all shadow-[0_4px_12px_rgba(31,138,59,0.22)] active:scale-95 flex-shrink-0"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 rotate-180" />}
                                </button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Floating Trigger Button (64px, Gradient) ─── */}
            <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className="w-16 h-16 rounded-full bg-gradient-to-r from-[#1F8A3B] to-[#43A047] text-white shadow-[0_8px_30px_rgba(31,138,59,0.3)] flex items-center justify-center transition-all z-50 border-2 border-white/20"
                style={{
                    animation: !isOpen ? 'bounce-subtle 3.5s infinite' : 'none'
                }}
            >
                {isOpen ? <X size={26} className="stroke-[2.5]" /> : <Bot size={28} />}
                {!isOpen && messages.length > 0 && (
                    <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full"></span>
                )}
            </motion.button>
        </div>
    );
}
