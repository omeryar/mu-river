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

  // Layer 3: island body — soft edges, fully opaque interior
  float islandAlpha = smoothstep(0.0, 0.4, island.a);
  color = mix(color, island.rgb, islandAlpha);

  gl_FragColor = vec4(color, 1.0);
}
