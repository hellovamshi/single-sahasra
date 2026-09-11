#version 300 es
precision highp float;

// Inputs from vertex shader
in vec2 v_uv;
in vec3 v_normal;
in vec3 v_viewPosition;
in float v_hingeDistance;
in float v_foldAmount;

// Uniforms
uniform sampler2D u_texture;
uniform float u_maxLod;          // Maximum mipmap LOD (e.g., 5.0)
uniform float u_tiltAngle;       // Device tilt angle in degrees
uniform vec2 u_resolution;       // Viewport resolution in CSS/device pixels

// Fragment output
out vec4 fragColor;

void main() {
    // Check UV bounds
    if (v_uv.x < 0.0 || v_uv.x > 1.0 || v_uv.y < 0.0 || v_uv.y > 1.0) {
        discard;
    }

    // Normalized distance from hinge: 0.0 at hinge, 1.0 at outer folding edge
    float d = clamp(v_hingeDistance, 0.0, 1.0);

    // 1. PROGRESSIVE DEFOCUS BLUR VIA HARDWARE MIPMAPS & POISSON TAP
    // Blur factor scales non-linearly with distance from hinge and fold amount
    float blurIntensity = pow(d, 1.35) * v_foldAmount;
    float targetLod = blurIntensity * u_maxLod;

    // Multi-tap progressive blur: sample mip levels with micro-offsets for silky bokeh
    vec4 color = vec4(0.0);
    float offsetScale = blurIntensity * 0.005;

    // 5-tap kernel for smooth anti-aliased defocus
    color += textureLod(u_texture, v_uv, targetLod) * 0.40;
    color += textureLod(u_texture, v_uv + vec2(offsetScale, offsetScale), targetLod) * 0.15;
    color += textureLod(u_texture, v_uv + vec2(-offsetScale, offsetScale), targetLod) * 0.15;
    color += textureLod(u_texture, v_uv + vec2(-offsetScale, -offsetScale), targetLod) * 0.15;
    color += textureLod(u_texture, v_uv + vec2(offsetScale, -offsetScale), targetLod) * 0.15;

    // 2. LIGHTING & PHYSICAL DEPTH CUES
    vec3 N = normalize(v_normal);
    vec3 V = normalize(-v_viewPosition); // View vector towards camera

    // Dynamic light direction responsive to device tilt
    float lightTiltRad = radians(u_tiltAngle * 0.5);
    vec3 lightDir = normalize(vec3(sin(lightTiltRad) * 0.35 + 0.15, 0.45, 0.85));
    vec3 H = normalize(lightDir + V);

    // Subtle diffuse response
    float NdotL = max(dot(N, lightDir), 0.0);
    float diffuse = mix(0.92, 1.0, NdotL);

    // Specular oleophobic glass sheen sweeping across the fold curvature
    float NdotH = max(dot(N, H), 0.0);
    float specular = pow(NdotH, 28.0) * 0.22 * (0.3 + 0.7 * v_foldAmount);

    // Fresnel rim reflection on curved grazing edges
    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.5) * 0.18 * v_foldAmount;

    // 3. DEPTH SHADING & EDGE DARKENING
    // Crease shadow near hinge (contact occlusion)
    float creaseShadow = mix(0.88, 1.0, smoothstep(0.0, 0.04, d));

    // Darkening towards the deep folded edge (dissolving into the dark void)
    float depthDarkening = mix(1.0, 0.52, pow(d, 1.15) * v_foldAmount);

    // Combine shading
    vec3 finalRgb = color.rgb * diffuse * creaseShadow * depthDarkening;
    finalRgb += vec3(specular + fresnel);

    // Outer edge soft vignette into dark void
    float edgeVignette = smoothstep(1.0, 0.96, d * v_foldAmount);
    float alpha = color.a * edgeVignette;

    fragColor = vec4(finalRgb, alpha);
}
