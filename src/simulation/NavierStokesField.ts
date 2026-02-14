import * as THREE from 'three';
import { CONFIG } from '../config';
import { IFlowField } from './FlowField';
import advectFrag from '../rendering/shaders/ns/advect.frag';
import jacobiFrag from '../rendering/shaders/ns/jacobi.frag';
import divergenceFrag from '../rendering/shaders/ns/divergence.frag';
import gradientFrag from '../rendering/shaders/ns/gradient.frag';
import boundaryFragRaw from '../rendering/shaders/ns/boundary.frag';
import { injectNoise } from '../rendering/shaders/injectNoise';

const boundaryFrag = injectNoise(boundaryFragRaw);

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

function createRT(w: number, h: number): THREE.WebGLRenderTarget {
  return new THREE.WebGLRenderTarget(w, h, {
    type: THREE.FloatType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
  });
}

function createPass(frag: string, uniforms: Record<string, THREE.IUniform>) {
  const material = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: frag,
    uniforms,
  });
  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
  return { material, scene, camera };
}

export class NavierStokesField implements IFlowField {
  private width: number;
  private height: number;
  private texelSize: THREE.Vector2;

  // Ping-pong velocity buffers
  private velocity: [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget];
  private velIdx = 0;

  // Ping-pong pressure buffers
  private pressure: [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget];
  private presIdx = 0;

  // Divergence buffer (single)
  private divergenceRT: THREE.WebGLRenderTarget;

  // Obstacle texture (set externally)
  private obstacleTexture: THREE.Texture | null = null;
  private dummyObstacle: THREE.WebGLRenderTarget;

  // Shader passes
  private advectPass;
  private jacobiPass;
  private divergencePass;
  private gradientPass;
  private boundaryPass;

  private initialized = false;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.texelSize = new THREE.Vector2(1.0 / width, 1.0 / height);

    this.velocity = [createRT(width, height), createRT(width, height)];
    this.pressure = [createRT(width, height), createRT(width, height)];
    this.divergenceRT = createRT(width, height);
    this.dummyObstacle = createRT(1, 1);

    const ns = CONFIG.navierStokes;
    const ts = { value: this.texelSize };

    this.advectPass = createPass(advectFrag, {
      uVelocity: { value: null },
      uSource: { value: null },
      uTexelSize: ts,
      uDt: { value: 0 },
    });

    this.jacobiPass = createPass(jacobiFrag, {
      uX: { value: null },
      uB: { value: null },
      uTexelSize: ts,
      uAlpha: { value: 0 },
      uInvBeta: { value: 0 },
    });

    this.divergencePass = createPass(divergenceFrag, {
      uVelocity: { value: null },
      uTexelSize: ts,
    });

    this.gradientPass = createPass(gradientFrag, {
      uPressure: { value: null },
      uVelocity: { value: null },
      uTexelSize: ts,
    });

    this.boundaryPass = createPass(boundaryFrag, {
      uVelocity: { value: null },
      uObstacles: { value: null },
      uTexelSize: ts,
      uBaseSpeed: { value: ns.baseSpeed },
      uCurlStrength: { value: ns.curlStrength },
      uCurlScale: { value: CONFIG.flow.curlScale },
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(width, height) },
      uForceBlend: { value: ns.forceBlend },
    });
  }

  setObstacles(texture: THREE.Texture): void {
    this.obstacleTexture = texture;
  }

  getTexture(): THREE.WebGLRenderTarget {
    return this.velocity[this.velIdx];
  }

  private renderPass(
    pass: ReturnType<typeof createPass>,
    target: THREE.WebGLRenderTarget,
    renderer: THREE.WebGLRenderer,
  ): void {
    renderer.setRenderTarget(target);
    renderer.render(pass.scene, pass.camera);
  }

  private swapVelocity(): void {
    this.velIdx = 1 - this.velIdx;
  }

  private swapPressure(): void {
    this.presIdx = 1 - this.presIdx;
  }

  private get velRead() {
    return this.velocity[this.velIdx];
  }
  private get velWrite() {
    return this.velocity[1 - this.velIdx];
  }
  private get presRead() {
    return this.pressure[this.presIdx];
  }
  private get presWrite() {
    return this.pressure[1 - this.presIdx];
  }

  private initializeVelocity(renderer: THREE.WebGLRenderer): void {
    // Seed velocity field with base upward flow using boundary pass with strong blend
    const bu = this.boundaryPass.material.uniforms;
    const savedBlend = bu.uForceBlend.value;
    bu.uForceBlend.value = 1.0; // Full blend to set velocity directly
    bu.uVelocity.value = this.velocity[0].texture;
    bu.uObstacles.value = this.dummyObstacle.texture;
    bu.uTime.value = 0;
    this.renderPass(this.boundaryPass, this.velocity[1], renderer);
    this.velIdx = 1;
    bu.uForceBlend.value = savedBlend;
  }

  update(time: number, renderer: THREE.WebGLRenderer): void {
    if (!this.initialized) {
      this.initializeVelocity(renderer);
      this.initialized = true;
    }

    const ns = CONFIG.navierStokes;
    const dt = ns.timestep;
    const obstacles = this.obstacleTexture ?? this.dummyObstacle.texture;

    // --- Pass 1: Advect velocity (semi-Lagrangian) ---
    const au = this.advectPass.material.uniforms;
    au.uVelocity.value = this.velRead.texture;
    au.uSource.value = this.velRead.texture;
    au.uDt.value = dt;
    this.renderPass(this.advectPass, this.velWrite, renderer);
    this.swapVelocity();

    // (Diffusion skipped — viscosity is negligible for water)

    // --- Pass 2: Apply boundary conditions + external forces ---
    const bu = this.boundaryPass.material.uniforms;
    bu.uVelocity.value = this.velRead.texture;
    bu.uObstacles.value = obstacles;
    bu.uTime.value = time;
    this.renderPass(this.boundaryPass, this.velWrite, renderer);
    this.swapVelocity();

    // --- Pass 3: Pressure projection (enforce incompressibility) ---
    // 3a: Compute divergence
    const du = this.divergencePass.material.uniforms;
    du.uVelocity.value = this.velRead.texture;
    this.renderPass(this.divergencePass, this.divergenceRT, renderer);

    // 3b: Clear pressure
    renderer.setRenderTarget(this.pressure[0]);
    renderer.clear();
    renderer.setRenderTarget(this.pressure[1]);
    renderer.clear();
    this.presIdx = 0;

    // 3c: Jacobi iterations for pressure Poisson equation
    const ju = this.jacobiPass.material.uniforms;
    ju.uAlpha.value = -1.0; // -dx^2
    ju.uInvBeta.value = 0.25; // 1/4
    ju.uB.value = this.divergenceRT.texture;

    for (let i = 0; i < ns.pressureIterations; i++) {
      ju.uX.value = this.presRead.texture;
      this.renderPass(this.jacobiPass, this.presWrite, renderer);
      this.swapPressure();
    }

    // 3d: Subtract pressure gradient from velocity
    const gu = this.gradientPass.material.uniforms;
    gu.uPressure.value = this.presRead.texture;
    gu.uVelocity.value = this.velRead.texture;
    this.renderPass(this.gradientPass, this.velWrite, renderer);
    this.swapVelocity();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.texelSize.set(1.0 / width, 1.0 / height);

    this.velocity[0].setSize(width, height);
    this.velocity[1].setSize(width, height);
    this.pressure[0].setSize(width, height);
    this.pressure[1].setSize(width, height);
    this.divergenceRT.setSize(width, height);

    this.boundaryPass.material.uniforms.uResolution.value.set(width, height);

    this.initialized = false;
  }
}
