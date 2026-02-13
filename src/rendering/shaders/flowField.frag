precision highp float;

uniform float uTime;
uniform float uBaseSpeed;
uniform float uCurlScale;
uniform float uCurlStrength;
uniform float uTimeScale;
uniform vec2 uResolution;

varying vec2 vUv;

// noise functions injected at runtime via NOISE_PLACEHOLDER

vec2 curlNoise(vec2 p, float t) {
  float eps = 0.001;
  float n  = fbm(vec2(p.x, p.y + eps) + t, 3);
  float s  = fbm(vec2(p.x, p.y - eps) + t, 3);
  float e  = fbm(vec2(p.x + eps, p.y) + t, 3);
  float w  = fbm(vec2(p.x - eps, p.y) + t, 3);
  float dx = (n - s) / (2.0 * eps);
  float dy = (e - w) / (2.0 * eps);
  // Curl: rotate gradient 90 degrees → divergence-free
  return vec2(dx, -dy);
}

void main() {
  vec2 p = vUv * uResolution * uCurlScale;
  float t = uTime * uTimeScale;

  vec2 curl = curlNoise(p, t) * uCurlStrength;

  // Base flow goes upward (positive Y)
  vec2 velocity = vec2(0.0, uBaseSpeed) + curl;

  // Store velocity in RG channels, encode from [-1,1] to [0,1] for storage
  gl_FragColor = vec4(velocity * 0.5 + 0.5, 0.0, 1.0);
}
