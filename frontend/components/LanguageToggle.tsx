"use client";

import React from "react";
import { Languages } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export function LanguageToggle({ className = "" }: { className?: string }) {
    const { language, setLanguage } = useLanguage();

    return (
        <div
            className={`inline-flex items-center p-1 rounded-full border border-cream-300 bg-white shadow-xs ${className}`}
            role="group"
            aria-label="Language selection"
        >
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    onClick={() => setLanguage("en")}
                    className={`px-3 py-1 text-xs font-bold rounded-full transition-all duration-200 cursor-pointer ${
                        language === "en"
                            ? "bg-terracotta-500 text-white shadow-xs"
                            : "text-espresso-700 hover:text-espresso-950 hover:bg-cream-100"
                    }`}
                >
                    English
                </button>

                <button
                    type="button"
                    onClick={() => setLanguage("te")}
                    className={`px-3 py-1 text-xs font-bold rounded-full transition-all duration-200 cursor-pointer ${
                        language === "te"
                            ? "bg-terracotta-500 text-white shadow-xs"
                            : "text-espresso-700 hover:text-espresso-950 hover:bg-cream-100"
                    }`}
                >
                    తెలుగు
                </button>
            </div>
        </div>
    );
}
