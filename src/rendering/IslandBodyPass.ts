import * as THREE from 'three';
import { CONFIG } from '../config';
import { Island } from '../island/Island';
import islandBodyFragRaw from './shaders/islandBody.frag';
import { injectNoise } from './shaders/injectNoise';

const islandBodyFrag = injectNoise(islandBodyFragRaw);

const MAX_ISLANDS = 24;

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

export class IslandBodyPass {
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
      fragmentShader: islandBodyFrag,
      uniforms: {
        uPrevBody: { value: null },
        uFlowField: { value: null },
        uTexelSize: { value: new THREE.Vector2(1 / width, 1 / height) },
        uTime: { value: 0 },
        uErodeRate: { value: CONFIG.island.erodeRate },
        uIslandCount: { value: 0 },
        uIslandPos: { value: new Array(MAX_ISLANDS).fill(null).map(() => new THREE.Vector2()) },
        uIslandRadius: { value: new Float32Array(MAX_ISLANDS) },
        uIslandElongation: { value: new Float32Array(MAX_ISLANDS) },
        uIslandRotation: { value: new Float32Array(MAX_ISLANDS) },
        uIslandColor: { value: new Array(MAX_ISLANDS).fill(null).map(() => new THREE.Vector3()) },
        uIslandEmerge: { value: new Float32Array(MAX_ISLANDS) },
        uIslandEroding: { value: new Float32Array(MAX_ISLANDS) },
        uResolution: { value: new THREE.Vector2(width, height) },
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
    islands: readonly Island[],
    flowFieldTex: THREE.WebGLRenderTarget,
    time: number,
    renderer: THREE.WebGLRenderer,
  ): void {
    const prev = this.current;
    const next = 1 - this.current;

    const u = this.material.uniforms;
    u.uPrevBody.value = this.targets[prev].texture;
    u.uFlowField.value = flowFieldTex.texture;
    u.uTime.value = time;
    u.uIslandCount.value = islands.length;

    for (let i = 0; i < MAX_ISLANDS; i++) {
      if (i < islands.length) {
        const isl = islands[i];
        (u.uIslandPos.value as THREE.Vector2[])[i].set(isl.position[0], isl.position[1]);
        (u.uIslandRadius.value as Float32Array)[i] = isl.radius;
        (u.uIslandElongation.value as Float32Array)[i] = isl.elongation;
        (u.uIslandRotation.value as Float32Array)[i] = isl.rotation;
        (u.uIslandColor.value as THREE.Vector3[])[i].set(isl.color[0], isl.color[1], isl.color[2]);
        (u.uIslandEmerge.value as Float32Array)[i] = isl.emergeProgress;
        (u.uIslandEroding.value as Float32Array)[i] = isl.phase === 'eroding' ? 1.0 : 0.0;
      }
    }

    renderer.setRenderTarget(this.targets[next]);
    renderer.render(this.scene, this.camera);

    this.current = next;
  }

  resize(width: number, height: number): void {
    this.targets[0].setSize(width, height);
    this.targets[1].setSize(width, height);
    this.material.uniforms.uTexelSize.value.set(1 / width, 1 / height);
    this.material.uniforms.uResolution.value.set(width, height);
  }
}
