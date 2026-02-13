import * as THREE from 'three';
import { CONFIG } from '../config';
import { FlowField } from '../simulation/FlowField';
import { IslandManager } from '../island/IslandManager';
import { IslandBodyPass } from '../rendering/IslandBodyPass';
import { PigmentPass } from '../rendering/PigmentPass';
import { CompositePass } from '../rendering/CompositePass';

export class Renderer {
  private threeRenderer: THREE.WebGLRenderer;
  private flowField: FlowField;
  private islandManager: IslandManager;
  private islandBodyPass: IslandBodyPass;
  private pigmentPass: PigmentPass;
  private compositePass: CompositePass;
  private clock: THREE.Clock;

  constructor() {
    this.threeRenderer = new THREE.WebGLRenderer({ antialias: false });
    this.threeRenderer.setPixelRatio(window.devicePixelRatio);
    this.threeRenderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.threeRenderer.domElement);

    const w = Math.floor(window.innerWidth * CONFIG.simScale);
    const h = Math.floor(window.innerHeight * CONFIG.simScale);

    this.flowField = new FlowField(w, h);
    this.islandManager = new IslandManager();
    this.islandBodyPass = new IslandBodyPass(w, h);
    this.pigmentPass = new PigmentPass(w, h);
    this.compositePass = new CompositePass();

    this.clock = new THREE.Clock();

    window.addEventListener('resize', this.onResize);
  }

  private onResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.threeRenderer.setSize(width, height);

    const w = Math.floor(width * CONFIG.simScale);
    const h = Math.floor(height * CONFIG.simScale);
    this.flowField.resize(w, h);
    this.islandBodyPass.resize(w, h);
    this.pigmentPass.resize(w, h);
  };

  start(): void {
    const animate = (): void => {
      requestAnimationFrame(animate);

      const dt = Math.min(this.clock.getDelta(), 0.05);
      const time = this.clock.elapsedTime;

      // 1. Update island lifecycle (CPU)
      this.islandManager.update(dt);

      // 2. Generate flow field
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
    };

    animate();
  }
}
