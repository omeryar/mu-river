precision highp float;

uniform sampler2D uPrevBody;    // previous frame body (ping-pong read)
uniform sampler2D uFlowField;   // flow velocity
uniform vec2 uTexelSize;
uniform float uTime;
uniform float uErodeRate;
uniform float uGlobalDecay;

// Islands to stamp (only during emergence phase)
#define MAX_ISLANDS 24
uniform int uIslandCount;
uniform vec2 uIslandPos[MAX_ISLANDS];
uniform float uIslandRadius[MAX_ISLANDS];
uniform float uIslandElongation[MAX_ISLANDS];
uniform float uIslandRotation[MAX_ISLANDS];
uniform vec3 uIslandColor[MAX_ISLANDS];
uniform float uIslandEmerge[MAX_ISLANDS]; // 0–1 emergence, >= 1 means fully emerged
uniform float uIslandEroding[MAX_ISLANDS]; // 1.0 if in erosion phase, 0.0 otherwise

// Thought Profile uniforms
uniform float uIslandNoiseFreq[MAX_ISLANDS];
uniform float uIslandNoiseAmp[MAX_ISLANDS];
uniform float uIslandPulseRate[MAX_ISLANDS];
uniform float uIslandPermeability[MAX_ISLANDS];

uniform vec2 uResolution;

varying vec2 vUv;

// noise functions injected at runtime via NOISE_PLACEHOLDER

void main() {
  vec4 body = texture2D(uPrevBody, vUv);
  vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);

  // === STAMP emerging islands into the body texture ===
  for (int i = 0; i < MAX_ISLANDS; i++) {
    if (i >= uIslandCount) break;

    // Only stamp during emergence (not during erosion)
    if (uIslandEroding[i] > 0.5) continue;

    vec2 delta = (vUv - uIslandPos[i]) * aspect;
    float cs = cos(uIslandRotation[i]);
    float sn = sin(uIslandRotation[i]);
    vec2 rotated = vec2(delta.x * cs + delta.y * sn,
                       -delta.x * sn + delta.y * cs);
    rotated.x *= uIslandElongation[i];
    
    // Calculate base distance
    float dist = length(rotated) / uIslandRadius[i];

    // Pulsation effect based on pulseRate
    float pulse = sin(uTime * uIslandPulseRate[i] + float(i) * 1.5) * 0.05;
    dist -= pulse;

    // Noise-perturbed distance for organic boundary
    float freq = uIslandNoiseFreq[i];
    float amp = uIslandNoiseAmp[i];
    
    // Animate the noise over time so the thought "breathes" and shifts
    vec2 noisePos = rotated * freq + vec2(uTime * uIslandPulseRate[i] * 0.5 + float(i) * 13.7);
    // Scale the amplitude inversely by the radius so small thoughts wiggle just as much
    float absoluteAmp = amp / max(0.01, uIslandRadius[i]);
    float boundaryNoise = snoise(noisePos) * absoluteAmp 
                        + snoise(noisePos * 2.0) * (absoluteAmp * 0.5);
                        
    float noisyDist = dist + boundaryNoise;

    // Soften the edge based on permeability
    float edgeSoftness = mix(0.1, 0.4, uIslandPermeability[i]);
    float shape = 1.0 - smoothstep(1.0 - edgeSoftness, 1.0 + edgeSoftness, noisyDist);

    // Subtle interior density variation
    float interiorNoise = snoise(rotated * freq * 1.5 + vec2(uTime * 0.2 + float(i) * 19.3)) * 0.1;
    shape *= (0.9 + interiorNoise);

    // Emergence: center appears first, grows outward
    float emergeThresh = 1.0 - uIslandEmerge[i];
    float emerged = smoothstep(emergeThresh + 0.15, emergeThresh - 0.05, noisyDist);
    float emergeOpacity = smoothstep(0.0, 0.4, uIslandEmerge[i]);

    float density = shape * emerged * emergeOpacity;

    // Smooth blend: merge colors proportionally, max alpha for solid body
    if (density > 0.001) {
      float blend = density / (body.a + density + 0.001);
      body.rgb = mix(body.rgb, uIslandColor[i], blend);
      
      // Apply permeability to the alpha channel (which acts as the obstacle)
      // High permeability = lower alpha = less obstacle
      float targetAlpha = density * (1.0 - uIslandPermeability[i] * 0.8);
      body.a = max(body.a, targetAlpha);
    }
  }

  // === ITERATIVE EROSION of existing material ===
  if (body.a > 0.02) {
    // Sample neighbors from PREVIOUS frame (not current, to avoid order-dependent artifacts)
    float nL = texture2D(uPrevBody, vUv + vec2(-uTexelSize.x, 0.0)).a;
    float nR = texture2D(uPrevBody, vUv + vec2( uTexelSize.x, 0.0)).a;
    float nU = texture2D(uPrevBody, vUv + vec2(0.0,  uTexelSize.y)).a;
    float nD = texture2D(uPrevBody, vUv + vec2(0.0, -uTexelSize.y)).a;

    // Also sample diagonals for smoother edge detection
    float nUL = texture2D(uPrevBody, vUv + vec2(-uTexelSize.x,  uTexelSize.y)).a;
    float nUR = texture2D(uPrevBody, vUv + vec2( uTexelSize.x,  uTexelSize.y)).a;
    float nDL = texture2D(uPrevBody, vUv + vec2(-uTexelSize.x, -uTexelSize.y)).a;
    float nDR = texture2D(uPrevBody, vUv + vec2( uTexelSize.x, -uTexelSize.y)).a;

    // Exposure: how many neighbors are empty (0 = fully interior, high = very exposed)
    float avgNeighbor = (nL + nR + nU + nD + nUL + nUR + nDL + nDR) / 8.0;
    float exposure = 1.0 - avgNeighbor;

    // Only erode exposed pixels (edges)
    if (exposure > 0.02) {
      // Flow direction at this pixel
      vec2 flow = (texture2D(uFlowField, vUv).rg - 0.5) * 2.0;

      // Edge normal: points from body toward empty space
      float gradX = (nL + nUL + nDL) - (nR + nUR + nDR);
      float gradY = (nD + nDL + nDR) - (nU + nUL + nUR);
      vec2 edgeNormal = vec2(gradX, gradY);
      float edgeLen = length(edgeNormal);
      if (edgeLen > 0.001) edgeNormal /= edgeLen;

      // Flow hitting the edge face-on increases erosion
      float flowImpact = max(0.0, dot(flow, edgeNormal));

      // Spatial noise so erosion isn't uniform along the edge
      float resistance = snoise(vUv * 20.0 + vec2(uTime * 0.1)) * 0.5 + 0.5;

      // Combine erosion factors
      float erodeAmount = exposure * uErodeRate
        * (0.3 + flowImpact * 0.7)  // flow bias
        * (1.2 - resistance * 0.8); // spatial variation

      body.a -= erodeAmount;
      body.a = max(0.0, body.a);

      // Smooth erosion front: blend alpha toward neighbor average
      body.a = mix(body.a, avgNeighbor, 0.06);
    }
  }

  // Global alpha decay: ensures linear mass loss and no lingering remnants
  if (body.a > 0.0) {
    body.a -= uGlobalDecay;
    body.a = max(0.0, body.a);
  }

  gl_FragColor = body;
}
