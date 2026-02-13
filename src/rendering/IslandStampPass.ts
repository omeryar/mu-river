import * as THREE from 'three';
import { CONFIG } from '../config';
import { Island } from '../island/Island';
import islandStampFragRaw from './shaders/islandStamp.frag';
import { injectNoise } from './shaders/injectNoise';

const islandStampFrag = injectNoise(islandStampFragRaw);

const MAX_ISLANDS = 8;

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

export class IslandStampPass {
  private renderTarget: THREE.WebGLRenderTarget;
  private material: THREE.ShaderMaterial;
  private scene: THREE.Scene;
  private camera: THREE.Camera;

  constructor(width: number, height: number) {
    this.renderTarget = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });

    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: islandStampFrag,
      uniforms: {
        uIslandCount: { value: 0 },
        uIslandPos: { value: new Array(MAX_ISLANDS).fill(null).map(() => new THREE.Vector2()) },
        uIslandRadius: { value: new Float32Array(MAX_ISLANDS) },
        uIslandElongation: { value: new Float32Array(MAX_ISLANDS) },
        uIslandRotation: { value: new Float32Array(MAX_ISLANDS) },
        uIslandColor: { value: new Array(MAX_ISLANDS).fill(null).map(() => new THREE.Vector3()) },
        uIslandEmerge: { value: new Float32Array(MAX_ISLANDS) },
        uIslandErode: { value: new Float32Array(MAX_ISLANDS) },
        uPigmentIntensity: { value: CONFIG.island.pigmentIntensity },
        uErosionNoise: { value: CONFIG.island.erosionNoise },
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(width, height) },
      },
    });

    this.scene = new THREE.Scene();
    this.camera = new THREE.Camera();
    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material));
  }

  getTexture(): THREE.WebGLRenderTarget {
    return this.renderTarget;
  }

  update(islands: readonly Island[], time: number, renderer: THREE.WebGLRenderer): void {
    const u = this.material.uniforms;
    u.uIslandCount.value = islands.length;
    u.uTime.value = time;

    for (let i = 0; i < MAX_ISLANDS; i++) {
      if (i < islands.length) {
        const isl = islands[i];
        (u.uIslandPos.value as THREE.Vector2[])[i].set(isl.position[0], isl.position[1]);
        (u.uIslandRadius.value as Float32Array)[i] = isl.radius;
        (u.uIslandElongation.value as Float32Array)[i] = isl.elongation;
        (u.uIslandRotation.value as Float32Array)[i] = isl.rotation;
        (u.uIslandColor.value as THREE.Vector3[])[i].set(isl.color[0], isl.color[1], isl.color[2]);
        (u.uIslandEmerge.value as Float32Array)[i] = isl.emergeProgress;
        (u.uIslandErode.value as Float32Array)[i] = isl.erodeProgress;
      }
    }

    renderer.setRenderTarget(this.renderTarget);
    renderer.render(this.scene, this.camera);
  }

  resize(width: number, height: number): void {
    this.renderTarget.setSize(width, height);
    this.material.uniforms.uResolution.value.set(width, height);
  }
}
