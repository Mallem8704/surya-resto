import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LanguageProvider } from "@/context/LanguageContext";
import { ToastProvider } from "@/context/ToastContext";
import { AuthProvider } from "@/context/AuthContext";
import { OutletProvider } from "@/context/OutletContext";
import { OfflineProvider } from "@/context/OfflineContext";
import { CustomerProvider } from "@/context/CustomerContext";
import { OfflineBanner } from "@/components/offline/OfflineBanner";

export const viewport: Viewport = {
  themeColor: "#f97316",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Surya Family Restaurant Kadiri | Authentic Biryani, Punjabi Curries & Family Dining",
    template: "%s | Surya Family Restaurant Kadiri",
  },
  description:
    "Surya Family Restaurant (సూర్య ఫ్యామిలీ రెస్టారెంట్ కదిరి), rated 4.8★ on Google. Located on Bypass Road, opposite RTC Bus Stand, Kadiri. Renowned for authentic Hyderabadi Biryani, Punjabi Chicken Curry, Butter Naan, and pure family dining.",
  keywords: [
    "surya family restaurant kadiri",
    "surya restaurant kadiri",
    "సూర్య ఫ్యామిలీ రెస్టారెంట్ కదిరి",
    "restaurants in kadiri",
    "best biryani in kadiri",
    "family restaurant kadiri",
    "opposite rtc bus stand kadiri",
    "punjabi chicken curry butter naan kadiri",
    "kadiri bypass road restaurant",
    "veg non veg restaurant kadiri",
    "surya restaurant online order",
  ],
  authors: [{ name: "Surya Family Restaurant" }],
  creator: "Surya Family Restaurant",
  publisher: "Surya Family Restaurant",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: SITE_URL,
    siteName: "Surya Family Restaurant — Kadiri",
    title: "Surya Family Restaurant Kadiri | 4.8★ Rated Family Dining & Biryani",
    description:
      "Kadiri's favorite destination for authentic Hyderabadi Dum Biryani, Punjabi Chicken Curry, Tandoori Starters & Butter Naan. Scan QR to order at table or take away.",
    images: [
      {
        url: "/logo.png",
        width: 800,
        height: 800,
        alt: "Surya Family Restaurant Kadiri Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Surya Family Restaurant — Kadiri",
    description: "Authentic Biryani, Punjabi Curries & Table QR Ordering in Kadiri.",
    images: ["/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Surya Restaurant",
  },
};

const restaurantStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": ["Restaurant", "FoodEstablishment", "LocalBusiness"],
      "@id": `${SITE_URL}/#restaurant`,
      "name": "Surya Family Restaurant",
      "alternateName": [
        "Surya Restaurant Kadiri",
        "సూర్య ఫ్యామిలీ రెస్టారెంట్ కదిరి",
        "Surya Family Restaurant Bypass Road"
      ],
      "image": [
        `${SITE_URL}/logo.png`
      ],
      "url": SITE_URL,
      "telephone": "+91 98803 58634",
      "priceRange": "₹200 - ₹400",
      "servesCuisine": [
        "Hyderabadi Biryani",
        "North Indian / Punjabi",
        "Tandoori",
        "Andhra Specials",
        "Chinese",
        "South Indian"
      ],
      "currenciesAccepted": "INR",
      "paymentAccepted": "Cash, UPI, Credit Card, Debit Card, Google Pay, PhonePe, Paytm",
      "acceptsReservations": "True",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Dhandubatu Street, Bypass road, opposite to RTC Bus Stand, Police Quarters",
        "addressLocality": "Kadiri",
        "addressRegion": "Andhra Pradesh",
        "postalCode": "515591",
        "addressCountry": "IN"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": 14.1132,
        "longitude": 78.1612
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.8",
        "reviewCount": "69",
        "bestRating": "5",
        "worstRating": "1"
      },
      "openingHoursSpecification": [
        {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
          "opens": "11:00",
          "closes": "22:30"
        }
      ]
    }
  ]
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(restaurantStructuredData) }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  if (typeof caches !== 'undefined') {
                    caches.keys().then(function(names) {
                      names.forEach(function(name) {
                        if (name !== 'surya-restaurant-v1') {
                          caches.delete(name);
                        }
                      });
                    });
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className="min-h-screen bg-cream-50 text-espresso-900 selection:bg-amber-500 selection:text-white flex flex-col font-sans"
        suppressHydrationWarning
      >
        <AuthProvider>
          <CustomerProvider>
            <OutletProvider>
              <LanguageProvider>
                <ToastProvider>
                  <OfflineProvider>
                    {children}
                    <OfflineBanner />
                  </OfflineProvider>
                </ToastProvider>
              </LanguageProvider>
            </OutletProvider>
          </CustomerProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
