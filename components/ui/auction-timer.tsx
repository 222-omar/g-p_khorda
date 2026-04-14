'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { motion } from 'framer-motion';

interface AuctionTimerProps {
    endTime: string;
}

export function AuctionTimer({ endTime }: AuctionTimerProps) {
    const [timeLeft, setTimeLeft] = useState('');
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date().getTime();
            const end = new Date(endTime).getTime();
            const distance = end - now;

            if (distance < 0) {
                setTimeLeft('انتهى المزاد');
                setProgress(100);
                clearInterval(timer);
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            if (days > 0) {
                setTimeLeft(`${days} يوم ${hours} ساعة`);
            } else if (hours > 0) {
                setTimeLeft(`${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
            } else {
                setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
            }

            // Calculate progress (assuming 7 days auction)
            const totalTime = 7 * 24 * 60 * 60 * 1000;
            const elapsed = totalTime - distance;
            setProgress((elapsed / totalTime) * 100);
        }, 1000);

        return () => clearInterval(timer);
    }, [endTime]);

    return (
        <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 p-4 rounded-xl border border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-2 mb-3">
                <Clock className="text-orange-600 animate-pulse" size={20} />
                <span className="font-bold text-sm">المتبقي على انتهاء المزاد</span>
            </div>

            <div className="text-2xl font-black text-orange-600 mb-3 font-mono">
                {timeLeft}
            </div>

            {/* Progress Bar */}
            <div className="relative h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                />
            </div>
        </div>
    );
}
