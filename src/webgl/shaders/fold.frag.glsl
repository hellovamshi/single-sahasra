#version 300 es
precision highp float;

in vec2 v_uv;
in vec3 v_normal;
in vec3 v_viewPosition;
in float v_hingeDistance;
in float v_foldAmount;
in vec2 v_gridUv;

uniform sampler2D u_texture;
uniform float u_maxLod;          // Mipmap level (4.0 - 6.0)
uniform float u_tiltAngle;       // Device tilt angle in degrees
uniform vec2 u_resolution;       // Viewport resolution

out vec4 fragColor;

void main() {
    // Normalized distance from hinge: 0.0 at hinge, 1.0 at outer edge
    float s = clamp(v_hingeDistance, 0.0, 1.0);

    // 1. PROGRESSIVE DEFOCUS BLUR & CHROMATIC GLASS DISPERSION
    float blurIntensity = pow(s, 1.35) * v_foldAmount;
    float targetLod = blurIntensity * u_maxLod;

    // Subtle chromatic dispersion across curved glass
    float disp = blurIntensity * 0.0045;
    vec2 offsetR = vec2(disp, disp * 0.5);
    vec2 offsetB = vec2(-disp, -disp * 0.5);

    // Multi-tap sample with chromatic split for optical glass realism
    float r = textureLod(u_texture, v_uv + offsetR, targetLod).r;
    float g = textureLod(u_texture, v_uv, targetLod).g;
    float b = textureLod(u_texture, v_uv + offsetB, targetLod).b;
    float a = textureLod(u_texture, v_uv, targetLod).a;

    // 4 additional Poisson taps to soften bokeh
    float poissScale = blurIntensity * 0.004;
    vec4 tap1 = textureLod(u_texture, v_uv + vec2(poissScale, poissScale), targetLod);
    vec4 tap2 = textureLod(u_texture, v_uv + vec2(-poissScale, poissScale), targetLod);
    vec4 tap3 = textureLod(u_texture, v_uv + vec2(-poissScale, -poissScale), targetLod);
    vec4 tap4 = textureLod(u_texture, v_uv + vec2(poissScale, -poissScale), targetLod);
    vec4 avgColor = (tap1 + tap2 + tap3 + tap4) * 0.25;

    vec3 baseColor = mix(vec3(r, g, b), avgColor.rgb, clamp(blurIntensity * 1.5, 0.0, 0.7));

    // 2. GLASS SHADING & SPECULAR REFLECTION
    vec3 N = normalize(v_normal);
    vec3 V = normalize(-v_viewPosition);

    // Dynamic light based on phone roll angle
    float tiltRad = radians(u_tiltAngle * 0.4);
    vec3 lightDir = normalize(vec3(sin(tiltRad) * 0.4 + 0.1, 0.5, 0.85));
    vec3 H = normalize(lightDir + V);

    float NdotH = max(dot(N, H), 0.0);
    float NdotV = max(dot(N, V), 0.0);

    // Dual-lobe glass reflection:
    // Broad glossy sheen + soft ambient glass highlights
    float wideSheen = pow(NdotH, 8.0) * 0.09 * (0.4 + 0.6 * v_foldAmount);
    float sharpSpec = pow(NdotH, 32.0) * 0.18 * v_foldAmount;

    // Soft Fresnel glass rim (cool tone)
    float fresnel = pow(1.0 - NdotV, 3.5) * 0.12 * v_foldAmount;
    vec3 glassRimColor = vec3(0.85, 0.92, 1.0) * fresnel;

    // 3. DEPTH SHADOW & VOID INTEGRATION
    // Soft depth attenuation as the sheet folds backward
    float depthFade = mix(1.0, 0.48, pow(s, 1.2) * v_foldAmount);

    vec3 finalRgb = baseColor * depthFade;
    finalRgb += vec3(wideSheen + sharpSpec);
    finalRgb += glassRimColor;

    // 4. SEAMLESS GLASS EDGE FADE (NO SHARP CUTTING BORDERS)
    // The receding outer edge dissolves softly into the background void
    float outerEdgeFade = smoothstep(1.0, 0.76, s * v_foldAmount);

    // Subtle edge feathering on the 4 canvas boundaries to avoid sharp polygon clipping
    float borderFeatherX = smoothstep(0.0, 0.015, v_gridUv.x) * (1.0 - smoothstep(0.985, 1.0, v_gridUv.x));
    float borderFeatherY = smoothstep(0.0, 0.015, v_gridUv.y) * (1.0 - smoothstep(0.985, 1.0, v_gridUv.y));
    float seamlessMask = borderFeatherX * borderFeatherY;

    // Glass opacity smoothly blending into the black void
    float finalAlpha = a * outerEdgeFade * mix(1.0, seamlessMask, v_foldAmount * 0.5);

    fragColor = vec4(finalRgb * finalAlpha, finalAlpha);
}
