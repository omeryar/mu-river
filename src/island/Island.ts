export type IslandPhase = "emerging" | "eroding" | "done";

export interface Island {
  id: number;
  position: [number, number];
  radius: number;
  elongation: number;
  rotation: number;
  color: [number, number, number];
  phase: IslandPhase;
  emergeProgress: number;
  erodeProgress: number;
  emergeDuration: number;
  erodeDuration: number;
  age: number;
  noiseFrequency: number;
  noiseAmplitude: number;
  pulseRate: number;
  permeability: number;
}
