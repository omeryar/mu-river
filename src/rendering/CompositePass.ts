import * as THREE from 'three';
import { CONFIG } from '../config';
import compositeFrag from './shaders/composite.frag';

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

export class CompositePass {
  private material: THREE.ShaderMaterial;
  private scene: THREE.Scene;
  private camera: THREE.Camera;

  constructor() {
    const [r, g, b] = CONFIG.composite.baseColor;
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: compositeFrag,
      uniforms: {
        uPigment: { value: null },
        uIslandStamp: { value: null },
        uBaseColor: { value: new THREE.Vector3(r, g, b) },
        uPigmentOpacity: { value: CONFIG.composite.pigmentOpacity },
      },
    });

    this.scene = new THREE.Scene();
    this.camera = new THREE.Camera();
    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material));
  }

  render(pigmentTex: THREE.WebGLRenderTarget, islandStampTex: THREE.WebGLRenderTarget, renderer: THREE.WebGLRenderer): void {
    this.material.uniforms.uPigment.value = pigmentTex.texture;
    this.material.uniforms.uIslandStamp.value = islandStampTex.texture;
    renderer.setRenderTarget(null); // render to screen
    renderer.render(this.scene, this.camera);
  }
}
