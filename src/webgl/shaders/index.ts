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
uniform vec2 u_screenSize;
uniform vec2 u_uvScale;
uniform vec2 u_uvOffset;

out vec2 v_uv;
out vec3 v_normal;
out vec3 v_viewPosition;
out float v_hingeDistance;
out float v_foldAmount;
out vec2 v_gridUv;

const float MAX_FOLD_ANGLE = 1.42;

void main() {
    v_gridUv = a_uv;
    v_uv = a_uv * u_uvScale + u_uvOffset;
    v_foldAmount = u_foldAmount;

    float xBase = a_position.x * u_screenSize.x;
    float yBase = a_position.y * u_screenSize.y;

    float s = (u_hinge == 0) ? a_uv.x : (1.0 - a_uv.x);
    v_hingeDistance = s;

    float bendAngle = u_foldAmount * MAX_FOLD_ANGLE * pow(s, 1.15);

    vec3 localPos = vec3(xBase, yBase, 0.0);
    vec3 normal = vec3(0.0, 0.0, 1.0);

    if (u_foldAmount > 0.0001) {
        if (u_hinge == 0) {
            float hingeX = -u_screenSize.x;
            float distFromHinge = localPos.x - hingeX;
            localPos.x = hingeX + distFromHinge * cos(bendAngle);
            localPos.z = -distFromHinge * sin(bendAngle) * 1.2;
            normal = vec3(sin(bendAngle), 0.0, cos(bendAngle));
        } else {
            float hingeX = u_screenSize.x;
            float distFromHinge = hingeX - localPos.x;
            localPos.x = hingeX - distFromHinge * cos(bendAngle);
            localPos.z = -distFromHinge * sin(bendAngle) * 1.2;
            normal = vec3(-sin(bendAngle), 0.0, cos(bendAngle));
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
in vec2 v_gridUv;

uniform sampler2D u_texture;
uniform float u_maxLod;
uniform float u_tiltAngle;
uniform vec2 u_resolution;

out vec4 fragColor;

void main() {
    float s = clamp(v_hingeDistance, 0.0, 1.0);

    float blurIntensity = pow(s, 1.35) * v_foldAmount;
    float targetLod = blurIntensity * u_maxLod;

    float disp = blurIntensity * 0.0045;
    vec2 offsetR = vec2(disp, disp * 0.5);
    vec2 offsetB = vec2(-disp, -disp * 0.5);

    float r = textureLod(u_texture, v_uv + offsetR, targetLod).r;
    float g = textureLod(u_texture, v_uv, targetLod).g;
    float b = textureLod(u_texture, v_uv + offsetB, targetLod).b;
    float a = textureLod(u_texture, v_uv, targetLod).a;

    float poissScale = blurIntensity * 0.004;
    vec4 tap1 = textureLod(u_texture, v_uv + vec2(poissScale, poissScale), targetLod);
    vec4 tap2 = textureLod(u_texture, v_uv + vec2(-poissScale, poissScale), targetLod);
    vec4 tap3 = textureLod(u_texture, v_uv + vec2(-poissScale, -poissScale), targetLod);
    vec4 tap4 = textureLod(u_texture, v_uv + vec2(poissScale, -poissScale), targetLod);
    vec4 avgColor = (tap1 + tap2 + tap3 + tap4) * 0.25;

    vec3 baseColor = mix(vec3(r, g, b), avgColor.rgb, clamp(blurIntensity * 1.5, 0.0, 0.7));

    vec3 N = normalize(v_normal);
    vec3 V = normalize(-v_viewPosition);

    float tiltRad = radians(u_tiltAngle * 0.4);
    vec3 lightDir = normalize(vec3(sin(tiltRad) * 0.4 + 0.1, 0.5, 0.85));
    vec3 H = normalize(lightDir + V);

    float NdotH = max(dot(N, H), 0.0);
    float NdotV = max(dot(N, V), 0.0);

    float wideSheen = pow(NdotH, 8.0) * 0.09 * (0.4 + 0.6 * v_foldAmount);
    float sharpSpec = pow(NdotH, 32.0) * 0.18 * v_foldAmount;

    float fresnel = pow(1.0 - NdotV, 3.5) * 0.12 * v_foldAmount;
    vec3 glassRimColor = vec3(0.85, 0.92, 1.0) * fresnel;

    float depthFade = mix(1.0, 0.48, pow(s, 1.2) * v_foldAmount);

    vec3 finalRgb = baseColor * depthFade;
    finalRgb += vec3(wideSheen + sharpSpec);
    finalRgb += glassRimColor;

    float outerEdgeFade = smoothstep(1.0, 0.76, s * v_foldAmount);
    float borderFeatherX = smoothstep(0.0, 0.015, v_gridUv.x) * (1.0 - smoothstep(0.985, 1.0, v_gridUv.x));
    float borderFeatherY = smoothstep(0.0, 0.015, v_gridUv.y) * (1.0 - smoothstep(0.985, 1.0, v_gridUv.y));
    float seamlessMask = borderFeatherX * borderFeatherY;

    float finalAlpha = a * outerEdgeFade * mix(1.0, seamlessMask, v_foldAmount * 0.5);

    fragColor = vec4(finalRgb * finalAlpha, finalAlpha);
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
