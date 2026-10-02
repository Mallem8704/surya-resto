"use client";

import React, { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { GA_MEASUREMENT_ID, trackPageView } from "@/lib/analytics";

function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return;
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
    trackPageView(url);
  }, [pathname, searchParams]);

  return null;
}

export function GoogleAnalytics() {
  const measurementId = GA_MEASUREMENT_ID || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  useEffect(() => {
    if (!measurementId) {
      if (process.env.NODE_ENV === "development") {
        console.info("[GA4] NEXT_PUBLIC_GA_MEASUREMENT_ID not configured. Analytics tracking dormant.");
      }
      return;
    }

    // Load gtag.js script
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);

    // Initialize gtag
    const initScript = document.createElement("script");
    initScript.textContent = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${measurementId}', {
        page_path: window.location.pathname,
        send_page_view: true,
        cookie_flags: 'SameSite=None;Secure'
      });
    `;
    document.head.appendChild(initScript);
  }, [measurementId]);

  if (!measurementId) return null;

  return (
    <Suspense fallback={null}>
      <AnalyticsTracker />
    </Suspense>
  );
}
