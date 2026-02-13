import noiseGlsl from './common/noise.glsl';

export function injectNoise(shader: string): string {
  return shader.replace(
    '// noise functions injected at runtime via NOISE_PLACEHOLDER',
    noiseGlsl,
  );
}
