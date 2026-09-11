#version 300 es
precision highp float;

// Input attributes from grid mesh
layout(location = 0) in vec2 a_position; // Normalized grid position [-1, 1]
layout(location = 1) in vec2 a_uv;       // Texture coordinates [0, 1]

// Uniforms
uniform mat4 u_projectionMatrix;
uniform mat4 u_modelViewMatrix;
uniform float u_foldAmount;     // 0.0 (flat) to 1.0 (max fold)
uniform int u_hinge;            // 0 = LEFT hinge, 1 = RIGHT hinge
uniform vec2 u_imageAspect;     // (imageWidth/viewportWidth, imageHeight/viewportHeight) or fit scaling

// Outputs to fragment shader
out vec2 v_uv;
out vec3 v_normal;
out vec3 v_viewPosition;
out float v_hingeDistance;      // Normalized distance from hinge [0, 1]
out float v_foldAmount;

const float PI = 3.14159265359;
const float MAX_FOLD_ANGLE = 1.38; // ~79 degrees maximum fold

void main() {
    v_uv = a_uv;
    v_foldAmount = u_foldAmount;

    // Determine normalized distance from hinge: s in [0, 1]
    float s = (u_hinge == 0) ? a_uv.x : (1.0 - a_uv.x);
    v_hingeDistance = s;

    // Organic bend profile: smooth easing near hinge, rigid plane beyond
    // Creates a physical hinge curvature followed by a planar wing
    float bendRadius = 0.15;
    float bendFactor = smoothstep(0.0, bendRadius, s);
    float angle = u_foldAmount * MAX_FOLD_ANGLE * bendFactor;

    // Base position scaled to fit aspect ratio
    float xBase = a_position.x * u_imageAspect.x;
    float yBase = a_position.y * u_imageAspect.y;

    // Calculate 3D position folding around virtual hinge
    vec3 localPos = vec3(xBase, yBase, 0.0);
    vec3 normal = vec3(0.0, 0.0, 1.0);

    if (u_foldAmount > 0.0001) {
        if (u_hinge == 0) {
            // LEFT HINGE: rotation axis at x = -u_imageAspect.x
            float hingeX = -u_imageAspect.x;
            float distFromHinge = localPos.x - hingeX;

            // Rotate around hinge axis: x moves in, z pushes backwards
            localPos.x = hingeX + distFromHinge * cos(angle);
            localPos.z = -distFromHinge * sin(angle);

            // Normal rotates accordingly
            normal = vec3(sin(angle), 0.0, cos(angle));
        } else {
            // RIGHT HINGE: rotation axis at x = +u_imageAspect.x
            float hingeX = u_imageAspect.x;
            float distFromHinge = hingeX - localPos.x;

            // Rotate around hinge axis
            localPos.x = hingeX - distFromHinge * cos(angle);
            localPos.z = -distFromHinge * sin(angle);

            // Normal rotates accordingly
            normal = vec3(-sin(angle), 0.0, cos(angle));
        }
    }

    vec4 viewPos = u_modelViewMatrix * vec4(localPos, 1.0);
    v_viewPosition = viewPos.xyz;
    v_normal = normalize(mat3(u_modelViewMatrix) * normal);

    gl_Position = u_projectionMatrix * viewPos;
}
