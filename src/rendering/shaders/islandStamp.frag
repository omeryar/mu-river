precision highp float;

varying vec2 vUv;

#define MAX_ISLANDS 8
uniform int uIslandCount;
uniform vec2 uIslandPos[MAX_ISLANDS];
uniform float uIslandRadius[MAX_ISLANDS];
uniform float uIslandElongation[MAX_ISLANDS];
uniform float uIslandRotation[MAX_ISLANDS];
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

    // Rotate delta into island-local space
    float cs = cos(uIslandRotation[i]);
    float sn = sin(uIslandRotation[i]);
    vec2 rotated = vec2(delta.x * cs + delta.y * sn,
                       -delta.x * sn + delta.y * cs);

    // Stretch one axis to create ellipse (pebble shape)
    rotated.x *= uIslandElongation[i];

    float dist = length(rotated) / uIslandRadius[i];

    // Solid pebble shape: fully opaque inside, soft at very edge
    float shape = 1.0 - smoothstep(0.75, 0.95, dist);

    // Emergence: center appears first, grows outward with a wide soft gradient
    float emergeThresh = 1.0 - uIslandEmerge[i];
    float emerged = smoothstep(emergeThresh + 0.15, emergeThresh - 0.05, dist);
    // Overall opacity ramps up during emergence for a "rising from water" feel
    float emergeOpacity = smoothstep(0.0, 0.4, uIslandEmerge[i]);

    // Erosion: flow-directed, not uniform shrink
    // Flow is upward (+Y), so upstream face (delta.y > 0) erodes first
    float upstreamBias = delta.y / (length(delta) + 0.001); // -1 to +1

    // Upstream side erodes earlier (lower threshold = erodes sooner)
    float directional = upstreamBias * 0.35 * uIslandErode[i];

    // Multi-scale noise for organic breakup (scaled by erode progress)
    float erodeProgress = uIslandErode[i];
    float n1 = snoise(rotated * 8.0 + float(i) * 7.3 + uTime * 0.08) * 0.25;
    float n2 = snoise(rotated * 16.0 + float(i) * 3.1 + uTime * 0.15) * 0.12;
    float erodeNoise = (n1 + n2) * erodeProgress;

    // Erosion threshold: starts at 1.0 (nothing eroded), decreases over time
    // directional bias makes upstream reach threshold sooner
    float erodeFront = 1.0 - erodeProgress + erodeNoise - directional;

    // Wider transition band for softer, smokier erosion edges
    float eroded = smoothstep(erodeFront + 0.06, erodeFront - 0.06, dist);

    float density = shape * emerged * eroded * emergeOpacity * uPigmentIntensity;

    if (density > result.a) {
      result = vec4(uIslandColor[i], density);
    }
  }

  gl_FragColor = result;
}
