import * as THREE from 'three';
import { CONFIG } from '../config';
import flowFieldFragRaw from '../rendering/shaders/flowField.frag';
import { injectNoise } from '../rendering/shaders/injectNoise';

const flowFieldFrag = injectNoise(flowFieldFragRaw);

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

export interface IFlowField {
  getTexture(): THREE.WebGLRenderTarget;
  update(time: number, renderer: THREE.WebGLRenderer): void;
  resize(width: number, height: number): void;
}

export class FlowField implements IFlowField {
  private renderTarget: THREE.WebGLRenderTarget;
  private material: THREE.ShaderMaterial;
  private scene: THREE.Scene;
  private camera: THREE.Camera;

  constructor(width: number, height: number) {
    this.renderTarget = new THREE.WebGLRenderTarget(width, height, {
      type: THREE.FloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });

    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: flowFieldFrag,
      uniforms: {
        uTime: { value: 0 },
        uBaseSpeed: { value: CONFIG.flow.baseSpeed },
        uCurlScale: { value: CONFIG.flow.curlScale },
        uCurlStrength: { value: CONFIG.flow.curlStrength },
        uTimeScale: { value: CONFIG.flow.timeScale },
        uResolution: { value: new THREE.Vector2(width, height) },
      },
    });

    this.scene = new THREE.Scene();
    this.camera = new THREE.Camera();
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.scene.add(quad);
  }

  getTexture(): THREE.WebGLRenderTarget {
    return this.renderTarget;
  }

  update(time: number, renderer: THREE.WebGLRenderer): void {
    this.material.uniforms.uTime.value = time;
    renderer.setRenderTarget(this.renderTarget);
    renderer.render(this.scene, this.camera);
  }

  resize(width: number, height: number): void {
    this.renderTarget.setSize(width, height);
    this.material.uniforms.uResolution.value.set(width, height);
  }
}
