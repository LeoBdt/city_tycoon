import { CONFIG } from '../utils/constants.js';

export class SoundManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.enabled = true;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = CONFIG.MASTER_VOLUME || 0.3;
            this.masterGain.connect(this.ctx.destination);
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playTone(freq, duration, type = 'sine', startTime = 0) {
        if (!this.enabled || !this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);

        // Soft envelope (Attack, Decay)
        const now = this.ctx.currentTime + startTime;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.05); // Attack
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration); // Decay

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + duration);
    }

    playShoot() {
        // "Pew" effect with pitch drop - melodic
        if (!this.enabled || !this.ctx) return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, t); // High A
        osc.frequency.exponentialRampToValueAtTime(220, t + 0.2); // Drop to Low A

        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.2);
    }

    playExplosion(intensity = 1) {
        if (!this.enabled || !this.ctx) return;

        const t = this.ctx.currentTime;

        // 1. Low Thump (Bass impact) - instead of noise
        const oscLow = this.ctx.createOscillator();
        const gainLow = this.ctx.createGain();
        oscLow.type = 'sine';
        oscLow.frequency.setValueAtTime(150, t);
        oscLow.frequency.exponentialRampToValueAtTime(40, t + 0.3);

        gainLow.gain.setValueAtTime(0.5 * intensity, t);
        gainLow.gain.exponentialRampToValueAtTime(0.01, t + 0.5);

        oscLow.connect(gainLow);
        gainLow.connect(this.masterGain);
        oscLow.start(t);
        oscLow.stop(t + 0.5);

        // 2. High Sparkle (Melodic debris)
        // Play a random pentatonic note to make destruction musical
        const pentatonic = [523.25, 587.33, 659.25, 783.99, 880.00]; // C Major Pentatonic
        const note = pentatonic[Math.floor(Math.random() * pentatonic.length)];
        this.playTone(note, 0.3, 'triangle', 0.1);
    }

    playWin() {
        if (!this.enabled || !this.ctx) return;

        // Major Arpeggio Fanfare (C - E - G - C)
        const C4 = 261.63;
        const E4 = 329.63;
        const G4 = 392.00;
        const C5 = 523.25;

        this.playTone(C4, 0.4, 'sine', 0);
        this.playTone(E4, 0.4, 'sine', 0.15);
        this.playTone(G4, 0.4, 'sine', 0.30);
        this.playTone(C5, 0.8, 'sine', 0.45);
    }
}
