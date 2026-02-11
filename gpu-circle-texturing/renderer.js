const VERTEX_SHADER = `
  attribute vec2 a_position;
  attribute vec2 a_uv;
  uniform vec2 u_resolution;
  varying vec2 v_uv;

  void main() {
    // Convert pixel coords (origin at canvas center) to clip space.
    vec2 clip = a_position / (u_resolution * 0.5);
    gl_Position = vec4(clip, 0.0, 1.0);
    v_uv = a_uv;
  }
`;

const FRAGMENT_SHADER = `
  precision mediump float;
  varying vec2 v_uv;
  uniform sampler2D u_texture;

  void main() {
    gl_FragColor = texture2D(u_texture, v_uv);
  }
`;

const WIRE_VERTEX_SHADER = `
  attribute vec2 a_position;
  uniform vec2 u_resolution;

  void main() {
    vec2 clip = a_position / (u_resolution * 0.5);
    gl_Position = vec4(clip, 0.0, 1.0);
  }
`;

const WIRE_FRAGMENT_SHADER = `
  precision mediump float;
  uniform vec4 u_color;

  void main() {
    gl_FragColor = u_color;
  }
`;

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error("Shader compile error: " + info);
  }
  return shader;
}

function linkProgram(gl, vsSrc, fsSrc) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(prog);
    gl.deleteProgram(prog);
    throw new Error("Program link error: " + info);
  }
  return prog;
}

/**
 * Build annular-sector geometry as a triangle strip.
 * Returns { positions: Float32Array, uvs: Float32Array, count: number }.
 */
function buildSliceGeometry({ innerRadius, outerRadius, startAngle, endAngle }) {
  const arcLength = Math.abs(endAngle - startAngle) * outerRadius;
  const segments = Math.max(4, Math.ceil(arcLength / 5));

  // 2 triangles per segment, 3 vertices each → 6 vertices per segment
  const vertexCount = segments * 6;
  const positions = new Float32Array(vertexCount * 2);
  const uvs = new Float32Array(vertexCount * 2);

  for (let i = 0; i < segments; i++) {
    const u0 = i / segments;
    const u1 = (i + 1) / segments;
    const a0 = startAngle + (endAngle - startAngle) * u0;
    const a1 = startAngle + (endAngle - startAngle) * u1;

    const cos0 = Math.cos(a0), sin0 = Math.sin(a0);
    const cos1 = Math.cos(a1), sin1 = Math.sin(a1);

    // Four corners of the quad: inner0, outer0, inner1, outer1
    const ix0 = innerRadius * cos0, iy0 = innerRadius * sin0;
    const ox0 = outerRadius * cos0, oy0 = outerRadius * sin0;
    const ix1 = innerRadius * cos1, iy1 = innerRadius * sin1;
    const ox1 = outerRadius * cos1, oy1 = outerRadius * sin1;

    // Triangle 1: inner0, outer0, inner1
    const base = i * 12; // 6 vertices * 2 components
    positions[base]     = ix0; positions[base + 1]  = iy0;
    positions[base + 2] = ox0; positions[base + 3]  = oy0;
    positions[base + 4] = ix1; positions[base + 5]  = iy1;

    // Triangle 2: inner1, outer0, outer1
    positions[base + 6]  = ix1; positions[base + 7]  = iy1;
    positions[base + 8]  = ox0; positions[base + 9]  = oy0;
    positions[base + 10] = ox1; positions[base + 11] = oy1;

    // UVs: u = angular (0→1), v = radial (0 = inner, 1 = outer)
    const uvBase = i * 12;
    uvs[uvBase]     = u0; uvs[uvBase + 1]  = 0; // inner0
    uvs[uvBase + 2] = u0; uvs[uvBase + 3]  = 1; // outer0
    uvs[uvBase + 4] = u1; uvs[uvBase + 5]  = 0; // inner1

    uvs[uvBase + 6]  = u1; uvs[uvBase + 7]  = 0; // inner1
    uvs[uvBase + 8]  = u0; uvs[uvBase + 9]  = 1; // outer0
    uvs[uvBase + 10] = u1; uvs[uvBase + 11] = 1; // outer1
  }

  return { positions, uvs, count: vertexCount };
}

export function createCircleRenderer(canvas) {
  const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false });
  if (!gl) throw new Error("WebGL not supported");

  const program = linkProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
  const aPosition = gl.getAttribLocation(program, "a_position");
  const aUv = gl.getAttribLocation(program, "a_uv");
  const uResolution = gl.getUniformLocation(program, "u_resolution");
  const uTexture = gl.getUniformLocation(program, "u_texture");

  const wireProgram = linkProgram(gl, WIRE_VERTEX_SHADER, WIRE_FRAGMENT_SHADER);
  const wAPosition = gl.getAttribLocation(wireProgram, "a_position");
  const wUResolution = gl.getUniformLocation(wireProgram, "u_resolution");
  const wUColor = gl.getUniformLocation(wireProgram, "u_color");

  const posBuf = gl.createBuffer();
  const uvBuf = gl.createBuffer();
  const wireBuf = gl.createBuffer();

  // Queue of pending draw calls
  const queue = [];

  function drawSlice(bitmap, { innerRadius, outerRadius, startAngle, endAngle }) {
    queue.push({ bitmap, innerRadius, outerRadius, startAngle, endAngle });
  }

  function flush({ debug = false } = {}) {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    for (const slice of queue) {
      const { bitmap, innerRadius, outerRadius, startAngle, endAngle } = slice;
      const geom = buildSliceGeometry({ innerRadius, outerRadius, startAngle, endAngle });

      // --- Textured pass ---
      gl.useProgram(program);
      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.uniform1i(uTexture, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
      gl.bufferData(gl.ARRAY_BUFFER, geom.positions, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(aPosition);
      gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
      gl.bufferData(gl.ARRAY_BUFFER, geom.uvs, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(aUv);
      gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0);

      const tex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);

      gl.drawArrays(gl.TRIANGLES, 0, geom.count);
      gl.deleteTexture(tex);

      // --- Wireframe overlay ---
      if (debug) {
        gl.useProgram(wireProgram);
        gl.uniform2f(wUResolution, canvas.width, canvas.height);
        gl.uniform4f(wUColor, 1.0, 1.0, 0.0, 0.8);

        // Disable the UV attribute (wire shader doesn't use it)
        gl.disableVertexAttribArray(aUv);

        gl.bindBuffer(gl.ARRAY_BUFFER, wireBuf);
        gl.enableVertexAttribArray(wAPosition);

        // Draw each triangle as a LINE_LOOP (3 vertices each)
        const triCount = geom.count / 3;
        for (let t = 0; t < triCount; t++) {
          const off = t * 6; // 3 verts * 2 floats
          const tri = geom.positions.subarray(off, off + 6);
          gl.bufferData(gl.ARRAY_BUFFER, tri, gl.DYNAMIC_DRAW);
          gl.vertexAttribPointer(wAPosition, 2, gl.FLOAT, false, 0, 0);
          gl.drawArrays(gl.LINE_LOOP, 0, 3);
        }
      }
    }

    queue.length = 0;
  }

  return { drawSlice, flush };
}
