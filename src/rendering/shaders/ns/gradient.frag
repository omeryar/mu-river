precision highp float;

uniform sampler2D uPressure;
uniform sampler2D uVelocity;
uniform sampler2D uObstacles; // obstacle mask (A > 0.5 = solid)
uniform vec2 uTexelSize;

varying vec2 vUv;

void main() {
  float oC = texture2D(uObstacles, vUv).a;

  // Inside solid: zero velocity
  if (oC > 0.5) {
    gl_FragColor = vec4(0.5, 0.5, 0.0, 1.0); // encoded zero velocity
    return;
  }

  float pC = texture2D(uPressure, vUv).r;

  // Sample pressure neighbors; use center pressure for solid neighbors
  float pL = texture2D(uPressure, vUv - vec2(uTexelSize.x, 0.0)).r;
  float pR = texture2D(uPressure, vUv + vec2(uTexelSize.x, 0.0)).r;
  float pB = texture2D(uPressure, vUv - vec2(0.0, uTexelSize.y)).r;
  float pT = texture2D(uPressure, vUv + vec2(0.0, uTexelSize.y)).r;

  float oL = texture2D(uObstacles, vUv - vec2(uTexelSize.x, 0.0)).a;
  float oR = texture2D(uObstacles, vUv + vec2(uTexelSize.x, 0.0)).a;
  float oB = texture2D(uObstacles, vUv - vec2(0.0, uTexelSize.y)).a;
  float oT = texture2D(uObstacles, vUv + vec2(0.0, uTexelSize.y)).a;

  if (oL > 0.5) pL = pC;
  if (oR > 0.5) pR = pC;
  if (oB > 0.5) pB = pC;
  if (oT > 0.5) pT = pC;

  // Gradient of pressure
  vec2 grad = 0.5 * vec2(pR - pL, pT - pB);

  // Decode velocity, subtract gradient, re-encode
  vec2 vel = (texture2D(uVelocity, vUv).rg - 0.5) * 2.0;
  vel -= grad;

  gl_FragColor = vec4(vel * 0.5 + 0.5, 0.0, 1.0);
}
