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
  sourceUv = clamp(sourceUv, vec2(0.0), vec2(1.0));

  vec4 advected = texture2D(uPrevPigment, sourceUv);

  // Diffusion: blend with neighbors for softness
  vec4 left  = texture2D(uPrevPigment, vUv + vec2(-uTexelSize.x, 0.0));
  vec4 right = texture2D(uPrevPigment, vUv + vec2( uTexelSize.x, 0.0));
  vec4 up    = texture2D(uPrevPigment, vUv + vec2(0.0,  uTexelSize.y));
  vec4 down  = texture2D(uPrevPigment, vUv + vec2(0.0, -uTexelSize.y));
  vec4 neighbors = (left + right + up + down) * 0.25;

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

  // Fade pigment flowing off the top edge
  pigment *= smoothstep(1.0, 0.95, vUv.y);

  gl_FragColor = pigment;
}
