"use client";

import { useEffect } from "react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error for production monitoring
        console.error("[GlobalError] Unhandled error:", error);
    }, [error]);

    return (
        <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center p-6 text-center">
            <div className="max-w-md space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto">
                    <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-espresso-900">Something went wrong</h1>
                <p className="text-espresso-600">
                    We encountered an unexpected error. Our team has been notified.
                </p>
                <div className="flex gap-3 justify-center pt-2">
                    <button
                        onClick={reset}
                        className="px-5 py-2.5 rounded-xl bg-saffron-500 hover:bg-saffron-600 text-white font-bold text-sm transition shadow-sm"
                    >
                        Try Again
                    </button>
                    <a
                        href="/"
                        className="px-5 py-2.5 rounded-xl bg-cream-200 hover:bg-cream-300 text-espresso-800 font-bold text-sm transition"
                    >
                        Go Home
                    </a>
                </div>
            </div>
        </div>
    );
}
