precision highp float;

uniform sampler2D uPressure;
uniform sampler2D uVelocity;
uniform vec2 uTexelSize;

varying vec2 vUv;

void main() {
  // Sample pressure neighbors
  float pL = texture2D(uPressure, vUv - vec2(uTexelSize.x, 0.0)).r;
  float pR = texture2D(uPressure, vUv + vec2(uTexelSize.x, 0.0)).r;
  float pB = texture2D(uPressure, vUv - vec2(0.0, uTexelSize.y)).r;
  float pT = texture2D(uPressure, vUv + vec2(0.0, uTexelSize.y)).r;

  // Gradient of pressure
  vec2 grad = 0.5 * vec2(pR - pL, pT - pB);

  // Decode velocity, subtract gradient, re-encode
  vec2 vel = (texture2D(uVelocity, vUv).rg - 0.5) * 2.0;
  vel -= grad;

  gl_FragColor = vec4(vel * 0.5 + 0.5, 0.0, 1.0);
}
