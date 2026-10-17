// ============================================================
// LittleTalk AI - Web Audio Sound Effects Synthesizer
// 100% self-contained, offline, child-friendly audio chimes & pops
// Bulletproof error-safe fallback (never crashes calling UI)
// ============================================================

class SoundFX {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (muted) {
      this.stopAll();
    }
  }

  getMuted(): boolean {
    return this.isMuted;
  }

  stopAll(): void {
    try {
      if (this.ctx && this.ctx.state !== 'closed') {
        this.ctx.suspend().catch(() => {});
      }
    } catch {}
  }

  private getContext(): AudioContext | null {
    if (this.isMuted || typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended' && !this.isMuted) {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  /**
   * Star & Correct Answer Chime: Joyful ascending twinkling arpeggio
   */
  playCorrectChime(): void {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'triangle';
          const startTime = now + idx * 0.08;
          osc.frequency.setValueAtTime(freq, startTime);

          gain.gain.setValueAtTime(0.001, startTime);
          gain.gain.linearRampToValueAtTime(0.18, startTime + 0.02);
          gain.gain.linearRampToValueAtTime(0.001, startTime + 0.28);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(startTime);
          osc.stop(startTime + 0.3);
        } catch {
          // ignore single note error
        }
      });
    } catch (e) {
      console.warn('Sound effect error ignored:', e);
    }
  }

  /**
   * Bubble Pop Sound on Option Tap
   */
  playPopSound(): void {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.linearRampToValueAtTime(800, now + 0.05);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch (e) {
      console.warn('Sound effect error ignored:', e);
    }
  }

  /**
   * Gentle Encouraging Chime for Mistakes
   */
  playGentleTryAgain(): void {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [440, 392]; // A4, G4 (gentle descending warmth)
      notes.forEach((freq, idx) => {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          const startTime = now + idx * 0.12;
          osc.frequency.setValueAtTime(freq, startTime);

          gain.gain.setValueAtTime(0.001, startTime);
          gain.gain.linearRampToValueAtTime(0.12, startTime + 0.03);
          gain.gain.linearRampToValueAtTime(0.001, startTime + 0.32);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(startTime);
          osc.stop(startTime + 0.35);
        } catch {
          // ignore
        }
      });
    } catch (e) {
      console.warn('Sound effect error ignored:', e);
    }
  }

  /**
   * Level-Up Fanfare: Triumphant festive chord
   */
  playLevelUpFanfare(): void {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const chords = [
        [523.25, 659.25, 783.99],       // C Major
        [587.33, 739.99, 880.00],       // D Major
        [659.25, 830.61, 987.77],       // E Major
        [1046.50, 1318.51, 1567.98],    // High C Major burst
      ];

      chords.forEach((chord, step) => {
        chord.forEach((freq) => {
          try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'triangle';
            const startTime = now + step * 0.14;
            osc.frequency.setValueAtTime(freq, startTime);

            const duration = step === chords.length - 1 ? 0.6 : 0.16;
            gain.gain.setValueAtTime(0.001, startTime);
            gain.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
            gain.gain.linearRampToValueAtTime(0.001, startTime + duration);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(startTime);
            osc.stop(startTime + duration + 0.05);
          } catch {
            // ignore
          }
        });
      });
    } catch (e) {
      console.warn('Sound effect error ignored:', e);
    }
  }
}

export const soundFX = new SoundFX();
