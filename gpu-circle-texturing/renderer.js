const VERTEX_SHADER = `
  attribute vec2 a_position;
  uniform vec2 u_resolution;
  varying vec2 v_pos;

  void main() {
    v_pos = a_position;
    gl_Position = vec4(a_position / (u_resolution * 0.5), 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision mediump float;
  varying vec2 v_pos;
  uniform sampler2D u_texture;
  uniform float u_innerRadius;
  uniform float u_outerRadius;
  uniform float u_midAngle;
  uniform float u_halfSpan;

  #define PI  3.14159265359
  #define TAU 6.28318530718

  void main() {
    float r = length(v_pos);
    if (r < u_innerRadius || r > u_outerRadius) discard;

    float angle = atan(v_pos.y, v_pos.x);
    float da = angle - u_midAngle;
    da -= TAU * floor((da + PI) / TAU);   // wrap to [-PI, PI]

    if (abs(da) > abs(u_halfSpan)) discard;

    float u = da / u_halfSpan * 0.5 + 0.5;
    float v = (r - u_innerRadius) / (u_outerRadius - u_innerRadius);
    gl_FragColor = texture2D(u_texture, vec2(u, v));
  }
`;

const WIRE_VERTEX_SHADER = `
  attribute vec2 a_position;
  uniform vec2 u_resolution;

  void main() {
    gl_Position = vec4(a_position / (u_resolution * 0.5), 0.0, 1.0);
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
 * Build a bounding quad (2 triangles) for the annular sector.
 * Uses the outer radius as extent — the fragment shader discards
 * pixels outside the actual sector.
 */
function buildQuad(outerRadius) {
  const r = outerRadius;
  // Two triangles covering [-r, r] x [-r, r]
  // prettier-ignore
  return new Float32Array([
    -r, -r,   r, -r,  -r,  r,
    -r,  r,   r, -r,   r,  r,
  ]);
}

/**
 * Build line vertices for the sector outline:
 * inner arc, outer arc, and two radial edges.
 */
function buildSectorOutline({ innerRadius, outerRadius, startAngle, endAngle }) {
  const arcSteps = 64;
  // inner arc + outer arc + 2 radial lines (2 verts each)
  const verts = [];

  // Inner arc
  for (let i = 0; i <= arcSteps; i++) {
    const a = startAngle + (endAngle - startAngle) * (i / arcSteps);
    verts.push(innerRadius * Math.cos(a), innerRadius * Math.sin(a));
  }
  // Outer arc (reverse direction to form a closed loop)
  for (let i = arcSteps; i >= 0; i--) {
    const a = startAngle + (endAngle - startAngle) * (i / arcSteps);
    verts.push(outerRadius * Math.cos(a), outerRadius * Math.sin(a));
  }

  return new Float32Array(verts);
}

export function createCircleRenderer(canvas) {
  const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false });
  if (!gl) throw new Error("WebGL not supported");

  const program = linkProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
  const aPosition = gl.getAttribLocation(program, "a_position");
  const uResolution = gl.getUniformLocation(program, "u_resolution");
  const uTexture = gl.getUniformLocation(program, "u_texture");
  const uInnerRadius = gl.getUniformLocation(program, "u_innerRadius");
  const uOuterRadius = gl.getUniformLocation(program, "u_outerRadius");
  const uMidAngle = gl.getUniformLocation(program, "u_midAngle");
  const uHalfSpan = gl.getUniformLocation(program, "u_halfSpan");

  const wireProgram = linkProgram(gl, WIRE_VERTEX_SHADER, WIRE_FRAGMENT_SHADER);
  const wAPosition = gl.getAttribLocation(wireProgram, "a_position");
  const wUResolution = gl.getUniformLocation(wireProgram, "u_resolution");
  const wUColor = gl.getUniformLocation(wireProgram, "u_color");

  const posBuf = gl.createBuffer();
  const wireBuf = gl.createBuffer();

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
      const midAngle = (startAngle + endAngle) * 0.5;
      const halfSpan = (endAngle - startAngle) * 0.5;

      // --- Textured quad pass ---
      gl.useProgram(program);
      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.uniform1i(uTexture, 0);
      gl.uniform1f(uInnerRadius, innerRadius);
      gl.uniform1f(uOuterRadius, outerRadius);
      gl.uniform1f(uMidAngle, midAngle);
      gl.uniform1f(uHalfSpan, halfSpan);

      const quad = buildQuad(outerRadius);
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
      gl.bufferData(gl.ARRAY_BUFFER, quad, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(aPosition);
      gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

      const tex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.deleteTexture(tex);

      // --- Debug: sector outline ---
      if (debug) {
        gl.useProgram(wireProgram);
        gl.uniform2f(wUResolution, canvas.width, canvas.height);
        gl.uniform4f(wUColor, 1.0, 1.0, 0.0, 0.8);

        const outline = buildSectorOutline({ innerRadius, outerRadius, startAngle, endAngle });
        gl.bindBuffer(gl.ARRAY_BUFFER, wireBuf);
        gl.bufferData(gl.ARRAY_BUFFER, outline, gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(wAPosition);
        gl.vertexAttribPointer(wAPosition, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.LINE_LOOP, 0, outline.length / 2);
      }
    }

    queue.length = 0;
  }

  return { drawSlice, flush };
}
