import { Island, IslandPhase } from './Island';
import { CONFIG } from '../config';
import { PALETTE } from '../palette/colors';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function randRange([min, max]: [number, number]): number {
  return lerp(min, max, Math.random());
}

export type InteractionMode = 'observer' | 'active';

export class IslandManager {
  private islands: Island[] = [];
  private nextId = 0;
  private spawnTimer = 0;
  private nextSpawnDelay: number;
  private paletteIndex = 0;

  private mode: InteractionMode = 'observer';
  private inactivityTimer = 0;
  private holdingIslandId: number | null = null;

  constructor() {
    this.nextSpawnDelay = randRange(CONFIG.island.spawnInterval);
  }

  getIslands(): readonly Island[] {
    return this.islands;
  }

  getMode(): InteractionMode {
    return this.mode;
  }

  switchToActive(): void {
    if (this.mode === 'active') return;
    this.mode = 'active';
    this.inactivityTimer = 0;
  }

  private switchToObserver(): void {
    this.mode = 'observer';
    this.holdingIslandId = null;
    this.spawnTimer = 0;
    this.nextSpawnDelay = randRange(CONFIG.island.spawnInterval);
  }

  resetInactivityTimer(): void {
    this.inactivityTimer = 0;
  }

  /** Spawn an island at the given UV position. Returns the island, or null if rejected. */
  spawnAtPosition(uv: [number, number]): Island | null {
    const maxCount = this.mode === 'active'
      ? CONFIG.activeMode.maxConcurrent
      : CONFIG.island.maxConcurrent;

    // Don't count islands that are mostly eroded (>80%) against the cap
    const activeCount = this.islands.filter(i => i.erodeProgress < 0.8).length;
    if (activeCount >= maxCount) return null;

    // Overlap check: distance between centers < sum of radii
    const newRadius = CONFIG.activeMode.minRadius;
    if (this.overlapsExisting(uv, newRadius)) return null;

    const color = PALETTE[this.paletteIndex % PALETTE.length];
    this.paletteIndex++;

    const island: Island = {
      id: this.nextId++,
      position: [uv[0], uv[1]],
      radius: newRadius,
      elongation: 1.2 + Math.random() * 0.6,
      rotation: Math.random() * Math.PI,
      color,
      phase: 'emerging',
      emergeProgress: 0,
      erodeProgress: 0,
      emergeDuration: randRange(CONFIG.island.emergeDuration),
      erodeDuration: randRange(CONFIG.island.erodeDuration),
      age: 0,
    };

    this.islands.push(island);
    this.holdingIslandId = island.id;
    return island;
  }

  /** Check if a circle at `pos` with `radius` overlaps any active island. */
  private overlapsExisting(pos: [number, number], radius: number): boolean {
    for (const existing of this.islands) {
      if (existing.erodeProgress > 0.6) continue;
      const dx = pos[0] - existing.position[0];
      const dy = pos[1] - existing.position[1];
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < existing.radius + radius) {
        return true;
      }
    }
    return false;
  }

  /** Grow the currently-held island's radius up to max. */
  updateHoldingIsland(dt: number): void {
    if (this.holdingIslandId === null) return;
    const island = this.islands.find(i => i.id === this.holdingIslandId);
    if (!island) {
      this.holdingIslandId = null;
      return;
    }
    island.radius = Math.min(
      CONFIG.activeMode.maxRadius,
      island.radius + CONFIG.activeMode.holdGrowRate * dt,
    );
  }

  /** Release the currently-held island so it continues its lifecycle normally. */
  releaseHoldingIsland(): void {
    this.holdingIslandId = null;
  }

  update(dt: number): void {
    // Update existing islands
    for (const island of this.islands) {
      island.age += dt;

      if (island.phase === 'emerging') {
        island.emergeProgress = Math.min(1, island.age / island.emergeDuration);
        // Don't transition to eroding while being held
        if (island.emergeProgress >= 1 && island.id !== this.holdingIslandId) {
          island.phase = 'eroding';
        }
      }

      if (island.phase === 'eroding') {
        const erodeAge = island.age - island.emergeDuration;
        island.erodeProgress = Math.min(1, erodeAge / island.erodeDuration);
        if (island.erodeProgress >= 1) {
          island.phase = 'done';
        }
      }
    }

    // Remove finished islands
    this.islands = this.islands.filter(i => i.phase !== 'done');

    if (this.mode === 'observer') {
      // Auto-spawn in observer mode
      this.spawnTimer += dt;
      if (this.spawnTimer >= this.nextSpawnDelay && this.islands.length < CONFIG.island.maxConcurrent) {
        this.autoSpawn();
        this.spawnTimer = 0;
        this.nextSpawnDelay = randRange(CONFIG.island.spawnInterval);
      }
    } else {
      // Active mode: tick inactivity timer
      this.inactivityTimer += dt;
      if (this.inactivityTimer >= CONFIG.activeMode.inactivityTimeout) {
        this.switchToObserver();
      }
    }
  }

  private autoSpawn(): void {
    const radius = randRange(CONFIG.island.radiusRange);

    // Try a few random positions, bail if all overlap
    let position: [number, number] | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate: [number, number] = [0.2 + Math.random() * 0.6, 0.2 + Math.random() * 0.5];
      if (!this.overlapsExisting(candidate, radius)) {
        position = candidate;
        break;
      }
    }
    if (!position) return;

    const color = PALETTE[this.paletteIndex % PALETTE.length];
    this.paletteIndex++;

    const island: Island = {
      id: this.nextId++,
      position,
      radius,
      elongation: 1.2 + Math.random() * 0.6,
      rotation: Math.random() * Math.PI,
      color,
      phase: 'emerging',
      emergeProgress: 0,
      erodeProgress: 0,
      emergeDuration: randRange(CONFIG.island.emergeDuration),
      erodeDuration: randRange(CONFIG.island.erodeDuration),
      age: 0,
    };

    this.islands.push(island);
  }
}
