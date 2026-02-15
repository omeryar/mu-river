// Pentatonic scale: C, D, E, G, A across 3 octaves
const PENTATONIC_FREQUENCIES = [
  // Octave 3
  130.81, 146.83, 164.81, 196.00, 220.00,
  // Octave 4
  261.63, 293.66, 329.63, 392.00, 440.00,
  // Octave 5
  523.25,
];

export interface TimbreConfig {
  type: OscillatorType;
  filterCutoff: number | null;  // null = no filter
  detune: number;               // cents detune for second oscillator (0 = no second osc)
}

/**
 * Convert RGB color [0-1] to a frequency in the pentatonic scale.
 * Hue determines scale degree, brightness shifts octave.
 */
export function colorToNote(rgb: [number, number, number]): number {
  const [r, g, b] = rgb;

  // Convert RGB to hue (0-360)
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let hue = 0;
  if (max !== min) {
    const d = max - min;
    if (max === r) hue = ((g - b) / d + 6) % 6;
    else if (max === g) hue = (b - r) / d + 2;
    else hue = (r - g) / d + 4;
    hue *= 60;
  }

  // Map hue to scale degree (0 to length-1)
  const scaleLen = PENTATONIC_FREQUENCIES.length;
  const degree = Math.floor((hue / 360) * scaleLen) % scaleLen;

  // Brightness shifts octave: dark colors stay in lower range, bright in upper
  const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
  // Nudge by up to ±2 scale steps based on brightness
  const offset = Math.round((brightness - 0.4) * 4);
  const finalDegree = Math.max(0, Math.min(scaleLen - 1, degree + offset));

  return PENTATONIC_FREQUENCIES[finalDegree];
}

/**
 * Derive timbre from color: warm → filtered sawtooth, cool → sine/triangle,
 * muted → detuned sines.
 */
export function colorToTimbre(rgb: [number, number, number]): TimbreConfig {
  const [r, , b] = rgb;
  const warmth = r - b;  // positive = warm, negative = cool

  // Saturation check: low saturation → muted/ethereal
  const max = Math.max(...rgb);
  const min = Math.min(...rgb);
  const saturation = max > 0 ? (max - min) / max : 0;

  if (saturation < 0.3) {
    // Muted colors: two detuned sines for gentle beating
    return { type: 'sine', filterCutoff: null, detune: 3 };
  }

  if (warmth > 0.15) {
    // Warm: filtered sawtooth, cutoff based on how warm
    const cutoff = 400 + warmth * 800;
    return { type: 'sawtooth', filterCutoff: cutoff, detune: 0 };
  }

  if (warmth < -0.15) {
    // Cool: clean triangle
    return { type: 'triangle', filterCutoff: null, detune: 0 };
  }

  // Neutral: sine with slight detune
  return { type: 'sine', filterCutoff: null, detune: 2 };
}
