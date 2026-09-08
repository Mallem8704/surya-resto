"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { dictionary, Language, TranslationKey } from "@/lib/i18n";
import { safeStorage } from "@/lib/safeStorage";

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    toggleLanguage: () => void;
    t: (key: TranslationKey, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguageState] = useState<Language>("en");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const savedLang = (safeStorage.getItem("surya_lang") || safeStorage.getItem("teatime_lang")) as Language;
        if (savedLang && (savedLang === "en" || savedLang === "te")) {
            setLanguageState(savedLang);
        }
    }, []);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        safeStorage.setItem("surya_lang", lang);
    };

    const toggleLanguage = () => {
        const nextLang: Language = language === "en" ? "te" : "en";
        setLanguage(nextLang);
    };

    const t = (key: TranslationKey, fallback?: string): string => {
        const langDict = dictionary[language] || dictionary.en;
        return langDict[key] || fallback || dictionary.en[key] || String(key);
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }
    return context;
}
