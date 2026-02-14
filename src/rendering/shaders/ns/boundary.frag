precision highp float;

uniform sampler2D uVelocity;
uniform sampler2D uObstacles;
uniform vec2 uTexelSize;
uniform float uBaseSpeed;
uniform float uCurlStrength;
uniform float uCurlScale;
uniform float uTime;
uniform vec2 uResolution;
uniform float uForceBlend;

varying vec2 vUv;

// noise functions injected at runtime via NOISE_PLACEHOLDER

vec2 curlNoise(vec2 p, float t) {
  float eps = 0.001;
  float n = fbm(vec2(p.x, p.y + eps) + t, 3);
  float s = fbm(vec2(p.x, p.y - eps) + t, 3);
  float e = fbm(vec2(p.x + eps, p.y) + t, 3);
  float w = fbm(vec2(p.x - eps, p.y) + t, 3);
  float dx = (n - s) / (2.0 * eps);
  float dy = (e - w) / (2.0 * eps);
  return vec2(dx, -dy);
}

void main() {
  float obstacle = texture2D(uObstacles, vUv).a;
  vec2 vel = (texture2D(uVelocity, vUv).rg - 0.5) * 2.0;

  // Smooth obstacle mask: ramp from full fluid (0) to full solid (1)
  float solid = smoothstep(0.3, 0.7, obstacle);

  // Target velocity: base upward flow + curl noise
  vec2 p = vUv * uResolution * uCurlScale;
  vec2 curl = curlNoise(p, uTime * 0.05) * uCurlStrength;
  vec2 target = vec2(0.0, uBaseSpeed) + curl;

  // Relax toward target (prevents unbounded accumulation)
  vel = mix(vel, target, uForceBlend);

  // Free-slip at obstacle edges: smoothly damp normal component near walls
  float oL = texture2D(uObstacles, vUv - vec2(uTexelSize.x, 0.0)).a;
  float oR = texture2D(uObstacles, vUv + vec2(uTexelSize.x, 0.0)).a;
  float oB = texture2D(uObstacles, vUv - vec2(0.0, uTexelSize.y)).a;
  float oT = texture2D(uObstacles, vUv + vec2(0.0, uTexelSize.y)).a;

  // Smooth wall influence from each direction
  float wallL = smoothstep(0.3, 0.7, oL);
  float wallR = smoothstep(0.3, 0.7, oR);
  float wallB = smoothstep(0.3, 0.7, oB);
  float wallT = smoothstep(0.3, 0.7, oT);

  // Damp velocity component toward nearby walls
  if (vel.x < 0.0) vel.x *= (1.0 - wallL);
  if (vel.x > 0.0) vel.x *= (1.0 - wallR);
  if (vel.y < 0.0) vel.y *= (1.0 - wallB);
  if (vel.y > 0.0) vel.y *= (1.0 - wallT);

  // Blend to zero inside solid regions
  vel *= (1.0 - solid);

  gl_FragColor = vec4(vel * 0.5 + 0.5, 0.0, 1.0);
}
