"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { StaffPortalModal } from "@/components/home/StaffPortalModal";
import { HowItWorksModal } from "@/components/home/HowItWorksModal";
import { BranchSelectorModal } from "@/components/home/BranchSelectorModal";
import { useOutlet } from "@/context/OutletContext";
import { isTableBookingEnabled, isTableOrderingEnabled } from "@/lib/features";
import {
    Shield,
    Phone,
    Clock,
    Snowflake,
    MessageSquare,
    UtensilsCrossed,
    Utensils,
    Crown,
    Calendar,
    Users,
    MapPin,
    Search,
    Flame,
    Sparkles,
    ShoppingBag,
    QrCode,
    Zap,
    ShieldCheck,
    Smartphone,
    CreditCard,
    Bike,
    Truck,
    Star,
    CheckCircle2,
    Heart,
    Menu as MenuIcon,
    X,
} from "lucide-react";

/* ─── SVG Sun Logo (matches design exactly) ──────────────────── */
// Ray coords are pre-computed (inner r=25, outer r=38, center=50,50)
// to avoid floating-point hydration mismatches from Math.cos/sin
const SUN_RAYS = [
    { x1: "75",    y1: "50",    x2: "88",    y2: "50",    w: "3.5" }, // 0°
    { x1: "71.65", y1: "62.5",  x2: "82.91", y2: "69",    w: "2"   }, // 30°
    { x1: "62.5",  y1: "71.65", x2: "69",    y2: "82.91", w: "3.5" }, // 60°
    { x1: "50",    y1: "75",    x2: "50",    y2: "88",    w: "2"   }, // 90°
    { x1: "37.5",  y1: "71.65", x2: "31",    y2: "82.91", w: "3.5" }, // 120°
    { x1: "28.35", y1: "62.5",  x2: "17.09", y2: "69",    w: "2"   }, // 150°
    { x1: "25",    y1: "50",    x2: "12",    y2: "50",    w: "3.5" }, // 180°
    { x1: "28.35", y1: "37.5",  x2: "17.09", y2: "31",    w: "2"   }, // 210°
    { x1: "37.5",  y1: "28.35", x2: "31",    y2: "17.09", w: "3.5" }, // 240°
    { x1: "50",    y1: "25",    x2: "50",    y2: "12",    w: "2"   }, // 270°
    { x1: "62.5",  y1: "28.35", x2: "69",    y2: "17.09", w: "3.5" }, // 300°
    { x1: "71.65", y1: "37.5",  x2: "82.91", y2: "31",    w: "2"   }, // 330°
] as const;

const SuryaSunLogo = ({ size = 44 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="22" fill="#D4AF37" />
        <circle cx="50" cy="50" r="18" fill="#E8C547" />
        <circle cx="50" cy="50" r="12" fill="#D4AF37" stroke="#C8960C" strokeWidth="1.5" />
        {SUN_RAYS.map((r, i) => (
            <line key={i} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2}
                stroke="#D4AF37" strokeWidth={r.w} strokeLinecap="round" />
        ))}
        {/* Face */}
        <circle cx="44" cy="47" r="2.5" fill="#8B3A00" />
        <circle cx="56" cy="47" r="2.5" fill="#8B3A00" />
        <path d="M44 55 Q50 60 56 55" stroke="#8B3A00" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
);

/* ─── Constants ─────────────────────────────────────────────── */
const GOOGLE_MAPS = "https://maps.app.goo.gl/mx51L23iDJuwmThY8";
const WHATSAPP = "919880358634";
const PHONE = "098803 58634";
const PHONE_TEL = "+919880358634";

const NAV = [
    { label: "Home", href: "#home" },
    { label: "About", href: "#about", fullLabel: "About Us" },
    { label: "Menu", href: "/order?branch=1&table=T1" },
    { label: "Book Table", href: "#book-table", fullLabel: "Pre-Book Table" },
    { label: "Smart QR", href: "#smart-table" },
    { label: "Delivery", href: "#delivery" },
    { label: "Gallery", href: "#gallery" },
    { label: "Reviews", href: "#reviews" },
    { label: "Location", href: "#location" },
    { label: "Contact", href: "#contact", fullLabel: "Contact Us" },
];

const SPECIALTIES = [
    { name: "Biryani", sub: "Lovers Favorite", img: "/dishes/3d_biryani.jpg" },
    { name: "Butter Naan", sub: "Soft & Tasty", img: "/dishes/3d_curries.jpg" },
    { name: "Punjabi Curry", sub: "Rich & Flavorful", img: "/dishes/3d_mandi.jpg" },
    { name: "Veg Delights", sub: "Fresh & Healthy", img: "/dishes/3d_veg_starters.jpg" },
];

const GALLERY = [
    "/dishes/3d_tiffin.jpg",
    "/dishes/3d_nonveg_starters.jpg",
    "/dishes/3d_veg_starters.jpg",
    "/dishes/3d_curries.jpg",
    "/dishes/3d_mandi.jpg",
    "/dishes/3d_biryani.jpg",
];

const REVIEWS = [
    {
        initial: "b", bg: "bg-blue-700", name: "Babu Y.", meta: "5 reviews · 1 photo",
        time: "4 weeks ago", badge: null, stars: 5,
        text: "Food was excellent and hygiene, good place for family in kadiri with reasonable prices",
    },
    {
        initial: "B", bg: "bg-amber-700", name: "Balachandra Raju", meta: "2 reviews · 3 photos",
        time: "15 hours ago", badge: "New", stars: 5,
        text: "I am on my way to Tirupati … entered the restaurant without any idea but loved the food .. I tried everything veg only",
    },
    {
        initial: "G", bg: "bg-emerald-700", name: "Gangi Reddy Machireddy", meta: "2 reviews",
        time: "3 days ago", badge: "New", stars: 5,
        text: "Good\n\nFood: 5  |  Service: 5",
    },
];

/* ─── Animated counter ─────────────────────────────────────── */
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
    const [val, setVal] = useState(0);
    const ref = useRef<HTMLSpanElement>(null);
    const done = useRef(false);
    useEffect(() => {
        const io = new IntersectionObserver(([e]) => {
            if (e.isIntersecting && !done.current) {
                done.current = true;
                let n = 0;
                const step = Math.ceil(to / 40);
                const t = setInterval(() => {
                    n = Math.min(n + step, to);
                    setVal(n);
                    if (n >= to) clearInterval(t);
                }, 35);
            }
        }, { threshold: 0.3 });
        if (ref.current) io.observe(ref.current);
        return () => io.disconnect();
    }, [to]);
    return <span ref={ref}>{val}{suffix}</span>;
}

/* ─── Stars ────────────────────────────────────────────────── */
const Stars = ({ n }: { n: number }) => (
    <div className="flex gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
            <svg key={i} viewBox="0 0 20 20" width="14" height="14" fill={i < n ? "#FBBF24" : "#D1D5DB"}>
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
        ))}
    </div>
);

/* ═══════════════════════════════════════════════════════════ */
export default function SuryaLandingPage() {
    const { outlet } = useOutlet();
    const canBookTable = isTableBookingEnabled(outlet);
    const canOrderTable = isTableOrderingEnabled(outlet);

    const [mobileOpen, setMobileOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [activeSection, setActiveSection] = useState("home");
    const [lightbox, setLightbox] = useState<number | null>(null);
    const [staffModalOpen, setStaffModalOpen] = useState(false);
    const [howItWorksOpen, setHowItWorksOpen] = useState(false);
    const [branchModalOpen, setBranchModalOpen] = useState(false);

    const navItems = NAV.filter(n => {
        if (n.href === "#book-table" && !canBookTable) return false;
        if (n.href === "#smart-table" && !canOrderTable) return false;
        return true;
    }).map(n => {
        if (n.label === "Menu" && !canOrderTable) {
            return { ...n, href: "/delivery?branch=1" };
        }
        return n;
    });

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener("scroll", onScroll);
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    useEffect(() => {
        const ids = ["home", "about", "book-table", "smart-table", "delivery", "gallery", "reviews", "location", "contact"];
        const io = new IntersectionObserver(
            (entries) => entries.forEach(e => { if (e.isIntersecting) setActiveSection(e.target.id); }),
            { rootMargin: "-35% 0px -55% 0px" }
        );
        ids.forEach(id => { const el = document.getElementById(id); if (el) io.observe(el); });
        return () => io.disconnect();
    }, []);

    const goto = (href: string) => {
        setMobileOpen(false);
        if (!href.startsWith("#")) return;
        document.getElementById(href.slice(1))?.scrollIntoView({ behavior: "smooth" });
    };

    return (
        <div className="min-h-screen" style={{ fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", background: "#FAF8F2" }}>

            {/* ═══════════════════ HEADER ═══════════════════ */}
            <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
                style={{ background: "#1A0800", boxShadow: scrolled ? "0 2px 24px rgba(0,0,0,.6)" : "none" }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[64px] flex items-center justify-between gap-2 lg:gap-3">

                    {/* Logo — left */}
                    <Link href="/" className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                        <SuryaSunLogo size={42} />
                        <div className="leading-none">
                            <div style={{ color: "#D4AF37", fontWeight: 900, fontSize: 18, letterSpacing: 2 }}>SURYA</div>
                            <div style={{ color: "#BFA882", fontSize: 7.5, letterSpacing: 2, fontWeight: 700, marginTop: 1 }}>FAMILY RESTAURANT</div>
                            <div style={{ color: "#8A7055", fontSize: 7, letterSpacing: 2, fontWeight: 600 }}>KADIRI</div>
                        </div>
                    </Link>

                    {/* Desktop Nav */}
                    <nav className="hidden lg:flex items-center justify-center h-full flex-1 min-w-0 px-1">
                        {navItems.map(n => {
                            const isActive = n.href === "#home"
                                ? activeSection === "home"
                                : n.href.startsWith("#") && activeSection === n.href.slice(1);

                            const linkStyle: React.CSSProperties = {
                                color: isActive ? "#D4AF37" : "rgba(255,255,255,.82)",
                                fontWeight: isActive ? 700 : 500,
                                position: "relative",
                                display: "flex",
                                alignItems: "center",
                                height: "100%",
                                border: "none",
                                background: "none",
                                cursor: "pointer",
                                transition: "color .2s",
                                textDecoration: "none",
                                whiteSpace: "nowrap",
                            };

                            const linkClasses = "px-1.5 xl:px-2.5 2xl:px-3 text-xs xl:text-[13px] 2xl:text-sm";

                            const underline = isActive && (
                                <span className="absolute bottom-0 left-1.5 right-1.5 xl:left-2 xl:right-2 h-[2.5px] rounded-t bg-[#D4AF37]" />
                            );

                            return n.href.startsWith("#") ? (
                                <button key={n.label} onClick={() => goto(n.href)} style={linkStyle} className={linkClasses}
                                    onMouseEnter={(e: React.MouseEvent<HTMLElement>) => { if (!isActive) (e.currentTarget as HTMLElement).style.color = "#fff"; }}
                                    onMouseLeave={(e: React.MouseEvent<HTMLElement>) => { if (!isActive) (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,.82)"; }}>
                                    {n.label}
                                    {underline}
                                </button>
                            ) : (
                                <Link key={n.label} href={n.href} style={linkStyle} className={linkClasses}
                                    onMouseEnter={(e: React.MouseEvent<HTMLElement>) => { (e.currentTarget as HTMLElement).style.color = "#fff"; }}
                                    onMouseLeave={(e: React.MouseEvent<HTMLElement>) => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,.82)"; }}>
                                    {n.label}
                                    {underline}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Right Actions */}
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        {/* Staff & Admin Button */}
                        <button
                            onClick={() => setStaffModalOpen(true)}
                            title="Staff & Management Portals"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-[#D4AF37]/40 bg-[#150600] hover:bg-[#D4AF37]/20 hover:border-[#D4AF37] text-[#D4AF37] text-[11px] xl:text-xs font-bold tracking-wider transition cursor-pointer shrink-0"
                        >
                            <Shield className="w-3.5 h-3.5 text-[#D4AF37]" />
                            <span>STAFF</span>
                        </button>

                        {/* Quick Order Now CTA */}
                        <Link
                            href={canOrderTable ? "/order?branch=1&table=T1" : "/delivery?branch=1"}
                            className="hidden sm:inline-flex items-center gap-1.5 px-3 xl:px-4 py-1.5 rounded-full font-bold text-[11px] xl:text-xs uppercase tracking-wider transition shadow-md hover:brightness-110 shrink-0"
                            style={{ background: "#E5A93C", color: "#1A0800" }}
                        >
                            Order Now
                        </Link>

                        {/* Phone CTA */}
                        <a
                            href={`tel:${PHONE_TEL}`}
                            title={`Call Surya Restaurant: ${PHONE}`}
                            className="hidden lg:inline-flex items-center gap-1.5 font-bold transition-all hover:opacity-90 shrink-0"
                            style={{
                                background: "#8B2020",
                                color: "#fff",
                                fontSize: 12,
                                fontWeight: 700,
                                padding: "6px 12px",
                                borderRadius: 24,
                                letterSpacing: 0.2,
                            }}
                        >
                            <Phone className="w-3.5 h-3.5 shrink-0" />
                            <span className="hidden xl:inline">{PHONE}</span>
                            <span className="xl:hidden text-[11px]">Call</span>
                        </a>

                        {/* Hamburger for mobile/tablet */}
                        <button
                            onClick={() => setMobileOpen(!mobileOpen)}
                            aria-label="Toggle navigation menu"
                            className="lg:hidden p-2 rounded-lg transition-colors text-white bg-white/10 hover:bg-white/15"
                        >
                            {mobileOpen ? (
                                <X className="w-5 h-5 text-white" />
                            ) : (
                                <MenuIcon className="w-5 h-5 text-white" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile/Tablet dropdown menu */}
                {mobileOpen && (
                    <div className="lg:hidden border-t"
                        style={{ background: "#150500", borderColor: "rgba(255,255,255,.07)" }}>
                        <div className="max-w-7xl mx-auto px-5 py-3 flex flex-col">
                            {navItems.map(n => n.href.startsWith("#") ? (
                                <button key={n.label} onClick={() => goto(n.href)}
                                    className="text-left py-3 border-b text-sm font-medium"
                                    style={{
                                        color: (n.href === "#home" ? activeSection === "home" : activeSection === n.href.slice(1))
                                            ? "#D4AF37" : "rgba(255,255,255,.7)",
                                        borderColor: "rgba(255,255,255,.05)",
                                    }}>
                                    {n.fullLabel || n.label}
                                </button>
                            ) : (
                                <Link key={n.label} href={n.href} onClick={() => setMobileOpen(false)}
                                    className="py-3 border-b text-sm font-medium"
                                    style={{ color: "rgba(255,255,255,.7)", borderColor: "rgba(255,255,255,.05)" }}>
                                    {n.fullLabel || n.label}
                                </Link>
                            ))}
                            <button
                                onClick={() => { setMobileOpen(false); setStaffModalOpen(true); }}
                                className="mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold border border-[#D4AF37]/50 text-[#D4AF37] bg-[#1A0800]"
                            >
                                <Shield className="w-3.5 h-3.5 text-[#D4AF37]" />
                                <span>Staff &amp; Operations Cockpit</span>
                            </button>
                            <a href={`tel:${PHONE_TEL}`}
                                className="mt-2 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white"
                                style={{ background: "#8B2020" }}>
                                <Phone className="w-4 h-4 text-white" />
                                <span>{PHONE}</span>
                            </a>
                        </div>
                    </div>
                )}
            </header>

            {/* ═══════════════════ HERO ═══════════════════ */}
            <section id="home" className="relative min-h-[85vh] lg:min-h-screen flex items-center pt-[64px] overflow-hidden"
                style={{
                    backgroundColor: "#150600",
                    backgroundImage: "url('/hero_biryani_faded_hd.jpg')",
                    backgroundSize: "cover",
                    backgroundPosition: "center right",
                    backgroundRepeat: "no-repeat",
                }}>

                {/* Left gradient overlay to ensure 100% text readability across all viewport widths */}
                <div className="absolute inset-0 pointer-events-none"
                    style={{
                        background: "linear-gradient(to right, #150600 0%, rgba(21,6,0,0.94) 35%, rgba(21,6,0,0.5) 55%, transparent 75%)",
                    }} />

                {/* Subtle texture dots */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
                    style={{ backgroundImage: "radial-gradient(#D4AF37 1px, transparent 1px)", backgroundSize: "48px 48px" }} />

                <div className="max-w-7xl mx-auto px-5 w-full py-12 grid lg:grid-cols-[1fr_auto] gap-10 items-center relative z-10">

                    {/* ── Left Text Block ── */}
                    <div className="max-w-xl">
                        {/* Welcome to */}
                        <p className="mb-1" style={{ color: "#D4AF37", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 24, fontStyle: "italic", fontWeight: 400 }}>
                            Welcome to
                        </p>

                        {/* Restaurant Name */}
                        <h1 className="leading-tight mb-2" style={{ color: "#fff", fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 900, letterSpacing: "-0.5px" }}>
                            Surya Family<br />Restaurant, Kadiri
                        </h1>

                        {/* Telugu */}
                        <p className="mb-4" style={{ color: "#D4AF37", fontSize: 18, fontWeight: 600 }}>
                            సూర్య ఫ్యామిలీ రెస్టారెంట్ కదిరి
                        </p>

                        {/* Tagline */}
                        <p className="mb-6 max-w-md" style={{ color: "rgba(255,255,255,.72)", fontSize: 13.5, lineHeight: 1.65 }}>
                            A perfect blend of taste, ambience and hospitality.<br />
                            Where every meal feels like a celebration with family.
                        </p>

                        {/* 4 Feature badges (Line outline style matching design image) */}
                        <div className="flex flex-wrap items-center gap-4 sm:gap-6 mb-8">
                            {[
                                {
                                    title: "Family", sub: "Friendly",
                                    icon: (
                                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#D4AF37" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                            <circle cx="9" cy="7" r="4" />
                                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                        </svg>
                                    ),
                                },
                                {
                                    title: "Hygienic", sub: "Food",
                                    icon: (
                                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#D4AF37" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12 3v3m0 0a8 8 0 0 1 8 8v3H4v-3a8 8 0 0 1 8-8zm-8 14h16" />
                                            <circle cx="12" cy="3" r="1" fill="#D4AF37" />
                                        </svg>
                                    ),
                                },
                                {
                                    title: "Great", sub: "Ambience",
                                    icon: (
                                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#D4AF37" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M4 11a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5z" />
                                            <path d="M6 18v2m12-2v2M4 13h16" />
                                        </svg>
                                    ),
                                },
                                {
                                    title: "Reasonable", sub: "Prices",
                                    icon: (
                                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#D4AF37" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="9" />
                                            <path d="M8.5 7h7M8.5 11h5.5M8.5 7v7c0 1.5 2 2.5 4 4l3-4" />
                                        </svg>
                                    ),
                                },
                            ].map(f => (
                                <div key={f.title} className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                                        style={{ border: "1px solid rgba(212,175,55,0.45)", background: "rgba(212,175,55,0.08)" }}>
                                        {f.icon}
                                    </div>
                                    <div className="text-left" style={{ color: "rgba(255,255,255,0.8)", fontSize: 10.5, lineHeight: 1.25, fontWeight: 500 }}>
                                        <div>{f.title}</div>
                                        <div>{f.sub}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Primary Action Buttons matching DineOS Luxury Style */}
                        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 pt-1">
                            {/* Button 1: Order at Table OR Primary Online Order */}
                            {canOrderTable ? (
                                <button
                                    type="button"
                                    onClick={() => setBranchModalOpen(true)}
                                    className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#142318] hover:bg-[#1A3320] text-[#4ADE80] border-2 border-[#22C55E]/60 font-bold text-xs uppercase tracking-wider flex items-center justify-center sm:justify-start gap-2 shadow-lg transition active:scale-95 cursor-pointer"
                                >
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                                        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                                    </svg>
                                    <div className="text-left">
                                        <span className="block text-[11px] leading-tight font-extrabold text-white">ORDER AT TABLE</span>
                                        <span className="text-[9px] font-mono tracking-widest text-[#4ADE80]">SCAN QR STAND</span>
                                    </div>
                                </button>
                            ) : (
                                <Link
                                    href="/delivery?branch=1"
                                    className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#E5C058] to-[#C59B27] hover:from-[#E5C058] hover:to-[#D4AF37] text-black font-extrabold text-xs uppercase tracking-wider flex items-center justify-center sm:justify-start gap-2.5 shadow-xl shadow-[#D4AF37]/30 transition active:scale-95"
                                >
                                    <Truck className="w-4 h-4 text-black shrink-0" />
                                    <div className="text-left">
                                        <span className="block text-[12px] leading-tight font-black text-black">ORDER ONLINE NOW</span>
                                        <span className="text-[9px] font-mono tracking-widest text-black/85">FREE DOORSTEP DELIVERY</span>
                                    </div>
                                </Link>
                            )}

                            {/* Button 2: Free Delivery OR Explore Menu */}
                            {canOrderTable ? (
                                <Link
                                    href="/delivery?branch=1"
                                    className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#E5C058] to-[#C59B27] hover:from-[#E5C058] hover:to-[#D4AF37] text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center sm:justify-start gap-2 shadow-lg shadow-[#D4AF37]/20 transition active:scale-95"
                                >
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" className="shrink-0">
                                        <path d="M19 6h-2c0-2.76-2.24-5-5-5S7 3.24 7 6H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z" />
                                    </svg>
                                    <div className="text-left">
                                        <span className="block text-[11px] leading-tight font-extrabold text-black">FREE DELIVERY</span>
                                        <span className="text-[9px] font-mono tracking-widest text-black/75">HOT &amp; FRESH</span>
                                    </div>
                                </Link>
                            ) : (
                                <Link
                                    href="/delivery?branch=1"
                                    className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-[#200A02] hover:bg-[#2C1004] text-[#F3E5AB] border border-[#D4AF37]/50 font-bold text-xs uppercase tracking-wider flex items-center justify-center sm:justify-start gap-2 shadow-md transition active:scale-95"
                                >
                                    <Utensils className="w-4 h-4 text-[#D4AF37] shrink-0" />
                                    <div className="text-left">
                                        <span className="block text-[11px] leading-tight font-extrabold text-[#D4AF37]">EXPLORE MENU</span>
                                        <span className="text-[9px] font-mono tracking-widest text-white/70">48+ DISHES &amp; OFFERS</span>
                                    </div>
                                </Link>
                            )}

                            {/* Button 3: Pre-Book Table OR Call Takeaway */}
                            {canBookTable ? (
                                <Link
                                    href="/book-table"
                                    className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#200A02] hover:bg-[#2C1004] text-[#F3E5AB] border-2 border-[#D4AF37]/70 font-bold text-xs uppercase tracking-wider flex items-center justify-center sm:justify-start gap-2 shadow-lg transition active:scale-95"
                                >
                                    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" className="shrink-0">
                                        <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" />
                                    </svg>
                                    <div className="text-left">
                                        <span className="block text-[11px] leading-tight font-extrabold text-[#D4AF37]">PRE-BOOK TABLE</span>
                                        <span className="text-[9px] font-mono tracking-widest text-white/80">ZERO WAIT VIP</span>
                                    </div>
                                </Link>
                            ) : (
                                <a
                                    href={`tel:${PHONE_TEL}`}
                                    className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-[#1C0A02]/80 hover:bg-[#2A1005] text-white/90 border border-white/20 font-bold text-xs uppercase tracking-wider flex items-center justify-center sm:justify-start gap-2 transition active:scale-95"
                                >
                                    <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                                    <div className="text-left">
                                        <span className="block text-[11px] leading-tight font-bold text-white">CALL TAKEAWAY</span>
                                        <span className="text-[9px] font-mono tracking-widest text-white/60">{PHONE}</span>
                                    </div>
                                </a>
                            )}
                        </div>

                        {/* Secondary Row: Explore Menu & Get Directions */}
                        <div className="flex flex-wrap items-center gap-3 pt-3">
                            <Link href={canOrderTable ? "/order?branch=1&table=T1" : "/delivery?branch=1"}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#D4AF37] hover:underline py-1">
                                <span>Explore 48 Authentic Dishes &rarr;</span>
                            </Link>
                            <span className="text-white/30">&bull;</span>
                            <a href={GOOGLE_MAPS} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-white/70 hover:text-white py-1">
                                <span>Get Google Directions &rarr;</span>
                            </a>
                        </div>
                    </div>

                    {/* ── Right: Order Tag Card (100% accurate to 2nd image) ── */}
                    <div className="flex justify-center lg:justify-end w-full">
                        <div className="w-full max-w-[275px] rounded-2xl p-4 transition-transform hover:scale-[1.01]"
                            style={{
                                background: "#FAF5ED",
                                boxShadow: "0 14px 40px rgba(0,0,0,0.45), 0 2px 10px rgba(0,0,0,0.2)",
                            }}>

                            {/* Status row: Open Now | Closes 10:00 PM */}
                            <div className="flex items-center justify-between pb-2">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-[#2E7D32]" style={{ boxShadow: "0 0 4px #2E7D32" }} />
                                    <span className="font-semibold text-[#2E7D32] text-xs">Open Now</span>
                                </div>
                                <div className="flex items-center gap-1 text-[#8C7A68]" style={{ fontSize: 10 }}>
                                    <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm.5 5v5.25l4.5 2.67-.75 1.23L11 13V7h1.5z" />
                                    </svg>
                                    <span>Closes 10:00 PM</span>
                                </div>
                            </div>

                            {/* Thin subtle divider */}
                            <div className="border-t border-[#E8DFD5] mb-2.5" />

                            {/* Card body items */}
                            <div className="space-y-2.5 text-left">
                                {/* Address */}
                                <div className="flex items-start gap-2">
                                    <svg viewBox="0 0 24 24" width="13" height="13" fill="#8C5338" className="mt-0.5 shrink-0">
                                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                                    </svg>
                                    <p style={{ color: "#3D2D24", fontSize: 10, lineHeight: 1.45 }}>
                                        Dhandubatu Street, Bypass road, opposite to RTC Bus Stand, Police Quarters, Kadiri, Andhra Pradesh 515591
                                    </p>
                                </div>

                                {/* Price */}
                                <div className="flex items-start gap-2">
                                    <span style={{ color: "#8C5338", fontWeight: 700, fontSize: 13, lineHeight: 1 }}>₹</span>
                                    <div>
                                        <p style={{ color: "#2B1D16", fontSize: 11, fontWeight: 700, lineHeight: 1.2 }}>₹ 200 - ₹ 400 per person</p>
                                        <p style={{ color: "#8C7A68", fontSize: 9.5, marginTop: 1 }}>Reported by 30 people</p>
                                    </div>
                                </div>

                                {/* Phone */}
                                <div className="flex items-center gap-2">
                                    <svg viewBox="0 0 24 24" width="12" height="12" fill="#8C5338" className="shrink-0">
                                        <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                                    </svg>
                                    <a href={`tel:${PHONE_TEL}`} style={{ color: "#2B1D16", fontSize: 11, fontWeight: 700 }} className="hover:underline">
                                        {PHONE}
                                    </a>
                                </div>

                                {/* Plus code */}
                                <div className="flex items-center gap-2">
                                    <svg viewBox="0 0 24 24" width="12" height="12" fill="#8C5338" className="shrink-0">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                    </svg>
                                    <p style={{ color: "#5A4B42", fontSize: 10 }}>4576+X2 Kadiri, Andhra Pradesh</p>
                                </div>
                            </div>

                            {/* Order Now button (Deep maroon with shopping bag icon) */}
                            <Link href={canOrderTable ? "/order?branch=1&table=T1" : "/delivery?branch=1"}
                                className="mt-3.5 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-xs text-white transition-all hover:brightness-110 shadow-md"
                                style={{ background: "#581717" }}>
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                                    <line x1="3" y1="6" x2="21" y2="6" />
                                    <path d="M16 10a4 4 0 0 1-8 0" />
                                </svg>
                                Order Now
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Bottom wave */}
                <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
                    <svg viewBox="0 0 1440 56" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "block", width: "100%", height: 56 }}>
                        <path d="M0 56 L0 28 C240 56 480 0 720 28 C960 56 1200 0 1440 28 L1440 56 Z" fill="#FAF8F2" />
                    </svg>
                </div>
            </section>

            {/* ═══════════ WHAT MAKES US SPECIAL ═══════════ */}
            <section id="about" style={{ background: "#FAF8F2", padding: "60px 16px" }}>
                <div className="max-w-7xl mx-auto grid lg:grid-cols-[300px_1fr] gap-12 items-start">

                    {/* Left */}
                    <div>
                        <p style={{ color: "#C8960C", fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 20, marginBottom: 2 }}>
                            What Makes Us
                        </p>
                        <h2 style={{ color: "#1A0800", fontSize: 42, fontWeight: 900, lineHeight: 1.1, marginBottom: 12 }}>Special</h2>
                        <div style={{ width: 48, height: 3, background: "linear-gradient(90deg,#C8960C,#D4AF37)", borderRadius: 2, marginBottom: 16 }} />
                        <button
                            type="button"
                            onClick={() => document.getElementById("reviews")?.scrollIntoView({ behavior: "smooth" })}
                            className="flex items-center gap-2 font-bold text-sm px-5 py-2.5 rounded-lg transition-all hover:opacity-90 cursor-pointer"
                            style={{ background: "#8B2020", color: "#fff" }}>
                            Know More About Us
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" /></svg>
                        </button>
                    </div>

                    {/* Right: 4 Features */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                            {
                                icon: (
                                    <svg viewBox="0 0 24 24" width="32" height="32" fill="#C8960C">
                                        <path d="M18.06 22.99h1.66c.84 0 1.53-.64 1.63-1.46L23 5.05h-5V1h-1.97v4.05h-4.97l.3 2.34c1.71.47 3.31 1.32 4.27 2.26 1.44 1.42 2.43 2.89 2.43 5.29v8.05zM1 21.99V21h15.03v.99c0 .55-.45 1-1.01 1H2.01c-.56 0-1.01-.45-1.01-1zm15.03-7c0-8.61-15.03-8.61-15.03 0h15.03zM1.02 17h15v2h-15z" />
                                    </svg>
                                ),
                                title: "Delicious Food",
                                desc: "A wide range of Veg & Non-Veg dishes made with authentic ingredients.",
                            },
                            {
                                icon: (
                                    <svg viewBox="0 0 24 24" width="32" height="32" fill="#C8960C">
                                        <path d="M12 2a3 3 0 0 0-3 3v1H5a2 2 0 0 0-2 2v3c0 4 3 7.5 7 8v1H8a1 1 0 0 0 0 2h8a1 1 0 0 0 0-2h-2v-1c4-.5 7-4 7-8V8a2 2 0 0 0-2-2h-4V5a3 3 0 0 0-3-3zm0 2a1 1 0 0 1 1 1v1h-2V5a1 1 0 0 1 1-1zM5 8h14v3c0 3.31-2.69 6-6 6H11c-3.31 0-6-2.69-6-6V8z" />
                                    </svg>
                                ),
                                title: "Warm Ambience",
                                desc: "Comfortable and clean dining space perfect for families and friends.",
                            },
                            {
                                icon: (
                                    <svg viewBox="0 0 24 24" width="32" height="32" fill="#C8960C">
                                        <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" />
                                    </svg>
                                ),
                                title: "Quality Service",
                                desc: "Our friendly staff ensures you feel at home every time you visit.",
                            },
                            {
                                icon: (
                                    <svg viewBox="0 0 24 24" width="32" height="32" fill="#C8960C">
                                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                    </svg>
                                ),
                                title: "Loved by Many",
                                desc: "High ratings and positive reviews from our happy customers.",
                            },
                        ].map(f => (
                            <div key={f.title} className="flex flex-col items-center text-center gap-3 p-4 rounded-2xl"
                                style={{ background: "#fff", boxShadow: "0 2px 12px rgba(0,0,0,.06)" }}>
                                <div className="w-14 h-14 rounded-full flex items-center justify-center"
                                    style={{ background: "#FFF5E0" }}>
                                    {f.icon}
                                </div>
                                <div>
                                    <p style={{ color: "#1A0800", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{f.title}</p>
                                    <p style={{ color: "#777", fontSize: 11.5, lineHeight: 1.6 }}>{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════ DINE-IN PRE-BOOKING (VIP TABLE RESERVATION) ═══════════════════ */}
            {canBookTable && (
            <section id="book-table" className="py-20 bg-[#150600] text-white relative overflow-hidden border-t border-[#D4AF37]/20">
                {/* Decorative background glow */}
                <div className="absolute top-1/2 left-0 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#8B2020]/20 rounded-full blur-3xl pointer-events-none" />

                <div className="max-w-7xl mx-auto px-5 relative z-10">
                    <div className="grid lg:grid-cols-12 gap-12 items-center">
                        {/* Left Column: Why Pre-Book & Perks */}
                        <div className="lg:col-span-6 space-y-6">
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-mono font-bold uppercase tracking-wider">
                                <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-ping" />
                                <span>Zero Waiting Time &bull; VIP Dine-In Experience</span>
                            </div>

                            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight">
                                DINE-IN PRE-BOOKING<br />
                                <span className="text-[#D4AF37] font-serif italic text-2xl sm:text-3xl block mt-1">
                                    ముందస్తు టేబుల్ రిజర్వేషన్
                                </span>
                            </h2>

                            <p className="text-sm sm:text-base text-white/70 leading-relaxed font-light">
                                Planning a family gathering, birthday dinner, or special occasion in Kadiri? Pre-book your table in advance. We reserve your dedicated AC family table or VIP cabin, so you step in and dine without waiting in queues.
                            </p>

                            {/* 4 Pre-booking perks */}
                            <div className="grid grid-cols-2 gap-3.5 pt-2">
                                <div className="p-4 rounded-2xl bg-[#200A02] border border-[#D4AF37]/20">
                                    <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] flex items-center justify-center mb-2">
                                        <Clock className="w-4 h-4 text-amber-400" />
                                    </div>
                                    <h4 className="font-bold text-sm text-white">Instant Seating</h4>
                                    <p className="text-[11px] text-white/50 mt-0.5">Your table is kept reserved &amp; sanitized for your arrival</p>
                                </div>

                                <div className="p-4 rounded-2xl bg-[#200A02] border border-[#D4AF37]/20">
                                    <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] flex items-center justify-center mb-2">
                                        <Snowflake className="w-4 h-4 text-sky-400" />
                                    </div>
                                    <h4 className="font-bold text-sm text-white">AC Family Section</h4>
                                    <p className="text-[11px] text-white/50 mt-0.5">Private dining for couples, elders &amp; large groups</p>
                                </div>

                                <div className="p-4 rounded-2xl bg-[#200A02] border border-[#D4AF37]/20">
                                    <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] flex items-center justify-center mb-2">
                                        <MessageSquare className="w-4 h-4 text-emerald-400" />
                                    </div>
                                    <h4 className="font-bold text-sm text-white">WhatsApp Updates</h4>
                                    <p className="text-[11px] text-white/50 mt-0.5">Receive booking reference &amp; table details directly on WhatsApp</p>
                                </div>

                                <div className="p-4 rounded-2xl bg-[#200A02] border border-[#D4AF37]/20">
                                    <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] flex items-center justify-center mb-2">
                                        <UtensilsCrossed className="w-4 h-4 text-amber-400" />
                                    </div>
                                    <h4 className="font-bold text-sm text-white">Pre-Order Dishes</h4>
                                    <p className="text-[11px] text-white/50 mt-0.5">Request your Biryani, Naan &amp; Starters ready when you arrive</p>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Interactive Booking Card with Instant CTA to /book-table */}
                        <div className="lg:col-span-6 flex justify-center">
                            <div className="w-full max-w-md rounded-3xl p-6 sm:p-8 bg-gradient-to-b from-[#240C03] via-[#1E0902] to-[#150600] border-2 border-[#D4AF37]/40 shadow-2xl shadow-black/80 space-y-5">
                                <div className="flex items-center justify-between pb-3 border-b border-[#D4AF37]/20">
                                    <div>
                                        <span className="text-[10px] font-mono text-[#D4AF37] font-bold uppercase tracking-wider block">
                                            Table Reservation System
                                        </span>
                                        <h3 className="font-serif font-black text-xl text-white">
                                            Reserve Your Dining Table
                                        </h3>
                                    </div>
                                    <div className="w-10 h-10 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center">
                                        <Crown className="w-5 h-5 text-amber-400" />
                                    </div>
                                </div>

                                <div className="space-y-3 text-xs">
                                    <div className="p-3 rounded-xl bg-[#150600] border border-[#D4AF37]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                        <span className="text-white/70 flex items-center gap-1.5 shrink-0">
                                            <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                            <span>Timing:</span>
                                        </span>
                                        <span className="font-bold text-[#D4AF37] text-left sm:text-right">Lunch (11 AM - 4 PM) &bull; Dinner (6 PM - 10 PM)</span>
                                    </div>

                                    <div className="p-3 rounded-xl bg-[#150600] border border-[#D4AF37]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                        <span className="text-white/70 flex items-center gap-1.5 shrink-0">
                                            <Users className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                            <span>Group Size:</span>
                                        </span>
                                        <span className="font-bold text-white text-left sm:text-right">2 to 20+ Guests (Family / Friends / Corporate)</span>
                                    </div>

                                    <div className="p-3 rounded-xl bg-[#150600] border border-[#D4AF37]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                        <span className="text-white/70 flex items-center gap-1.5 shrink-0">
                                            <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                            <span>Location:</span>
                                        </span>
                                        <span className="font-bold text-white text-left sm:text-right">Opp. RTC Bus Stand, Bypass Road, Kadiri</span>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-2">
                                    <Link
                                        href="/book-table"
                                        className="w-full py-3.5 rounded-xl font-bold text-sm text-[#1A0800] bg-gradient-to-r from-[#D4AF37] via-[#E5C058] to-[#C59B27] hover:from-[#E5C058] hover:to-[#D4AF37] flex items-center justify-center gap-2 shadow-lg shadow-[#D4AF37]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        <span>PRE-BOOK TABLE ONLINE NOW</span>
                                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                            <path d="M5 13h11.86l-5.43 5.43 1.42 1.42L21.14 12l-8.29-8.29-1.42 1.42L16.86 11H5v2z" />
                                        </svg>
                                    </Link>

                                    <a
                                        href={`tel:${PHONE_TEL}`}
                                        className="w-full py-2.5 rounded-xl font-bold text-xs text-white/90 border border-white/20 hover:border-[#D4AF37] hover:text-[#D4AF37] bg-white/5 flex items-center justify-center gap-2 transition"
                                    >
                                        <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                                            <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                                        </svg>
                                        <span>Prefer Calling? Tap to Dial {PHONE}</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            )}

            {/* ═══════════════════ SMART QR TABLE ORDERING SECTION ═══════════════════ */}
            {canOrderTable && (
            <section id="smart-table" className="py-24 bg-[#0F0500] text-white relative overflow-hidden border-t border-[#D4AF37]/20">
                <div className="max-w-7xl mx-auto px-5 relative z-10">
                    <div className="grid lg:grid-cols-12 gap-12 items-center">
                        {/* Left: 4-Step QR Ordering Flow */}
                        <div className="lg:col-span-5 space-y-6">
                            <div>
                                <span className="text-[10px] font-mono tracking-widest text-[#D4AF37] uppercase font-bold block mb-1">
                                    DineOS Smart Restaurant Experience
                                </span>
                                <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight uppercase">
                                    YOUR TABLE<br />IS YOUR MENU
                                </h2>
                                <div className="w-12 h-1 bg-[#D4AF37] my-3 rounded-full" />
                                <p className="text-xs sm:text-sm text-white/70 max-w-sm leading-relaxed font-light">
                                    Scan the QR standee on your dining table and order in just a few taps. No waiting for busy waiters. Your order prints instantly in the kitchen.
                                </p>
                            </div>

                            {/* 4 Process Icons */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                                <div className="p-3 rounded-2xl bg-[#1C0A02] border border-[#D4AF37]/20 text-center">
                                    <span className="text-xs font-mono font-black text-[#D4AF37] block">01</span>
                                    <span className="text-[10px] font-bold text-white block mt-1 uppercase">SCAN QR CODE</span>
                                </div>
                                <div className="p-3 rounded-2xl bg-[#1C0A02] border border-[#D4AF37]/20 text-center">
                                    <span className="text-xs font-mono font-black text-[#D4AF37] block">02</span>
                                    <span className="text-[10px] font-bold text-white block mt-1 uppercase">CHOOSE DISHES</span>
                                </div>
                                <div className="p-3 rounded-2xl bg-[#1C0A02] border border-[#D4AF37]/20 text-center">
                                    <span className="text-xs font-mono font-black text-[#D4AF37] block">03</span>
                                    <span className="text-[10px] font-bold text-white block mt-1 uppercase">KITCHEN KOT</span>
                                </div>
                                <div className="p-3 rounded-2xl bg-[#1C0A02] border border-[#D4AF37]/20 text-center">
                                    <span className="text-xs font-mono font-black text-[#D4AF37] block">04</span>
                                    <span className="text-[10px] font-bold text-white block mt-1 uppercase">ENJOY &amp; PAY</span>
                                </div>
                            </div>
                        </div>

                        {/* Center: Smartphone Live Preview */}
                        <div className="lg:col-span-4 flex justify-center">
                            <div className="relative w-64 rounded-[36px] p-3 bg-gradient-to-b from-[#333] via-[#1A1A1A] to-[#111] border-4 border-[#D4AF37]/50 shadow-2xl shadow-black/80">
                                <div className="w-20 h-3 bg-black rounded-b-lg mx-auto mb-2" />
                                <div className="bg-[#1A0800] rounded-[24px] p-3.5 text-white overflow-hidden text-xs space-y-2.5">
                                    <div className="flex items-center justify-between border-b border-[#D4AF37]/20 pb-2">
                                        <div>
                                            <span className="text-[9px] text-[#A6957E] block">Surya Restaurant</span>
                                            <span className="font-bold text-xs text-[#D4AF37]">Table T1 (Kadiri)</span>
                                        </div>
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    </div>
                                    <div className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-[9px] text-white/60 flex items-center gap-1.5">
                                        <Search className="w-3 h-3 text-[#D4AF37] shrink-0" />
                                        <span>48 Dishes Available</span>
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="p-2 rounded-lg bg-[#250C03] border border-[#D4AF37]/20 flex items-center justify-between text-[11px]">
                                            <span className="flex items-center gap-1.5">
                                                <Flame className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                                                <span>Chicken Dum Biryani</span>
                                            </span>
                                            <span className="font-mono text-[#D4AF37] font-bold">₹240</span>
                                        </div>
                                        <div className="p-2 rounded-lg bg-[#250C03] border border-[#D4AF37]/20 flex items-center justify-between text-[11px]">
                                            <span className="flex items-center gap-1.5">
                                                <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                                                <span>Butter Naan (2 Pcs)</span>
                                            </span>
                                            <span className="font-mono text-[#D4AF37] font-bold">₹90</span>
                                        </div>
                                        <div className="p-2 rounded-lg bg-[#250C03] border border-[#D4AF37]/20 flex items-center justify-between text-[11px]">
                                            <span className="flex items-center gap-1.5">
                                                <Utensils className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                                <span>Punjabi Chicken Curry</span>
                                            </span>
                                            <span className="font-mono text-[#D4AF37] font-bold">₹280</span>
                                        </div>
                                    </div>
                                    <Link
                                        href="/order?branch=1&table=T1"
                                        className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-[#E5A93C] text-black text-center font-bold text-[10px] uppercase tracking-wider hover:bg-[#F2BC5C] transition"
                                    >
                                        <span>Open Table 1 Menu</span>
                                        <ShoppingBag className="w-3 h-3 text-black" />
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* Right: Scannable Standee QR Card */}
                        <div className="lg:col-span-3">
                            <div className="bg-[#1C0A02] border-2 border-emerald-500/40 rounded-3xl p-5 text-center space-y-3.5 shadow-xl">
                                <div className="w-10 h-10 rounded-2xl bg-[#142618] text-emerald-400 flex items-center justify-center mx-auto">
                                    <QrCode className="w-5 h-5 text-emerald-400" />
                                </div>
                                <div>
                                    <h4 className="font-black text-sm text-white uppercase">
                                        NO APP REQUIRED
                                    </h4>
                                    <p className="text-[10px] text-white/60 mt-0.5">
                                        Open iPhone or Android camera &amp; scan
                                    </p>
                                </div>
                                <div className="bg-white p-2.5 rounded-2xl inline-block shadow-md border-2 border-[#D4AF37]">
                                    <img
                                        src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=https%3A%2F%2Fsurya-resto.vercel.app%2Forder%3Fbranch%3D1%26table%3DT1"
                                        alt="Scan QR code for Table 1"
                                        className="w-28 h-28 object-contain"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setHowItWorksOpen(true)}
                                    className="w-full py-2 rounded-xl bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 text-[#D4AF37] border border-[#D4AF37]/40 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer"
                                >
                                    <span>SEE HOW IT WORKS</span>
                                    <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                                        <path d="M8 5v14l11-7z" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            )}

            {/* ═══════════════════ DOORSTEP DELIVERY SHOWCASE BANNER ═══════════════════ */}
            <section id="delivery" className="py-16 bg-gradient-to-r from-[#180700] via-[#240C03] to-[#180700] text-white relative overflow-hidden border-t border-[#D4AF37]/20">
                <div className="max-w-7xl mx-auto px-5 relative z-10">
                    <div className="grid lg:grid-cols-12 gap-8 items-center">
                        <div className="lg:col-span-8 space-y-4">
                            <span className="text-[10px] font-mono tracking-widest text-[#D4AF37] uppercase font-bold block">
                                Kadiri Town Delivery Service
                            </span>
                            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-tight">
                                CRAVING SURYA'S BIRYANI?<br />
                                <span className="text-[#D4AF37]">WE'LL DELIVER IT PIPING HOT TO YOUR DOORSTEP.</span>
                            </h2>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col items-start justify-center">
                                    <Zap className="w-5 h-5 text-amber-400 mb-1" />
                                    <span className="text-xs font-bold text-white block">30-40 Mins Fast</span>
                                </div>
                                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col items-start justify-center">
                                    <ShieldCheck className="w-5 h-5 text-emerald-400 mb-1" />
                                    <span className="text-xs font-bold text-white block">Hygienic Pack</span>
                                </div>
                                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col items-start justify-center">
                                    <Smartphone className="w-5 h-5 text-sky-400 mb-1" />
                                    <span className="text-xs font-bold text-white block">WhatsApp Updates</span>
                                </div>
                                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col items-start justify-center">
                                    <CreditCard className="w-5 h-5 text-purple-400 mb-1" />
                                    <span className="text-xs font-bold text-white block">UPI / Cash on Delivery</span>
                                </div>
                            </div>
                        </div>
                        <div className="lg:col-span-4 flex flex-col gap-3 justify-center items-stretch sm:items-start lg:items-end w-full">
                            <Link
                                href="/delivery?branch=1"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider text-black bg-[#E5A93C] hover:bg-[#F2BC5C] shadow-lg transition active:scale-98"
                            >
                                <span>Order For Delivery Now</span>
                                <Bike className="w-4 h-4 text-black" />
                            </Link>
                            <button
                                type="button"
                                onClick={() => setBranchModalOpen(true)}
                                className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs text-[#D4AF37] border border-[#D4AF37]/40 bg-[#1A0800] hover:bg-[#2A1005] transition cursor-pointer text-center"
                            >
                                Select Table / Takeaway Mode
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* ════════ SPECIALTIES + GALLERY (dark bg) ════════ */}
            <section style={{ background: "#1C0800", padding: "48px 16px" }}>
                <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-10">

                    {/* Left: Our Specialties */}
                    <div>
                        <h2 className="text-center font-extrabold text-white mb-1" style={{ fontSize: 24 }}>Our Specialties</h2>
                        {/* Divider with dots */}
                        <div className="flex items-center justify-center gap-1.5 mb-6">
                            <div style={{ width: 40, height: 1.5, background: "#D4AF37", opacity: 0.5 }} />
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#D4AF37" }} />
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#D4AF37" }} />
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#D4AF37" }} />
                            <div style={{ width: 40, height: 1.5, background: "#D4AF37", opacity: 0.5 }} />
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
                            {SPECIALTIES.map(s => (
                                <div key={s.name} className="flex flex-col items-center gap-2">
                                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden group cursor-pointer"
                                        style={{ border: "3px solid rgba(212,175,55,.5)", boxShadow: "0 0 0 2px rgba(212,175,55,.15)" }}>
                                        <Image src={s.img} alt={s.name} fill className="object-cover group-hover:scale-110 transition-transform duration-300" />
                                    </div>
                                    <p className="font-bold text-white text-center" style={{ fontSize: 12 }}>{s.name}</p>
                                    <p className="text-center" style={{ color: "rgba(255,255,255,.5)", fontSize: 10 }}>{s.sub}</p>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-center">
                            <Link href={canOrderTable ? "/order?branch=1&table=T1" : "/delivery?branch=1"}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all hover:opacity-90"
                                style={{ border: "1.5px solid #D4AF37", color: "#D4AF37" }}>
                                View Full Menu
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" /></svg>
                            </Link>
                        </div>
                    </div>

                    {/* Right: Ambience & Gallery */}
                    <div id="gallery">
                        <div className="flex items-start justify-between mb-1">
                            <h2 className="font-extrabold text-white" style={{ fontSize: 24 }}>Ambience &amp; Gallery</h2>
                            <button onClick={() => setLightbox(0)}
                                className="flex items-center gap-1 font-semibold text-xs"
                                style={{ color: "rgba(255,255,255,.6)" }}>
                                View All
                                <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs"
                                    style={{ border: "1px solid rgba(255,255,255,.3)" }}>+</span>
                            </button>
                        </div>
                        {/* Divider */}
                        <div className="flex items-center gap-1.5 mb-5">
                            <div style={{ width: 40, height: 1.5, background: "#D4AF37", opacity: 0.5 }} />
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#D4AF37" }} />
                            <div style={{ width: 40, height: 1.5, background: "#D4AF37", opacity: 0.5 }} />
                        </div>

                        {/* Gallery grid: 1 large left + 4 small right */}
                        <div className="grid grid-cols-3 grid-rows-2 gap-1.5 h-48 sm:h-56">
                            <div className="col-span-2 row-span-2 relative rounded-xl overflow-hidden cursor-pointer group"
                                onClick={() => setLightbox(0)}>
                                <Image src={GALLERY[0]} alt="Gallery 1" fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                                <div className="absolute bottom-2 right-2 rounded px-2 py-0.5 text-[10px] font-bold"
                                    style={{ background: "rgba(26,8,0,.75)", color: "#D4AF37" }}>
                                    Surya Family Restaurant
                                </div>
                            </div>
                            {GALLERY.slice(1, 5).map((src, i) => (
                                <div key={i} className="relative rounded-xl overflow-hidden cursor-pointer group"
                                    onClick={() => setLightbox(i + 1)}>
                                    <Image src={src} alt={`Gallery ${i + 2}`} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Lightbox */}
            {lightbox !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.92)" }}
                    onClick={() => setLightbox(null)}>
                    <button className="absolute top-4 right-4 text-white" onClick={() => setLightbox(null)}>
                        <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
                    </button>
                    <div className="relative w-full max-w-2xl h-[70vh]" onClick={e => e.stopPropagation()}>
                        <Image src={GALLERY[lightbox]} alt="Gallery" fill className="object-contain rounded-xl" />
                    </div>
                    <div className="absolute bottom-5 flex gap-2">
                        {GALLERY.map((_, i) => (
                            <button key={i} onClick={e => { e.stopPropagation(); setLightbox(i); }}
                                className="rounded-full transition-all"
                                style={{ width: i === lightbox ? 24 : 8, height: 8, background: i === lightbox ? "#D4AF37" : "rgba(255,255,255,.35)" }} />
                        ))}
                    </div>
                </div>
            )}

            {/* ══════════════ STATS BAR ══════════════ */}
            <section style={{ background: "#F5F0E8", padding: "32px 16px" }}>
                <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 items-center">

                    {/* 30+ Dishes */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 flex items-center justify-center rounded-full" style={{ background: "rgba(139,32,32,.1)" }}>
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="#8B2020"><path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" /></svg>
                        </div>
                        <div>
                            <p style={{ color: "#1A0800", fontSize: 28, fontWeight: 900, lineHeight: 1 }}>
                                <Counter to={30} suffix="+" />
                            </p>
                            <p style={{ color: "#666", fontSize: 11 }}>Dishes to Choose From</p>
                        </div>
                    </div>

                    {/* 69+ Happy Customers */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 flex items-center justify-center rounded-full" style={{ background: "rgba(139,32,32,.1)" }}>
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="#8B2020"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" /></svg>
                        </div>
                        <div>
                            <p style={{ color: "#1A0800", fontSize: 28, fontWeight: 900, lineHeight: 1 }}>
                                <Counter to={69} suffix="+" />
                            </p>
                            <p style={{ color: "#666", fontSize: 11 }}>Happy Customers</p>
                        </div>
                    </div>

                    {/* Center card */}
                    <div className="col-span-2 md:col-span-1 -order-1 md:order-none text-center py-6 px-4 rounded-2xl"
                        style={{ background: "#7A1818", boxShadow: "0 4px 24px rgba(122,24,24,.4)" }}>
                        <p style={{ color: "#fff", fontWeight: 700, fontSize: 15, lineHeight: 1.4 }}>Experience the Best</p>
                        <p style={{ color: "#fff", fontWeight: 900, fontSize: 18, lineHeight: 1.3 }}>Family Dining in Kadiri</p>
                        <div className="flex items-center justify-center gap-1.5 mt-2">
                            <div style={{ width: 20, height: 1.5, background: "#D4AF37", opacity: 0.6 }} />
                            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#D4AF37" }} />
                            <div style={{ width: 20, height: 1.5, background: "#D4AF37", opacity: 0.6 }} />
                        </div>
                    </div>

                    {/* 4.8★ + 10PM */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2">
                            <div className="w-9 h-9 flex items-center justify-center rounded-full" style={{ background: "rgba(139,32,32,.1)" }}>
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="#8B2020"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" /></svg>
                            </div>
                            <div>
                                <p className="flex items-center" style={{ color: "#1A0800", fontSize: 24, fontWeight: 900, lineHeight: 1 }}>
                                    4.8
                                    <Star className="w-4 h-4 fill-amber-500 text-amber-500 inline ml-1" />
                                </p>
                                <p style={{ color: "#666", fontSize: 10 }}>Average Rating</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-9 h-9 flex items-center justify-center rounded-full" style={{ background: "rgba(139,32,32,.1)" }}>
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="#8B2020"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm.5 5v5.25l4.5 2.67-.75 1.23L11 13V7h1.5z" /></svg>
                            </div>
                            <div>
                                <p style={{ color: "#1A0800", fontSize: 22, fontWeight: 900, lineHeight: 1 }}>10:00 <span style={{ fontSize: 14 }}>PM</span></p>
                                <p style={{ color: "#666", fontSize: 10 }}>We Close</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══════════════ REVIEWS ══════════════ */}
            <section id="reviews" style={{ background: "#FAF8F2", padding: "60px 16px" }}>
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-10">
                        <p style={{ color: "#C8960C", fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 20 }}>Our</p>
                        <h2 style={{ color: "#1A0800", fontSize: 36, fontWeight: 900 }}>Happy Customers</h2>
                        <div className="flex items-center justify-center gap-1.5 mt-2">
                            <div style={{ width: 40, height: 2, background: "#D4AF37", borderRadius: 2 }} />
                            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#D4AF37" }} />
                            <div style={{ width: 40, height: 2, background: "#D4AF37", borderRadius: 2 }} />
                        </div>
                    </div>

                    <div className="grid sm:grid-cols-3 gap-5 mb-10">
                        {REVIEWS.map((r, i) => (
                            <div key={i} className="relative p-5 rounded-2xl" style={{ background: "#fff", boxShadow: "0 2px 16px rgba(0,0,0,.07)" }}>
                                {/* Big quote */}
                                <div className="absolute top-3 right-4" style={{ color: "#D4AF37", fontSize: 56, lineHeight: 1, opacity: 0.2, fontFamily: "Georgia,serif" }}>"</div>

                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`w-9 h-9 rounded-full ${r.bg} flex items-center justify-center font-bold text-white text-sm shrink-0`}>
                                        {r.initial}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p style={{ color: "#1A0800", fontWeight: 700, fontSize: 13 }}>{r.name}</p>
                                        <p style={{ color: "#aaa", fontSize: 10.5 }}>{r.meta}</p>
                                    </div>
                                    {r.badge && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "#E8F5E9", color: "#2E7D32" }}>{r.badge}</span>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 mb-3">
                                    <Stars n={r.stars} />
                                    <span style={{ color: "#bbb", fontSize: 10 }}>· {r.time}</span>
                                </div>

                                <p style={{ color: "#555", fontSize: 12.5, lineHeight: 1.65, whiteSpace: "pre-line" }}>{r.text}</p>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-center">
                        <a href={GOOGLE_MAPS} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90"
                            style={{ background: "#8B2020" }}>
                            Read All 69 Reviews
                            <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" /></svg>
                        </a>
                    </div>
                </div>
            </section>

            {/* ══════════════ LOCATION ══════════════ */}
            <section id="location" style={{ background: "#FFF8EE", padding: "60px 16px" }}>
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-10">
                        <p style={{ color: "#C8960C", fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 20 }}>Find</p>
                        <h2 style={{ color: "#1A0800", fontSize: 36, fontWeight: 900 }}>Our Location</h2>
                        <div className="flex items-center justify-center gap-1.5 mt-2">
                            <div style={{ width: 40, height: 2, background: "#D4AF37", borderRadius: 2 }} />
                            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#D4AF37" }} />
                            <div style={{ width: 40, height: 2, background: "#D4AF37", borderRadius: 2 }} />
                        </div>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-8 items-start">
                        <div className="rounded-2xl overflow-hidden" style={{ boxShadow: "0 4px 24px rgba(0,0,0,.12)", border: "4px solid #fff" }}>
                            <iframe
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3845.0!2d78.1583!3d14.1082!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bb146c8b8e37eeb%3A0x5f53a8b73a30bc68!2sSurya%20Family%20Restaurant!5e0!3m2!1sen!2sin!4v1234567890"
                                width="100%" height="320" style={{ border: 0, display: "block" }}
                                allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                                title="Surya Family Restaurant Location"
                            />
                        </div>

                        <div className="space-y-4">
                            {[
                                {
                                    icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="#8B2020"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>,
                                    title: "Address",
                                    body: "Dhandubatu Street, Bypass road, opposite to RTC Bus Stand, Police Quarters, Kadiri, Andhra Pradesh 515591",
                                    sub: "Plus Code: 4576+X2 Kadiri, Andhra Pradesh",
                                },
                                {
                                    icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="#8B2020"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm.5 5v5.25l4.5 2.67-.75 1.23L11 13V7h1.5z" /></svg>,
                                    title: "Timings",
                                    body: "Open Daily  11:00 AM – 10:00 PM",
                                    sub: "We Close at 10:00 PM • Currently Open",
                                    subGreen: true,
                                },
                                {
                                    icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="#8B2020"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" /></svg>,
                                    title: "Contact",
                                    body: PHONE,
                                    isPhone: true,
                                },
                            ].map((item, i) => (
                                <div key={i} className="flex items-start gap-4 p-4 rounded-xl" style={{ background: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,.06)" }}>
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "#FFF0E0" }}>
                                        {item.icon}
                                    </div>
                                    <div>
                                        <p style={{ color: "#1A0800", fontWeight: 700, marginBottom: 3, fontSize: 13 }}>{item.title}</p>
                                        {item.isPhone
                                            ? <a href={`tel:${PHONE_TEL}`} style={{ color: "#8B2020", fontWeight: 600, fontSize: 13 }}>{item.body}</a>
                                            : <p style={{ color: "#555", fontSize: 12.5 }}>{item.body}</p>}
                                        {item.sub && <p style={{ color: item.subGreen ? "#16a34a" : "#aaa", fontSize: 11.5, marginTop: 2, fontWeight: item.subGreen ? 600 : 400 }}>{item.sub}</p>}
                                    </div>
                                </div>
                            ))}

                            <a href={GOOGLE_MAPS} target="_blank" rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-white text-sm transition-all hover:opacity-90"
                                style={{ background: "#8B2020" }}>
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>
                                Get Directions on Google Maps
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══════════════ FOOTER ══════════════ */}
            <footer id="contact" style={{ background: "#150500", color: "#fff" }}>
                <div className="max-w-7xl mx-auto px-4 py-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">

                    {/* About */}
                    <div>
                        <h4 style={{ color: "#D4AF37", fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>About Us</h4>
                        <p style={{ color: "rgba(255,255,255,.55)", fontSize: 12.5, lineHeight: 1.8, marginBottom: 16 }}>
                            Surya Family Restaurant is a place where great food, warm ambience, and excellent service come together to create memorable moments with your loved ones.
                        </p>
                        {/* Social icons */}
                        <div className="flex gap-2.5">
                            {[
                                { title: "Facebook", color: "#1877F2", path: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z", href: "#" },
                                { title: "Instagram", color: "#E1306C", path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z", href: "#" },
                                { title: "Google", color: "#D4AF37", path: "M12 0C7.802 0 4 3.403 4 7.602 4 11.8 7.469 16.812 12 24c4.531-7.188 8-12.2 8-16.398C20 3.403 16.199 0 12 0zm0 11a3 3 0 110-6 3 3 0 010 6z", href: GOOGLE_MAPS },
                                { title: "WhatsApp", color: "#25D366", path: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z", href: `https://wa.me/${WHATSAPP}` },
                            ].map(s => (
                                <a key={s.title} href={s.href} target={s.href !== "#" ? "_blank" : undefined} rel="noopener noreferrer"
                                    title={s.title}
                                    className="w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-110"
                                    style={{ background: "rgba(255,255,255,.1)" }}
                                    onMouseEnter={e => (e.currentTarget.style.background = s.color + "33")}
                                    onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,.1)")}>
                                    <svg viewBox="0 0 24 24" width="13" height="13" fill="white">
                                        <path d={s.path} />
                                    </svg>
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 style={{ color: "#D4AF37", fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>Quick Links</h4>
                        <ul className="space-y-2">
                            {[
                                { label: "About Us", href: "#about" },
                                { label: "Our Menu", href: "/order?branch=1&table=T1" },
                                { label: "Book a Table", href: "/book-table" },
                                { label: "Delivery Orders", href: "/delivery" },
                                { label: "Admin & Staff Login", href: "/admin/login" },
                                { label: "Gallery", href: "#gallery" },
                                { label: "Reviews", href: "#reviews" },
                                { label: "Location", href: "#location" },
                                { label: "Contact Us", href: "#contact" },
                            ].map(l => (
                                <li key={l.label}>
                                    {l.href.startsWith("#") ? (
                                        <button onClick={() => goto(l.href)} style={{ color: "rgba(255,255,255,.55)", fontSize: 12.5 }}
                                            className="hover:text-[#D4AF37] transition-colors text-left">
                                            {l.label}
                                        </button>
                                    ) : (
                                        <Link href={l.href} style={{ color: "rgba(255,255,255,.55)", fontSize: 12.5 }}
                                            className="hover:text-[#D4AF37] transition-colors">
                                            {l.label}
                                        </Link>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Timings */}
                    <div>
                        <h4 className="flex items-center gap-1.5" style={{ color: "#D4AF37", fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>
                            <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
                            <span>Timings</span>
                        </h4>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2" style={{ color: "rgba(255,255,255,.55)", fontSize: 12.5 }}>
                                <svg viewBox="0 0 24 24" width="13" height="13" fill="#D4AF37"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm.5 5v5.25l4.5 2.67-.75 1.23L11 13V7h1.5z" /></svg>
                                Open Daily
                            </div>
                            <p style={{ color: "rgba(255,255,255,.55)", fontSize: 12.5, paddingLeft: 20 }}>11:00 AM – 10:00 PM</p>
                            <p style={{ color: "rgba(255,255,255,.35)", fontSize: 11.5, paddingLeft: 20 }}>We Close at 10:00 PM</p>
                        </div>
                    </div>

                    {/* Reservation */}
                    <div>
                        <h4 className="flex items-center gap-1.5" style={{ color: "#D4AF37", fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>
                            <UtensilsCrossed className="w-3.5 h-3.5 text-[#D4AF37]" />
                            <span>Make a Reservation / Order</span>
                        </h4>
                        <p style={{ color: "rgba(255,255,255,.4)", fontSize: 11, marginBottom: 10 }}>Call Us</p>
                        <a href={`tel:${PHONE_TEL}`}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm mb-3 hover:opacity-90 transition-all"
                            style={{ background: "#D4AF37", color: "#1A0800" }}>
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" /></svg>
                            {PHONE}
                        </a>
                        <Link href="/delivery?branch=1"
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm mb-4 hover:opacity-90 transition-all"
                            style={{ background: "#8B2020", color: "#fff" }}>
                            <Truck className="w-4 h-4 text-white" />
                            Order Online (Free Delivery)
                        </Link>
                        {canBookTable && (
                            <Link href="/book-table" className="flex items-center gap-2 mb-2 hover:opacity-80 transition-all" style={{ color: "rgba(255,255,255,.45)", fontSize: 12.5 }}>
                                <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" /></svg>
                                Book a Table
                            </Link>
                        )}
                        <Link href="/delivery" className="flex items-center gap-2 hover:opacity-80 transition-all" style={{ color: "rgba(255,255,255,.45)", fontSize: 12.5 }}>
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M19 6h-2c0-2.76-2.24-5-5-5S7 3.24 7 6H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z" /></svg>
                            Delivery Orders
                        </Link>
                        <button
                            onClick={() => setStaffModalOpen(true)}
                            className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10 hover:text-amber-400 transition-all text-left w-full cursor-pointer"
                            style={{ color: "#D4AF37", fontSize: 12, fontWeight: 700 }}
                        >
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                            Staff & Operations Cockpit
                        </button>
                    </div>
                </div>

                {/* Bottom bar */}
                <div style={{ borderTop: "1px solid rgba(255,255,255,.07)", padding: "14px 16px" }}>
                    <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
                        <p style={{ color: "rgba(255,255,255,.3)", fontSize: 11 }}>
                            © 2025 Surya Family Restaurant, Kadiri. All Rights Reserved.
                        </p>
                        <p style={{ color: "rgba(255,255,255,.3)", fontSize: 11 }} className="flex items-center gap-1">
                            <span>Made with</span>
                            <Heart className="w-3.5 h-3.5 fill-[#D4AF37] text-[#D4AF37] inline" />
                            <span>for Our Valuable Customers</span>
                        </p>
                    </div>
                </div>
            </footer>

            {/* Floating Direct Online Order Button (Bottom Right) */}
            <div className="fixed bottom-4 sm:bottom-5 right-4 sm:right-5 z-40 pb-safe">
                <Link
                    href="/delivery?branch=1"
                    className="flex items-center gap-2 sm:gap-2.5 px-4 sm:px-5 py-2.5 sm:py-3 rounded-full text-white font-extrabold text-xs sm:text-sm shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 group bg-gradient-to-r from-amber-600 via-orange-600 to-terracotta-700 border border-amber-300/40 shadow-amber-950/40"
                >
                    <Truck className="w-4 h-4 text-amber-200 shrink-0" />
                    <span className="font-bold">Order Online (Free Delivery)</span>
                    <span className="hidden xs:inline-block px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 font-mono">Kadiri</span>
                </Link>
            </div>

            {/* Staff & Operations Cockpit Modal */}
            <StaffPortalModal isOpen={staffModalOpen} onClose={() => setStaffModalOpen(false)} />

            {/* Smart Table How-It-Works Modal */}
            <HowItWorksModal isOpen={howItWorksOpen} onClose={() => setHowItWorksOpen(false)} />

            {/* Branch & Dining Table Picker Modal */}
            <BranchSelectorModal isOpen={branchModalOpen} onClose={() => setBranchModalOpen(false)} />
        </div>
    );
}
