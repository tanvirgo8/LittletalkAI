// ============================================================
// LittleTalk AI - Web Audio Sound Effects Synthesizer
// 100% self-contained, offline, child-friendly audio chimes & pops
// ============================================================

class SoundFX {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Star & Correct Answer Chime: Joyful ascending twinkling arpeggio
   */
  playCorrectChime(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);

      gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.08);
      osc.stop(ctx.currentTime + idx * 0.08 + 0.35);
    });
  }

  /**
   * Bubble Pop Sound on Option Tap
   */
  playPopSound(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.06);

    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.09);
  }

  /**
   * Gentle Encouraging Chime for Mistakes
   */
  playGentleTryAgain(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const notes = [440, 392]; // A4, G4 (gentle descending warmth)
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);

      gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.12);
      gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + idx * 0.12 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.12);
      osc.stop(ctx.currentTime + idx * 0.12 + 0.38);
    });
  }

  /**
   * Level-Up Fanfare: Triumphant festive chord
   */
  playLevelUpFanfare(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const chords = [
      [523.25, 659.25, 783.99],       // C Major
      [587.33, 739.99, 880.00],       // D Major
      [659.25, 830.61, 987.77],       // E Major
      [1046.50, 1318.51, 1567.98],    // High C Major burst
    ];

    chords.forEach((chord, step) => {
      chord.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + step * 0.14);

        const duration = step === chords.length - 1 ? 0.7 : 0.18;
        gain.gain.setValueAtTime(0.001, ctx.currentTime + step * 0.14);
        gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + step * 0.14 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + step * 0.14 + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + step * 0.14);
        osc.stop(ctx.currentTime + step * 0.14 + duration + 0.05);
      });
    });
  }
}

export const soundFX = new SoundFX();
