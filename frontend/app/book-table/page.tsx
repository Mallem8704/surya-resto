"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
    Calendar,
    Clock,
    Users,
    MapPin,
    Phone,
    User,
    Mail,
    Sparkles,
    CheckCircle2,
    ShieldCheck,
    ArrowRight,
    UtensilsCrossed,
    Crown,
    MessageSquare,
    Compass,
    ChevronRight,
    Star,
    HeartHandshake,
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { useCustomer } from "@/context/CustomerContext";
import { soundManager } from "@/lib/sound";
import { ArabiqLogo, ArabesqueDivider } from "@/components/home/ArabiqBrandIcons";
import { LanguageToggle } from "@/components/LanguageToggle";

const BRANCHES = [
    {
        id: 1,
        name: "Surya Family Restaurant",
        tagline: "Opposite RTC Bus Stand, Bypass Road, Police Quarters, Kadiri",
        highlights: "Hyderabadi Dum Biryani, Punjabi Chicken Curry & AC Family Hall",
        badge: "Main Dining",
    },
];

const TIME_SLOTS = {
    lunch: ["12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM", "03:00 PM"],
    dinner: ["06:30 PM", "07:00 PM", "07:30 PM", "08:00 PM", "08:30 PM", "09:00 PM", "09:30 PM", "10:00 PM", "10:30 PM"],
};

const SEATING_PREFERENCES = [
    { id: "family_ac", label: "Family AC Dining Hall", desc: "Comfortable air-conditioned private family section", icon: "❄️" },
    { id: "standard", label: "Standard Table Dining", desc: "Classic chair seating near central dining hall", icon: "🪑" },
    { id: "window", label: "Window View Table", desc: "Breezy seating with view of Kadiri Bypass Road", icon: "🌿" },
];

const OCCASIONS = [
    { id: "casual", label: "Casual Dining" },
    { id: "birthday", label: "Birthday Celebration 🎂" },
    { id: "anniversary", label: "Anniversary 💐" },
    { id: "family", label: "Family Get-Together 👨‍👩‍👧‍👦" },
    { id: "business", label: "Business Meeting 💼" },
];

function BookTableContent() {
    const searchParams = useSearchParams();
    const branchParam = searchParams.get("branch");
    const toast = useToast();
    const { customer } = useCustomer();

    const [outlets, setOutlets] = useState<any[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<number>(branchParam === "2" ? 2 : 1);
    const [partySize, setPartySize] = useState<number>(4);

    // Auto-fetch real outlet DB records
    useEffect(() => {
        api.getOutlets()
            .then((data: any[]) => {
                if (Array.isArray(data) && data.length > 0) {
                    setOutlets(data);
                    if (branchParam === "2" && data.length > 1) {
                        setSelectedBranch(data[1].id);
                    } else {
                        setSelectedBranch(data[0].id);
                    }
                }
            })
            .catch(() => {});
    }, [branchParam]);
    
    // Default today's date in YYYY-MM-DD
    const todayStr = new Date().toISOString().split("T")[0];
    const [reservationDate, setReservationDate] = useState<string>(todayStr);
    const [reservationTime, setReservationTime] = useState<string>("07:30 PM");
    const [seatingPreference, setSeatingPreference] = useState<string>("majlis");
    const [occasion, setOccasion] = useState<string>("casual");
    
    const [customerName, setCustomerName] = useState<string>("");
    const [customerPhone, setCustomerPhone] = useState<string>("");
    const [customerEmail, setCustomerEmail] = useState<string>("");
    const [specialRequests, setSpecialRequests] = useState<string>("");

    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [confirmedReservation, setConfirmedReservation] = useState<any>(null);

    // Auto-fill from logged-in customer profile
    useEffect(() => {
        if (customer) {
            if (customer.name && !customerName) setCustomerName(customer.name);
            if (customer.phone && !customerPhone) setCustomerPhone(customer.phone);
        }
    }, [customer]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const phoneClean = customerPhone.replace(/\D/g, "");
        if (phoneClean.length < 10) {
            toast.error("Please enter a valid 10-digit mobile number");
            return;
        }

        if (!customerName.trim()) {
            toast.error("Please enter your full name");
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                outlet_id: selectedBranch,
                customer_name: customerName.trim(),
                customer_phone: phoneClean,
                customer_email: customerEmail.trim() || undefined,
                party_size: partySize,
                reservation_date: reservationDate,
                reservation_time: reservationTime,
                seating_preference: seatingPreference,
                occasion: occasion,
                special_requests: specialRequests.trim() || undefined,
            };

            const result = await api.createReservation(payload);
            soundManager.playOrderPlacedSuccess();
            toast.success(`Table Pre-Booked Successfully! Reservation #${result.reservation_number}`);
            setConfirmedReservation(result);
        } catch (err: any) {
            toast.error(err.message || "Failed to book table. Please try again or call restaurant.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const dispatchWhatsAppShare = () => {
        if (!confirmedReservation) return;
        const branchName = outlets[0]?.name || "Surya Family Restaurant, Kadiri";
        const msg = `👑 *SURYA FAMILY RESTAURANT — TABLE RESERVATION* 👑\n\n` +
            `🏷️ *Pass Code:* ${confirmedReservation.reservation_number}\n` +
            `📍 *Location:* ${branchName} (Opp. RTC Bus Stand)\n` +
            `📅 *Date:* ${confirmedReservation.reservation_date}\n` +
            `⏰ *Time:* ${confirmedReservation.reservation_time}\n` +
            `👥 *Guests:* ${confirmedReservation.party_size} People\n` +
            `❄️ *Seating:* ${confirmedReservation.seating_preference.toUpperCase()}\n` +
            `👤 *Booked for:* ${confirmedReservation.customer_name}\n\n` +
            `✨ *Status:* CONFIRMED & RESERVED\n` +
            `Show this pass at reception upon arrival.`;
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
    };

    return (
        <div className="min-h-screen bg-[#0D0907] text-[#F8F3EB] font-sans selection:bg-[#D4AF37] selection:text-black overflow-x-hidden pb-24">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-[#0D0907]/90 backdrop-blur-md border-b border-[#D4AF37]/20">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
                    <Link href="/" className="hover:opacity-95 transition">
                        <ArabiqLogo />
                    </Link>
                    <div className="flex items-center gap-3">
                        <LanguageToggle />
                        <Link
                            href="/"
                            className="hidden sm:inline-flex px-4 py-2 rounded-full border border-[#D4AF37]/30 text-xs font-bold text-[#D4AF37] hover:bg-[#D4AF37]/15 transition"
                        >
                            Back to Home
                        </Link>
                        <Link
                            href="/order?branch=1"
                            className="px-4 py-2 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#B89020] text-black font-black text-xs uppercase tracking-wider shadow-md hover:opacity-95 transition"
                        >
                            View Menu
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-10">
                {/* Hero Title */}
                <div className="text-center space-y-3 mb-10">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1A140F] border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-black tracking-wider uppercase shadow-xs">
                        <Crown className="w-3.5 h-3.5" />
                        <span>VIP Hospitality & Dining</span>
                    </div>
                    <h1 className="font-serif text-3xl sm:text-5xl font-black tracking-tight text-white uppercase">
                        PRE-BOOK YOUR TABLE
                    </h1>
                    <ArabesqueDivider light={false} className="my-2" />
                    <p className="text-xs sm:text-sm text-[#C5B39A] max-w-lg mx-auto leading-relaxed">
                        Reserve your table in advance from home or office. Enjoy guaranteed zero waiting time, priority seating, and authentic Arabian Mandi hospitality.
                    </p>
                </div>

                {confirmedReservation ? (
                    /* ══════════════════════════════════════════════════════════
                       CONFIRMATION PASS CARD
                       ══════════════════════════════════════════════════════════ */
                    <div className="max-w-xl mx-auto bg-[#140F0B] rounded-3xl border-2 border-[#D4AF37] p-6 sm:p-8 space-y-6 shadow-2xl shadow-[#D4AF37]/20 animate-in zoom-in-95 duration-300">
                        <div className="text-center space-y-2">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B89020] text-black flex items-center justify-center mx-auto shadow-lg shadow-[#D4AF37]/30">
                                <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
                            </div>
                            <span className="text-xs font-mono font-bold text-[#D4AF37] uppercase tracking-widest block">
                                RESERVATION CONFIRMED
                            </span>
                            <h2 className="font-serif text-2xl font-black text-white">
                                We Look Forward to Welcoming You!
                            </h2>
                        </div>

                        {/* Pass Details */}
                        <div className="p-5 rounded-2xl bg-[#1A140F] border border-[#D4AF37]/30 space-y-4">
                            <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                <span className="text-xs text-white/50">Reservation Pass Code</span>
                                <span className="font-mono font-black text-lg text-[#D4AF37]">
                                    {confirmedReservation.reservation_number}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                    <span className="text-white/40 block text-[10px] uppercase font-bold">Branch</span>
                                    <span className="text-white font-bold">
                                        {confirmedReservation.outlet_id === 2 ? "Branch 2 (Bypass Rd)" : "Branch 1 (Main Rd)"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-white/40 block text-[10px] uppercase font-bold">Party Size</span>
                                    <span className="text-white font-bold">{confirmedReservation.party_size} Guests</span>
                                </div>
                                <div>
                                    <span className="text-white/40 block text-[10px] uppercase font-bold">Date</span>
                                    <span className="text-white font-bold">{confirmedReservation.reservation_date}</span>
                                </div>
                                <div>
                                    <span className="text-white/40 block text-[10px] uppercase font-bold">Time</span>
                                    <span className="text-white font-bold">{confirmedReservation.reservation_time}</span>
                                </div>
                            </div>

                            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                                <span className="text-white/50">Guest Name</span>
                                <span className="font-bold text-white">{confirmedReservation.customer_name}</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="space-y-3">
                            <button
                                onClick={dispatchWhatsAppShare}
                                className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <MessageSquare className="w-4 h-4" />
                                <span>Share Reservation on WhatsApp</span>
                            </button>

                            <button
                                onClick={() => setConfirmedReservation(null)}
                                className="w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white transition cursor-pointer"
                            >
                                Book Another Table
                            </button>
                        </div>
                    </div>
                ) : (
                    /* ══════════════════════════════════════════════════════════
                       PRE-BOOKING FORM
                       ══════════════════════════════════════════════════════════ */
                    <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8 bg-[#140F0B] p-4 sm:p-10 rounded-3xl border border-[#D4AF37]/30 shadow-xl">
                        
                        {/* STEP 1: RESTAURANT OUTLET */}
                        <div className="space-y-3">
                            <label className="text-xs font-black uppercase tracking-wider text-[#D4AF37] flex items-center gap-1.5">
                                <MapPin className="w-4 h-4" />
                                <span>1. Restaurant Dining Location</span>
                            </label>
                            <div className="grid grid-cols-1 gap-4">
                                {[
                                    {
                                        id: outlets[0]?.id || 1,
                                        name: outlets[0]?.name || "Surya Family Restaurant",
                                        tagline: outlets[0]?.address || "Opposite RTC Bus Stand, Bypass Road, Police Quarters, Kadiri",
                                        highlights: "Authentic Hyderabadi Dum Biryani, Punjabi Chicken Curry & AC Family Dining",
                                        badge: "Main Dining Hall",
                                    },
                                ].map((b) => (
                                    <button
                                        type="button"
                                        key={b.id}
                                        onClick={() => setSelectedBranch(b.id)}
                                        className={`p-4 rounded-2xl border text-left transition cursor-pointer relative overflow-hidden ${
                                            selectedBranch === b.id
                                                ? "bg-[#2A1E14] border-[#D4AF37] ring-2 ring-[#D4AF37]/30"
                                                : "bg-[#1A140F] border-white/10 hover:border-[#D4AF37]/50"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 font-mono">
                                                {b.badge}
                                            </span>
                                            {selectedBranch === b.id && (
                                                <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />
                                            )}
                                        </div>
                                        <h3 className="font-serif font-black text-base text-white">{b.name}</h3>
                                        <p className="text-[11px] text-[#C5B39A] mt-0.5">{b.tagline}</p>
                                        <p className="text-[10px] text-white/50 mt-2 line-clamp-1">{b.highlights}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* STEP 2: GUEST COUNT & OCCASION */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {/* Party Size */}
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-wider text-[#D4AF37] flex items-center gap-1.5">
                                    <Users className="w-4 h-4" />
                                    <span>2. Number of Guests</span>
                                </label>
                                <div className="grid grid-cols-5 gap-2">
                                    {[2, 4, 6, 8, 12].map((num) => (
                                        <button
                                            type="button"
                                            key={num}
                                            onClick={() => setPartySize(num)}
                                            className={`py-3 rounded-xl font-mono text-xs font-black transition cursor-pointer border ${
                                                partySize === num
                                                    ? "bg-[#D4AF37] text-black border-[#D4AF37] shadow-md"
                                                    : "bg-[#1A140F] text-white border-white/10 hover:border-[#D4AF37]/40"
                                            }`}
                                        >
                                            {num === 12 ? "10+" : num}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Occasion */}
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-wider text-[#D4AF37] flex items-center gap-1.5">
                                    <Sparkles className="w-4 h-4" />
                                    <span>Dining Occasion</span>
                                </label>
                                <select
                                    value={occasion}
                                    onChange={(e) => setOccasion(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-[#1A140F] border border-white/15 text-xs text-white focus:outline-none focus:border-[#D4AF37] cursor-pointer"
                                >
                                    {OCCASIONS.map((o) => (
                                        <option key={o.id} value={o.id} className="bg-[#140F0B]">
                                            {o.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* STEP 3: DATE & TIME */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {/* Date */}
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-wider text-[#D4AF37] flex items-center gap-1.5">
                                    <Calendar className="w-4 h-4" />
                                    <span>3. Reservation Date</span>
                                </label>
                                <input
                                    type="date"
                                    min={todayStr}
                                    value={reservationDate}
                                    onChange={(e) => setReservationDate(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-[#1A140F] border border-white/15 text-xs text-white focus:outline-none focus:border-[#D4AF37] cursor-pointer font-mono"
                                />
                            </div>

                            {/* Time Slot */}
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-wider text-[#D4AF37] flex items-center gap-1.5">
                                    <Clock className="w-4 h-4" />
                                    <span>Time Slot</span>
                                </label>
                                <select
                                    value={reservationTime}
                                    onChange={(e) => setReservationTime(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-[#1A140F] border border-white/15 text-xs text-white focus:outline-none focus:border-[#D4AF37] cursor-pointer font-mono"
                                >
                                    <optgroup label="Lunch (12 PM – 3 PM)" className="bg-[#140F0B]">
                                        {TIME_SLOTS.lunch.map((slot) => (
                                            <option key={slot} value={slot}>{slot}</option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="Dinner (6:30 PM – 11 PM)" className="bg-[#140F0B]">
                                        {TIME_SLOTS.dinner.map((slot) => (
                                            <option key={slot} value={slot}>{slot}</option>
                                        ))}
                                    </optgroup>
                                </select>
                            </div>
                        </div>

                        {/* STEP 4: SEATING PREFERENCE */}
                        <div className="space-y-3">
                            <label className="text-xs font-black uppercase tracking-wider text-[#D4AF37] flex items-center gap-1.5">
                                <Crown className="w-4 h-4" />
                                <span>4. Preferred Seating Style</span>
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {SEATING_PREFERENCES.map((sp) => (
                                    <button
                                        type="button"
                                        key={sp.id}
                                        onClick={() => setSeatingPreference(sp.id)}
                                        className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex items-start gap-3 ${
                                            seatingPreference === sp.id
                                                ? "bg-[#2A1E14] border-[#D4AF37] ring-1 ring-[#D4AF37]"
                                                : "bg-[#1A140F] border-white/10 hover:border-white/20"
                                        }`}
                                    >
                                        <span className="text-xl">{sp.icon}</span>
                                        <div>
                                            <div className="font-bold text-xs text-white flex items-center gap-1.5">
                                                <span>{sp.label}</span>
                                                {seatingPreference === sp.id && <CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF37]" />}
                                            </div>
                                            <p className="text-[10px] text-white/50 mt-0.5 leading-snug">{sp.desc}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* STEP 5: CONTACT DETAILS */}
                        <div className="space-y-4 pt-2 border-t border-white/10">
                            <label className="text-xs font-black uppercase tracking-wider text-[#D4AF37] flex items-center gap-1.5">
                                <User className="w-4 h-4" />
                                <span>5. Guest Contact Information</span>
                            </label>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <span className="text-[11px] font-bold text-white/60">Full Name *</span>
                                    <input
                                        type="text"
                                        required
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        placeholder="e.g. Mallem Mohammed"
                                        className="w-full px-4 py-3 rounded-xl bg-[#1A140F] border border-white/15 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#D4AF37]"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <span className="text-[11px] font-bold text-white/60">Mobile Phone Number *</span>
                                    <div className="relative">
                                        <span className="absolute left-3.5 top-3 text-xs font-bold text-[#D4AF37]">+91</span>
                                        <input
                                            type="tel"
                                            required
                                            maxLength={10}
                                            value={customerPhone}
                                            onChange={(e) => setCustomerPhone(e.target.value)}
                                            placeholder="9876543210"
                                            className="w-full pl-12 pr-4 py-3 rounded-xl bg-[#1A140F] border border-white/15 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#D4AF37] font-mono"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <span className="text-[11px] font-bold text-white/60">Special Requests (Optional)</span>
                                <input
                                    type="text"
                                    value={specialRequests}
                                    onChange={(e) => setSpecialRequests(e.target.value)}
                                    placeholder="e.g. Birthday cake table setup, High chair for child, quiet corner"
                                    className="w-full px-4 py-3 rounded-xl bg-[#1A140F] border border-white/15 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#D4AF37]"
                                />
                            </div>
                        </div>

                        {/* SUBMIT BUTTON */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#E5C058] to-[#C59B27] hover:from-[#E5C058] hover:to-[#D4AF37] text-black font-black text-sm uppercase tracking-wider shadow-xl shadow-[#D4AF37]/20 flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer disabled:opacity-50"
                        >
                            <span>{isSubmitting ? "CONFIRMING RESERVATION..." : "CONFIRM TABLE PRE-BOOKING (ZERO ADVANCE FEE)"}</span>
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </form>
                )}
            </main>
        </div>
    );
}

export default function BookTablePage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-[#0D0907] text-[#D4AF37]">
                    Loading Surya Family Restaurant Table Reservations...
                </div>
            }
        >
            <BookTableContent />
        </Suspense>
    );
}
