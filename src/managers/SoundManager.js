import { CONFIG } from '../utils/constants.js';

export class SoundManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
        this.enabled = true;

        // Music State
        this.isPlayingMusic = false;
        this.nextNoteTime = 0;
        this.currentNote = 0;
        this.tempo = 100; // BPM
        this.lookahead = 25.0; // ms
        this.scheduleAheadTime = 0.1; // seconds
        this.timerID = null;

        // Scale (C Major Pentatonic: C, D, E, G, A)
        this.scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();

            // Master Mix
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 1.0;
            this.masterGain.connect(this.ctx.destination);

            // Sub-mixes
            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.value = 0.2; // Background music volume (lower)
            this.musicGain.connect(this.masterGain);

            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.value = 0.6; // SFX Volume (louder)
            this.sfxGain.connect(this.masterGain);
        }

        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        this.startMusic();
    }

    // --- MUSIC SEQUENCER ---

    startMusic() {
        if (this.isPlayingMusic || !this.ctx) return;
        this.isPlayingMusic = true;
        this.nextNoteTime = this.ctx.currentTime;
        this.scheduler();
    }

    scheduler() {
        if (!this.isPlayingMusic) return;

        // Schedule notes until wait time is reached
        while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
            this.scheduleNote(this.currentNote, this.nextNoteTime);
            this.nextNote();
        }

        this.timerID = setTimeout(() => this.scheduler(), this.lookahead);
    }

    nextNote() {
        const secondsPerBeat = 60.0 / this.tempo;
        this.nextNoteTime += 0.25 * secondsPerBeat; // 16th notes
        this.currentNote++;
        if (this.currentNote === 16) {
            this.currentNote = 0;
        }
    }

    scheduleNote(beatNumber, time) {
        // Simple procedural melody pattern

        // Bass (Every 4 beats)
        if (beatNumber % 4 === 0) {
            const freq = (beatNumber === 0 || beatNumber === 8) ? 130.81 : 174.61; // C then F
            this.playSynthNote(freq / 2, time, 0.5, 'sine', 0.5);
        }

        // Melody (Random pentatonic pluck)
        if (beatNumber % 2 === 0 && Math.random() > 0.3) {
            const noteIndex = Math.floor(Math.random() * this.scale.length);
            // Harmony
            const freq = this.scale[noteIndex];
            this.playSynthNote(freq, time, 0.1, 'triangle', 0.2);

            // Delay/Echo effect (simulated manually)
            if (Math.random() > 0.5) {
                this.playSynthNote(freq, time + 0.15, 0.1, 'triangle', 0.1);
            }
        }
    }

    playSynthNote(freq, time, duration, type, vol) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, time);

        // Envelope (Pluck)
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(vol, time + 0.01); // Attack
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration); // Decay

        osc.connect(gain);
        gain.connect(this.musicGain);

        osc.start(time);
        osc.stop(time + duration);
    }

    stopMusic() {
        this.isPlayingMusic = false;
        if (this.timerID) clearTimeout(this.timerID);
    }

    // --- SOUND EFFECTS ---

    playTone(freq, duration, type = 'sine', startTime = 0) {
        if (!this.enabled || !this.ctx) return;
        const t = this.ctx.currentTime + startTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.3, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + duration);
    }

    playBuild() {
        // Happy "Pop" sound
        this.playTone(600, 0.1, 'sine');
        this.playTone(1200, 0.05, 'sine', 0.05);
    }

    playUIHover() {
        // Subtle tick
        if (!this.ctx) return;
        this.playTone(800, 0.02, 'sine');
    }

    playUIClick() {
        // Validation sound
        this.playTone(1000, 0.1, 'square');
    }

    playError() {
        // Low "Buzz"
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, t);
        osc.frequency.linearRampToValueAtTime(50, t + 0.2);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.2);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.2);
    }

    playShoot() {
        if (!this.enabled || !this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.2);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.2);
    }

    playExplosion(intensity = 1) {
        if (!this.enabled || !this.ctx) return;
        const t = this.ctx.currentTime;

        // Thump
        const oscLow = this.ctx.createOscillator();
        const gainLow = this.ctx.createGain();
        oscLow.type = 'sawtooth'; // More grit
        oscLow.frequency.setValueAtTime(100, t);
        oscLow.frequency.exponentialRampToValueAtTime(10, t + 0.4);
        gainLow.gain.setValueAtTime(0.5 * intensity, t);
        gainLow.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
        oscLow.connect(gainLow);
        gainLow.connect(this.sfxGain);
        oscLow.start(t);
        oscLow.stop(t + 0.4);

        // Sparkle
        const pentatonic = [523.25, 659.25, 783.99];
        const note = pentatonic[Math.floor(Math.random() * pentatonic.length)];
        this.playTone(note, 0.2, 'square', 0.05);
    }

    playWin() {
        if (!this.enabled || !this.ctx) return;
        this.playTone(523.25, 0.2, 'sine', 0);
        this.playTone(659.25, 0.2, 'sine', 0.15);
        this.playTone(783.99, 0.2, 'sine', 0.30);
        this.playTone(1046.50, 0.6, 'sine', 0.45);
    }
}
