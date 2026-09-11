#version 300 es
precision highp float;

uniform sampler2D u_image;
uniform vec2 u_imageSize;
uniform vec2 u_cover;
uniform float u_aspect;
uniform float u_turn;
uniform float u_hinge; // 0.0 = LEFT hinge, 1.0 = RIGHT hinge

in vec2 v_uv;
out vec4 outColor;

const float HALF_PI = 1.570796327;
const float BLUR = 0.0315;
const float MAX_TILT = 0.941917; // acos(1.0 / 1.7)
const vec3 DARK = vec3(0.0, 0.0, 0.0);

vec3 sampleImage(vec2 uv, float sigma) {
  vec2 tuv = (uv - 0.5) * u_cover + 0.5;
  float lod = max(0.0, log2(max(sigma, 1.0)));
  vec3 blurred = textureLod(u_image, tuv, max(1.0, lod)).rgb;
  if (sigma >= 2.0) return blurred;
  return mix(textureLod(u_image, tuv, 0.0).rgb, blurred, smoothstep(0.0, 2.0, sigma));
}

void main() {
  float turn = clamp(u_turn, 0.0, 1.0);
  if (turn <= 0.00001) {
    outColor = vec4(sampleImage(v_uv, 0.0), 1.0);
    return;
  }

  // Inverse perspective ray projection into stationary image plane
  float outer = 1.0 - u_hinge;
  float fromHinge = abs(v_uv.x - u_hinge);
  float tilt = turn * HALF_PI;
  float bend = min(tilt, MAX_TILT);
  float cosine = cos(bend);
  float sine = sin(bend);

  float eye = 2.4 * max(u_aspect, 1.0);
  float depth = fromHinge * u_aspect * sine;
  float perspective = eye / (eye - depth);
  vec2 plane;
  plane.x = u_hinge + (v_uv.x - u_hinge) * cosine * perspective;
  plane.y = 0.5 + (v_uv.y - 0.5) * perspective;

  // Defocus progressive blur
  float blurAngle = pow(smoothstep(0.0, HALF_PI, tilt), 0.5);
  float blurSpread = pow(smoothstep(0.0, 0.7, fromHinge), 1.45);
  float defocus = blurAngle * mix(0.18, 1.0, blurSpread);
  float sigma = u_imageSize.x * BLUR * defocus;

  // Vertical perspective margins with anti-aliasing
  float softness = fwidth(v_uv.y) + 2.0 * sigma / u_imageSize.y;
  float mask = 1.0 - smoothstep(0.5 - softness, 0.5 + softness, abs(plane.y - 0.5));

  // OLED Glass tint & sheen reflection
  vec3 color = sampleImage(plane, sigma);
  float glass = sine * pow(fromHinge, 1.6);
  color *= 1.0 - mix(0.28, 0.06, outer) * glass;
  float reflection = exp(-pow((fromHinge - 0.70) / 0.30, 2.0)) * sine;
  color += vec3(0.82, 0.85, 0.86) * reflection * 0.025;

  // Fade into dark void
  float fade = clamp((fromHinge - 0.26) / 0.74, 0.0, 1.0);
  color *= 1.0 - 0.7 * blurAngle * fade;

  outColor = vec4(mix(DARK, color, mask), 1.0);
}
