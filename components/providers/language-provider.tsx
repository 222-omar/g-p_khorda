'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { Locale, dictionaries, Dictionary } from '@/lib/i18n/dictionaries';

interface LanguageContextType {
    locale: Locale;
    dict: Dictionary;
    toggleLanguage: () => void;
    isRtl: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [locale, setLocale] = useState<Locale>('ar');

    const toggleLanguage = () => {
        setLocale((prev) => (prev === 'ar' ? 'en' : 'ar'));
    };

    const dict = dictionaries[locale];
    const isRtl = locale === 'ar';

    return (
        <LanguageContext.Provider value={{ locale, dict, toggleLanguage, isRtl }}>
            <div dir={isRtl ? 'rtl' : 'ltr'}>{children}</div>
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
