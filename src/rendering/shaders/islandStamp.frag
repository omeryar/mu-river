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

    // === Erosion via domain-warped noise field ===
    // Instead of thresholding on radial distance (which always shrinks as an ellipse),
    // we build a 2D erosion field where each point has a "resistance" value 0–1.
    // Low resistance = erodes first. As erodeProgress rises, more points are consumed.
    //
    // The field blends:
    //   - (1-dist): edges have low resistance, center high (so center erodes last)
    //   - Domain-warped fbm: creates organic channels that eat inward
    //   - Upstream flow bias: upstream face has lower resistance

    float erodeProgress = uIslandErode[i];

    // Domain-warped noise (Inigo Quilez technique) for organic channel patterns
    // First noise layer warps the input of the second, creating flowing tendrils
    vec2 noiseCoord = rotated * 5.0 + float(i) * 7.3;
    vec2 q = vec2(
      fbm(noiseCoord + vec2(0.0, 0.0) + uTime * 0.03, 3),
      fbm(noiseCoord + vec2(5.2, 1.3) + uTime * 0.03, 3)
    );
    // Warp the noise input by q — this creates the branching, tendril-like patterns
    float erosionNoise = fbm(noiseCoord + q * 2.5 + uTime * 0.02, 3);
    // Map from [-1,1] to [0,1]
    erosionNoise = erosionNoise * 0.5 + 0.5;

    // Erosion resistance field:
    //   Radial component (0.45): ensures center is last to go
    //   Noise component (0.55): creates organic channels eating inward
    float radialResistance = 1.0 - dist; // 0 at edge, 1 at center
    float erosionField = radialResistance * 0.45 + erosionNoise * 0.55;

    // Flow bias: upstream face (delta.y > 0) has reduced resistance
    float upstreamBias = delta.y / (length(delta) + 0.001);
    erosionField -= upstreamBias * 0.18;

    // Body exists where erosionField > erodeProgress
    // As erodeProgress goes 0→1, more of the field falls below threshold
    float eroded = smoothstep(erodeProgress - 0.04, erodeProgress + 0.04, erosionField);

    float density = shape * emerged * eroded * emergeOpacity * uPigmentIntensity;

    if (density > result.a) {
      result = vec4(uIslandColor[i], density);
    }
  }

  gl_FragColor = result;
}
