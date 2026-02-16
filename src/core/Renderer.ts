import * as THREE from 'three';
import { CONFIG } from '../config';
import { NavierStokesField } from '../simulation/NavierStokesField';
import { IslandManager } from '../island/IslandManager';
import { IslandBodyPass } from '../rendering/IslandBodyPass';
import { PigmentPass } from '../rendering/PigmentPass';
import { CompositePass } from '../rendering/CompositePass';
import { InputHandler } from '../input/InputHandler';
import { AudioManager } from '../audio/AudioManager';

const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

export class Renderer {
  private threeRenderer: THREE.WebGLRenderer;
  private flowField: NavierStokesField;
  private islandManager: IslandManager;
  private islandBodyPass: IslandBodyPass;
  private pigmentPass: PigmentPass;
  private compositePass: CompositePass;
  private inputHandler: InputHandler;
  private audioManager: AudioManager;
  private clock: THREE.Clock;
  private frameBudget: number;
  private lastRenderTime = 0;

  constructor() {
    this.threeRenderer = new THREE.WebGLRenderer({ antialias: false });
    this.threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.threeRenderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.threeRenderer.domElement);

    // 30fps cap on mobile, uncapped on desktop
    this.frameBudget = isMobile ? 1000 / 30 : 0;

    const w = Math.floor(window.innerWidth * CONFIG.simScale);
    const h = Math.floor(window.innerHeight * CONFIG.simScale);
    const fw = Math.floor(window.innerWidth * CONFIG.flowScale);
    const fh = Math.floor(window.innerHeight * CONFIG.flowScale);

    this.flowField = new NavierStokesField(fw, fh);
    this.islandManager = new IslandManager();
    this.islandBodyPass = new IslandBodyPass(w, h);
    this.pigmentPass = new PigmentPass(w, h);
    this.compositePass = new CompositePass();

    this.audioManager = new AudioManager();
    this.clock = new THREE.Clock();

    // Initialize dark mode from system preference
    const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.applyDarkMode(darkQuery.matches);
    darkQuery.addEventListener('change', (e) => this.applyDarkMode(e.matches));

    const canvas = this.threeRenderer.domElement;
    this.inputHandler = new InputHandler(canvas, {
      onPress: (uv) => {
        this.islandManager.switchToActive();
        this.islandManager.resetInactivityTimer();
        const spawned = this.islandManager.spawnAtPosition(uv);
        if (!spawned) {
          // Show rejection ripple at screen position
          const screenX = uv[0] * canvas.clientWidth;
          const screenY = (1 - uv[1]) * canvas.clientHeight;
          this.showRejectRipple(screenX, screenY);
        }
      },
      onHoldUpdate: () => {
        this.islandManager.resetInactivityTimer();
      },
      onRelease: (_uv, _duration) => {
        this.islandManager.releaseHoldingIsland();
        this.islandManager.resetInactivityTimer();
      },
      onTripleTap: () => {
        this.applyDarkMode(!this.compositePass.isDarkMode());
      },
    });

    window.addEventListener('resize', this.onResize);
  }

  private applyDarkMode(on: boolean): void {
    this.compositePass.setDarkMode(on);
    const color = on ? '#0f0d14' : '#f2ede6';
    document.body.style.background = color;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', color);
  }

  private showRejectRipple(x: number, y: number): void {
    const el = document.createElement('div');
    el.className = 'reject-ripple';
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }

  private onResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.threeRenderer.setSize(width, height);

    const w = Math.floor(width * CONFIG.simScale);
    const h = Math.floor(height * CONFIG.simScale);
    const fw = Math.floor(width * CONFIG.flowScale);
    const fh = Math.floor(height * CONFIG.flowScale);
    this.flowField.resize(fw, fh);
    this.islandBodyPass.resize(w, h);
    this.pigmentPass.resize(w, h);
  };

  start(): void {
    const animate = (): void => {
      requestAnimationFrame(animate);

      // Throttle frame rate on mobile
      if (this.frameBudget > 0) {
        const now = performance.now();
        if (now - this.lastRenderTime < this.frameBudget) return;
        this.lastRenderTime = now;
      }

      const dt = Math.min(this.clock.getDelta(), 0.05);
      const time = this.clock.elapsedTime;

      // 1. Update island lifecycle (CPU) + grow held island
      this.islandManager.updateHoldingIsland(dt);
      this.islandManager.update(dt);

      // 2. Generate flow field (pass obstacle data from island body)
      this.flowField.setObstacles(this.islandBodyPass.getTexture().texture);
      this.flowField.update(time, this.threeRenderer);

      // 3. Update island body (stamp emerging + erode existing)
      this.islandBodyPass.update(
        this.islandManager.getIslands(),
        this.flowField.getTexture(),
        time,
        this.threeRenderer,
      );

      // 4. Advect pigment (reads body texture for emission + blocking)
      this.pigmentPass.update(
        this.flowField.getTexture(),
        this.islandBodyPass.getTexture(),
        dt,
        this.threeRenderer,
      );

      // 5. Composite to screen
      this.compositePass.render(
        this.pigmentPass.getTexture(),
        this.islandBodyPass.getTexture(),
        this.threeRenderer,
      );

      // 6. Update audio voices to match island state
      this.audioManager.update(this.islandManager.getIslands(), dt);
    };

    animate();
  }
}
