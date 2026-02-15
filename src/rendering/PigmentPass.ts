import * as THREE from 'three';
import { CONFIG } from '../config';
import pigmentAdvectFragRaw from './shaders/pigmentAdvect.frag';
import { injectNoise } from './shaders/injectNoise';

const pigmentAdvectFrag = injectNoise(pigmentAdvectFragRaw);

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

export class PigmentPass {
  private targets: [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget];
  private current = 0;
  private material: THREE.ShaderMaterial;
  private scene: THREE.Scene;
  private camera: THREE.Camera;

  constructor(width: number, height: number) {
    const opts: THREE.RenderTargetOptions = {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    };
    this.targets = [
      new THREE.WebGLRenderTarget(width, height, opts),
      new THREE.WebGLRenderTarget(width, height, opts),
    ];

    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: pigmentAdvectFrag,
      uniforms: {
        uPrevPigment: { value: null },
        uFlowField: { value: null },
        uIslandStamp: { value: null },
        uAdvectionStrength: { value: CONFIG.pigment.advectionStrength },
        uDiffusion: { value: CONFIG.pigment.diffusion },
        uDecay: { value: CONFIG.pigment.decay },
        uDt: { value: 0 },
        uTexelSize: { value: new THREE.Vector2(1 / width, 1 / height) },
        uTime: { value: 0 },
      },
    });

    this.scene = new THREE.Scene();
    this.camera = new THREE.Camera();
    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material));
  }

  getTexture(): THREE.WebGLRenderTarget {
    return this.targets[this.current];
  }

  update(
    flowFieldTex: THREE.WebGLRenderTarget,
    islandStampTex: THREE.WebGLRenderTarget,
    dt: number,
    renderer: THREE.WebGLRenderer,
    time: number = 0,
  ): void {
    const prev = this.current;
    const next = 1 - this.current;

    const u = this.material.uniforms;
    u.uPrevPigment.value = this.targets[prev].texture;
    u.uFlowField.value = flowFieldTex.texture;
    u.uIslandStamp.value = islandStampTex.texture;
    u.uDt.value = dt;
    u.uTime.value = time;

    renderer.setRenderTarget(this.targets[next]);
    renderer.render(this.scene, this.camera);

    this.current = next;
  }

  resize(width: number, height: number): void {
    this.targets[0].setSize(width, height);
    this.targets[1].setSize(width, height);
    this.material.uniforms.uTexelSize.value.set(1 / width, 1 / height);
  }
}
