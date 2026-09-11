#version 300 es
precision highp float;

layout(location = 0) in vec2 a_position; // Grid position [-1, 1]
layout(location = 1) in vec2 a_uv;       // Grid UV [0, 1]

uniform mat4 u_projectionMatrix;
uniform mat4 u_modelViewMatrix;
uniform float u_foldAmount;     // 0.0 (flat) to 1.0 (max fold)
uniform int u_hinge;            // 0 = LEFT hinge, 1 = RIGHT hinge
uniform vec2 u_screenSize;      // (halfVisibleWidth, halfVisibleHeight)
uniform vec2 u_uvScale;         // UV scale for aspect cover
uniform vec2 u_uvOffset;        // UV offset for aspect cover

out vec2 v_uv;
out vec3 v_normal;
out vec3 v_viewPosition;
out float v_hingeDistance;
out float v_foldAmount;
out vec2 v_gridUv;

const float MAX_FOLD_ANGLE = 1.42; // ~81 degrees

void main() {
    v_gridUv = a_uv;
    // Compute aspect-ratio covered UV so image always fills screen seamlessly
    v_uv = a_uv * u_uvScale + u_uvOffset;
    v_foldAmount = u_foldAmount;

    // Base position precisely fitting the screen viewport
    float xBase = a_position.x * u_screenSize.x;
    float yBase = a_position.y * u_screenSize.y;

    // Normalized distance from hinge across the screen: s in [0, 1]
    // s = 0.0 at the hinge bezel, s = 1.0 at the opposite edge
    float s = (u_hinge == 0) ? a_uv.x : (1.0 - a_uv.x);
    v_hingeDistance = s;

    // Smooth organic glass curvature:
    // Continuous bend without sharp kinks or cardboard creases
    float bendAngle = u_foldAmount * MAX_FOLD_ANGLE * pow(s, 1.15);

    vec3 localPos = vec3(xBase, yBase, 0.0);
    vec3 normal = vec3(0.0, 0.0, 1.0);

    if (u_foldAmount > 0.0001) {
        if (u_hinge == 0) {
            // LEFT HINGE: rotation anchored at left screen edge (-u_screenSize.x)
            float hingeX = -u_screenSize.x;
            float distFromHinge = localPos.x - hingeX;

            localPos.x = hingeX + distFromHinge * cos(bendAngle);
            localPos.z = -distFromHinge * sin(bendAngle) * 1.2;

            normal = vec3(sin(bendAngle), 0.0, cos(bendAngle));
        } else {
            // RIGHT HINGE: rotation anchored at right screen edge (+u_screenSize.x)
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
