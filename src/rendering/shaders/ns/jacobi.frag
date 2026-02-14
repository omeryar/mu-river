precision highp float;

uniform sampler2D uX;        // current solution (x)
uniform sampler2D uB;        // right-hand side (b)
uniform vec2 uTexelSize;
uniform float uAlpha;
uniform float uInvBeta;

varying vec2 vUv;

void main() {
  // Sample 4 neighbors of x
  vec4 xL = texture2D(uX, vUv - vec2(uTexelSize.x, 0.0));
  vec4 xR = texture2D(uX, vUv + vec2(uTexelSize.x, 0.0));
  vec4 xB = texture2D(uX, vUv - vec2(0.0, uTexelSize.y));
  vec4 xT = texture2D(uX, vUv + vec2(0.0, uTexelSize.y));

  vec4 bC = texture2D(uB, vUv);

  // Jacobi iteration: x_new = (xL + xR + xB + xT + alpha * bC) / beta
  gl_FragColor = (xL + xR + xB + xT + uAlpha * bC) * uInvBeta;
}
