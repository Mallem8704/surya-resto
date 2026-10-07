/**
 * Web Audio API Sound Generator for Surya Family Restaurant Kadiri.
 * Generates synthetic bell & chime notifications without external mp3 files.
 * Supports Autoplay Unlock detection and automatic gesture resumption for kitchen & cashier tablets.
 */

class SoundManager {
    private ctx: AudioContext | null = null;
    private listeners: Set<(unlocked: boolean) => void> = new Set();
    private hasUserUnlocked: boolean = false;
    private globalListenersAttached: boolean = false;

    constructor() {
        if (typeof window !== "undefined") {
            this.attachGlobalUnlockListeners();
        }
    }

    /**
     * Listen to global user gestures (tap, touch, click, keydown) to seamlessly unlock AudioContext
     */
    private attachGlobalUnlockListeners() {
        if (this.globalListenersAttached || typeof window === "undefined") return;
        this.globalListenersAttached = true;

        const onFirstInteraction = () => {
            if (!this.hasUserUnlocked) {
                this.unlockAudio().catch(() => {});
            }
        };

        window.addEventListener("pointerdown", onFirstInteraction, { passive: true, once: true });
        window.addEventListener("keydown", onFirstInteraction, { passive: true, once: true });
        window.addEventListener("touchstart", onFirstInteraction, { passive: true, once: true });

        // Wall tablet screen-wake / focus auto-resume handler
        const onWakeOrFocus = () => {
            if (this.ctx && this.ctx.state === "suspended" && this.hasUserUnlocked) {
                this.ctx.resume().catch(() => {});
            }
        };
        window.addEventListener("visibilitychange", onWakeOrFocus, { passive: true });
        window.addEventListener("focus", onWakeOrFocus, { passive: true });
    }

    private getContext(): AudioContext | null {
        if (typeof window === "undefined") return null;
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
                this.ctx.addEventListener("statechange", () => {
                    const running = this.ctx?.state === "running";
                    if (running) {
                        this.hasUserUnlocked = true;
                    }
                    this.notifyListeners();
                });
            }
        }
        if (this.ctx && this.ctx.state === "suspended") {
            this.ctx.resume().catch(() => {});
        }
        return this.ctx;
    }

    private notifyListeners() {
        const unlocked = this.isUnlocked();
        this.listeners.forEach((listener) => {
            try {
                listener(unlocked);
            } catch (err) {
                console.error("Error in sound listener:", err);
            }
        });
    }

    /**
     * Subscribe to changes in AudioContext unlock state
     */
    public subscribe(listener: (unlocked: boolean) => void): () => void {
        this.listeners.add(listener);
        // Immediately notify with current state
        listener(this.isUnlocked());
        return () => {
            this.listeners.delete(listener);
        };
    }

    /**
     * Returns true if AudioContext exists and is running (not suspended or blocked by browser)
     */
    public isUnlocked(): boolean {
        if (typeof window === "undefined") return false;
        if (this.hasUserUnlocked) return true;
        if (this.ctx && this.ctx.state === "running") {
            this.hasUserUnlocked = true;
            return true;
        }
        return false;
    }

    /**
     * Return raw AudioContextState
     */
    public getAudioState(): AudioContextState | "uninitialized" {
        return this.ctx ? this.ctx.state : "uninitialized";
    }

    /**
     * Proactively initialize AudioContext so browser state can be inspected
     */
    public init(): AudioContext | null {
        return this.getContext();
    }

    /**
     * Explicitly unlock / resume AudioContext upon user click or tap
     */
    public async unlockAudio(): Promise<boolean> {
        if (typeof window === "undefined") return false;
        try {
            const ctx = this.getContext();
            if (!ctx) return false;
            if (ctx.state === "suspended") {
                await ctx.resume();
            }
            if (ctx.state === "running") {
                this.hasUserUnlocked = true;
                this.notifyListeners();
                return true;
            }
        } catch (err) {
            console.warn("Could not unlock Web Audio:", err);
        }
        return false;
    }

    /**
     * Play a bright, cheerful dual-tone chime when a new order arrives.
     */
    playNewOrderChime() {
        const ctx = this.getContext();
        if (!ctx) return;

        if (ctx.state === "suspended") {
            ctx.resume().then(() => this.playNewOrderChime()).catch(() => {});
            return;
        }

        try {
            const now = ctx.currentTime;

            // Tone 1 (High bell E6 - 1318 Hz)
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = "sine";
            osc1.frequency.setValueAtTime(1318.5, now);
            gain1.gain.setValueAtTime(0.3, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(now);
            osc1.stop(now + 0.6);

            // Tone 2 (Higher bell G#6 - 1661 Hz)
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = "sine";
            osc2.frequency.setValueAtTime(1661.2, now + 0.12);
            gain2.gain.setValueAtTime(0.35, now + 0.12);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(now + 0.12);
            osc2.stop(now + 0.8);
        } catch (e) {
            console.warn("Could not play audio chime", e);
        }
    }

    /**
     * Play an alert tone for waiter / service call.
     */
    playServiceCallAlert() {
        const ctx = this.getContext();
        if (!ctx) return;

        if (ctx.state === "suspended") {
            ctx.resume().then(() => this.playServiceCallAlert()).catch(() => {});
            return;
        }

        try {
            const now = ctx.currentTime;

            // Pulsing attention chime
            [0, 0.18].forEach((delay, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = "triangle";
                osc.frequency.setValueAtTime(idx === 0 ? 880 : 1174, now + delay);
                gain.gain.setValueAtTime(0.25, now + delay);
                gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.4);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + delay);
                osc.stop(now + delay + 0.4);
            });
        } catch (e) {
            console.warn("Could not play service alert", e);
        }
    }

    /**
     * Play a short bubbly pop sound when an item is added to cart.
     */
    playAddToCartPop() {
        const ctx = this.getContext();
        if (!ctx) return;

        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = "sine";
            osc.frequency.setValueAtTime(520, now);
            osc.frequency.exponentialRampToValueAtTime(980, now + 0.08);

            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.09);
        } catch (e) {
            console.warn("Could not play add to cart sound", e);
        }
    }

    /**
     * Alias for playAddToCartPop
     */
    playAddToCart() {
        this.playAddToCartPop();
    }

    /**
     * Play an energetic celebratory chime when an order is placed.
     */
    playOrderPlacedSuccess() {
        const ctx = this.getContext();
        if (!ctx) return;

        try {
            const now = ctx.currentTime;
            const chords = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
            chords.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const noteStart = now + i * 0.09;

                osc.type = "sine";
                osc.frequency.setValueAtTime(freq, noteStart);

                gain.gain.setValueAtTime(0.22, noteStart);
                gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.5);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(noteStart);
                osc.stop(noteStart + 0.5);
            });
        } catch (e) {
            console.warn("Could not play order success sound", e);
        }
    }

    /**
     * Play a clear, high chime when food is ready / rider dispatched.
     */
    playReadyChime() {
        const ctx = this.getContext();
        if (!ctx) return;

        if (ctx.state === "suspended") {
            ctx.resume().then(() => this.playReadyChime()).catch(() => {});
            return;
        }

        try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = "sine";
            osc.frequency.setValueAtTime(880, now);
            osc.frequency.setValueAtTime(1760, now + 0.15);

            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.7);
        } catch (e) {
            console.warn("Could not play ready chime", e);
        }
    }

    /**
     * Get preferred voice announcement language ('en' or 'te')
     */
    public getVoiceLanguage(): "en" | "te" {
        if (typeof window === "undefined") return "en";
        try {
            const saved = localStorage.getItem("surya_voice_lang");
            if (saved === "te" || saved === "en") return saved;
            const appLang = localStorage.getItem("surya_language");
            if (appLang === "te") return "te";
        } catch (e) {}
        return "en";
    }

    /**
     * Set preferred voice announcement language ('en' or 'te')
     */
    public setVoiceLanguage(lang: "en" | "te") {
        if (typeof window === "undefined") return;
        try {
            localStorage.setItem("surya_voice_lang", lang);
        } catch (e) {}
    }

    /**
     * Get sound mode: 'voice_and_chime' | 'chime_only' | 'mute'
     */
    public getSoundMode(): "voice_and_chime" | "chime_only" | "mute" {
        if (typeof window === "undefined") return "voice_and_chime";
        try {
            const saved = localStorage.getItem("surya_sound_mode");
            if (saved === "chime_only" || saved === "mute" || saved === "voice_and_chime") return saved;
        } catch (e) {}
        return "voice_and_chime";
    }

    /**
     * Set sound mode: 'voice_and_chime' | 'chime_only' | 'mute'
     */
    public setSoundMode(mode: "voice_and_chime" | "chime_only" | "mute") {
        if (typeof window === "undefined") return;
        try {
            localStorage.setItem("surya_sound_mode", mode);
        } catch (e) {}
    }

    /**
     * Helper to synthesize speech safely with Indian English (en-IN) / Telugu (te-IN) fallbacks
     */
    private speakText(text: string, lang: "en" | "te" = "en") {
        if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
        try {
            window.speechSynthesis.cancel(); // Cancel any ongoing speech
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.05;
            utterance.pitch = 1.05;
            utterance.lang = lang === "te" ? "te-IN" : "en-IN";

            // Attempt to assign native Indian voices if available
            const voices = window.speechSynthesis.getVoices();
            if (voices && voices.length > 0) {
                const targetCode = lang === "te" ? "te" : "en-IN";
                const matched = voices.find(
                    (v) => v.lang.toLowerCase().includes(targetCode.toLowerCase()) || v.name.includes("India")
                );
                if (matched) {
                    utterance.voice = matched;
                }
            }

            window.speechSynthesis.speak(utterance);
        } catch (err) {
            console.warn("SpeechSynthesis error:", err);
        }
    }

    /**
     * Universal Voice & Chime Alert for New Orders (Dine-In Table, Delivery, Takeaway).
     * Plays high-penetration bell chime first, followed by clear voice announcement!
     */
    playOrderVoiceAlert(
        order: {
            order_type?: string;
            table_label?: string;
            total_paise?: number;
            order_number?: string;
            customer_name?: string;
            items?: any[];
        },
        preferredLang?: "en" | "te"
    ) {
        const mode = this.getSoundMode();
        if (mode === "mute") return;

        // 1. Play high-penetration bell chime first
        this.playNewOrderChime();

        if (mode === "chime_only") return;

        // 2. Synthesize Voice Announcement
        const lang = preferredLang || this.getVoiceLanguage();
        const totalRs = order.total_paise ? Math.round(order.total_paise / 100) : 0;
        const rawType = (order.order_type || "dine_in").toLowerCase();

        let speechText = "";

        if (rawType === "delivery") {
            const amountStr = totalRs > 0 ? ` of rupees ${totalRs}` : "";
            speechText =
                lang === "te"
                    ? `కొత్త డెలివరీ ఆర్డర్ వచ్చింది! ${totalRs > 0 ? `మొత్తం ${totalRs} రూపాయలు.` : ""}`
                    : `New delivery order received${amountStr}!`;
        } else if (rawType === "takeaway" || rawType === "parcel") {
            const amountStr = totalRs > 0 ? ` of rupees ${totalRs}` : "";
            speechText =
                lang === "te"
                    ? `కొత్త టేక్‌అవే పార్శిల్ ఆర్డర్ వచ్చింది! ${totalRs > 0 ? `మొత్తం ${totalRs} రూపాయలు.` : ""}`
                    : `New takeaway parcel order received${amountStr}!`;
        } else {
            // Dine-in Table Order
            const tableStr = order.table_label ? order.table_label : "Table";
            const amountStr = totalRs > 0 ? `, rupees ${totalRs}` : "";
            speechText =
                lang === "te"
                    ? `టేబుల్ ${tableStr} కోసం కొత్త ఆర్డర్ వచ్చింది! ${totalRs > 0 ? `మొత్తం ${totalRs} రూపాయలు.` : ""}`
                    : `New order for Table ${tableStr}${amountStr}!`;
        }

        setTimeout(() => {
            this.speakText(speechText, lang);
        }, 380);
    }

    /**
     * Voice alert when additional running items are added to an existing table
     */
    playRunningKotVoiceAlert(tableLabel: string, preferredLang?: "en" | "te") {
        const mode = this.getSoundMode();
        if (mode === "mute") return;

        this.playNewOrderChime();
        if (mode === "chime_only") return;

        const lang = preferredLang || this.getVoiceLanguage();
        const speechText =
            lang === "te"
                ? `టేబుల్ ${tableLabel} కి అదనపు ఆర్డర్ వచ్చింది!`
                : `Additional items added to Table ${tableLabel}!`;

        setTimeout(() => {
            this.speakText(speechText, lang);
        }, 380);
    }

    /**
     * Voice alert for digital waiter service calls (Water, Bill, Waiter, Clean)
     */
    playServiceCallVoiceAlert(
        service: { table_label?: string; table_id?: number; call_type?: string },
        preferredLang?: "en" | "te"
    ) {
        const mode = this.getSoundMode();
        if (mode === "mute") return;

        this.playServiceCallAlert();
        if (mode === "chime_only") return;

        const lang = preferredLang || this.getVoiceLanguage();
        const tableStr = service.table_label || (service.table_id ? `T${service.table_id}` : "Table");
        const callType = (service.call_type || "service").toLowerCase();

        let speechText = "";
        if (lang === "te") {
            const reason =
                callType === "water"
                    ? "నీళ్లు"
                    : callType === "bill"
                    ? "బిల్లు"
                    : callType === "clean"
                    ? "టేబుల్ క్లీన్"
                    : "సహాయం";
            speechText = `టేబుల్ ${tableStr} నుండి ${reason} పిలుపు వచ్చింది!`;
        } else {
            speechText = `Service alert! Table ${tableStr} requested ${callType}.`;
        }

        setTimeout(() => {
            this.speakText(speechText, lang);
        }, 400);
    }

    /**
     * Voice alert for table pre-booking & reservations
     */
    playReservationVoiceAlert(
        reservation: { party_size?: number; customer_name?: string; reservation_date?: string },
        preferredLang?: "en" | "te"
    ) {
        const mode = this.getSoundMode();
        if (mode === "mute") return;

        this.playNewOrderChime();
        if (mode === "chime_only") return;

        const lang = preferredLang || this.getVoiceLanguage();
        const partySize = reservation.party_size || 2;
        const speechText =
            lang === "te"
                ? `${partySize} మంది కోసం కొత్త టేబుల్ రిజర్వేషన్ నమోదయింది!`
                : `New table reservation for ${partySize} guests!`;

        setTimeout(() => {
            this.speakText(speechText, lang);
        }, 380);
    }

    /**
     * Built-in Voice "Soundbox" Audio Engine for Payment Receipts.
     * Plays cash register celebratory chime followed by speech synthesis.
     */
    playPaymentSoundbox(amountRs: number, method: string = "UPI", tableLabel?: string, language?: "en" | "te") {
        const mode = this.getSoundMode();
        if (mode === "mute") return;

        // 1. Play Cash Register Chime
        this.playOrderPlacedSuccess();
        if (mode === "chime_only") return;

        // 2. Synthesize Voice Announcement
        const lang = language || this.getVoiceLanguage();
        const cleanAmount = Math.round(amountRs);
        const tableText = tableLabel ? ` for Table ${tableLabel}` : "";

        let textToSpeak = `Payment of rupees ${cleanAmount} received on ${method}${tableText}.`;
        if (lang === "te") {
            textToSpeak = tableLabel
                ? `టేబుల్ ${tableLabel} కోసం ${cleanAmount} రూపాయల పేమెంట్ అందింది.`
                : `${cleanAmount} రూపాయల పేమెంట్ విజయవంతంగా అందింది.`;
        }

        setTimeout(() => {
            this.speakText(textToSpeak, lang);
        }, 380);
    }

    /**
     * Continuous Repeating Order Alarm Engine (Swiggy / Zomato merchant style)
     * Rings loud alert every 3.5s until acknowledged/silenced by cashier.
     */
    private alarmTimer: any = null;
    private activeAlarmOrder: any = null;
    private alarmListeners: Set<(isRinging: boolean, order: any) => void> = new Set();

    public subscribeAlarm(listener: (isRinging: boolean, order: any) => void): () => void {
        this.alarmListeners.add(listener);
        listener(this.isAlarmRinging(), this.activeAlarmOrder);
        return () => {
            this.alarmListeners.delete(listener);
        };
    }

    private notifyAlarmListeners() {
        const ringing = this.isAlarmRinging();
        this.alarmListeners.forEach((fn) => {
            try { fn(ringing, this.activeAlarmOrder); } catch {}
        });
    }

    public isAlarmRinging(): boolean {
        return this.alarmTimer !== null;
    }

    public getActiveAlarmOrder(): any {
        return this.activeAlarmOrder;
    }

    public startContinuousOrderAlarm(order: any) {
        if (this.getSoundMode() === "mute") return;

        // Save active order and notify listeners
        this.activeAlarmOrder = order;

        // Play first alert immediately
        this.playOrderVoiceAlert(order);
        this.notifyAlarmListeners();

        // Also trigger native OS desktop notification
        this.showDesktopNotification(
            `🚨 NEW ${order.order_type === "delivery" ? "DELIVERY" : "TAKEAWAY"} ORDER #${order.order_number || order.id}!`,
            `Total: ₹${order.total_paise ? Math.round(order.total_paise / 100) : "0"} • Customer: ${order.customer_name || "Guest"} • Tap to open and accept!`
        );

        // If alarm is already running, update order info without duplicating intervals
        if (this.alarmTimer) return;

        // Ring repeatedly every 3.5 seconds like commercial merchant terminals
        this.alarmTimer = setInterval(() => {
            if (this.activeAlarmOrder) {
                // Play loud dual-tone chime
                this.playNewOrderChime();
            }
        }, 3500);
    }

    public stopContinuousOrderAlarm() {
        if (this.alarmTimer) {
            clearInterval(this.alarmTimer);
            this.alarmTimer = null;
        }
        this.activeAlarmOrder = null;
        this.notifyAlarmListeners();
    }

    /**
     * Request HTML5 Desktop Push Notification Permission
     */
    public async requestNotificationPermission(): Promise<boolean> {
        if (typeof window === "undefined" || !("Notification" in window)) return false;
        try {
            if (Notification.permission === "granted") return true;
            if (Notification.permission !== "denied") {
                const res = await Notification.requestPermission();
                return res === "granted";
            }
        } catch {}
        return false;
    }

    /**
     * Show high-priority native OS desktop notification (even when Chrome is minimized or in background)
     */
    public showDesktopNotification(title: string, body: string, onClick?: () => void) {
        if (typeof window === "undefined" || !("Notification" in window)) return;
        if (Notification.permission !== "granted") {
            this.requestNotificationPermission();
            return;
        }

        try {
            const notif = new Notification(title, {
                body,
                icon: "/icon.png",
                badge: "/icon.png",
                tag: "surya-new-order",
                requireInteraction: true, // Keep notification on screen until user clicks
            });

            notif.onclick = () => {
                window.focus();
                if (onClick) onClick();
                notif.close();
            };
        } catch (e) {
            console.warn("Desktop notification error:", e);
        }
    }

    /**
     * Test voice engine function for staff onboarding & sound check
     */
    testVoice(type: "table" | "delivery" | "payment" | "service" = "table", lang?: "en" | "te") {
        const l = lang || this.getVoiceLanguage();
        if (type === "delivery") {
            this.playOrderVoiceAlert({ order_type: "delivery", total_paise: 55000 }, l);
        } else if (type === "payment") {
            this.playPaymentSoundbox(650, "UPI", "T3", l);
        } else if (type === "service") {
            this.playServiceCallVoiceAlert({ table_label: "T5", call_type: "water" }, l);
        } else {
            this.playOrderVoiceAlert({ order_type: "dine_in", table_label: "T3", total_paise: 48000 }, l);
        }
    }
}

export type SoundMode = "voice_and_chime" | "chime_only" | "mute";
export type VoiceLanguage = "en" | "te" | "en-IN";

export const soundManager = new SoundManager();

