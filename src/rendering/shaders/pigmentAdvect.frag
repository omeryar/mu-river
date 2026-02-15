precision highp float;

uniform sampler2D uPrevPigment;    // previous frame pigment (ping-pong)
uniform sampler2D uFlowField;      // RG = velocity (encoded 0–1)
uniform sampler2D uIslandStamp;    // solid island body (RGB=color, A=density)
uniform float uAdvectionStrength;
uniform float uDiffusion;
uniform float uDecay;
uniform float uDt;
uniform vec2 uTexelSize;
uniform float uTime;

varying vec2 vUv;

// noise functions injected at runtime via NOISE_PLACEHOLDER

// HSV <-> RGB conversion
vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
  // Decode flow velocity from [0,1] to [-1,1]
  vec2 velocity = (texture2D(uFlowField, vUv).rg - 0.5) * 2.0;

  // Semi-Lagrangian advection: look backward along velocity
  vec2 sourceUv = vUv - velocity * uAdvectionStrength * uDt;
  sourceUv.x = clamp(sourceUv.x, 0.0, 1.0);

  // Let pigment flow off top/bottom edges — sample returns edge color
  // but we zero it out if the source is off-screen
  vec4 advected = texture2D(uPrevPigment, clamp(sourceUv, vec2(0.0), vec2(1.0)));
  if (sourceUv.y < 0.0 || sourceUv.y > 1.0) advected = vec4(0.0);

  // Diffusion: 3x3 weighted blur for smooth spreading (handles diagonal aliasing)
  // For top/bottom edges, treat off-screen neighbors as empty so pigment flows out
  vec4 neighbors = vec4(0.0);
  float totalWeight = 0.0;
  for (int dy = -1; dy <= 1; dy++) {
    for (int dx = -1; dx <= 1; dx++) {
      if (dx == 0 && dy == 0) continue;
      vec2 offset = vec2(float(dx) * uTexelSize.x, float(dy) * uTexelSize.y);
      vec2 sampleUv = vUv + offset;
      // Weight: 1.0 for cardinal, 0.707 for diagonal (1/sqrt2)
      float w = (dx == 0 || dy == 0) ? 1.0 : 0.707;
      if (sampleUv.y < 0.0 || sampleUv.y > 1.0) {
        // off-screen: contribute zero (weighted)
        totalWeight += w;
      } else {
        neighbors += texture2D(uPrevPigment, sampleUv) * w;
        totalWeight += w;
      }
    }
  }
  neighbors /= totalWeight;

  vec4 pigment = mix(advected, neighbors, uDiffusion);

  // Decay
  pigment *= uDecay;

  // === Hue shimmer: slowly shift existing pigment color as it flows ===
  if (pigment.a > 0.01) {
    // Gentle hue drift based on position and time — creates iridescent effect
    float hueShift = snoise(vUv * 8.0 + uTime * 0.03) * 0.025;
    vec3 hsv = rgb2hsv(pigment.rgb);
    hsv.x = fract(hsv.x + hueShift);
    // Slightly boost saturation downstream for richer color
    hsv.y = min(1.0, hsv.y * 1.005);
    pigment.rgb = hsv2rgb(hsv);
  }

  // === Wispy opacity variation: noise-modulated alpha for cloud-like density ===
  if (pigment.a > 0.01) {
    float wisp = snoise(vUv * 20.0 + uTime * 0.08) * 0.5 + 0.5;
    // Gentle modulation — not too extreme, just enough to break up uniformity
    pigment.a *= mix(0.85, 1.0, wisp);
  }

  // Read the island stamp
  vec4 stamp = texture2D(uIslandStamp, vUv);
  float bodyAlpha = stamp.a;

  // Emit pigment at the erosion front. Narrow band for thin plume source.
  float emitCurve = smoothstep(0.15, 0.35, bodyAlpha) * smoothstep(0.75, 0.5, bodyAlpha);
  float emitAmount = emitCurve * 0.9;

  // Block existing pigment flow through solid body interior
  float blockFactor = 1.0 - smoothstep(0.5, 0.9, bodyAlpha);
  pigment *= blockFactor;

  // Add fresh emission AFTER blocking
  pigment.rgb = mix(pigment.rgb, stamp.rgb, emitAmount);
  pigment.a = max(pigment.a, emitAmount);

  // Gentle fade at the very edge (2 texels) so pigment vanishes smoothly off-screen
  float edgeFade = smoothstep(1.0, 1.0 - uTexelSize.y * 2.0, vUv.y)
                 * smoothstep(0.0, uTexelSize.y * 2.0, vUv.y);
  pigment *= edgeFade;

  gl_FragColor = pigment;
}
