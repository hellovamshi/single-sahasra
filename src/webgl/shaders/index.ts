/**
 * Export GLSL shader source strings for compilation.
 */

export const VERTEX_SHADER_SOURCE = `#version 300 es
precision highp float;

layout(location = 0) in vec2 a_position;
layout(location = 1) in vec2 a_uv;

uniform mat4 u_projectionMatrix;
uniform mat4 u_modelViewMatrix;
uniform float u_foldAmount;
uniform int u_hinge;
uniform vec2 u_imageAspect;

out vec2 v_uv;
out vec3 v_normal;
out vec3 v_viewPosition;
out float v_hingeDistance;
out float v_foldAmount;

const float MAX_FOLD_ANGLE = 1.38; // ~79 degrees maximum fold

void main() {
    v_uv = a_uv;
    v_foldAmount = u_foldAmount;

    float s = (u_hinge == 0) ? a_uv.x : (1.0 - a_uv.x);
    v_hingeDistance = s;

    float bendRadius = 0.15;
    float bendFactor = smoothstep(0.0, bendRadius, s);
    float angle = u_foldAmount * MAX_FOLD_ANGLE * bendFactor;

    float xBase = a_position.x * u_imageAspect.x;
    float yBase = a_position.y * u_imageAspect.y;

    vec3 localPos = vec3(xBase, yBase, 0.0);
    vec3 normal = vec3(0.0, 0.0, 1.0);

    if (u_foldAmount > 0.0001) {
        if (u_hinge == 0) {
            float hingeX = -u_imageAspect.x;
            float distFromHinge = localPos.x - hingeX;
            localPos.x = hingeX + distFromHinge * cos(angle);
            localPos.z = -distFromHinge * sin(angle);
            normal = vec3(sin(angle), 0.0, cos(angle));
        } else {
            float hingeX = u_imageAspect.x;
            float distFromHinge = hingeX - localPos.x;
            localPos.x = hingeX - distFromHinge * cos(angle);
            localPos.z = -distFromHinge * sin(angle);
            normal = vec3(-sin(angle), 0.0, cos(angle));
        }
    }

    vec4 viewPos = u_modelViewMatrix * vec4(localPos, 1.0);
    v_viewPosition = viewPos.xyz;
    v_normal = normalize(mat3(u_modelViewMatrix) * normal);

    gl_Position = u_projectionMatrix * viewPos;
}
`;

export const FOLD_FRAGMENT_SHADER_SOURCE = `#version 300 es
precision highp float;

in vec2 v_uv;
in vec3 v_normal;
in vec3 v_viewPosition;
in float v_hingeDistance;
in float v_foldAmount;

uniform sampler2D u_texture;
uniform float u_maxLod;
uniform float u_tiltAngle;
uniform vec2 u_resolution;

out vec4 fragColor;

void main() {
    if (v_uv.x < 0.0 || v_uv.x > 1.0 || v_uv.y < 0.0 || v_uv.y > 1.0) {
        discard;
    }

    float d = clamp(v_hingeDistance, 0.0, 1.0);

    // 1. Progressive mip-blur with multi-tap jitter
    float blurIntensity = pow(d, 1.35) * v_foldAmount;
    float targetLod = blurIntensity * u_maxLod;

    vec4 color = vec4(0.0);
    float offsetScale = blurIntensity * 0.005;

    color += textureLod(u_texture, v_uv, targetLod) * 0.40;
    color += textureLod(u_texture, v_uv + vec2(offsetScale, offsetScale), targetLod) * 0.15;
    color += textureLod(u_texture, v_uv + vec2(-offsetScale, offsetScale), targetLod) * 0.15;
    color += textureLod(u_texture, v_uv + vec2(-offsetScale, -offsetScale), targetLod) * 0.15;
    color += textureLod(u_texture, v_uv + vec2(offsetScale, -offsetScale), targetLod) * 0.15;

    // 2. Physical cues & lighting
    vec3 N = normalize(v_normal);
    vec3 V = normalize(-v_viewPosition);

    float lightTiltRad = radians(u_tiltAngle * 0.5);
    vec3 lightDir = normalize(vec3(sin(lightTiltRad) * 0.35 + 0.15, 0.45, 0.85));
    vec3 H = normalize(lightDir + V);

    float NdotL = max(dot(N, lightDir), 0.0);
    float diffuse = mix(0.92, 1.0, NdotL);

    // Specular oleophobic sheen
    float NdotH = max(dot(N, H), 0.0);
    float specular = pow(NdotH, 28.0) * 0.22 * (0.3 + 0.7 * v_foldAmount);

    // Fresnel rim reflection
    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.5) * 0.18 * v_foldAmount;

    // 3. Crease shadow and depth darkening
    float creaseShadow = mix(0.88, 1.0, smoothstep(0.0, 0.04, d));
    float depthDarkening = mix(1.0, 0.52, pow(d, 1.15) * v_foldAmount);

    vec3 finalRgb = color.rgb * diffuse * creaseShadow * depthDarkening;
    finalRgb += vec3(specular + fresnel);

    float edgeVignette = smoothstep(1.0, 0.96, d * v_foldAmount);
    float alpha = color.a * edgeVignette;

    fragColor = vec4(finalRgb, alpha);
}
`;

export const BLUR_FRAGMENT_SHADER_SOURCE = `#version 300 es
precision highp float;

in vec2 v_uv;
uniform sampler2D u_image;
uniform vec2 u_direction;
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
`;
