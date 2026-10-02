/* The Erbalatte cow: a cute, toon-shaded Friesian.
   Chibi proportions (big head, round body, stubby legs), glossy eyes,
   rosy cheeks, a brand-green collar with a bell, and the sensor ear tag.
   cow.update(dt, { graze, lie, look, lookAt }) drives every motion; walking
   is inferred from how far the root actually moved, so feet never slide. */

import * as THREE from 'three';

let toonRamp;
export function toonGradient() {
  if (toonRamp) return toonRamp;
  const data = new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 235, 235, 235, 255, 255, 255, 255, 255]);
  toonRamp = new THREE.DataTexture(data, 4, 1, THREE.RGBAFormat);
  toonRamp.minFilter = toonRamp.magFilter = THREE.NearestFilter;
  toonRamp.needsUpdate = true;
  return toonRamp;
}
export const toon = (color, extra = {}) => new THREE.MeshToonMaterial({ color, gradientMap: toonGradient(), ...extra });

// Big soft Friesian patches from 3D noise, in each part's local space
function hide(offset, scale = 1.25) {
  const m = toon(0xfbfaf6);
  m.onBeforeCompile = (s) => {
    s.uniforms.uOff = { value: new THREE.Vector3(...offset) };
    s.uniforms.uScale = { value: scale };
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLocal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocal = position;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vLocal; uniform vec3 uOff; uniform float uScale;
        float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
        float n3(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
          return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x), mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
                     mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x), mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y), f.z); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float n = n3(vLocal * uScale + uOff);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.07, 0.07, 0.09), smoothstep(0.6, 0.63, n));`);
  };
  m.customProgramCacheKey = () => 'hide';
  return m;
}

/* soft toon + rim light: the coat reads as fluffy instead of flat plastic */
function withRim(m, strength = 0.32, color = 0xffffff) {
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (s, r) => {
    prev?.call(m, s, r);
    s.uniforms.uRim = { value: new THREE.Color(color).multiplyScalar(strength) };
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uRim;')
      .replace('#include <opaque_fragment>', `
        float rimF = pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 2.6);
        outgoingLight += uRim * rimF;
        #include <opaque_fragment>`);
  };
  const baseKey = m.customProgramCacheKey?.() ?? '';
  m.customProgramCacheKey = () => baseKey + '|rim'; // strength is a uniform, so only the shader shape matters
  return m;
}
const softToon = (color, rim = 0.3) => withRim(toon(color), rim);

/* tiny critically-damped spring, for secondary motion */
const spring = (k = 60, d = 12) => ({ x: 0, v: 0, k, d, step(target, dt) { this.v += ((target - this.x) * this.k - this.v * this.d) * dt; this.x += this.v * dt; return this.x; } });

export function buildCow(opts = {}) {
  // opts: { seed (patch pattern), hero (collar + bell, default true), scale }
  const seed = opts.seed ?? 0;
  const hero = opts.hero ?? true;
  const P = (a, b, c) => [a + seed * 1.7, b + seed * 0.9, c - seed * 1.3]; // per-cow patches
  const rnd = (() => { let s = (seed + 1) * 9301 + 49297; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; })();
  const coat = (o, sc) => withRim(hide(o, sc), 0.34);
  const root = new THREE.Group();
  const white = softToon(0xfbfaf6, 0.34);
  const pink = softToon(0xf4a9a8, 0.22);
  const pinkDeep = softToon(0xe98b8d, 0.15);
  const dark = softToon(0x2a2a2e, 0.25);
  const hoofM = softToon(0x4a3b36, 0.12);
  const cream = softToon(0xf2e6c9, 0.2);

  /* body: a round, soft bean */
  const body = new THREE.Group();
  body.position.y = 0.95;
  root.add(body);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.62, 48, 32), coat(P(1.3, 0.2, 4.1)));
  belly.scale.set(1.45, 1, 1.02);
  body.add(belly);

  /* stubby legs, now with a knee so steps lift and fold */
  const legs = [];
  const upperGeo = new THREE.CapsuleGeometry(0.15, 0.14, 6, 16);
  const lowerGeo = new THREE.CapsuleGeometry(0.142, 0.16, 6, 16);
  [[0.52, 0.3, 1], [0.52, -0.3, 1], [-0.55, 0.3, 0], [-0.55, -0.3, 0]].forEach(([x, z, front], i) => {
    const hip = new THREE.Group();
    hip.position.set(x, 0.62, z);
    const legM = i % 3 === 0 ? coat(P(i * 3.1, 0.5, 1.2)) : white;
    const upper = new THREE.Mesh(upperGeo, legM);
    upper.position.y = -0.14;
    const knee = new THREE.Group();
    knee.position.y = -0.27;
    const lower = new THREE.Mesh(lowerGeo, legM);
    lower.position.y = -0.1;
    const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.12, 20), hoofM);
    hoof.position.y = -0.29;
    knee.add(lower, hoof);
    hip.add(upper, knee);
    root.add(hip);
    legs.push({ hip, knee, front, i });
  });

  /* udder */
  const udder = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 18), pink);
  udder.scale.set(1.2, 0.8, 1);
  udder.position.set(-0.3, 0.46, 0);
  root.add(udder);
  const teats = [[-0.22, 0.08], [-0.22, -0.08], [-0.38, 0.08], [-0.38, -0.08]].map(([x, z]) => {
    const t = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.05, 4, 8), pinkDeep);
    t.position.set(x, 0.33, z);
    root.add(t);
    return t;
  });

  /* tail: a three-link chain with a tuft, simulated with springs */
  const tail = new THREE.Group();
  tail.position.set(-0.88, 1.2, 0);
  tail.rotation.z = 0.25;
  root.add(tail);
  const tailLinks = [];
  let parent = tail;
  for (let k = 0; k < 3; k++) {
    const link = new THREE.Group();
    link.position.y = k === 0 ? 0 : -0.2;
    const seg = new THREE.Mesh(new THREE.CapsuleGeometry(0.03 - k * 0.004, 0.16, 4, 8), white);
    seg.position.y = -0.1;
    link.add(seg);
    parent.add(link);
    tailLinks.push({ g: link, sx: spring(40, 8), sz: spring(40, 8) });
    parent = link;
  }
  const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), dark);
  tuft.scale.set(1, 1.5, 1);
  tuft.position.y = -0.26;
  parent.add(tuft);

  /* neck pivot → head (chibi: big) */
  const neck = new THREE.Group();
  neck.position.set(0.72, 1.12, 0);
  root.add(neck);
  const head = new THREE.Group();
  head.position.set(0.32, 0.26, 0);
  neck.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.46, 48, 36), coat(P(7.7, 0.4, 5.5), 1.6));
  skull.scale.set(1, 0.94, 1.02);
  head.add(skull);
  // collar with the bell, in brand green
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 14, 48), softToon(0x509a48, 0.2));
  collar.rotation.y = Math.PI / 2;
  collar.rotation.x = 0.35;
  collar.position.set(0.12, 0.02, 0);
  if (hero) neck.add(collar);
  const bell = new THREE.Group();
  bell.position.set(0.3, -0.24, 0);
  const bellBody = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.1, 0.14, 24), new THREE.MeshStandardMaterial({ color: 0xf2c230, roughness: 0.28, metalness: 0.55 }));
  bellBody.position.y = -0.06;
  const bellRim = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.012, 8, 24), bellBody.material);
  bellRim.rotation.x = Math.PI / 2; bellRim.position.y = -0.13;
  const clapper = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), toon(0xb8861a));
  clapper.position.y = -0.14;
  bell.add(bellBody, bellRim, clapper);
  if (hero) neck.add(bell);

  // snout (+ a lower lip that chews)
  const snout = new THREE.Mesh(new THREE.SphereGeometry(0.3, 40, 28), pink);
  snout.scale.set(0.72, 0.62, 1.05);
  snout.position.set(0.33, -0.17, 0);
  head.add(snout);
  [0.1, -0.1].forEach((z) => {
    const n = new THREE.Mesh(new THREE.SphereGeometry(0.045, 14, 10), pinkDeep);
    n.scale.set(0.5, 1, 0.8);
    n.position.set(0.53, -0.14, z);
    head.add(n);
  });
  const mouth = new THREE.Group();
  mouth.position.set(0.5, -0.27, 0);
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 8, 24, Math.PI), pinkDeep);
  smile.rotation.set(0, Math.PI / 2, Math.PI);
  smile.position.x = 0.02;
  mouth.add(smile);
  head.add(mouth);

  // eyes: glossy, big, two highlights; they track the camera and blink
  const eyes = [];
  [0.18, -0.18].forEach((z) => {
    const socket = new THREE.Group();
    socket.position.set(0.405, 0.09, z);
    socket.lookAt(socket.position.clone().add(new THREE.Vector3(1, 0, z * 1.4)));
    const g = new THREE.Group();
    socket.add(g);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.095, 32, 24), new THREE.MeshStandardMaterial({ color: 0x141418, roughness: 0.1, metalness: 0 }));
    ball.scale.set(0.95, 1.12, 0.7);
    const hi1 = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    hi1.position.set(0.028, 0.045, 0.062);
    const hi2 = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    hi2.position.set(-0.03, -0.035, 0.062);
    g.add(ball, hi1, hi2);
    head.add(socket);
    eyes.push(g);
  });
  // rosy cheeks
  [0.3, -0.3].forEach((z) => {
    const c = new THREE.Mesh(new THREE.CircleGeometry(0.075, 24), new THREE.MeshBasicMaterial({ color: 0xff8f9a, transparent: true, opacity: 0.55, depthWrite: false }));
    c.position.set(0.36, -0.07, z * 0.97);
    c.lookAt(c.position.clone().add(new THREE.Vector3(0.6, 0, z * 2)));
    head.add(c);
  });
  // ears (pivot at skull), pink inside, floppy
  const ears = [1, -1].map((s) => {
    const p = new THREE.Group();
    p.position.set(0.0, 0.16, s * 0.4);
    const outer = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16), white);
    outer.scale.set(0.55, 0.32, 1.1);
    outer.position.z = s * 0.14;
    const inner = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), pink);
    inner.scale.set(0.3, 0.22, 1);
    inner.position.set(0.04, 0, s * 0.15);
    p.add(outer, inner);
    p.rotation.x = s * -0.35;
    head.add(p);
    return { g: p, s, sp: spring(70, 7) };
  });
  // the sensor tag: steps, rumination, rest
  const tag = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.02, 24), softToon(0xf2c230, 0.15));
  tag.rotation.x = Math.PI / 2;
  tag.position.set(0.02, -0.06, 0.2);
  ears[0].g.add(tag);
  // little horns and a hair tuft
  [0.2, -0.2].forEach((z) => {
    const h = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 16), cream);
    h.position.set(-0.05, 0.42, z);
    h.rotation.x = z > 0 ? 0.35 : -0.35;
    head.add(h);
  });
  const fringe = new THREE.Group();
  fringe.position.set(0.05, 0.42, 0);
  for (let i = 0; i < 4; i++) {
    const tuftH = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), dark);
    tuftH.position.set((i % 2) * 0.06, i > 1 ? 0.02 : 0, (i - 1.5) * 0.06);
    fringe.add(tuftH);
  }
  head.add(fringe);

  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  // everything sits in a posture group so she can settle down on the straw
  const posture = new THREE.Group();
  [...root.children].forEach((c) => posture.add(c));
  root.add(posture);
  if (opts.scale) root.scale.setScalar(opts.scale);

  /* ---------- behaviour ---------- */
  let t = seed * 3.7 + rnd() * 5, blinkT = 1 + rnd() * 3, graze = 0, lie = 0, first = true;
  let phase = rnd() * 6, gait = 0, mooT = 6 + rnd() * 10, moo = 0, swatT = 3 + rnd() * 4, swat = 0, shakeT = 9 + rnd() * 9, shake = 0;
  const yawS = spring(30, 10), pitchS = spring(30, 10), bellS = spring(55, 3.5), bellZ = spring(55, 3.5), headTossS = spring(80, 10);
  const prevPos = new THREE.Vector3(), tmpV = new THREE.Vector3(), headW = new THREE.Vector3();
  let prevYaw = 0, prevNeckY = 0;
  const state = { root, head, neck, tag, eyes, udder, teats };

  state.update = (dt, o = {}) => {
    if (dt <= 0) return;
    if (first) { graze = o.graze ?? 0; lie = o.lie ?? 0; prevPos.copy(root.position); prevYaw = root.rotation.y; first = false; }
    t += dt;

    /* locomotion from real movement: no foot sliding */
    const speed = tmpV.copy(root.position).sub(prevPos).setY(0).length() / dt / root.scale.x;
    const angVel = Math.abs(root.rotation.y - prevYaw) / dt;
    prevPos.copy(root.position); prevYaw = root.rotation.y;
    const moving = Math.min(1, Math.max(speed / 0.9, o.walk ?? 0, angVel * 0.6));
    gait += (moving - gait) * Math.min(1, dt * 6);
    phase += (speed * 3.3 + angVel * 2.2 + (o.walk ?? 0) * 4) * dt; // stride ~1.9 units per cycle

    graze += ((o.graze ?? 0) * (1 - gait) - graze) * Math.min(1, dt * 2.2);
    lie += ((o.lie ?? 0) - lie) * Math.min(1, dt * 1.4);

    /* legs: diagonal pairs, knee folds on the forward swing, feet lift */
    legs.forEach((l) => {
      const p = phase + (l.i === 0 || l.i === 3 ? 0 : Math.PI);
      const swing = Math.sin(p);
      const lift = Math.max(0, Math.cos(p));
      l.hip.rotation.z = swing * 0.42 * gait;
      l.knee.rotation.z = (l.front ? 1 : -1) * lift * 0.55 * gait;
      l.hip.position.y = 0.62 + lift * 0.05 * gait;
      l.hip.scale.y = 1 - lie * 0.7;
    });
    // body bobs twice per stride and rolls with the weight; idle weight shift and breathing
    const bob = Math.abs(Math.cos(phase)) * 0.045 * gait;
    body.position.y = 0.95 + bob + Math.sin(t * 1.3) * 0.01 * (1 - gait);
    body.rotation.x = Math.sin(phase) * 0.035 * gait + Math.sin(t * 0.37) * 0.018 * (1 - gait) * (1 - lie);
    body.rotation.z = Math.cos(phase * 2) * 0.012 * gait;
    belly.scale.y = 1 + Math.sin(t * 1.55) * 0.014;
    belly.scale.z = 1.02 + Math.sin(t * 1.55) * 0.008;
    posture.position.y = -lie * 0.38;

    /* head: graze / look with springs; nods with the stride; a happy moo now and then */
    mooT -= dt;
    if (mooT < 0 && graze < 0.2 && lie < 0.5) { moo = 1; mooT = 12 + rnd() * 12; }
    moo = Math.max(0, moo - dt * 0.55);
    const mooK = Math.sin(Math.min(1, moo) * Math.PI); // 0 → 1 → 0
    shakeT -= dt;
    if (shakeT < 0 && gait < 0.2) { shake = 1; shakeT = 10 + rnd() * 12; }
    shake = Math.max(0, shake - dt * 1.4);

    let lookYaw = (o.look ?? 0) * 0.6, lookPitch = 0;
    if (o.lookAt) { // world-space target (the camera, the pointer)
      head.getWorldPosition(headW);
      tmpV.copy(o.lookAt);
      root.worldToLocal(tmpV);
      const lx = tmpV.x - 1.0, lz = tmpV.z, ly = tmpV.y - 1.4;
      lookYaw = THREE.MathUtils.clamp(Math.atan2(-lz, lx), -0.75, 0.75);
      lookPitch = THREE.MathUtils.clamp(Math.atan2(ly, Math.hypot(lx, lz)), -0.35, 0.4);
    }
    const yaw = yawS.step((1 - graze) * (lookYaw + Math.sin(t * 0.5) * 0.08) + Math.sin(shake * 18) * 0.12 * shake, dt);
    const pitch = pitchS.step(lookPitch * (1 - graze), dt);
    const nibble = graze * (Math.max(0, Math.sin(t * 2.3)) ** 6) * 0.12; // little tugs at the grass
    neck.rotation.z = THREE.MathUtils.lerp(0.06 + pitch * 0.6, -0.85, graze) + nibble + mooK * 0.32 + Math.cos(phase * 2) * 0.05 * gait;
    neck.rotation.y = yaw;
    head.rotation.x = (1 - graze) * (Math.sin(t * 0.8) * 0.08) + headTossS.step(mooK * 0.1, dt);
    head.rotation.z = graze * 0.25 + pitch * 0.3;

    // chewing the cud: the mouth works, a bit faster when grazing
    const chew = Math.sin(t * (graze > 0.5 ? 9 : 4.5));
    mouth.position.y = -0.27 - (chew * 0.5 + 0.5) * 0.018 * (0.4 + graze) - mooK * 0.03;
    mouth.scale.set(1, 1 + mooK * 0.6, 1 + mooK * 0.25);
    snout.position.y = -0.17 - (chew * 0.5 + 0.5) * 0.006;

    // eyes: blink with a soft ease; glance toward the look target; squint while mooing
    blinkT -= dt;
    let lid = 1;
    if (blinkT < 0.14) lid = Math.abs(blinkT - 0.07) / 0.07;
    if (blinkT < 0) blinkT = 2 + rnd() * 3.5 + (rnd() < 0.2 ? -1.7 : 0); // sometimes a double blink
    lid = Math.min(lid, 1 - mooK * 0.45);
    eyes.forEach((e) => {
      e.scale.y = Math.max(0.08, lid * lid * (3 - 2 * lid));
      e.position.x = THREE.MathUtils.clamp(yaw - neck.rotation.y + lookYaw * 0.25, -0.2, 0.2) * 0.04;
      e.position.y = pitch * 0.03;
    });

    /* secondary motion: ears flop with head motion + random flicks; bell swings; tail swats */
    const neckVel = (neck.rotation.y - prevNeckY) / dt;
    prevNeckY = neck.rotation.y;
    ears.forEach((e, k) => {
      const flick = Math.max(0, Math.sin(t * (1.3 + k * 0.4) + k * 2)) ** 18 * 0.7;
      const flop = e.sp.step(-neckVel * 0.05 * e.s + bob * 2.5 + mooK * 0.2, dt);
      e.g.rotation.x = e.s * (-0.35 - flick - flop * 0.6);
      e.g.rotation.z = flop * 0.4;
    });
    if (hero) {
      bell.rotation.x = bellS.step(-neckVel * 0.04 + Math.sin(phase * 2) * 0.18 * gait, dt);
      bell.rotation.z = bellZ.step(-(neck.rotation.z - 0.06) * 0.5, dt);
    }
    swatT -= dt;
    if (swatT < 0) { swat = 1; swatT = 2.5 + rnd() * 5; }
    swat = Math.max(0, swat - dt * 1.6);
    const swatK = Math.sin(swat * Math.PI);
    tailLinks.forEach((l, k) => {
      const tx = (Math.sin(t * 1.6 + k * 0.6) * 0.18 + swatK * (k === 0 ? 0.9 : 0.35)) * (1 - lie * 0.7) + Math.sin(phase) * 0.15 * gait;
      const tz = -bob * 2 * (k + 1) + swatK * 0.2;
      l.g.rotation.x = l.sx.step(tx, dt);
      l.g.rotation.z = l.sz.step(tz, dt);
    });
  };
  return state;
}

/* ==================================================================
   The realistic Friesian — real proportions, soft PBR shading, a
   unique patch pattern per cow. Same update() API as the cute cow,
   plus { lie } to settle down on the straw.
   opts: { seed, hero (collar + bell), scale, darker }
   ================================================================== */

function hideStd(offset, scale = 1.05, darker = 0) {
  const m = new THREE.MeshStandardMaterial({ color: 0xf6f3ec, roughness: 0.82, metalness: 0 });
  m.onBeforeCompile = (s) => {
    s.uniforms.uOff = { value: new THREE.Vector3(...offset) };
    s.uniforms.uScale = { value: scale };
    s.uniforms.uDark = { value: darker };
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWorldish;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWorldish = position;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vWorldish; uniform vec3 uOff; uniform float uScale; uniform float uDark;
        float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
        float n3(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
          return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x), mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
                     mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x), mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y), f.z); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 q = vWorldish * uScale + uOff;
        float n = n3(q) * 0.7 + n3(q * 2.7) * 0.22 + n3(q * 7.0) * 0.08;
        float spot = smoothstep(0.55 - uDark, 0.575 - uDark, n);
        // the coat is never pure white: a faint warm mottling
        vec3 coat = diffuseColor.rgb * (0.96 + 0.05 * n3(q * 11.0));
        diffuseColor.rgb = mix(coat, vec3(0.045, 0.043, 0.05), spot);`);
  };
  return m;
}

export function buildRealCow(opts = {}) {
  const seed = opts.seed ?? Math.random() * 100;
  const rnd = (() => { let s = seed * 9301 + 49297; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; })();
  const std = (color, rough = 0.8) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 });
  const darker = opts.darker ?? (rnd() - 0.4) * 0.08;
  const coat = (k) => hideStd([seed * 1.7 + k * 3.1, seed * 0.3 + k, seed * 2.3 - k * 1.7], 2.1 + rnd() * 0.5, darker);
  const muzzleM = std(0xc99a95, 0.55);
  const pinkM = std(0xe8b2ab, 0.7);
  const hoofM = std(0x2b2422, 0.6);
  const darkM = std(0x111113, 0.9);

  const root = new THREE.Group();
  const posture = new THREE.Group(); // everything that lowers when she lies down
  root.add(posture);

  /* torso: one sculpted mesh (flat back, withers and hips, sagging belly, barrel widest mid-body) */
  const body = new THREE.Group();
  body.position.y = 1.08;
  posture.add(body);
  const torsoGeo = new THREE.SphereGeometry(1, 72, 48);
  {
    const P = torsoGeo.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
      const u = x; // -1 rump … +1 chest
      const top = 0.4 + 0.05 * Math.exp(-((u - 0.55) ** 2) * 18) + 0.05 * Math.exp(-((u + 0.62) ** 2) * 22);
      const bottom = 0.44 + 0.1 * (1 - u * u) - 0.06 * Math.max(0, u - 0.5);
      const width = 0.33 + 0.08 * (1 - u * u) + 0.03 * Math.exp(-((u + 0.6) ** 2) * 10);
      P.setXYZ(i, x * 1.0, y > 0 ? y * top : y * bottom, z * width);
    }
    torsoGeo.computeVertexNormals();
  }
  const torso = new THREE.Mesh(torsoGeo, coat(0));
  const barrel = torso;
  body.add(torso);

  /* legs: thigh + shank with a knee, cloven hoof */
  const legs = [];
  const legDefs = [[0.6, 0.2, 1], [0.6, -0.2, 1], [-0.62, 0.22, 0], [-0.62, -0.22, 0]];
  legDefs.forEach(([x, z, front], i) => {
    const hipJ = new THREE.Group();
    hipJ.position.set(x, 0.9, z);
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(front ? 0.105 : 0.13, front ? 0.075 : 0.085, 0.5, 16), coat(10 + i));
    thigh.position.y = -0.2;
    const knee = new THREE.Group();
    knee.position.y = -0.42;
    const kneeBall = new THREE.Mesh(new THREE.SphereGeometry(front ? 0.078 : 0.088, 12, 10), std(0xf2eee6, 0.85));
    const shank = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.056, 0.4, 14), std(0xf2eee6, 0.85));
    shank.position.y = -0.2;
    const fetlock = new THREE.Mesh(new THREE.SphereGeometry(0.066, 12, 10), std(0xe9e4da, 0.85));
    fetlock.position.y = -0.4;
    const hoof = new THREE.Group();
    hoof.position.y = -0.46;
    [0.035, -0.035].forEach((dz) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.058, 0.09, 12), hoofM); c.position.set(0.01, 0, dz); hoof.add(c); });
    knee.add(kneeBall, shank, fetlock, hoof);
    hipJ.add(thigh, knee);
    posture.add(hipJ);
    legs.push({ hipJ, knee, front });
  });

  /* udder + teats */
  const udder = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 18), pinkM);
  udder.scale.set(1.25, 0.85, 1.05);
  udder.position.set(-0.36, 0.62, 0);
  posture.add(udder);
  const teats = [[-0.27, 0.09], [-0.27, -0.09], [-0.46, 0.09], [-0.46, -0.09]].map(([x, z]) => {
    const t = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.06, 4, 8), std(0xd99a93, 0.6));
    t.position.set(x, 0.47, z);
    posture.add(t);
    return t;
  });

  /* tail from the tailhead down to the hocks */
  const tail = new THREE.Group();
  tail.position.set(-0.86, 1.38, 0);
  const tailRope = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.78, 4, 8), coat(20));
  tailRope.position.y = -0.42;
  const switchM = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), rnd() < 0.5 ? std(0xf3efe7, 1) : darkM);
  switchM.scale.set(0.9, 2.2, 0.9);
  switchM.position.y = -0.92;
  tail.add(tailRope, switchM);
  tail.rotation.z = -0.06;
  posture.add(tail);

  /* neck → head */
  const neck = new THREE.Group();
  neck.position.set(0.82, 1.28, 0);
  posture.add(neck);
  const neckMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.42, 8, 16), coat(30));
  neckMesh.rotation.z = -1.0;
  neckMesh.position.set(0.24, 0.08, 0);
  const dewlap = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), coat(31));
  dewlap.scale.set(1.4, 0.8, 0.6);
  dewlap.position.set(0.24, -0.16, 0);
  neck.add(neckMesh, dewlap);

  const head = new THREE.Group();
  head.position.set(0.52, 0.24, 0);
  head.scale.setScalar(1.22);
  neck.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.24, 32, 24), coat(40));
  skull.scale.set(1.05, 1.05, 0.95);
  const face = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.28, 8, 16), coat(41));
  face.rotation.z = Math.PI / 2 - 0.5;
  face.position.set(0.2, -0.13, 0);
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.155, 24, 18), muzzleM);
  muzzle.scale.set(0.8, 0.75, 1);
  muzzle.position.set(0.37, -0.29, 0);
  [0.07, -0.07].forEach((z) => {
    const n = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), std(0x5e3a38, 0.4));
    n.scale.set(0.5, 0.9, 0.7);
    n.position.set(0.48, -0.27, z);
    head.add(n);
  });
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), muzzleM);
  jaw.scale.set(0.9, 0.5, 0.85);
  jaw.position.set(0.3, -0.38, 0);
  head.add(skull, face, muzzle, jaw);
  // white blaze down the face, as most Friesians have
  const blaze = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), std(0xf6f3ec, 0.85));
  blaze.scale.set(0.35, 1.9, 0.75);
  blaze.position.set(0.2, -0.04, 0);
  blaze.rotation.z = -0.5;
  head.add(blaze);

  const eyes = [0.19, -0.19].map((z) => {
    const g = new THREE.Group();
    g.position.set(0.12, 0.02, z);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.048, 16, 12), new THREE.MeshStandardMaterial({ color: 0x1a120f, roughness: 0.08 }));
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    glint.position.set(0.03, 0.02, z > 0 ? 0.03 : -0.03);
    g.add(ball, glint);
    head.add(g);
    return g;
  });
  const ears = [1, -1].map((s) => {
    const p = new THREE.Group();
    p.position.set(-0.04, 0.06, s * 0.2);
    const outer = new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 12), coat(50 + s));
    outer.scale.set(0.5, 0.22, 1.25);
    outer.position.z = s * 0.15;
    const inner = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), pinkM);
    inner.scale.set(0.3, 0.12, 1);
    inner.position.set(0.03, 0.01, s * 0.16);
    p.add(outer, inner);
    p.rotation.x = s * -0.25;
    head.add(p);
    return p;
  });
  // yellow ear tags: the identification tag, and the sensor on the left ear
  const tagM = std(0xf2c230, 0.5);
  const tag = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.085, 0.07), tagM);
  tag.position.set(0.02, -0.06, 0.24);
  ears[0].add(tag);
  const tag2 = tag.clone(); tag2.position.z = -0.24; ears[1].add(tag2);
  // polls (dehorned dairy cows keep only little bumps) + a hair whorl
  const poll = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 10), coat(60));
  poll.scale.set(0.8, 0.6, 1.8);
  poll.position.set(-0.08, 0.2, 0);
  head.add(poll);

  if (opts.hero) {
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.035, 10, 40), std(0x509a48, 0.6));
    collar.rotation.y = Math.PI / 2; collar.rotation.x = 0.5;
    collar.position.set(0.28, 0.0, 0);
    neck.add(collar);
    const bell = new THREE.Group();
    bell.position.set(0.42, -0.28, 0);
    const bb = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.085, 0.12, 18), new THREE.MeshStandardMaterial({ color: 0xd9a92c, roughness: 0.35, metalness: 0.6 }));
    bell.add(bb);
    neck.add(bell);
    neck.userData.bell = bell;
  }

  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  const sc = opts.scale ?? 0.95 + rnd() * 0.12;
  root.scale.setScalar(sc);

  /* ---------- behaviour ---------- */
  let t = rnd() * 10, blinkT = 1 + rnd() * 3, graze = 0, walk = 0, lie = 0, first = true;
  const state = { root, head, neck, tag, eyes, udder, teats };
  state.update = (dt, o = {}) => {
    if (first) { graze = o.graze ?? 0; lie = o.lie ?? 0; first = false; } // start in pose, ease afterwards
    t += dt;
    graze += ((o.graze ?? 0) - graze) * Math.min(1, dt * 2.2);
    walk += ((o.walk ?? 0) - walk) * Math.min(1, dt * 4);
    lie += ((o.lie ?? 0) - lie) * Math.min(1, dt * 1.6);
    const look = o.look ?? 0;
    const chew = (Math.sin(t * 7) * 0.5 + 0.5) * 0.035;

    neck.rotation.z = THREE.MathUtils.lerp(0.08 + Math.sin(t * 0.7) * 0.04, -0.95, graze) + chew * graze - lie * 0.15;
    neck.rotation.y = (1 - graze) * (look * 0.55 + Math.sin(t * 0.45) * 0.1);
    head.rotation.z = graze * 0.3 + (1 - graze) * Math.sin(t * 0.8) * 0.04;
    head.rotation.x = (1 - graze) * Math.sin(t * 0.6) * 0.06;
    // ruminating jaw even when resting
    jaw.position.y = -0.38 - chew * (graze > 0.5 ? 1 : 0.6);
    jaw.position.z = Math.sin(t * 3.5) * 0.012 * (1 - walk);

    blinkT -= dt;
    let lid = 1;
    if (blinkT < 0.14) lid = Math.abs(blinkT - 0.07) / 0.07;
    if (blinkT < 0) blinkT = 2.5 + Math.random() * 4;
    eyes.forEach((e) => { e.scale.y = Math.max(0.1, lid); });

    ears[0].rotation.x = -0.25 - Math.max(0, Math.sin(t * 1.4 + 1)) ** 16 * 0.55;
    ears[1].rotation.x = 0.25 + Math.max(0, Math.sin(t * 1.1)) ** 16 * 0.55;
    tail.rotation.x = Math.sin(t * 1.6) * 0.18 + Math.max(0, Math.sin(t * 0.7)) ** 8 * 0.5;
    if (neck.userData.bell) neck.userData.bell.rotation.x = Math.sin(t * 3) * 0.2 * (0.3 + walk);

    // walk: thigh swings, knee bends on the forward swing
    const ph = t * 5.5;
    legs.forEach((l, i) => {
      const p = ph + (i === 0 || i === 3 ? 0 : Math.PI);
      l.hipJ.rotation.z = Math.sin(p) * 0.38 * walk;
      l.knee.rotation.z = (l.front ? -1 : 1) * Math.max(0, Math.cos(p)) * 0.55 * walk;
      // lying: legs tuck under the body (front ones folded, hind ones to the side)
      l.hipJ.scale.y = 1 - lie * 0.72;
      l.hipJ.rotation.x = lie * (l.front ? 0 : (i === 2 ? 0.5 : -0.5));
    });
    posture.position.y = -lie * 0.5 + Math.abs(Math.sin(ph)) * 0.03 * walk;
    posture.rotation.x = lie * 0.06;
    body.rotation.z = Math.sin(ph) * 0.02 * walk;
    barrel.scale.y = 1 + Math.sin(t * 1.5) * 0.01; // breathing
  };
  return state;
}

/* A bee: fuzzy, striped, busy */
export function buildBee() {
  const g = new THREE.Group();
  const bodyM = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), toon(0xf6c945));
  bodyM.scale.set(1.35, 1, 1);
  const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.066, 0.016, 8, 20), toon(0x2a2a2e));
  stripe.rotation.y = Math.PI / 2;
  const stripe2 = stripe.clone(); stripe2.position.x = -0.045; stripe2.scale.setScalar(0.82);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), toon(0x2a2a2e));
  eye.position.set(0.085, 0.02, 0.03);
  const eye2 = eye.clone(); eye2.position.z = -0.03;
  const wingM = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
  const wings = [1, -1].map((s) => {
    const w = new THREE.Mesh(new THREE.CircleGeometry(0.06, 16), wingM);
    w.scale.set(1.3, 0.75, 1);
    w.position.set(-0.01, 0.07, s * 0.04);
    w.rotation.x = s * 0.4 - Math.PI / 2;
    return w;
  });
  g.add(bodyM, stripe, stripe2, eye, eye2, ...wings);
  g.userData.wings = wings;
  return g;
}

/* Instanced meadow on a disc: grass blades with wind + clover flowers */
export function buildMeadow(radius, count, uniforms, height = 1) {
  const g = new THREE.Group();
  const bladeGeo = new THREE.PlaneGeometry(0.06, 0.36, 1, 4);
  bladeGeo.translate(0, 0.18, 0);
  const p = bladeGeo.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 0.36; p.setX(i, p.getX(i) * (1 - y * 0.9)); }
  const mat = new THREE.MeshToonMaterial({ side: THREE.DoubleSide, gradientMap: toonGradient() });
  mat.onBeforeCompile = (s) => {
    s.uniforms.uTime = uniforms.uTime;
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float h = uv.y * uv.y;
        vec4 ip = instanceMatrix[3];
        transformed.x += (sin(uTime * 1.6 + ip.x * 0.9 + ip.z * 0.7) * 0.6 + sin(uTime * 2.9 + ip.x * 2.1) * 0.25) * 0.1 * h;`);
  };
  const blades = new THREE.InstancedMesh(bladeGeo, mat, count);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), v = new THREE.Vector3(), c = new THREE.Color();
  const greens = [0x7fbf5c, 0x8fcb67, 0x6aae4d, 0x9ed47a, 0x79b85a, 0xa9d884];
  for (let i = 0; i < count; i++) {
    const r = Math.sqrt(Math.random()) * (radius - 0.1), a = Math.random() * Math.PI * 2;
    v.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    e.set((Math.random() - 0.5) * 0.3, Math.random() * Math.PI, (Math.random() - 0.5) * 0.3);
    m.compose(v, q.setFromEuler(e), s.set(1, (0.45 + Math.random() * 0.75) * height, 1));
    blades.setMatrixAt(i, m);
    blades.setColorAt(i, c.set(greens[(Math.random() * greens.length) | 0]));
  }
  blades.receiveShadow = true;
  g.add(blades);

  const fl = Math.round(count / 30);
  const flowers = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.05, 1), toon(0xffffff), fl);
  const petals = [0xffffff, 0xffffff, 0xfff2a8, 0xf3b6d2, 0xd6b8f0];
  for (let i = 0; i < fl; i++) {
    const r = Math.sqrt(Math.random()) * (radius - 0.2), a = Math.random() * Math.PI * 2;
    v.set(Math.cos(a) * r, (0.16 + Math.random() * 0.14) * height, Math.sin(a) * r);
    const k = 0.7 + Math.random() * 0.7;
    m.compose(v, q.identity(), s.set(k, k * 0.8, k));
    flowers.setMatrixAt(i, m);
    flowers.setColorAt(i, c.set(petals[(Math.random() * petals.length) | 0]));
  }
  g.add(flowers);
  return g;
}

/* A soft round island: grass top + a layered soil slice */
export function buildIsland(radius, topColor = 0x8cc86c, depth = 0.9) {
  const g = new THREE.Group();
  const soil = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.9, depth, 72), [
    toon(0xa8845f), toon(topColor), toon(0x8a6a4a),
  ]);
  soil.position.y = -depth / 2;
  soil.receiveShadow = true;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.004, radius * 1.004, 0.16, 72, 1, true), toon(0x6fae55));
  band.position.y = -0.08;
  g.add(soil, band);
  return g;
}

/* Leaf burst, like the leaves around the original Erbalatte bottle.
   burst.set(k) opens it (0 = folded into the centre, 1 = full crown). */
export function buildLeafBurst(count = 46, radius = 1.6) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(0.13, 0.14, 0, 0.36);
  shape.quadraticCurveTo(-0.13, 0.14, 0, 0);
  const geo = new THREE.ShapeGeometry(shape, 10);
  geo.translate(0, -0.05, 0);
  const cols = [0x509a48, 0x6fb165, 0x8fbc8b, 0x3f8438, 0xbaddb6, 0xc9a24a, 0xd9667a];
  const mat = new THREE.MeshToonMaterial({ side: THREE.DoubleSide, gradientMap: toonGradient() });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const seeds = Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2 + Math.random() * 0.2;
    const ring = 0.55 + Math.random() * 0.45;
    return { a, ring, y: (Math.random() - 0.5) * 1.4, spin: Math.random() * 6, size: 0.7 + Math.random() * 0.9 };
  });
  const c = new THREE.Color();
  seeds.forEach((sd, i) => mesh.setColorAt(i, c.set(cols[i % cols.length])));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3();
  let t = 0;
  mesh.userData.set = (k, dt = 0) => {
    t += dt;
    const ease = 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);
    seeds.forEach((sd, i) => {
      const r = radius * sd.ring * ease;
      v.set(Math.cos(sd.a) * r, sd.y * ease + Math.sin(t * 1.2 + sd.spin) * 0.05, Math.sin(sd.a) * r * 0.35);
      e.set(Math.sin(t * 0.8 + sd.spin) * 0.3, 0, -sd.a + Math.PI / 2 + Math.sin(t + sd.spin) * 0.15);
      const sc = sd.size * ease;
      m.compose(v, q.setFromEuler(e), s.set(sc, sc, sc));
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
  mesh.userData.set(0);
  return mesh;
}
