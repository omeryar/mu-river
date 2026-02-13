import { Island, IslandPhase } from './Island';
import { CONFIG } from '../config';
import { PALETTE } from '../palette/colors';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function randRange([min, max]: [number, number]): number {
  return lerp(min, max, Math.random());
}

export class IslandManager {
  private islands: Island[] = [];
  private nextId = 0;
  private spawnTimer = 0;
  private nextSpawnDelay: number;
  private paletteIndex = 0;

  constructor() {
    this.nextSpawnDelay = randRange(CONFIG.island.spawnInterval);
  }

  getIslands(): readonly Island[] {
    return this.islands;
  }

  update(dt: number): void {
    // Update existing islands
    for (const island of this.islands) {
      island.age += dt;

      if (island.phase === 'emerging') {
        island.emergeProgress = Math.min(1, island.age / island.emergeDuration);
        if (island.emergeProgress >= 1) {
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

    // Spawn new islands
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.nextSpawnDelay && this.islands.length < CONFIG.island.maxConcurrent) {
      this.spawn();
      this.spawnTimer = 0;
      this.nextSpawnDelay = randRange(CONFIG.island.spawnInterval);
    }
  }

  private spawn(): void {
    const color = PALETTE[this.paletteIndex % PALETTE.length];
    this.paletteIndex++;

    const island: Island = {
      id: this.nextId++,
      position: [0.2 + Math.random() * 0.6, 0.2 + Math.random() * 0.5],
      radius: randRange(CONFIG.island.radiusRange),
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
