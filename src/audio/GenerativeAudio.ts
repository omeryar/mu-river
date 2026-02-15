import { Island } from '../island/Island';
import { IslandVoice } from './IslandVoice';

export class GenerativeAudio {
  private ctx: AudioContext;
  private masterGain: GainNode;
  private reverbGain: GainNode;
  private dryGain: GainNode;
  private convolver: ConvolverNode;
  private droneOsc: OscillatorNode | null = null;
  private droneGain: GainNode;
  private voices = new Map<number, IslandVoice>();
  private volume = 0.5;
  private lastDt = 1 / 60;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;

    // Master gain (user volume control)
    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.volume, ctx.currentTime);
    this.masterGain.connect(ctx.destination);

    // Reverb send: convolver with generated impulse
    this.convolver = ctx.createConvolver();
    this.convolver.buffer = this.createImpulseResponse(3.0, 2.0);
    this.reverbGain = ctx.createGain();
    this.reverbGain.gain.setValueAtTime(0.3, ctx.currentTime);
    this.convolver.connect(this.reverbGain);
    this.reverbGain.connect(this.masterGain);

    // Dry path
    this.dryGain = ctx.createGain();
    this.dryGain.gain.setValueAtTime(0.7, ctx.currentTime);
    this.dryGain.connect(this.masterGain);

    // Background drone
    this.droneGain = ctx.createGain();
    this.droneGain.gain.setValueAtTime(0, ctx.currentTime);
    this.droneGain.connect(this.masterGain);
  }

  private createImpulseResponse(duration: number, decay: number): AudioBuffer {
    const rate = this.ctx.sampleRate;
    const length = rate * duration;
    const buffer = this.ctx.createBuffer(2, length, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return buffer;
  }

  /**
   * Start the background drone. Must be called within a user gesture on iOS.
   */
  startDrone(): void {
    if (this.droneOsc) return;
    this.droneOsc = this.ctx.createOscillator();
    this.droneOsc.type = 'sine';
    this.droneOsc.frequency.setValueAtTime(65.41, this.ctx.currentTime); // C2
    this.droneOsc.connect(this.droneGain);
    this.droneOsc.start();
  }

  /**
   * Sync voices with current island state. Called each frame.
   */
  update(islands: readonly Island[], dt?: number): void {
    if (dt !== undefined) this.lastDt = dt;

    const activeIds = new Set<number>();

    for (const island of islands) {
      if (island.phase === 'done') continue;
      activeIds.add(island.id);

      let voice = this.voices.get(island.id);
      if (!voice) {
        // Each voice gets separate dry and wet (convolver) destinations
        voice = new IslandVoice(island, this.ctx, this.dryGain, this.convolver);
        this.voices.set(island.id, voice);
      }
      voice.update(island);
    }

    // Handle voices whose islands have disappeared
    const toDelete: number[] = [];
    for (const [id, voice] of this.voices) {
      if (activeIds.has(id)) continue;

      if (!voice.isFading) {
        // Island just disappeared — begin the plume tail
        voice.beginPostFade();
      }

      // Tick the post-fade; clean up when done
      const done = voice.updatePostFade(this.lastDt);
      if (done) {
        toDelete.push(id);
      }
    }
    for (const id of toDelete) {
      this.voices.delete(id);
    }

    // Drone: louder when no voices active, quieter when voices present
    const anyActive = this.voices.size > 0;
    const droneTarget = anyActive ? 0.015 : 0.06;
    this.droneGain.gain.setTargetAtTime(droneTarget, this.ctx.currentTime, 0.5);
  }

  setVolume(v: number): void {
    this.volume = v;
    this.masterGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }

  stop(): void {
    for (const [id, voice] of this.voices) {
      voice.stop();
      this.voices.delete(id);
    }
    if (this.droneOsc) {
      this.droneOsc.stop();
      this.droneOsc.disconnect();
      this.droneOsc = null;
    }
    this.droneGain.gain.setValueAtTime(0, this.ctx.currentTime);
  }
}
