precision highp float;

uniform sampler2D uPigment;
uniform sampler2D uIslandStamp;
uniform vec3 uBaseColor;
uniform float uPigmentOpacity;

varying vec2 vUv;

void main() {
  vec4 pigment = texture2D(uPigment, vUv);
  vec4 island = texture2D(uIslandStamp, vUv);

  // Layer 1: white river base
  vec3 color = uBaseColor;

  // Layer 2: pigment trails (flowing, semi-transparent)
  float pigmentAlpha = pigment.a * uPigmentOpacity;
  color = mix(color, pigment.rgb, pigmentAlpha);

  // Layer 3: island body — watercolor style (translucent, soft edges)
  // Soft alpha curve: cap opacity so islands feel like pigment stains, not solid objects
  float islandAlpha = smoothstep(0.0, 0.6, island.a) * 0.75;
  // Gentle interior shading — barely darker at center, mostly flat wash
  vec3 islandColor = island.rgb * (0.85 + 0.15 * (1.0 - island.a));
  color = mix(color, islandColor, islandAlpha);

  gl_FragColor = vec4(color, 1.0);
}
