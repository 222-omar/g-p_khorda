'use client';

import Link from 'next/link';
import { useLanguage } from '@/components/providers/language-provider';


export function Footer() {
    const { dict } = useLanguage();

    return (
        <footer className="bg-slate-50 dark:bg-slate-800 py-10 mt-20 border-t border-slate-200 dark:border-slate-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center">
                    <Link href="/" className="inline-flex items-center justify-center gap-2 mb-4 group">
                        <span className="font-bold text-xl"><span className="text-primary">4</span>Sale</span>
                    </Link>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        {dict.footer.rights}
                    </p>
                </div>
            </div>
        </footer>
    );
}
