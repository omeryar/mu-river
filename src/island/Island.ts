export type IslandPhase = 'emerging' | 'eroding' | 'done';

export interface Island {
  id: number;
  position: [number, number];  // normalized [0,1]
  radius: number;              // normalized to screen height
  color: [number, number, number];
  phase: IslandPhase;
  emergeProgress: number;      // 0 → 1
  erodeProgress: number;       // 0 → 1
  emergeDuration: number;      // seconds
  erodeDuration: number;       // seconds
  age: number;                 // seconds since spawn
}
