const audioUrl = new URL('../../assets/MoonRiver_32x.mp3', import.meta.url);

const ICON_UNMUTED = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;

const ICON_MUTED = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`;

export class AudioManager {
  private audio: HTMLAudioElement | null = null;
  private muted = false;
  private button: HTMLButtonElement | null = null;

  start(): void {
    if (this.audio) return;

    this.audio = new Audio(audioUrl.href);
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

    requestAnimationFrame(() => btn.classList.add('visible'));
  }

  private updateButtonLabel(): void {
    if (!this.button) return;
    this.button.innerHTML = this.muted ? ICON_MUTED : ICON_UNMUTED;
  }
}
