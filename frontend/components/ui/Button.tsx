"use client";

import React from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant = "primary" | "secondary" | "saffron" | "outline" | "ghost" | "danger" | "blue" | "red";
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
            "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-400 shadow-sm shadow-blue-500/20 active:bg-blue-800",
        blue:
            "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-400 shadow-sm shadow-blue-500/20 active:bg-blue-800",
        red:
            "bg-red-600 text-white hover:bg-red-700 focus:ring-red-400 shadow-sm shadow-red-600/20 active:bg-red-800",
        secondary:
            "bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-600 shadow-sm",
        saffron:
            "bg-amber-500 text-slate-950 hover:bg-amber-400 focus:ring-amber-300 font-bold shadow-sm shadow-amber-500/20",
        outline:
            "border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 focus:ring-slate-300 shadow-2xs",
        ghost:
            "bg-transparent hover:bg-slate-100 text-slate-700 focus:ring-slate-300",
        danger:
            "bg-red-600 text-white hover:bg-red-700 focus:ring-red-400 shadow-sm shadow-red-600/20 active:bg-red-800",
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
