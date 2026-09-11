#version 300 es
precision highp float;

// Standalone 2-pass separable Gaussian/Bokeh blur shader
in vec2 v_uv;

uniform sampler2D u_image;
uniform vec2 u_direction; // (1.0/w, 0.0) for horizontal, (0.0, 1.0/h) for vertical
uniform float u_radius;

out vec4 fragColor;

void main() {
    vec4 sum = vec4(0.0);
    float weight[5] = float[](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);

    sum += texture(u_image, v_uv) * weight[0];
    for (int i = 1; i < 5; i++) {
        vec2 offset = u_direction * float(i) * u_radius;
        sum += texture(u_image, v_uv + offset) * weight[i];
        sum += texture(u_image, v_uv - offset) * weight[i];
    }

    fragColor = sum;
}
