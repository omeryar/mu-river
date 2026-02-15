precision highp float;

uniform sampler2D uX;        // current solution (x)
uniform sampler2D uB;        // right-hand side (b)
uniform sampler2D uObstacles; // obstacle mask (A > 0.5 = solid)
uniform vec2 uTexelSize;
uniform float uAlpha;
uniform float uInvBeta;

varying vec2 vUv;

void main() {
  vec4 xC = texture2D(uX, vUv);

  // Sample 4 neighbors of x; use center pressure for solid neighbors (Neumann BC)
  vec4 xL = texture2D(uX, vUv - vec2(uTexelSize.x, 0.0));
  vec4 xR = texture2D(uX, vUv + vec2(uTexelSize.x, 0.0));
  vec4 xB = texture2D(uX, vUv - vec2(0.0, uTexelSize.y));
  vec4 xT = texture2D(uX, vUv + vec2(0.0, uTexelSize.y));

  float oL = texture2D(uObstacles, vUv - vec2(uTexelSize.x, 0.0)).a;
  float oR = texture2D(uObstacles, vUv + vec2(uTexelSize.x, 0.0)).a;
  float oB = texture2D(uObstacles, vUv - vec2(0.0, uTexelSize.y)).a;
  float oT = texture2D(uObstacles, vUv + vec2(0.0, uTexelSize.y)).a;

  // If neighbor is solid, use center cell pressure (zero gradient at wall)
  if (oL > 0.5) xL = xC;
  if (oR > 0.5) xR = xC;
  if (oB > 0.5) xB = xC;
  if (oT > 0.5) xT = xC;

  vec4 bC = texture2D(uB, vUv);

  // Jacobi iteration: x_new = (xL + xR + xB + xT + alpha * bC) / beta
  gl_FragColor = (xL + xR + xB + xT + uAlpha * bC) * uInvBeta;
}
