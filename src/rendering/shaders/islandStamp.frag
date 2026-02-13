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

    // Erosion: front moves from outside in, with noise breakup
    // Scale noise by erode progress so it's zero before erosion starts
    float erodeNoise = snoise(rotated * 10.0 + float(i) * 7.3 + uTime * 0.1) * uErosionNoise * uIslandErode[i];
    float erodeFront = 1.0 - uIslandErode[i] + erodeNoise;
    // Reversed args: returns 1 inside body (dist < erodeFront), 0 outside (eroded away)
    float eroded = smoothstep(erodeFront + 0.03, erodeFront - 0.03, dist);

    float density = shape * emerged * eroded * emergeOpacity * uPigmentIntensity;

    if (density > result.a) {
      result = vec4(uIslandColor[i], density);
    }
  }

  gl_FragColor = result;
}
