"use client";

import React from "react";

export function Card({
    children,
    className = "",
    hoverEffect = false,
    ...props
}: React.HTMLAttributes<HTMLDivElement> & { hoverEffect?: boolean }) {
    return (
        <div
            className={`bg-white rounded-2xl border border-cream-200 shadow-sm overflow-hidden transition-all duration-200 ${
                hoverEffect ? "hover:shadow-md hover:border-terracotta-200 hover:-translate-y-0.5" : ""
            } ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}

export function CardHeader({ children, className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={`p-5 pb-3 border-b border-cream-100 flex flex-col gap-1 ${className}`} {...props}>
            {children}
        </div>
    );
}

export function CardTitle({ children, className = "", ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
    return (
        <h3 className={`text-lg font-bold text-espresso-950 tracking-tight leading-snug ${className}`} {...props}>
            {children}
        </h3>
    );
}

export function CardDescription({ children, className = "", ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
    return (
        <p className={`text-xs text-espresso-600 font-normal leading-relaxed ${className}`} {...props}>
            {children}
        </p>
    );
}

export function CardContent({ children, className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={`p-5 ${className}`} {...props}>
            {children}
        </div>
    );
}

export function CardFooter({ children, className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={`p-5 pt-3 border-t border-cream-100 flex items-center justify-between ${className}`} {...props}>
            {children}
        </div>
    );
}
