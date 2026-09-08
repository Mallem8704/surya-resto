/**
 * Web Audio API Sound Generator for Tea Time Cafe.
 * Generates synthetic bell & chime notifications without external mp3 files.
 */

class SoundManager {
    private ctx: AudioContext | null = null;

    private getContext(): AudioContext | null {
        if (typeof window === "undefined") return null;
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === "suspended") {
            this.ctx.resume().catch(() => {});
        }
        return this.ctx;
    }

    /**
     * Play a bright, cheerful dual-tone chime when a new order arrives.
     */
    playNewOrderChime() {
        const ctx = this.getContext();
        if (!ctx) return;

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
     * Built-in Voice "Soundbox" Audio Engine.
     * Plays a pleasant dual-tone cash register chime, followed by crystal-clear speech synthesis!
     */
    playPaymentSoundbox(amountRs: number, method: string = "UPI", tableLabel?: string, language: "en" | "te" = "en") {
        // 1. Play Cash Register Chime
        this.playOrderPlacedSuccess();

        // 2. Synthesize Voice Announcement
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
            try {
                window.speechSynthesis.cancel(); // Cancel any ongoing speech
                const cleanAmount = Math.round(amountRs);
                const tableText = tableLabel ? ` for Table ${tableLabel}` : "";
                
                let textToSpeak = `Payment of rupees ${cleanAmount} received on ${method}${tableText}.`;
                if (language === "te") {
                    textToSpeak = tableLabel 
                        ? `టేబుల్ ${tableLabel} కోసం ${cleanAmount} రూపాయల పేమెంట్ అందింది.`
                        : `${cleanAmount} రూపాయల పేమెంట్ విజయవంతంగా అందింది.`;
                }

                const utterance = new SpeechSynthesisUtterance(textToSpeak);
                utterance.rate = 1.05;
                utterance.pitch = 1.1;
                utterance.lang = language === "te" ? "te-IN" : "en-IN";
                
                // Small delay so the initial chime plays cleanly first
                setTimeout(() => {
                    window.speechSynthesis.speak(utterance);
                }, 350);
            } catch (e) {
                console.warn("Speech synthesis error", e);
            }
        }
    }
}

export const soundManager = new SoundManager();
