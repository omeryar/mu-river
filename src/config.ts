export const CONFIG = {
  // Simulation resolution (can be lower than screen for performance)
  simScale: 1.0,

  // Flow field
  flow: {
    baseSpeed: 0.25,        // upward base flow strength
    curlScale: 0.003,       // spatial frequency of curl noise
    curlStrength: 0.06,     // curl perturbation strength (subtle)
    octaves: 3,
    timeScale: 0.05,        // how fast the flow evolves
  },

  // Pigment advection
  pigment: {
    advectionStrength: 0.6,
    diffusion: 0.3,          // smooth smoky trails
    decay: 0.997,            // multiplicative decay per frame
  },

  // Islands
  island: {
    maxConcurrent: 3,
    spawnInterval: [4, 8] as [number, number],    // seconds between spawns
    emergeDuration: [5, 20] as [number, number],   // seconds to fully emerge
    erodeDuration: [20, 60] as [number, number],   // seconds to fully erode
    radiusRange: [0.06, 0.14] as [number, number], // normalized to screen height
    pigmentIntensity: 0.8,
    erodeRate: 0.018,        // per-frame erosion rate for exposed edge pixels
  },

  // Composite
  composite: {
    baseColor: [0.95, 0.93, 0.90],  // warm white river
    pigmentOpacity: 0.85,
  },
} as const;
