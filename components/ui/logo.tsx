'use client';

import Link from 'next/link';
import { useLanguage } from '@/components/providers/language-provider';

interface LogoProps {
  className?: string;
}

export function Logo({ className = '' }: LogoProps) {
  const { isRtl } = useLanguage();
  
  return (
    <Link
      href="/"
      aria-label="4Sale — الرئيسية"
      className="flex items-center gap-3 flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-xl"
    >
      {/* ── Wordmark ── */}
      <div className="flex flex-col leading-none text-left">
        <span className="font-noto-kufi font-[900] text-[20px] tracking-tight text-slate-900 dark:text-white leading-none">
          Sale
        </span>
        <span className="font-tajawal text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] leading-none mt-1">
          Marketplace
        </span>
      </div>

      {/* ── Badge Mark ── */}
      <div className="relative">
        <div
          className="w-10 h-10 rounded-[12px] bg-primary relative flex items-center justify-center"
          style={{
            boxShadow: '0 4px 14px rgba(1,105,111,0.25)',
          }}
        >
          <span className="font-noto-kufi text-white font-black text-[22px] leading-none mb-[1px]">
            4
          </span>
          {/* Inner Light Edge */}
          <div className="absolute inset-0 rounded-[12px] border border-white/20 pointer-events-none" />
        </div>
      </div>
    </Link>
  );
}
