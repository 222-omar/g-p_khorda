'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { useLanguage } from '@/components/providers/language-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { walletAPI, profilesAPI } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Wallet, CreditCard, Loader2, CheckCircle2, ArrowRight,
    Sparkles, TrendingUp, TrendingDown, RefreshCcw, Plus,
    History,
} from 'lucide-react';

const QUICK_AMOUNTS = [100, 500, 1000, 5000];

// Transaction type icon + color mapping
const TX_STYLES: Record<string, { icon: any; color: string; bg: string; sign: string }> = {
    topup: { icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30', sign: '+' },
    bid_hold: { icon: TrendingDown, color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30', sign: '-' },
    bid_refund: { icon: RefreshCcw, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30', sign: '+' },
    bid_deduct: { icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30', sign: '-' },
};

export default function PaymentPage() {
    const router = useRouter();
    const { dict, isRtl } = useLanguage();
    const { user, loading: authLoading } = useAuth();

    const [balance, setBalance] = useState<number>(0);
    const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
    const [customAmount, setCustomAmount] = useState('');
    const [loading, setLoading] = useState(true);
    const [topUpLoading, setTopUpLoading] = useState(false);
    const [success, setSuccess] = useState<{ amount: number; newBalance: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [txLoading, setTxLoading] = useState(false);

    // Card form state (simulated — required but not verified)
    const [cardNumber, setCardNumber] = useState('');
    const [cardExpiry, setCardExpiry] = useState('');
    const [cardCvv, setCardCvv] = useState('');
    const [cardHolder, setCardHolder] = useState('');
    const [cardErrors, setCardErrors] = useState<Record<string, boolean>>({});

    // Redirect if not logged in
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [authLoading, user, router]);

    // Fetch balance and transactions
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [profileData, txData] = await Promise.all([
                    profilesAPI.getMe(),
                    walletAPI.getTransactions().catch(() => []),
                ]);
                setBalance(parseFloat(profileData.wallet_balance) || 0);
                setTransactions(txData || []);
            } catch (err) {
                console.error('Failed to fetch payment data:', err);
            } finally {
                setLoading(false);
            }
        };
        if (user) fetchData();
    }, [user]);

    const getTopUpAmount = (): number => {
        if (selectedAmount) return selectedAmount;
        const parsed = parseFloat(customAmount);
        return isNaN(parsed) ? 0 : parsed;
    };

    const handleTopUp = async () => {
        const amount = getTopUpAmount();
        if (amount <= 0) {
            setError(isRtl ? 'اختار مبلغ أو ادخل مبلغ مخصص' : 'Select or enter an amount');
            return;
        }

        // Validate card fields (simulated — just check they're filled)
        const errors: Record<string, boolean> = {};
        const cleanCard = cardNumber.replace(/\s/g, '');
        if (cleanCard.length < 16) errors.cardNumber = true;
        if (!cardHolder.trim()) errors.cardHolder = true;
        if (cardExpiry.length < 5) errors.cardExpiry = true;
        if (cardCvv.length < 3) errors.cardCvv = true;
        
        setCardErrors(errors);
        
        if (Object.keys(errors).length > 0) {
            setError(isRtl ? 'برجاء ملء بيانات البطاقة بالكامل' : 'Please fill in all card details');
            return;
        }

        setTopUpLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const result = await walletAPI.topup(amount);
            setBalance(result.new_balance);
            setSuccess({ amount: result.amount_added, newBalance: result.new_balance });
            setSelectedAmount(null);
            setCustomAmount('');

            // Refresh transactions
            const txData = await walletAPI.getTransactions().catch(() => []);
            setTransactions(txData || []);

            // Clear success after 4s
            setTimeout(() => setSuccess(null), 4000);
        } catch (err: any) {
            setError(err.message || 'فشل الشحن');
        } finally {
            setTopUpLoading(false);
        }
    };

    const formatCardNumber = (val: string) => {
        const digits = val.replace(/\D/g, '').slice(0, 16);
        return digits.replace(/(.{4})/g, '$1 ').trim();
    };

    const formatExpiry = (val: string) => {
        const digits = val.replace(/\D/g, '').slice(0, 4);
        if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
        return digits;
    };

    if (authLoading || loading) {
        return (
            <>
                <Navbar />
                <div className="min-h-screen pt-32 flex justify-center items-start">
                    <Loader2 className="animate-spin text-primary" size={40} />
                </div>
                <Footer />
            </>
        );
    }

    return (
        <>
            <Navbar />
            <main className="pt-24 pb-16 min-h-screen px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-950">
                <div className="max-w-4xl mx-auto">

                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8"
                    >
                        <Link href="/profile">
                            <button className="mb-4 flex items-center gap-2 text-sm font-bold text-primary hover:text-primary/80 transition-colors">
                                <ArrowRight size={16} className={isRtl ? '' : 'rotate-180'} />
                                {isRtl ? 'العودة للبروفايل' : 'Back to Profile'}
                            </button>
                        </Link>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="bg-gradient-to-br from-primary to-emerald-600 p-2.5 rounded-xl text-white shadow-lg shadow-primary/25">
                                <Wallet size={24} />
                            </div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-black">{dict.payment.title}</h1>
                                <p className="text-slate-500 dark:text-slate-400 text-sm">{dict.payment.subtitle}</p>
                            </div>
                        </div>
                    </motion.div>

                    <div className="grid lg:grid-cols-5 gap-6">

                        {/* Left Column — Balance + Quick Add + Custom Amount */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="lg:col-span-3 space-y-6"
                        >
                            {/* Balance Card */}
                            <div className="bg-gradient-to-br from-primary via-emerald-600 to-teal-600 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Sparkles size={18} className="opacity-80" />
                                        <span className="text-sm font-semibold opacity-90">{dict.payment.currentBalance}</span>
                                    </div>
                                    <motion.p
                                        key={balance}
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="text-4xl md:text-5xl font-black"
                                    >
                                        {balance.toLocaleString()} <span className="text-lg opacity-80">{dict.currency}</span>
                                    </motion.p>
                                </div>
                            </div>

                            {/* Success Message */}
                            <AnimatePresence>
                                {success && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                        className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl"
                                    >
                                        <CheckCircle2 className="text-emerald-500 flex-shrink-0" size={22} />
                                        <div>
                                            <p className="font-bold text-emerald-700 dark:text-emerald-300 text-sm">{dict.payment.success}</p>
                                            <p className="text-xs text-emerald-600 dark:text-emerald-400">
                                                +{success.amount.toLocaleString()} {dict.currency} → {isRtl ? 'الرصيد الجديد' : 'New balance'}: {success.newBalance.toLocaleString()} {dict.currency}
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Error */}
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
                                >
                                    <p className="text-red-600 dark:text-red-400 text-sm font-bold text-center">{error}</p>
                                </motion.div>
                            )}

                            {/* Quick Add */}
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                    <Sparkles size={18} className="text-primary" />
                                    {dict.payment.quickAdd}
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {QUICK_AMOUNTS.map((amount) => (
                                        <motion.button
                                            key={amount}
                                            whileHover={{ scale: 1.04, y: -2 }}
                                            whileTap={{ scale: 0.96 }}
                                            onClick={() => {
                                                setSelectedAmount(amount === selectedAmount ? null : amount);
                                                setCustomAmount('');
                                                setError(null);
                                            }}
                                            className={`relative p-4 rounded-xl border-2 font-black text-lg transition-all ${selectedAmount === amount
                                                ? 'border-primary bg-primary/5 dark:bg-primary/10 text-primary shadow-md shadow-primary/10'
                                                : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-primary/50'
                                                }`}
                                        >
                                            {selectedAmount === amount && (
                                                <motion.div
                                                    layoutId="selected-badge"
                                                    className="absolute -top-2 -right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center"
                                                >
                                                    <CheckCircle2 size={12} className="text-white" />
                                                </motion.div>
                                            )}
                                            {amount.toLocaleString()}
                                            <span className="block text-xs font-medium text-slate-400 mt-1">{dict.currency}</span>
                                        </motion.button>
                                    ))}
                                </div>

                                {/* Custom Amount */}
                                <div className="mt-5">
                                    <label className="block text-sm font-bold text-slate-600 dark:text-slate-400 mb-2">
                                        {dict.payment.customAmount}
                                    </label>
                                    <div className="flex gap-3">
                                        <input
                                            type="number"
                                            value={customAmount}
                                            onChange={(e) => {
                                                setCustomAmount(e.target.value);
                                                setSelectedAmount(null);
                                                setError(null);
                                            }}
                                            placeholder={dict.payment.customPlaceholder}
                                            className="flex-1 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white dark:bg-slate-900 font-bold text-lg transition-all"
                                        />
                                        <span className="flex items-center text-slate-400 font-bold px-3">{dict.currency}</span>
                                    </div>
                                </div>

                                {/* Add Funds Button */}
                                <motion.button
                                    whileHover={{ scale: 1.01, boxShadow: '0 8px 24px rgba(22,163,74,0.3)' }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleTopUp}
                                    disabled={topUpLoading || getTopUpAmount() <= 0}
                                    className="w-full mt-5 bg-gradient-to-r from-primary to-emerald-600 hover:from-primary/90 hover:to-emerald-600/90 text-white py-4 rounded-xl font-bold text-lg shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {topUpLoading ? (
                                        <><Loader2 className="animate-spin" size={20} /> {dict.payment.adding}</>
                                    ) : (
                                        <><Plus size={20} /> {dict.payment.addFunds} {getTopUpAmount() > 0 ? `(${getTopUpAmount().toLocaleString()} ${dict.currency})` : ''}</>
                                    )}
                                </motion.button>
                            </div>
                        </motion.div>

                        {/* Right Column — Card Form (Decorative) + Transactions */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="lg:col-span-2 space-y-6"
                        >
                            {/* Card Form (Required — Simulated) */}
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                                    <CreditCard size={16} className="text-primary" />
                                    {isRtl ? 'بيانات البطاقة' : 'Card Details'}
                                    <span className="text-red-500 text-xs">*</span>
                                </h3>

                                <div className="space-y-3">
                                    {/* Card Number */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">{dict.payment.cardNumber} <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            value={cardNumber}
                                            onChange={(e) => { setCardNumber(formatCardNumber(e.target.value)); setCardErrors(prev => ({...prev, cardNumber: false})); }}
                                            placeholder={dict.payment.cardPlaceholder}
                                            maxLength={19}
                                            className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-slate-50 dark:bg-slate-900 tracking-widest font-mono transition-all ${cardErrors.cardNumber ? 'border-red-400 ring-2 ring-red-100 dark:ring-red-900/30' : 'border-slate-200 dark:border-slate-700'}`}
                                            dir="ltr"
                                        />
                                    </div>

                                    {/* Card Holder */}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">{dict.payment.cardHolder} <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            value={cardHolder}
                                            onChange={(e) => { setCardHolder(e.target.value); setCardErrors(prev => ({...prev, cardHolder: false})); }}
                                            placeholder={dict.payment.cardHolderPlaceholder}
                                            className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-slate-50 dark:bg-slate-900 transition-all ${cardErrors.cardHolder ? 'border-red-400 ring-2 ring-red-100 dark:ring-red-900/30' : 'border-slate-200 dark:border-slate-700'}`}
                                        />
                                    </div>

                                    {/* Expiry + CVV */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">{dict.payment.expiry} <span className="text-red-500">*</span></label>
                                            <input
                                                type="text"
                                                value={cardExpiry}
                                                onChange={(e) => { setCardExpiry(formatExpiry(e.target.value)); setCardErrors(prev => ({...prev, cardExpiry: false})); }}
                                                placeholder={dict.payment.expiryPlaceholder}
                                                maxLength={5}
                                                className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-slate-50 dark:bg-slate-900 text-center font-mono tracking-wider transition-all ${cardErrors.cardExpiry ? 'border-red-400 ring-2 ring-red-100 dark:ring-red-900/30' : 'border-slate-200 dark:border-slate-700'}`}
                                                dir="ltr"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">{dict.payment.cvv} <span className="text-red-500">*</span></label>
                                            <input
                                                type="text"
                                                value={cardCvv}
                                                onChange={(e) => { setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 3)); setCardErrors(prev => ({...prev, cardCvv: false})); }}
                                                placeholder={dict.payment.cvvPlaceholder}
                                                maxLength={3}
                                                className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-slate-50 dark:bg-slate-900 text-center font-mono tracking-wider transition-all ${cardErrors.cardCvv ? 'border-red-400 ring-2 ring-red-100 dark:ring-red-900/30' : 'border-slate-200 dark:border-slate-700'}`}
                                                dir="ltr"
                                            />
                                        </div>
                                    </div>


                                </div>
                            </div>

                            {/* Recent Transactions */}
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <h3 className="font-bold text-sm mb-4 flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                    <History size={16} />
                                    {dict.payment.recentTransactions}
                                </h3>

                                {transactions.length === 0 ? (
                                    <p className="text-center text-sm text-slate-400 py-6">{dict.payment.noTransactions}</p>
                                ) : (
                                    <div className="space-y-2 max-h-80 overflow-y-auto">
                                        {transactions.slice(0, 15).map((tx: any, idx: number) => {
                                            const style = TX_STYLES[tx.type] || TX_STYLES.topup;
                                            const Icon = style.icon;
                                            return (
                                                <motion.div
                                                    key={tx.id}
                                                    initial={{ opacity: 0, x: 10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: idx * 0.03 }}
                                                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                                                >
                                                    <div className={`${style.bg} p-1.5 rounded-lg`}>
                                                        <Icon size={14} className={style.color} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-bold truncate">{tx.type_label}</p>
                                                        <p className="text-[10px] text-slate-400 truncate">{tx.description}</p>
                                                    </div>
                                                    <div className="text-right flex-shrink-0">
                                                        <p className={`text-xs font-black ${style.color}`}>
                                                            {style.sign}{tx.amount.toLocaleString()}
                                                        </p>
                                                        <p className="text-[10px] text-slate-400">
                                                            {new Date(tx.created_at).toLocaleDateString(isRtl ? 'ar-EG' : 'en', {
                                                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                                            })}
                                                        </p>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
