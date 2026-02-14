const AUDIO_SRC = 'assets/MoonRiver_32x.mp3';

export class AudioManager {
  private audio: HTMLAudioElement | null = null;
  private muted = false;
  private button: HTMLButtonElement | null = null;

  start(): void {
    if (this.audio) return;

    this.audio = new Audio(AUDIO_SRC);
    this.audio.loop = true;
    this.audio.play();

    this.createMuteButton();
  }

  toggle(): void {
    if (!this.audio) return;
    this.muted = !this.muted;
    this.audio.muted = this.muted;
    this.updateButtonLabel();
  }

  isMuted(): boolean {
    return this.muted;
  }

  private createMuteButton(): void {
    const btn = document.createElement('button');
    btn.id = 'mute-btn';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });
    document.body.appendChild(btn);
    this.button = btn;
    this.updateButtonLabel();

    // Fade in
    requestAnimationFrame(() => btn.classList.add('visible'));
  }

  private updateButtonLabel(): void {
    if (!this.button) return;
    this.button.textContent = this.muted ? '\u{1F507}' : '\u{1F509}';
  }
}
