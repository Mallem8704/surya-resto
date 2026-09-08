"use client";

import React from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant = "primary" | "secondary" | "saffron" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export function Button({
    children,
    variant = "primary",
    size = "md",
    isLoading = false,
    leftIcon,
    rightIcon,
    className = "",
    disabled,
    ...props
}: ButtonProps) {
    const baseStyles =
        "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none active:scale-[0.98]";

    const variantStyles: Record<ButtonVariant, string> = {
        primary:
            "bg-terracotta-500 text-white hover:bg-terracotta-600 focus:ring-terracotta-400 shadow-sm shadow-terracotta-500/20 active:bg-terracotta-700",
        secondary:
            "bg-espresso-900 text-white hover:bg-espresso-800 focus:ring-espresso-600 shadow-sm",
        saffron:
            "bg-saffron-500 text-espresso-950 hover:bg-saffron-400 focus:ring-saffron-300 font-bold shadow-sm shadow-saffron-500/20",
        outline:
            "border border-cream-300 bg-white/80 hover:bg-cream-100 text-espresso-900 focus:ring-cream-400",
        ghost:
            "bg-transparent hover:bg-cream-200/60 text-espresso-800 focus:ring-cream-300",
        danger:
            "bg-red-600 text-white hover:bg-red-700 focus:ring-red-400 shadow-sm shadow-red-600/20",
    };

    const sizeStyles: Record<ButtonSize, string> = {
        sm: "text-xs px-3 py-1.5 gap-1.5",
        md: "text-sm px-4 py-2.5 gap-2",
        lg: "text-base px-6 py-3 gap-2.5",
    };

    return (
        <button
            className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
            {!isLoading && leftIcon && <span className="shrink-0">{leftIcon}</span>}
            <span>{children}</span>
            {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </button>
    );
}
