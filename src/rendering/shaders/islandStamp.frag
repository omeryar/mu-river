precision highp float;

varying vec2 vUv;

#define MAX_ISLANDS 8
uniform int uIslandCount;
uniform vec2 uIslandPos[MAX_ISLANDS];
uniform float uIslandRadius[MAX_ISLANDS];
uniform vec3 uIslandColor[MAX_ISLANDS];
uniform float uIslandEmerge[MAX_ISLANDS];
uniform float uIslandErode[MAX_ISLANDS];
uniform float uPigmentIntensity;
uniform float uErosionNoise;
uniform float uTime;
uniform vec2 uResolution;

// noise functions injected at runtime via NOISE_PLACEHOLDER

void main() {
  vec4 result = vec4(0.0);
  vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);

  for (int i = 0; i < MAX_ISLANDS; i++) {
    if (i >= uIslandCount) break;

    vec2 delta = (vUv - uIslandPos[i]) * aspect;
    float rawDist = length(delta) / uIslandRadius[i];

    // Low-frequency noise to wobble the pebble outline
    // delta is in island-local space, so *6.0 gives ~1 wobble cycle across the island
    float wobble = snoise(delta * 6.0 + float(i) * 13.7) * 0.08;
    float dist = rawDist + wobble;

    // Solid pebble shape: fully opaque inside, soft at very edge
    float shape = 1.0 - smoothstep(0.8, 1.0, dist);

    // Emergence: center appears first, grows outward
    float emergeThresh = 1.0 - uIslandEmerge[i];
    float emerged = smoothstep(emergeThresh + 0.02, emergeThresh - 0.02, dist);

    // Erosion: front moves from outside in, with noise breakup
    // CRITICAL: scale noise by erode progress so it's zero before erosion starts
    float erodeNoise = snoise(delta * 10.0 + float(i) * 7.3 + uTime * 0.1) * uErosionNoise * uIslandErode[i];
    float erodeFront = 1.0 - uIslandErode[i] + erodeNoise;
    // Reversed args: returns 1 inside body (dist < erodeFront), 0 outside (eroded away)
    float eroded = smoothstep(erodeFront + 0.03, erodeFront - 0.03, dist);

    float density = shape * emerged * eroded * uPigmentIntensity;

    if (density > result.a) {
      result = vec4(uIslandColor[i], density);
    }
  }

  gl_FragColor = result;
}
