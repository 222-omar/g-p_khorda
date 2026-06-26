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
      aria-label="تدويرة — الرئيسية"
      className={`flex items-center flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-xl ${className}`}
    >
      <img
        src="/logo.png"
        alt="Tadwera Logo"
        className="h-28 w-auto object-contain"
      />
    </Link>
  );
}
