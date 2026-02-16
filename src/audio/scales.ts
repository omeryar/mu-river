// Moon River melody + chord sequence (key of C, 3/4 time)
// Each step represents one note event. Islands advance through the sequence.

export interface MoonRiverStep {
  melody: number;
  chord: number[];
}

// Frequency constants
const C3 = 130.81, E3 = 164.81, G3 = 196.00, A3 = 220.00, B3 = 246.94;
const C4 = 261.63, D4 = 293.66, E4 = 329.63, F4 = 349.23, G4 = 392.00, A4 = 440.00, B4 = 493.88;
const C5 = 523.25, D5 = 587.33, E5 = 659.25, F5 = 698.46, G5 = 783.99, A5 = 880.00;

// Full Moon River melody sequence (~40 steps, then loops)
// Chords are voiced in a comfortable mid range for ambient quality
export const MOON_RIVER_SEQUENCE: MoonRiverStep[] = [
  // "Moon River, wider than a mile"
  { melody: C4, chord: [C3, E3, G3] },       // 1  "Moon"
  { melody: A4, chord: [A3, C4, E4] },       // 2  "Riv-"
  { melody: B4, chord: [A3, C4, E4] },       // 3  "-er"
  { melody: C5, chord: [F4, A4, C5] },       // 4  "wi-"
  { melody: D5, chord: [F4, A4, C5] },       // 5  "-der"
  { melody: E5, chord: [F4, A4, C5] },       // 6  "than"
  { melody: D5, chord: [G3, B3, D4] },       // 7  "a"
  { melody: C5, chord: [C4, E4, G4] },       // 8  "mile"

  // "I'm crossing you in style someday"
  { melody: A4, chord: [C4, E4, G4] },       // 9  "I'm"
  { melody: G4, chord: [A3, C4, E4] },       // 10 "cross-"
  { melody: A4, chord: [A3, C4, E4] },       // 11 "-ing"
  { melody: B4, chord: [E4, G4, B4] },       // 12 "you"
  { melody: C5, chord: [E4, G4, B4] },       // 13 "in"
  { melody: B4, chord: [F4, A4, C5] },       // 14 "style"
  { melody: A4, chord: [F4, A4, C5] },       // 15 "some-"
  { melody: G4, chord: [G3, B3, D4] },       // 16 "-day"

  // "Oh, dream maker, you heart breaker"
  { melody: C4, chord: [C4, E4, G4] },       // 17 "Oh"
  { melody: A4, chord: [A3, C4, E4] },       // 18 "dream"
  { melody: B4, chord: [A3, C4, E4] },       // 19 "mak-"
  { melody: C5, chord: [F4, A4, C5] },       // 20 "-er"
  { melody: D5, chord: [F4, A4, C5] },       // 21 "you"
  { melody: E5, chord: [F4, A4, C5] },       // 22 "heart"
  { melody: D5, chord: [G3, B3, D4] },       // 23 "break-"
  { melody: C5, chord: [C4, E4, G4] },       // 24 "-er"

  // "Wherever you're going, I'm going your way"
  { melody: A4, chord: [C4, E4, G4] },       // 25 "Wher-"
  { melody: G4, chord: [A3, C4, E4] },       // 26 "-ev-"
  { melody: A4, chord: [A3, C4, E4] },       // 27 "-er"
  { melody: B4, chord: [E4, G4, B4] },       // 28 "you're"
  { melody: C5, chord: [E4, G4, B4] },       // 29 "go-"
  { melody: D5, chord: [F4, A4, C5] },       // 30 "-ing"
  { melody: C5, chord: [F4, A4, C5] },       // 31 "I'm"
  { melody: B4, chord: [G3, B3, D4] },       // 32 "go-"
  { melody: A4, chord: [G3, B3, D4] },       // 33 "-ing"
  { melody: G4, chord: [C4, E4, G4] },       // 34 "your"
  { melody: C5, chord: [C4, E4, G4] },       // 35 "way"

  // "Two drifters off to see the world"
  { melody: C4, chord: [C3, E3, G3] },       // 36 "Two"
  { melody: A4, chord: [A3, C4, E4] },       // 37 "drift-"
  { melody: B4, chord: [A3, C4, E4] },       // 38 "-ers"
  { melody: C5, chord: [F4, A4, C5] },       // 39 "off"
  { melody: D5, chord: [F4, A4, C5] },       // 40 "to"
  { melody: E5, chord: [F4, A4, C5] },       // 41 "see"
  { melody: D5, chord: [G3, B3, D4] },       // 42 "the"
  { melody: C5, chord: [C4, E4, G4] },       // 43 "world"
];

let sequenceIndex = 0;

/**
 * Returns the next Moon River step and advances the internal index (wraps).
 */
export function getNextMoonRiverStep(): MoonRiverStep {
  const step = MOON_RIVER_SEQUENCE[sequenceIndex];
  sequenceIndex = (sequenceIndex + 1) % MOON_RIVER_SEQUENCE.length;
  return step;
}
