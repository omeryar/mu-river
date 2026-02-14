precision highp float;

uniform sampler2D uVelocity;
uniform vec2 uTexelSize;

varying vec2 vUv;

void main() {
  // Sample neighbors (decoded from [0,1] to [-1,1])
  float vL = (texture2D(uVelocity, vUv - vec2(uTexelSize.x, 0.0)).r - 0.5) * 2.0;
  float vR = (texture2D(uVelocity, vUv + vec2(uTexelSize.x, 0.0)).r - 0.5) * 2.0;
  float vB = (texture2D(uVelocity, vUv - vec2(0.0, uTexelSize.y)).g - 0.5) * 2.0;
  float vT = (texture2D(uVelocity, vUv + vec2(0.0, uTexelSize.y)).g - 0.5) * 2.0;

  // Divergence = 0.5 * (du/dx + dv/dy)
  float div = 0.5 * (vR - vL + vT - vB);

  gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
}
