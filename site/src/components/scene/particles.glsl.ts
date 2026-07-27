/* ============================================================================
 * particles.glsl.ts — the GPU programs that draw the particle field
 * ----------------------------------------------------------------------------
 * WHAT A SHADER IS
 * A shader is a small program that runs on the graphics card, in parallel, for
 * every item being drawn. We supply two:
 *
 *   VERTEX SHADER   — runs once per particle. Decides WHERE on screen that
 *                     particle lands and HOW BIG it is.
 *   FRAGMENT SHADER — runs once per pixel of each particle. Decides what
 *                     COLOUR that pixel is.
 *
 * They are written in GLSL, a C-like language. We keep them in a .ts file as
 * template strings so the build tool bundles them like any other code.
 *
 * HOW DATA GETS IN
 *   attribute — a value that DIFFERS per particle (its position, its size).
 *   uniform   — a value that is the SAME for every particle this frame (the
 *               clock, the mouse position). This is how JavaScript talks to
 *               the GPU each frame.
 *   varying   — a value the vertex shader computes and passes down to the
 *               fragment shader.
 *
 * WHAT THIS DRAWS
 * Pure ambient drift — a cloud of warm dust behind the hero. The portrait is
 * no longer assembled from these particles (that read as a blob and was
 * retired); it is rendered as image layers on top. See PortraitTriptych.
 * ========================================================================= */

/* Simplex noise by Ashima Arts / Stefan Gustavson (public domain).
 *
 * Noise is the engine of organic motion. Ordinary randomness is jagged — each
 * value unrelated to its neighbour. Noise is SMOOTH randomness: nearby inputs
 * give nearby outputs, which is what makes drift look like flowing gas rather
 * than static. Sampling it with time as one input makes the field evolve. */
const simplex = /* glsl */ `
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(
               i.z + vec4(0.0, i1.z, i2.z, 1.0))
             + i.y + vec4(0.0, i1.y, i2.y, 1.0))
             + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }
`

export const particleVertexShader = /* glsl */ `
  ${simplex}

  // Per-particle data, uploaded once when the geometry is built.
  attribute float aSeed;    // per-particle randomness, so nothing moves in lockstep
  attribute float aSize;    // base size before depth scaling
  attribute float aTemp;    // 0 = deep bronze, 1 = hot gold

  // Per-frame data, the same for every particle, sent from JavaScript.
  uniform float uTime;             // seconds since load; drives the drift
  uniform vec3  uPointer;          // mouse position in world space
  uniform float uPointerStrength;  // 0 disables mouse interaction entirely
  uniform float uSizeScale;        // global size multiplier
  uniform float uPixelRatio;       // so particles stay the same physical size on retina
  uniform float uClearing;         // how strongly to thin the field behind the text

  // Values passed down to the fragment shader.
  varying float vTemp;
  varying float vAlpha;

  void main() {
    // The field is pure ambient drift now — the face is rendered as image
    // layers on top (see PortraitTriptych), not assembled from these particles.
    vec3 pos = position;

    // ---- Organic drift -------------------------------------------------
    // Sample noise three times at different offsets to get a 3D direction.
    // Adding time to one input makes the whole field slowly evolve.
    float t = uTime * 0.055;
    vec3 sp = pos * 0.085;
    vec3 drift = vec3(
      snoise(sp + vec3(0.0, 0.0, t)),
      snoise(sp + vec3(17.3, 5.1, t)),
      snoise(sp + vec3(43.7, 91.2, t))
    );
    pos += drift * (1.1 + aSeed * 0.9);

    // ---- Mouse interaction ---------------------------------------------
    // Push particles gently away from the pointer, fading with distance.
    vec3 toPointer = pos - uPointer;
    float dist = length(toPointer.xy);
    float influence = exp(-dist * 0.28) * uPointerStrength;
    pos.xy += normalize(toPointer.xy + 0.0001) * influence * 2.4;

    // Transform from world space into camera space, then into screen space.
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Distance from the camera. Used for both sizing and fading.
    float depth = -mvPosition.z;

    // Near particles large and soft, far ones fine. This size-with-distance
    // relationship is the main thing that makes a flat screen read as a volume.
    gl_PointSize = aSize * uSizeScale * uPixelRatio * (140.0 / max(depth, 0.1));
    gl_PointSize = clamp(gl_PointSize, 0.6, 42.0);

    // Fade at both ends of the depth range so the volume has no visible walls.
    vAlpha = smoothstep(0.5, 5.0, depth) * (1.0 - smoothstep(20.0, 34.0, depth));
    vAlpha *= 0.55 + aSeed * 0.45;

    // ---- The text clearing ---------------------------------------------
    // Melvin reported the hero text was unreadable against a uniformly dense
    // field. Rather than dimming the scene with a flat overlay (forbidden by
    // CLAUDE.md), we thin the field itself in a soft ellipse behind the text.
    //
    // Measured in camera space so the clearing stays anchored to the screen
    // rather than sliding around as the camera drifts.
    vec2 screenish = mvPosition.xy / max(depth, 0.1) * 8.0;
    float clearDist = length(screenish * vec2(0.42, 1.0));
    // Ragged edge, so the clearing looks like a natural void in the gas
    // instead of a circle someone cut out with scissors.
    float edge = snoise(vec3(screenish * 0.35, uTime * 0.03)) * 0.8;
    float clearing = smoothstep(1.6, 4.4 + edge, clearDist);
    // Only thin the particles nearest the camera — the ones actually covering
    // the text. Distant ones stay, so the clearing has depth rather than
    // punching a hole clean through the field.
    float nearness = 1.0 - smoothstep(6.0, 16.0, depth);
    vAlpha *= mix(1.0, clearing, uClearing * nearness);

    vTemp = aTemp;
  }
`

export const particleFragmentShader = /* glsl */ `
  precision highp float;

  uniform vec3  uColorCool;  // deep bronze, the bulk of the field
  uniform vec3  uColorWarm;  // hot gold, used rarely
  uniform float uOpacity;    // global fade-in when the scene first appears

  varying float vTemp;
  varying float vAlpha;

  void main() {
    // gl_PointCoord runs 0..1 across the particle's square. Subtracting 0.5
    // re-centres it so we can measure distance from the middle.
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    // Discard pixels outside the circle, turning the default square into a dot.
    if (d > 0.5) discard;

    // Bright core falling off to a soft edge. Raising to a power tightens the
    // core, which reads as a glowing point rather than a flat disc.
    float falloff = smoothstep(0.5, 0.0, d);
    falloff = pow(falloff, 1.9);

    // Blend between the two palette colours by this particle's temperature.
    vec3 color = mix(uColorCool, uColorWarm, vTemp);

    // NOTE: there is deliberately no brightness multiplier here.
    // A previous version multiplied colour by up to 3x near the pointer. With
    // additive blending and bloom, moving the mouse to the centre of a dense
    // region blew the whole screen to white — the bright/dark inconsistency
    // Melvin caught in his two screenshots. The pointer now displaces
    // particles without brightening them.
    gl_FragColor = vec4(color, falloff * vAlpha * uOpacity);
  }
`
