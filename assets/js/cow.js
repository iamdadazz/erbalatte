/* The Erbalatte cow — a cute, toon-shaded Friesian.
   Chibi proportions (big head, round body, stubby legs), glossy eyes,
   rosy cheeks, a brand-green collar with a bell, and the sensor ear tag.
   cow.update(dt, { graze, walk, look }) drives every motion. */

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
  return m;
}

export function buildCow() {
  const root = new THREE.Group();
  const white = toon(0xfbfaf6);
  const pink = toon(0xf4a9a8);
  const pinkDeep = toon(0xe98b8d);
  const dark = toon(0x2a2a2e);
  const hoofM = toon(0x4a3b36);
  const cream = toon(0xf2e6c9);

  /* body: a round, soft bean */
  const body = new THREE.Group();
  body.position.y = 0.95;
  root.add(body);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.62, 40, 28), hide([1.3, 0.2, 4.1]));
  belly.scale.set(1.45, 1, 1.02);
  body.add(belly);

  /* stubby legs */
  const legs = [];
  const legGeo = new THREE.CapsuleGeometry(0.15, 0.32, 6, 14);
  [[0.52, 0.3], [0.52, -0.3], [-0.55, 0.3], [-0.55, -0.3]].forEach(([x, z], i) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.62, z);
    const leg = new THREE.Mesh(legGeo, i % 3 === 0 ? hide([i * 3.1, 0.5, 1.2]) : white);
    leg.position.y = -0.3;
    const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.12, 16), hoofM);
    hoof.position.y = -0.56;
    pivot.add(leg, hoof);
    root.add(pivot);
    legs.push(pivot);
  });

  /* udder */
  const udder = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 16), pink);
  udder.scale.set(1.2, 0.8, 1);
  udder.position.set(-0.3, 0.46, 0);
  root.add(udder);
  [[-0.22, 0.08], [-0.22, -0.08], [-0.38, 0.08], [-0.38, -0.08]].forEach(([x, z]) => {
    const t = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.05, 4, 8), pinkDeep);
    t.position.set(x, 0.33, z);
    root.add(t);
  });

  /* tail */
  const tail = new THREE.Group();
  tail.position.set(-0.88, 1.2, 0);
  const rope = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.55, 4, 8), white);
  rope.position.y = -0.3;
  const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 10), dark);
  tuft.scale.set(1, 1.5, 1);
  tuft.position.y = -0.66;
  tail.add(rope, tuft);
  tail.rotation.z = 0.25;
  root.add(tail);

  /* neck pivot → head (chibi: big) */
  const neck = new THREE.Group();
  neck.position.set(0.72, 1.12, 0);
  root.add(neck);
  const head = new THREE.Group();
  head.position.set(0.32, 0.26, 0);
  neck.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.46, 40, 30), hide([7.7, 0.4, 5.5], 1.6));
  skull.scale.set(1, 0.94, 1.02);
  head.add(skull);
  // collar with the bell, in brand green
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 12, 40), toon(0x509a48));
  collar.rotation.y = Math.PI / 2;
  collar.rotation.x = 0.35;
  collar.position.set(0.12, 0.02, 0);
  neck.add(collar);
  const bell = new THREE.Group();
  bell.position.set(0.3, -0.3, 0);
  const bellBody = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.1, 0.14, 18), toon(0xf2c230));
  const clapper = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), toon(0xb8861a));
  clapper.position.y = -0.08;
  bell.add(bellBody, clapper);
  neck.add(bell);

  // snout
  const snout = new THREE.Mesh(new THREE.SphereGeometry(0.3, 32, 24), pink);
  snout.scale.set(0.72, 0.62, 1.05);
  snout.position.set(0.33, -0.17, 0);
  head.add(snout);
  [0.1, -0.1].forEach((z) => {
    const n = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), pinkDeep);
    n.scale.set(0.5, 1, 0.8);
    n.position.set(0.53, -0.14, z);
    head.add(n);
  });
  // smile
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 6, 20, Math.PI), pinkDeep);
  smile.rotation.set(0, Math.PI / 2, Math.PI);
  smile.position.set(0.52, -0.27, 0);
  head.add(smile);

  // eyes: glossy, big, with two highlights each; blink via scale.y
  const eyes = [];
  [0.18, -0.18].forEach((z) => {
    const g = new THREE.Group();
    g.position.set(0.405, 0.09, z);
    g.lookAt(g.position.clone().add(new THREE.Vector3(1, 0, z * 1.4)));
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.095, 24, 18), new THREE.MeshStandardMaterial({ color: 0x141418, roughness: 0.12, metalness: 0 }));
    ball.scale.set(0.95, 1.12, 0.7);
    const hi1 = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    hi1.position.set(0.028, 0.045, 0.062);
    const hi2 = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    hi2.position.set(-0.03, -0.035, 0.062);
    g.add(ball, hi1, hi2);
    head.add(g);
    eyes.push(g);
  });
  // rosy cheeks
  [0.3, -0.3].forEach((z) => {
    const c = new THREE.Mesh(new THREE.CircleGeometry(0.075, 20), new THREE.MeshBasicMaterial({ color: 0xff8f9a, transparent: true, opacity: 0.55, depthWrite: false }));
    c.position.set(0.36, -0.07, z * 0.97);
    c.lookAt(c.position.clone().add(new THREE.Vector3(0.6, 0, z * 2)));
    head.add(c);
  });
  // ears (pivot at skull), pink inside
  const ears = [1, -1].map((s) => {
    const p = new THREE.Group();
    p.position.set(0.0, 0.16, s * 0.4);
    const outer = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 14), white);
    outer.scale.set(0.55, 0.32, 1.1);
    outer.position.z = s * 0.14;
    const inner = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), pink);
    inner.scale.set(0.3, 0.22, 1);
    inner.position.set(0.04, 0, s * 0.15);
    p.add(outer, inner);
    p.rotation.x = s * -0.35;
    head.add(p);
    return p;
  });
  // the sensor tag: steps, rumination, rest
  const tag = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.02, 20), toon(0xf2c230));
  tag.rotation.x = Math.PI / 2;
  tag.position.set(0.02, -0.06, 0.2);
  ears[0].add(tag);
  // little horns and a hair tuft
  [0.2, -0.2].forEach((z) => {
    const h = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 12), cream);
    h.position.set(-0.05, 0.42, z);
    h.rotation.x = z > 0 ? 0.35 : -0.35;
    head.add(h);
  });
  for (let i = 0; i < 4; i++) {
    const tuftH = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), dark);
    tuftH.position.set(0.05 + (i % 2) * 0.06, 0.42 + (i > 1 ? 0.02 : 0), (i - 1.5) * 0.06);
    head.add(tuftH);
  }

  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });

  /* ---------- behaviour ---------- */
  let t = 0, blinkT = 2 + Math.random() * 2, graze = 0, walk = 0;
  const state = { root, head, neck, tag, eyes };

  state.update = (dt, opts = {}) => {
    t += dt;
    graze += ((opts.graze ?? 0) - graze) * Math.min(1, dt * 2.5);
    walk += ((opts.walk ?? 0) - walk) * Math.min(1, dt * 4);
    const look = opts.look ?? 0;

    // head: down to the grass when grazing, curious tilt otherwise
    const chew = Math.sin(t * 10) * 0.04 * graze;
    neck.rotation.z = THREE.MathUtils.lerp(0.05 + Math.sin(t * 0.8) * 0.04, -0.85, graze) + chew;
    neck.rotation.y = (1 - graze) * (look * 0.5 + Math.sin(t * 0.6) * 0.12);
    head.rotation.x = (1 - graze) * Math.sin(t * 0.9) * 0.1; // head tilt, the cute part
    head.rotation.z = graze * 0.25;

    // blink
    blinkT -= dt;
    let lid = 1;
    if (blinkT < 0.12) lid = Math.abs(blinkT - 0.06) / 0.06;
    if (blinkT < 0) blinkT = 2.5 + Math.random() * 3;
    eyes.forEach((e) => { e.scale.y = Math.max(0.08, lid); });

    // ears flick, tail swish, bell sways
    ears[0].rotation.x = -0.35 - Math.max(0, Math.sin(t * 1.7 + 1)) ** 14 * 0.6;
    ears[1].rotation.x = 0.35 + Math.max(0, Math.sin(t * 1.3)) ** 14 * 0.6;
    tail.rotation.x = Math.sin(t * 2.2) * 0.4;
    bell.rotation.x = Math.sin(t * 3.1) * 0.25 * (0.3 + walk);

    // walk cycle with a happy bounce
    const ph = t * 7;
    legs.forEach((l, i) => { l.rotation.z = Math.sin(ph + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.45 * walk; });
    body.position.y = 0.95 + Math.abs(Math.sin(ph)) * 0.05 * walk + Math.sin(t * 1.4) * 0.012 * (1 - walk);
    body.rotation.z = Math.sin(ph) * 0.03 * walk;
    // breathing
    belly.scale.y = 1 + Math.sin(t * 1.6) * 0.012;
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
