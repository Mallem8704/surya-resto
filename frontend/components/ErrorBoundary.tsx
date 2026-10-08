"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
    /** Optional label to identify which section crashed in error logs */
    section?: string;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

/**
 * Production-grade React Error Boundary for Surya Family Restaurant.
 * Catches rendering errors in child component tree, logs them,
 * and renders a friendly fallback UI instead of a blank white screen.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log the error for production monitoring
        const section = this.props.section || "unknown";
        console.error(
            `[ErrorBoundary:${section}] Caught rendering error:`,
            error,
            errorInfo.componentStack
        );
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            // Allow custom fallback UI
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex flex-col items-center justify-center min-h-[200px] p-6 text-center">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-3">
                        <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-bold text-espresso-900 mb-1">Something went wrong</h3>
                    <p className="text-sm text-espresso-600 mb-4 max-w-sm">
                        {this.state.error?.message || "An unexpected error occurred."}
                    </p>
                    <button
                        onClick={this.handleRetry}
                        className="px-4 py-2 rounded-xl bg-saffron-500 hover:bg-saffron-600 text-white text-sm font-bold transition shadow-sm"
                    >
                        Try Again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
