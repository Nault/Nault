// nano-webgl-pow
// Nano Currency Proof of Work Value generation using WebGL2
// Author:  numtel <ben@latenightsketches.com>
// License: MIT

// window.NanoWebglPow(hashHex, callback, progressCallback, threshold);
// @param hashHex           String   Previous Block Hash as Hex String
// @param callback          Function Called when work value found
//   Receives single string argument, work value as hex
// @param progressCallback  Function Optional
//   Receives single argument: n, number of frames so far
//   Return true to abort
// @param threshold         String   Optional difficulty threshold (default=0xFFFFFFF8 since v21)

(function(){
const defaultThreshold = '0xFFFFFFF8'

function array_hex(arr, index, length) {
  let out='';
  for(let i=length - 1;i>-1;i--) {
    out+=(arr[i] > 15 ? '' : '0') + arr[i].toString(16);
  }
  return out;
}

function hex_reverse(hex) {
  let out='';
  for(let i=hex.length;i>0;i-=2) {
    out+=hex.slice(i-2,i);
  }
  return out;
}

function calculate(hashHex, callback, progressCallback, threshold = defaultThreshold) {
  const canvas = document.createElement('canvas');

  canvas.width = window.NanoWebglPow.width;
  canvas.height = window.NanoWebglPow.height;

  const gl = canvas.getContext('webgl2');

  if(!gl)
    throw new Error('webgl2_required');

  if(!/^[A-F-a-f0-9]{64}$/.test(hashHex))
    throw new Error('invalid_hash');

  gl.clearColor(0, 0, 0, 1);

  const reverseHex = hex_reverse(hashHex);

  // Vertext Shader
  const vsSource = `#version 300 es
    precision highp float;
    layout (location=0) in vec4 position;
    layout (location=1) in vec2 uv;

    out vec2 uv_pos;

    void main() {
      uv_pos = uv;
      gl_Position = position;
    }`;

  // Fragment shader
  const fsSource = `#version 300 es
    precision highp float;
    precision highp int;

    in vec2 uv_pos;
    out vec4 fragColor;

    // Random work values
    // First 2 bytes will be overwritten by texture pixel position
    // Second 2 bytes will be modified if the canvas size is greater than 256x256
    uniform uvec4 u_work0;
    // Last 4 bytes remain as generated externally
    uniform uvec4 u_work1;

    // Defined separately from uint v[32] below as the original value is required
    // to calculate the second uint32 of the digest for threshold comparison
    #define BLAKE2B_IV32_1 0x6A09E667u

    // Both buffers represent 16 uint64s as 32 uint32s
    // because that's what GLSL offers, just like Javascript

    // Compression buffer, intialized to 2 instances of the initialization vector
    // The following values have been modified from the BLAKE2B_IV:
    // OUTLEN is constant 8 bytes
    // v[0] ^= 0x01010000u ^ uint(OUTLEN);
    // INLEN is constant 40 bytes: work value (8) + block hash (32)
    // v[24] ^= uint(INLEN);
    // It's always the "last" compression at this INLEN
    // v[28] = ~v[28];
    // v[29] = ~v[29];
    uint v[32] = uint[32](
      0xF2BDC900u, 0x6A09E667u, 0x84CAA73Bu, 0xBB67AE85u,
      0xFE94F82Bu, 0x3C6EF372u, 0x5F1D36F1u, 0xA54FF53Au,
      0xADE682D1u, 0x510E527Fu, 0x2B3E6C1Fu, 0x9B05688Cu,
      0xFB41BD6Bu, 0x1F83D9ABu, 0x137E2179u, 0x5BE0CD19u,
      0xF3BCC908u, 0x6A09E667u, 0x84CAA73Bu, 0xBB67AE85u,
      0xFE94F82Bu, 0x3C6EF372u, 0x5F1D36F1u, 0xA54FF53Au,
      0xADE682F9u, 0x510E527Fu, 0x2B3E6C1Fu, 0x9B05688Cu,
      0x04BE4294u, 0xE07C2654u, 0x137E2179u, 0x5BE0CD19u
    );
    // Input data buffer
    uint m[32];

    // These are offsets into the input data buffer for each mixing step.
    // They are multiplied by 2 from the original SIGMA values in
    // the C reference implementation, which refered to uint64s.
    const int SIGMA82[192] = int[192](
      0,2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,28,20,8,16,18,30,26,12,2,24,
      0,4,22,14,10,6,22,16,24,0,10,4,30,26,20,28,6,12,14,2,18,8,14,18,6,2,26,
      24,22,28,4,12,10,20,8,0,30,16,18,0,10,14,4,8,20,30,28,2,22,24,12,16,6,
      26,4,24,12,20,0,22,16,6,8,26,14,10,30,28,2,18,24,10,2,30,28,26,8,20,0,
      14,12,6,18,4,16,22,26,22,14,28,24,2,6,18,10,0,30,8,16,12,4,20,12,30,28,
      18,22,6,0,16,24,4,26,14,2,8,20,10,20,4,16,8,14,12,2,10,30,22,18,28,6,24,
      26,0,0,2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,28,20,8,16,18,30,26,12,
      2,24,0,4,22,14,10,6
    );

    // 64-bit unsigned addition within the compression buffer
    // Sets v[a,a+1] += b
    // b0 is the low 32 bits of b, b1 represents the high 32 bits
    void add_uint64 (int a, uint b0, uint b1) {
      uint o0 = v[a] + b0;
      uint o1 = v[a + 1] + b1;
      if (v[a] > 0xFFFFFFFFu - b0) { // did low 32 bits overflow?
        o1++;
      }
      v[a] = o0;
      v[a + 1] = o1;
    }
    // Sets v[a,a+1] += v[b,b+1]
    void add_uint64 (int a, int b) {
      add_uint64(a, v[b], v[b+1]);
    }

    // G Mixing function
    void B2B_G (int a, int b, int c, int d, int ix, int iy) {
      add_uint64(a, b);
      add_uint64(a, m[ix], m[ix + 1]);

      // v[d,d+1] = (v[d,d+1] xor v[a,a+1]) rotated to the right by 32 bits
      uint xor0 = v[d] ^ v[a];
      uint xor1 = v[d + 1] ^ v[a + 1];
      v[d] = xor1;
      v[d + 1] = xor0;

      add_uint64(c, d);

      // v[b,b+1] = (v[b,b+1] xor v[c,c+1]) rotated right by 24 bits
      xor0 = v[b] ^ v[c];
      xor1 = v[b + 1] ^ v[c + 1];
      v[b] = (xor0 >> 24) ^ (xor1 << 8);
      v[b + 1] = (xor1 >> 24) ^ (xor0 << 8);

      add_uint64(a, b);
      add_uint64(a, m[iy], m[iy + 1]);

      // v[d,d+1] = (v[d,d+1] xor v[a,a+1]) rotated right by 16 bits
      xor0 = v[d] ^ v[a];
      xor1 = v[d + 1] ^ v[a + 1];
      v[d] = (xor0 >> 16) ^ (xor1 << 16);
      v[d + 1] = (xor1 >> 16) ^ (xor0 << 16);

      add_uint64(c, d);

      // v[b,b+1] = (v[b,b+1] xor v[c,c+1]) rotated right by 63 bits
      xor0 = v[b] ^ v[c];
      xor1 = v[b + 1] ^ v[c + 1];
      v[b] = (xor1 >> 31) ^ (xor0 << 1);
      v[b + 1] = (xor0 >> 31) ^ (xor1 << 1);
    }

    void main() {
      int i;
      uint uv_x = uint(uv_pos.x * ${canvas.width - 1}.);
      uint uv_y = uint(uv_pos.y * ${canvas.height - 1}.);
      uint x_pos = uv_x % 256u;
      uint y_pos = uv_y % 256u;
      uint x_index = (uv_x - x_pos) / 256u;
      uint y_index = (uv_y - y_pos) / 256u;

      // First 2 work bytes are the x,y pos within the 256x256 area, the next
      //  two bytes are modified from the random generated value, XOR'd with
      //   the x,y area index of where this pixel is located
      m[0] = (x_pos ^ (y_pos << 8) ^ ((u_work0.b ^ x_index) << 16) ^ ((u_work0.a ^ y_index) << 24));
      // Remaining bytes are un-modified from the random generated value
      m[1] = (u_work1.r ^ (u_work1.g << 8) ^ (u_work1.b << 16) ^ (u_work1.a << 24));

      // Block hash
      m[2] = 0x${reverseHex.slice(56,64)}u;
      m[3] = 0x${reverseHex.slice(48,56)}u;
      m[4] = 0x${reverseHex.slice(40,48)}u;
      m[5] = 0x${reverseHex.slice(32,40)}u;
      m[6] = 0x${reverseHex.slice(24,32)}u;
      m[7] = 0x${reverseHex.slice(16,24)}u;
      m[8] = 0x${reverseHex.slice(8,16)}u;
      m[9] = 0x${reverseHex.slice(0,8)}u;

      // twelve rounds of mixing
      for(i=0;i<12;i++) {
        B2B_G(0, 8, 16, 24, SIGMA82[i * 16 + 0], SIGMA82[i * 16 + 1]);
        B2B_G(2, 10, 18, 26, SIGMA82[i * 16 + 2], SIGMA82[i * 16 + 3]);
        B2B_G(4, 12, 20, 28, SIGMA82[i * 16 + 4], SIGMA82[i * 16 + 5]);
        B2B_G(6, 14, 22, 30, SIGMA82[i * 16 + 6], SIGMA82[i * 16 + 7]);
        B2B_G(0, 10, 20, 30, SIGMA82[i * 16 + 8], SIGMA82[i * 16 + 9]);
        B2B_G(2, 12, 22, 24, SIGMA82[i * 16 + 10], SIGMA82[i * 16 + 11]);
        B2B_G(4, 14, 16, 26, SIGMA82[i * 16 + 12], SIGMA82[i * 16 + 13]);
        B2B_G(6, 8, 18, 28, SIGMA82[i * 16 + 14], SIGMA82[i * 16 + 15]);
      }

      // Threshold test, first 4 bytes not significant,
      //  only calculate digest of the second 4 bytes
      if((BLAKE2B_IV32_1 ^ v[1] ^ v[17]) > ` + threshold + `u) {
        // Success found, return pixel data so work value can be constructed
        fragColor = vec4(
          float(x_index + 1u)/255., // +1 to distinguish from 0 (unsuccessful) pixels
          float(y_index + 1u)/255., // Same as previous
          float(x_pos)/255., // Return the 2 custom bytes used in work value
          float(y_pos)/255.  // Second custom byte
        );
      }
    }`;

  const vertexShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertexShader, vsSource);
  gl.compileShader(vertexShader);

  if(!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS))
    throw gl.getShaderInfoLog(vertexShader);

  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragmentShader, fsSource);
  gl.compileShader(fragmentShader);

  if(!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS))
    throw gl.getShaderInfoLog(fragmentShader);

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if(!gl.getProgramParameter(program, gl.LINK_STATUS))
    throw gl.getProgramInfoLog(program);

  gl.useProgram(program);

  // Construct simple 2D geometry
  const triangleArray = gl.createVertexArray();
  gl.bindVertexArray(triangleArray);

  // Vertex Positions, 2 triangles
  const positions = new Float32Array([
    -1,-1,0, -1,1,0, 1,1,0,
    1,-1,0, 1,1,0, -1,-1,0
  ]);
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(0);

  // Texture Positions
  const uvPosArray = new Float32Array([
    1,1, 1,0, 0,0,   0,1, 0,0, 1,1
  ]);
  const uvBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, uvPosArray, gl.STATIC_DRAW);
  gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(1);

  const work0Location = gl.getUniformLocation(program, 'u_work0');
  const work1Location = gl.getUniformLocation(program, 'u_work1');

  // Draw output until success or progressCallback says to stop
  const work0 = new Uint8Array(4);
  const work1 = new Uint8Array(4);
  let n=0;

  function draw() {
    n++;
    window.crypto.getRandomValues(work0);
    window.crypto.getRandomValues(work1);

    gl.uniform4uiv(work0Location, Array.from(work0));
    gl.uniform4uiv(work1Location, Array.from(work1));

    // Check with progressCallback every 100 frames
    if(n%100===0 && typeof progressCallback === 'function' && progressCallback(n))
      return;

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    const pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
    gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    // Check the pixels for any success
    for(let i=0;i<pixels.length;i+=4) {
      if(pixels[i] !== 0) {
        // Return the work value with the custom bits
        typeof callback === 'function' &&
          callback(
            array_hex(work1, 0, 4) +
            array_hex([
              pixels[i+2],
              pixels[i+3],
              work0[2] ^ (pixels[i]-1),
              work0[3] ^ (pixels[i+1]-1)
            ], 0, 4), n);
        return;
      }
    }
    // Nothing found yet, try again
    window.requestAnimationFrame(draw);
  }

  // Begin generation
  window.requestAnimationFrame(draw);
}

window.NanoWebglPow = calculate;
// Both width and height must be multiple of 256, (one byte)
// but do not need to be the same,
// matching GPU capabilities is the aim
window.NanoWebglPow.width = 256 * 4;
window.NanoWebglPow.height = 256 * 4;

})();