export const CONFIG = {
  // Simulation resolution (can be lower than screen for performance)
  simScale: 0.5,
  // Flow field runs at half resolution (low-frequency, bilinear-sampled)
  flowScale: 0.5,

  // Flow field
  flow: {
    baseSpeed: 0.25,        // upward base flow strength
    curlScale: 0.003,       // spatial frequency of curl noise
    curlStrength: 0.08,     // curl perturbation for swirling plumes
    octaves: 3,
    timeScale: 0.05,        // how fast the flow evolves
  },

  // Pigment advection
  pigment: {
    advectionStrength: 0.6,
    diffusion: 0.25,         // lower = thinner plumes near source, curls thicken them downstream
    decay: 0.999,            // very slow decay for long flowing plumes
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
    globalDecay: 0.0004,     // per-frame uniform alpha decay (gentle cleanup, ~42s full fade at 60fps)
  },

  // Active mode (user-placed islands)
  activeMode: {
    maxConcurrent: 20,
    inactivityTimeout: 30,     // seconds before reverting to observer
    holdGrowRate: 0.04,        // radius units per second while holding
    minRadius: 0.04,           // starting radius on click
    maxRadius: 0.14,           // cap (same as current max)
  },

  // Navier-Stokes solver
  navierStokes: {
    pressureIterations: 20,
    baseSpeed: 0.25,             // upward base flow target
    curlStrength: 0.08,          // curl for swirling turbulence (kept below baseSpeed)
    timestep: 8,                 // advection step (~2 grid cells at base velocity)
    forceBlend: 0.08,            // how quickly velocity relaxes toward target flow
  },

  // Composite
  composite: {
    baseColor: [0.95, 0.93, 0.90],  // warm white river
    darkBaseColor: [0.06, 0.05, 0.08],  // near-black for dark mode
    pigmentOpacity: 0.95,
  },
} as const;
