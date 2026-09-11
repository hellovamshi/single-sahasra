/**
 * WebGL 2 shader compilation, program linking, and mesh geometry helpers.
 */

export function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error('Failed to allocate WebGL shader object');
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compilation failure:\n${info}`);
  }

  return shader;
}

export function createProgram(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string
): WebGLProgram {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

  const program = gl.createProgram();
  if (!program) {
    throw new Error('Failed to allocate WebGL program');
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`WebGL program link failure:\n${info}`);
  }

  // Clean up detached shaders
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  return program;
}

export interface GridMeshBuffers {
  vao: WebGLVertexArrayObject;
  vbo: WebGLBuffer;
  ibo: WebGLBuffer;
  indexCount: number;
}

/**
 * Generates a subdivided quad mesh with indexed triangles.
 * cols: horizontal subdivisions (e.g. 256 for smooth fold curvature)
 * rows: vertical subdivisions (e.g. 4)
 */
export function createSubdividedMesh(
  gl: WebGL2RenderingContext,
  cols: number = 256,
  rows: number = 4
): GridMeshBuffers {
  const vao = gl.createVertexArray();
  if (!vao) throw new Error('Failed to create VAO');
  gl.bindVertexArray(vao);

  const numVertices = (cols + 1) * (rows + 1);
  // Each vertex has: x, y (position: 2 floats) + u, v (texcoord: 2 floats) = 4 floats
  const vertexData = new Float32Array(numVertices * 4);

  let vIdx = 0;
  for (let r = 0; r <= rows; r++) {
    const yNorm = r / rows; // 0 to 1
    const yPos = 1.0 - yNorm * 2.0; // 1.0 (top) to -1.0 (bottom)
    const v = yNorm; // 0 (top) to 1 (bottom)

    for (let c = 0; c <= cols; c++) {
      const xNorm = c / cols; // 0 to 1
      const xPos = -1.0 + xNorm * 2.0; // -1.0 (left) to 1.0 (right)
      const u = xNorm; // 0 (left) to 1 (right)

      vertexData[vIdx++] = xPos;
      vertexData[vIdx++] = yPos;
      vertexData[vIdx++] = u;
      vertexData[vIdx++] = v;
    }
  }

  const vbo = gl.createBuffer();
  if (!vbo) throw new Error('Failed to create VBO');
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

  // Position: layout (location = 0) in vec2 a_position;
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 4 * 4, 0);

  // UV: layout (location = 1) in vec2 a_uv;
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 4 * 4, 2 * 4);

  // Index buffer
  const numQuads = cols * rows;
  const indices = new Uint16Array(numQuads * 6);
  let iIdx = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const topLeft = r * (cols + 1) + c;
      const topRight = topLeft + 1;
      const bottomLeft = (r + 1) * (cols + 1) + c;
      const bottomRight = bottomLeft + 1;

      // Triangle 1
      indices[iIdx++] = topLeft;
      indices[iIdx++] = bottomLeft;
      indices[iIdx++] = topRight;

      // Triangle 2
      indices[iIdx++] = topRight;
      indices[iIdx++] = bottomLeft;
      indices[iIdx++] = bottomRight;
    }
  }

  const ibo = gl.createBuffer();
  if (!ibo) throw new Error('Failed to create IBO');
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  // Unbind
  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

  return {
    vao,
    vbo,
    ibo,
    indexCount: indices.length,
  };
}
