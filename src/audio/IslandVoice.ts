import { Island } from '../island/Island';
import { colorToNote, colorToTimbre } from './scales';

// Post-fade duration: how long the voice lingers after the island is gone,
// matching the pigment plume dissipation (~decay 0.999/frame at 60fps).
const POST_FADE_DURATION = 15; // seconds

export class IslandVoice {
  readonly islandId: number;
  private ctx: AudioContext;
  private oscillator: OscillatorNode;
  private oscillator2: OscillatorNode | null = null;
  private gainNode: GainNode;
  private dryGain: GainNode;
  private wetGain: GainNode;
  private filter: BiquadFilterNode | null = null;
  private stopped = false;
  private postFading = false;
  private postFadeElapsed = 0;
  private lastGain = 0; // gain at moment post-fade began

  constructor(
    island: Island,
    ctx: AudioContext,
    dryDest: AudioNode,
    wetDest: AudioNode,
  ) {
    this.islandId = island.id;
    this.ctx = ctx;

    const freq = colorToNote(island.color);
    const timbre = colorToTimbre(island.color);

    // Gain node (starts at 0 for attack)
    this.gainNode = ctx.createGain();
    this.gainNode.gain.setValueAtTime(0, ctx.currentTime);

    // Per-voice dry/wet sends for reverb crossfade
    this.dryGain = ctx.createGain();
    this.dryGain.gain.setValueAtTime(1, ctx.currentTime);
    this.wetGain = ctx.createGain();
    this.wetGain.gain.setValueAtTime(0.2, ctx.currentTime);

    // Primary oscillator
    this.oscillator = ctx.createOscillator();
    this.oscillator.type = timbre.type;
    this.oscillator.frequency.setValueAtTime(freq, ctx.currentTime);

    // Optional second oscillator for detuned beating
    if (timbre.detune > 0) {
      this.oscillator2 = ctx.createOscillator();
      this.oscillator2.type = timbre.type;
      this.oscillator2.frequency.setValueAtTime(freq + timbre.detune, ctx.currentTime);
    }

    // Optional low-pass filter
    if (timbre.filterCutoff !== null) {
      this.filter = ctx.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.filter.frequency.setValueAtTime(timbre.filterCutoff, ctx.currentTime);
      this.filter.Q.setValueAtTime(1, ctx.currentTime);
    }

    // Connect chain: osc(s) → filter? → gain → dry/wet → destinations
    const preGain = this.filter || this.gainNode;
    this.oscillator.connect(preGain);
    if (this.oscillator2) this.oscillator2.connect(preGain);
    if (this.filter) this.filter.connect(this.gainNode);
    this.gainNode.connect(this.dryGain);
    this.gainNode.connect(this.wetGain);
    this.dryGain.connect(dryDest);
    this.wetGain.connect(wetDest);

    // Start oscillators
    this.oscillator.start();
    if (this.oscillator2) this.oscillator2.start();
  }

  /**
   * Update the voice's gain and dry/wet mix based on island lifecycle.
   * Called each frame while the island exists.
   */
  update(island: Island): void {
    if (this.stopped || this.postFading) return;

    // Base gain proportional to island radius (clamped)
    const radiusGain = Math.min(island.radius * 8, 1.0);

    let envelope = 1.0;
    let wetMix = 0.2;

    if (island.phase === 'emerging') {
      // Smooth attack curve
      envelope = island.emergeProgress * island.emergeProgress;
      wetMix = 0.2;
    } else if (island.phase === 'eroding') {
      // During erosion: gain fades gently, reverb increases
      const remaining = 1 - island.erodeProgress;
      // Slower fade — the plume is still very visible during erosion
      envelope = 0.3 + 0.7 * remaining;
      // Shift toward wet as erosion progresses
      wetMix = 0.2 + 0.6 * island.erodeProgress;
    }

    const targetGain = radiusGain * envelope * 0.12;
    this.lastGain = targetGain;

    this.gainNode.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.1);
    this.dryGain.gain.setTargetAtTime(1 - wetMix, this.ctx.currentTime, 0.3);
    this.wetGain.gain.setTargetAtTime(wetMix, this.ctx.currentTime, 0.3);
  }

  /**
   * Begin post-fade: the island is gone but plume pigment is still visible.
   * Slowly fade gain to 0 and shift fully to reverb.
   */
  beginPostFade(): void {
    if (this.stopped || this.postFading) return;
    this.postFading = true;
    this.postFadeElapsed = 0;

    // Capture current gain as starting point
    this.lastGain = this.lastGain || 0.01;

    // Shift fully to reverb
    this.dryGain.gain.setTargetAtTime(0.1, this.ctx.currentTime, 1.0);
    this.wetGain.gain.setTargetAtTime(0.9, this.ctx.currentTime, 1.0);
  }

  /**
   * Tick the post-fade. Returns true when fully faded and ready for cleanup.
   */
  updatePostFade(dt: number): boolean {
    if (this.stopped) return true;
    if (!this.postFading) return false;

    this.postFadeElapsed += dt;
    const t = Math.min(this.postFadeElapsed / POST_FADE_DURATION, 1);

    // Exponential decay matching pigment dissipation
    const fade = this.lastGain * Math.pow(1 - t, 2);
    this.gainNode.gain.setTargetAtTime(fade, this.ctx.currentTime, 0.2);

    if (t >= 1) {
      this.stop();
      return true;
    }
    return false;
  }

  get isFading(): boolean {
    return this.postFading;
  }

  /**
   * Immediately stop and clean up all audio nodes.
   */
  stop(): void {
    if (this.stopped) return;
    this.stopped = true;

    const now = this.ctx.currentTime;
    this.gainNode.gain.cancelScheduledValues(now);
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
    this.gainNode.gain.linearRampToValueAtTime(0, now + 0.3);

    setTimeout(() => {
      try {
        this.oscillator.stop();
        this.oscillator.disconnect();
        if (this.oscillator2) {
          this.oscillator2.stop();
          this.oscillator2.disconnect();
        }
        if (this.filter) this.filter.disconnect();
        this.gainNode.disconnect();
        this.dryGain.disconnect();
        this.wetGain.disconnect();
      } catch {
        // nodes may already be disconnected
      }
    }, 400);
  }
}
