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

  // Layer 3: solid island body on top (stationary, opaque)
  // Darken island color slightly toward center for depth
  vec3 islandColor = island.rgb * (0.7 + 0.3 * (1.0 - island.a));
  color = mix(color, islandColor, island.a);

  gl_FragColor = vec4(color, 1.0);
}
