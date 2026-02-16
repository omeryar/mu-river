precision highp float;

uniform sampler2D uPigment;
uniform sampler2D uIslandStamp;
uniform vec3 uBaseColor;
uniform float uPigmentOpacity;
uniform float uDarkMode;

varying vec2 vUv;

void main() {
  vec4 pigment = texture2D(uPigment, vUv);
  vec4 island = texture2D(uIslandStamp, vUv);

  // Layer 1: river base
  vec3 color = uBaseColor;

  // Layer 2: pigment trails
  float pigmentAlpha = pigment.a * uPigmentOpacity;
  vec3 lightBlend = mix(color, pigment.rgb, pigmentAlpha);
  vec3 screenBlend = 1.0 - (1.0 - color) * (1.0 - pigment.rgb * pigmentAlpha);
  color = mix(lightBlend, screenBlend, uDarkMode);

  // Layer 3: island body — solid shape, always normal blend
  float islandAlpha = smoothstep(0.0, 0.4, island.a);
  color = mix(color, island.rgb, islandAlpha);

  gl_FragColor = vec4(color, 1.0);
}
