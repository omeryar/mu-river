const audioUrl = new URL('../../assets/MoonRiver_32x.mp3', import.meta.url);

const ICON_UNMUTED = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;

const ICON_MUTED = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`;

export class AudioManager {
  private audio: HTMLAudioElement | null = null;
  private playing = false;
  private button: HTMLButtonElement;
  private slider: HTMLInputElement;
  private sliderWrap: HTMLDivElement;
  private volume = 0.5;

  constructor() {
    this.button = this.createMuteButton();
    this.sliderWrap = this.createSlider();
  }

  private toggle(): void {
    if (!this.playing) {
      // First time or resuming — create audio element if needed
      if (!this.audio) {
        this.audio = new Audio(audioUrl.href);
        this.audio.loop = true;
        this.audio.volume = this.volume;
      }
      this.audio.play();
      this.playing = true;
      this.sliderWrap.classList.add('visible');
    } else {
      this.audio!.pause();
      this.playing = false;
      this.sliderWrap.classList.remove('visible');
    }
    this.updateButtonLabel();
  }

  private createMuteButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.id = 'mute-btn';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });
    document.body.appendChild(btn);
    this.updateButtonLabelOn(btn, false);

    // Show immediately
    requestAnimationFrame(() => btn.classList.add('visible'));
    return btn;
  }

  private createSlider(): HTMLDivElement {
    const wrap = document.createElement('div');
    wrap.id = 'volume-wrap';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '1';
    slider.step = '0.01';
    slider.value = String(this.volume);
    slider.id = 'volume-slider';

    slider.addEventListener('input', (e) => {
      e.stopPropagation();
      this.volume = parseFloat(slider.value);
      if (this.audio) this.audio.volume = this.volume;
    });
    // Prevent touch events from propagating to canvas
    slider.addEventListener('pointerdown', (e) => e.stopPropagation());
    slider.addEventListener('touchstart', (e) => e.stopPropagation());

    wrap.appendChild(slider);
    document.body.appendChild(wrap);
    this.slider = slider;
    return wrap;
  }

  private updateButtonLabel(): void {
    this.updateButtonLabelOn(this.button, this.playing);
  }

  private updateButtonLabelOn(btn: HTMLButtonElement, playing: boolean): void {
    btn.innerHTML = playing ? ICON_UNMUTED : ICON_MUTED;
  }
}
