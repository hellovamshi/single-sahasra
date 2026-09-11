/**
 * Export GLSL shader source strings for compilation.
 */

export const VERTEX_SHADER_SOURCE = `#version 300 es
precision highp float;

layout(location = 0) in vec2 a_position;
out vec2 v_uv;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_uv = a_position * 0.5 + 0.5;
}
`;

export const FOLD_FRAGMENT_SHADER_SOURCE = `#version 300 es
precision highp float;

uniform sampler2D u_image;
uniform vec2 u_imageSize;
uniform vec2 u_cover;
uniform float u_aspect;
uniform float u_turn;
uniform float u_hinge;

in vec2 v_uv;
out vec4 outColor;

const float HALF_PI = 1.570796327;
const float BLUR = 0.0315;
const float MAX_TILT = 0.941917;
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

  // Hinge projection
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

  // Defocus
  float blurAngle = pow(smoothstep(0.0, HALF_PI, tilt), 0.5);
  float blurSpread = pow(smoothstep(0.0, 0.7, fromHinge), 1.45);
  float defocus = blurAngle * mix(0.18, 1.0, blurSpread);
  float sigma = u_imageSize.x * BLUR * defocus;

  // Vertical margins
  float softness = fwidth(v_uv.y) + 2.0 * sigma / u_imageSize.y;
  float mask = 1.0 - smoothstep(0.5 - softness, 0.5 + softness, abs(plane.y - 0.5));

  // Glass
  vec3 color = sampleImage(plane, sigma);
  float glass = sine * pow(fromHinge, 1.6);
  color *= 1.0 - mix(0.28, 0.06, outer) * glass;
  float reflection = exp(-pow((fromHinge - 0.70) / 0.30, 2.0)) * sine;
  color += vec3(0.82, 0.85, 0.86) * reflection * 0.025;

  // Void
  float fade = clamp((fromHinge - 0.26) / 0.74, 0.0, 1.0);
  color *= 1.0 - 0.7 * blurAngle * fade;

  outColor = vec4(mix(DARK, color, mask), 1.0);
}
`;

export const GAUSS_FRAGMENT_SHADER_SOURCE = `#version 300 es
precision highp float;
uniform sampler2D u_source;
uniform vec2 u_step;
uniform float u_level;
in vec2 v_uv;
out vec4 outColor;

void main() {
  vec4 color = textureLod(u_source, v_uv, u_level) * 0.2270270270;
  color += textureLod(u_source, v_uv + u_step * 1.3846153846, u_level) * 0.3162162162;
  color += textureLod(u_source, v_uv - u_step * 1.3846153846, u_level) * 0.3162162162;
  color += textureLod(u_source, v_uv + u_step * 3.2307692308, u_level) * 0.0702702703;
  color += textureLod(u_source, v_uv - u_step * 3.2307692308, u_level) * 0.0702702703;
  outColor = color;
}
`;
