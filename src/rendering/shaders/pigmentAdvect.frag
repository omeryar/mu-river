precision highp float;

uniform sampler2D uPrevPigment;    // previous frame pigment (ping-pong)
uniform sampler2D uFlowField;      // RG = velocity (encoded 0–1)
uniform sampler2D uIslandStamp;    // solid island body (RGB=color, A=density)
uniform float uAdvectionStrength;
uniform float uDiffusion;
uniform float uDecay;
uniform float uDt;
uniform vec2 uTexelSize;

varying vec2 vUv;

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

  // Read the island stamp
  vec4 stamp = texture2D(uIslandStamp, vUv);
  float bodyAlpha = stamp.a;

  // Emit pigment where body density is in transition (the erosion front).
  // bell curve: peaks at alpha ~0.5 (the soft edge of erosion), zero at 0 and 1.
  // This naturally finds erosion fronts without needing edge detection.
  float emitCurve = bodyAlpha * (1.0 - bodyAlpha) * 4.0;
  float emitAmount = emitCurve * 0.7;

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
