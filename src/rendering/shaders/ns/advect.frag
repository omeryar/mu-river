precision highp float;

uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 uTexelSize;
uniform float uDt;

varying vec2 vUv;

void main() {
  // Decode velocity from [0,1] to [-1,1]
  vec2 vel = (texture2D(uVelocity, vUv).rg - 0.5) * 2.0;

  // Semi-Lagrangian: trace backward along velocity
  vec2 sourceUv = vUv - vel * uTexelSize * uDt;

  gl_FragColor = texture2D(uSource, sourceUv);
}
