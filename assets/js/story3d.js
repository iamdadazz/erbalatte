/* "Dal prato al cartone" — the scroll-driven 3D story on storia.html.
   One continuous little world laid out along x. Scroll moves the camera
   from station to station; the cow walks with it.
     0 meadow · 1 breakfast · 2 care (barn) · 3 milking · 4 packaging · 5 the carton
   initStory(section, { onChapter }) — section is the tall scroll container. */

import * as THREE from 'three';
import { buildCow, buildBee, buildMeadow, buildIsland, buildLeafBurst, toon } from './cow.js';
import { buildCarton } from './carton3d.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const snap = new URLSearchParams(location.search).has('snap'); // debug/capture: no camera easing
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (v) => { v = clamp01(v); return v * v * v * (v * (v * 6 - 15) + 10); };
const lerp = THREE.MathUtils.lerp;

const X = { meadow: 0, barn: 14, milk: 28, pack: 42, home: 56 };

export async function initStory(section, { onChapter } = {}) {
  const stage = section.querySelector('[data-story-stage]');
  const canvas = stage.querySelector('canvas');
  const small = matchMedia('(max-width: 760px)').matches;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); }
  catch { stage.classList.add('no-webgl'); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xf6fbf4, 26, 60);
  const camera = new THREE.PerspectiveCamera(small ? 42 : 32, 1, 0.1, 200);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8ecd2, 2.1));
  const sun = new THREE.DirectionalLight(0xfffaf0, 2.3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, far: 40 });
  sun.shadow.radius = 6;
  sun.shadow.bias = -0.0005;
  scene.add(sun, sun.target);

  const uniforms = { uTime: { value: 0 } };
  const catcher = (r, x, y = 0.012) => {
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 64), new THREE.ShadowMaterial({ opacity: 0.16 }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, y, 0); m.receiveShadow = true;
    scene.add(m);
  };

  /* ---------- clouds, drifting over the whole journey ---------- */
  const clouds = [];
  const cloudM = toon(0xffffff);
  for (let i = 0; i < 12; i++) {
    const c = new THREE.Group();
    [[0, 0, 0.9], [0.8, -0.15, 0.65], [-0.8, -0.2, 0.6], [0.3, 0.35, 0.6]].forEach(([x, y, r]) => {
      const s = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), cloudM);
      s.position.set(x, y, 0);
      c.add(s);
    });
    c.position.set(-8 + i * 6.4, 6 + Math.random() * 2.5, -9 - Math.random() * 6);
    c.scale.setScalar(0.7 + Math.random() * 0.6);
    scene.add(c);
    clouds.push(c);
  }

  /* ---------- 0–1 · the meadow ---------- */
  const meadow = new THREE.Group();
  meadow.position.x = X.meadow;
  meadow.add(buildIsland(4.4, 0x8cc86c, 1.1));
  meadow.add(buildMeadow(4.4, small ? 4000 : 6500, uniforms));
  // round trees
  [[-2.6, -2.2, 1.2], [2.9, -2.4, 0.95], [-3.4, 0.6, 0.8]].forEach(([x, z, s]) => {
    const tr = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.1, 10), toon(0x9b7653));
    trunk.position.y = 0.55;
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.8, 2), toon(0x6fb165));
    crown.position.y = 1.55;
    const crown2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 2), toon(0x8fcb67));
    crown2.position.set(0.35, 1.95, 0.2);
    tr.add(trunk, crown, crown2);
    tr.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    tr.position.set(x, 0, z); tr.scale.setScalar(s);
    meadow.add(tr);
  });
  scene.add(meadow);
  catcher(4.4, X.meadow);
  const bees = [0, 1, 2].map((i) => {
    const b = buildBee();
    b.scale.setScalar(1.3);
    scene.add(b);
    return { mesh: b, phase: i * 2.1, rad: 1.8 + i * 0.7, h: 0.8 + i * 0.3, speed: 0.55 + i * 0.12 };
  });

  /* stepping stones between stations */
  const stoneM = toon(0xe9e1cf);
  const stones = (x0, x1) => {
    for (let x = x0; x <= x1; x += 0.9) {
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.14, 20), stoneM);
      st.position.set(x, -0.05 + Math.sin(x) * 0.02, Math.sin(x * 0.7) * 0.25);
      st.receiveShadow = true;
      scene.add(st);
    }
  };
  stones(X.meadow + 4.6, X.barn - 4.1);
  stones(X.barn + 4.3, X.milk - 4.1);

  /* ---------- 2 · care: a light, open barn ---------- */
  const barn = new THREE.Group();
  barn.position.x = X.barn;
  const straw = new THREE.Mesh(new THREE.CylinderGeometry(4, 3.7, 0.7, 64), [toon(0xd8bd90), toon(0xf5e9c6), toon(0xc2a57c)]);
  straw.position.y = -0.35; straw.receiveShadow = true;
  barn.add(straw);
  const wood = toon(0xffffff), roofM = toon(0x8fbc8b);
  [[-2.6, -1.8], [2.6, -1.8], [-2.6, 1.6], [2.6, 1.6]].forEach(([x, z]) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3, 0.22), wood);
    p.position.set(x, 1.5, z); p.castShadow = true; barn.add(p);
  });
  const back = new THREE.Mesh(new THREE.BoxGeometry(5.4, 2.6, 0.16), new THREE.MeshBasicMaterial({ color: 0xf6f3ea }));
  back.position.set(0, 1.3, -1.85); back.receiveShadow = true; barn.add(back);
  [-1, 1].forEach((s) => {
    const r = new THREE.Mesh(new THREE.BoxGeometry(3.25, 0.14, 4.2), roofM);
    r.position.set(s * 1.38, 3.55, -0.1); r.rotation.z = -s * 0.52; r.castShadow = true; barn.add(r);
  });
  const hay = toon(0xf0dc9c);
  [[-2.1, -1.1, 0], [-1.3, -1.25, 0.3], [2.2, -1.1, -0.2]].forEach(([x, z, r]) => {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.8, 24), hay);
    b.rotation.set(Math.PI / 2, 0, r); b.position.set(x, 0.45, z); b.castShadow = true; barn.add(b);
  });
  scene.add(barn);
  // hearts float up while she is cared for
  const heartShape = new THREE.Shape();
  heartShape.moveTo(0, -0.3);
  heartShape.bezierCurveTo(-0.5, 0.05, -0.28, 0.42, 0, 0.18);
  heartShape.bezierCurveTo(0.28, 0.42, 0.5, 0.05, 0, -0.3);
  const heartGeo = new THREE.ExtrudeGeometry(heartShape, { depth: 0.08, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 3 });
  const heartM = toon(0xff8fa3);
  const hearts = Array.from({ length: 5 }, (_, i) => {
    const h = new THREE.Mesh(heartGeo, heartM);
    h.scale.setScalar(0.45); h.userData.off = i / 5; h.visible = false;
    scene.add(h); return h;
  });
  // sensor pulse ring
  const pulse = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.014, 8, 40), new THREE.MeshBasicMaterial({ color: 0xf2c230, transparent: true }));
  scene.add(pulse);

  /* ---------- 3 · milking ---------- */
  const milking = new THREE.Group();
  milking.position.x = X.milk;
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(4, 3.7, 0.7, 64), [toon(0xcfd8cd), toon(0xf1f5f0), toon(0xb9c4b7)]);
  floor.position.y = -0.35; floor.receiveShadow = true; milking.add(floor);
  const steel = new THREE.MeshStandardMaterial({ color: 0xe3e9eb, metalness: 0.25, roughness: 0.35 });
  const tankM = toon(0xf3f6f7);
  [-1, 1].forEach((s) => {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.4, 12), steel);
    rail.rotation.z = Math.PI / 2; rail.position.set(-0.4, 1.25, s * 0.85); milking.add(rail);
    [-1.9, 1.1].forEach((x) => { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.3, 12), steel); post.position.set(x, 0.62, s * 0.85); milking.add(post); });
  });
  const tank = new THREE.Group();
  tank.position.set(2.5, 0, -0.9);
  const tankBody = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 1.9, 40), tankM);
  tankBody.position.y = 1.15; tankBody.castShadow = true;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.95, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), tankM);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.965, 0.965, 0.2, 40), toon(0x509a48));
  band.position.y = 1.85;
  dome.position.y = 2.1; dome.scale.y = 0.35;
  const legsT = [0, 1, 2].map((i) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 8), steel); const a = i * 2.1; l.position.set(Math.cos(a) * 0.7, 0.1, Math.sin(a) * 0.7); return l; });
  // sight glass on the front, filling with milk
  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.4, 0.04), new THREE.MeshStandardMaterial({ color: 0xbfd0d6, roughness: 0.1, metalness: 0.2 }));
  glass.position.set(0, 1.15, 0.96);
  const milkLevel = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.36, 0.05), new THREE.MeshBasicMaterial({ color: 0xfffdf7 }));
  milkLevel.geometry.translate(0, 0.68, 0);
  milkLevel.position.set(0, 0.47, 0.975);
  tank.add(tankBody, dome, band, ...legsT, glass, milkLevel);
  milking.add(tank);
  scene.add(milking);
  catcher(4, X.milk);
  const cupM = new THREE.MeshStandardMaterial({ color: 0xcfd6da, metalness: 0.6, roughness: 0.25 });
  const cups = Array.from({ length: 4 }, () => { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.14, 10), cupM); scene.add(c); return c; });

  /* the milk line: udder → tank → (long run) → filler */
  const pipeM = new THREE.MeshStandardMaterial({ color: 0xe8eef0, transparent: true, opacity: 0.55, roughness: 0.15, metalness: 0.1 });
  const cowX = { milk: X.milk - 0.6 };
  const curveA = new THREE.CatmullRomCurve3([
    new THREE.Vector3(cowX.milk - 0.32, 0.28, 0.05), new THREE.Vector3(cowX.milk - 0.1, 0.12, 0.35),
    new THREE.Vector3(cowX.milk + 1.2, 0.12, 0.2), new THREE.Vector3(X.milk + 1.7, 0.35, -0.3), new THREE.Vector3(X.milk + 1.6, 0.6, -0.9),
  ]);
  const curveB = new THREE.CatmullRomCurve3([
    new THREE.Vector3(X.milk + 3.4, 0.5, -0.9), new THREE.Vector3(X.milk + 4.4, 0.18, -0.9), new THREE.Vector3(X.pack - 4.6, 0.18, -0.9),
    new THREE.Vector3(X.pack - 2.2, 0.3, -0.9), new THREE.Vector3(X.pack - 1.4, 2.6, -0.6), new THREE.Vector3(X.pack - 1.0, 2.95, -0.2),
  ]);
  [curveA, curveB].forEach((cv) => { const tube = new THREE.Mesh(new THREE.TubeGeometry(cv, 120, 0.07, 10), pipeM); scene.add(tube); });
  const dropM = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const dropsA = Array.from({ length: 14 }, (_, i) => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), dropM); d.userData.off = i / 14; scene.add(d); return d; });
  const dropsB = Array.from({ length: 26 }, (_, i) => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), dropM); d.userData.off = i / 26; scene.add(d); return d; });

  /* ---------- 4 · packaging line ---------- */
  const pack = new THREE.Group();
  pack.position.x = X.pack;
  const pfloor = new THREE.Mesh(new THREE.CylinderGeometry(4.3, 4, 0.7, 64), [toon(0xcfd8cd), toon(0xf1f5f0), toon(0xb9c4b7)]);
  pfloor.position.y = -0.35; pfloor.receiveShadow = true; pack.add(pfloor);
  const belt = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.16, 1.0), toon(0x5d6b5b));
  belt.position.set(0, 0.72, 0); belt.castShadow = true; pack.add(belt);
  const beltFrame = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.1, 1.15), toon(0xdfe5e8));
  beltFrame.position.set(0, 0.6, 0); pack.add(beltFrame);
  [-2.8, 0, 2.8].forEach((x) => [-0.45, 0.45].forEach((z) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 8), steel); l.position.set(x, 0.3, z); pack.add(l); }));
  const rollers = Array.from({ length: 14 }, (_, i) => { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.02, 10), toon(0x8a978a)); r.rotation.x = Math.PI / 2; r.position.set(-3.1 + i * 0.48, 0.64, 0); pack.add(r); return r; });
  // the filler: white machine with a brand-green band
  const filler = new THREE.Group();
  filler.position.set(-1, 0, 0);
  const fBody = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.1, 1.5), toon(0xffffff));
  fBody.position.y = 3.05; fBody.castShadow = true;
  const fBand = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.22, 1.52), toon(0x509a48));
  fBand.position.y = 2.75;
  const fLegs = [-0.55, 0.55].map((x) => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.5, 0.12), steel); l.position.set(x, 1.25, -0.65); return l; });
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.05, 0.35, 16), steel);
  nozzle.position.y = 2.35;
  filler.add(fBody, fBand, ...fLegs, nozzle);
  pack.add(filler);
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  stream.visible = false;
  scene.add(pack, stream);
  catcher(4.3, X.pack);

  /* ---------- 5 · the carton, at home ---------- */
  const home = new THREE.Group();
  home.position.x = X.home;
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.6, 0.5, 64), toon(0xe4f2e1));
  plinth.position.y = 0.25; plinth.receiveShadow = true; home.add(plinth);
  const burst = buildLeafBurst(56, 2.6);
  burst.position.set(0, 1.9, -0.4);
  home.add(burst);
  scene.add(home);
  catcher(3, X.home, 0.51);

  // cartons are async (canvas-painted); the scene runs without them until ready
  let heroCarton, sideCarton;
  const conveyor = [];
  Promise.all([buildCarton('intero'), buildCarton('scremato')]).then(([a, b]) => {
    heroCarton = a; heroCarton.position.set(-0.35, 0.5 + 0.9, 0.1); heroCarton.scale.setScalar(1);
    sideCarton = b; sideCarton.position.set(0.95, 0.5 + 0.72, -0.35); sideCarton.scale.setScalar(0.8); sideCarton.rotation.y = -0.35;
    home.add(heroCarton, sideCarton);
    for (let i = 0; i < 7; i++) {
      const c = (i % 3 === 2 ? b : a).clone();
      c.scale.setScalar(0.42);
      c.userData.off = i / 7;
      scene.add(c);
      conveyor.push(c);
    }
  });

  /* ---------- the cow ---------- */
  const cow = buildCow();
  scene.add(cow.root);

  /* ---------- camera path ---------- */
  // [position, lookAt] per chapter
  const shots = [
    [[-4.5, 2.2, 9.5], [0.2, 0.9, 0]],
    [[3.9, 2.3, 6.6], [0.9, 1.0, 0.2]],
    [[X.barn + 1.6, 2.8, 8.2], [X.barn, 1.3, 0]],
    [[X.milk - 0.6, 2.6, 8.2], [X.milk + 0.6, 1.0, -0.2]],
    [[X.pack + 0.6, 4.4, 10.4], [X.pack, 1.8, 0]],
    [[X.home + 0.2, 2.6, 7.4], [X.home, 1.9, 0]],
  ];
  if (small) shots.forEach((s) => { s[0][2] += 3.2; s[0][1] += 0.6; });
  const P = shots.map((s) => new THREE.Vector3(...s[0]));
  const L = shots.map((s) => new THREE.Vector3(...s[1]));

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    if (w > 900) camera.setViewOffset(w, h, -w * 0.16, 0, w, h); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  /* ---------- scroll → chapter float ---------- */
  let target = 0, prog = 0, lastChapter = -1;
  const readScroll = () => {
    const r = section.getBoundingClientRect();
    const range = section.offsetHeight - innerHeight;
    target = clamp01(-r.top / range) * 5;
  };
  addEventListener('scroll', readScroll, { passive: true });
  addEventListener('resize', readScroll);
  readScroll();
  prog = target;

  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), tmp = new THREE.Vector3();
  function cameraAt(c) {
    const k = Math.min(4, Math.floor(c));
    const f = c - k;
    const e = smooth((f - 0.35) / 0.65);
    camPos.lerpVectors(P[k], P[k + 1], e);
    camLook.lerpVectors(L[k], L[k + 1], e);
    camPos.y += Math.sin(Math.PI * e) * (Math.abs(P[k + 1].x - P[k].x) > 4 ? 2.2 : 0.4);
    camera.position.copy(camPos);
    camera.lookAt(camLook);
    sun.position.set(camLook.x + 5, 10, 6);
    sun.target.position.set(camLook.x, 0, 0);
  }

  function cowAt(c, dt) {
    // walking windows follow the camera moves
    const w1 = smooth((c - 1.35) / 0.65);  // meadow → barn
    const w2 = smooth((c - 2.35) / 0.65);  // barn → milking
    const walking = (c > 1.35 && c < 2.0) || (c > 2.35 && c < 3.0);
    let x = lerp(0.9, X.barn - 0.2, w1);
    x = lerp(x, cowX.milk, w2);
    cow.root.position.set(x, 0, c < 1.35 ? 0.3 : lerp(0.3, 0.1, w1));
    // facing: 3/4 to camera when still, along +x while walking, side-on in the stall
    let face = c < 1.35 ? lerp(-2.1, -1.15, smooth(c)) : c < 2.35 ? lerp(-0.2, -1.1, smooth((c - 2.0) / 0.2)) : 0;
    if (walking) face = 0;
    if (c >= 2.35 && c < 3.0) face = 0;
    cow.root.rotation.y += (face - cow.root.rotation.y) * Math.min(1, dt * 6);
    const graze = c < 0.35 ? 1 : c < 1.3 ? (Math.sin(c * 9) > -0.3 ? 1 : 0) : 0;
    cow.update(dt, { graze: walking ? 0 : graze, walk: walking ? 1 : 0, look: c > 2 && c < 2.4 ? 0.3 : 0 });
  }

  const clock = new THREE.Clock();
  let t = 0, visible = true, running = false;
  const udder = new THREE.Vector3(), tagW = new THREE.Vector3();

  function frame(dt) {
    t += dt;
    uniforms.uTime.value = t;
    prog = snap ? target : prog + (target - prog) * Math.min(1, dt * (reduced ? 20 : 5));
    const c = prog;
    cameraAt(c);
    cowAt(c, dt);

    // meadow life
    bees.forEach((b) => {
      const a = t * b.speed + b.phase;
      b.mesh.position.set(X.meadow + Math.cos(a) * b.rad, b.h + Math.sin(a * 3) * 0.15, Math.sin(a * 1.3) * b.rad * 0.7);
      b.mesh.rotation.y = -a + Math.PI / 2;
      b.mesh.userData.wings.forEach((w, i) => { w.rotation.x = (i ? 1 : -1) * 0.4 - Math.PI / 2 + Math.sin(t * 55) * 0.5; });
    });
    clouds.forEach((cl, i) => { cl.position.x += dt * (0.12 + (i % 3) * 0.05); if (cl.position.x > 66) cl.position.x = -10; });

    // care: hearts + sensor pulse
    const careOn = c > 1.85 && c < 2.6;
    cow.tag.getWorldPosition(tagW);
    pulse.visible = careOn;
    if (careOn) {
      const k = (t * 0.8) % 1;
      pulse.position.copy(tagW);
      pulse.lookAt(camera.position);
      pulse.scale.setScalar(1 + k * 1.4);
      pulse.material.opacity = 1 - k;
    }
    hearts.forEach((h) => {
      h.visible = careOn;
      if (!careOn) return;
      const k = (t * 0.35 + h.userData.off) % 1;
      h.position.set(cow.root.position.x + 0.4 + Math.sin(k * 6 + h.userData.off * 9) * 0.35, 2.1 + k * 1.6, cow.root.position.z + 0.2);
      h.scale.setScalar(0.35 * Math.sin(k * Math.PI));
      h.lookAt(camera.position);
    });

    // milking: cups on, milk flows, tank fills
    const milkOn = clamp01((c - 2.85) / 0.3);
    cow.root.localToWorld(udder.set(-0.3, 0.33, 0));
    [[0.08, 0.08], [0.08, -0.08], [-0.08, 0.08], [-0.08, -0.08]].forEach(([dx, dz], i) => {
      cups[i].visible = milkOn > 0;
      cups[i].position.set(udder.x + dx, udder.y - 0.06, udder.z + dz);
    });
    dropsA.forEach((d) => {
      d.visible = milkOn > 0 && c < 4.6;
      if (d.visible) curveA.getPointAt((t * 0.25 + d.userData.off) % 1, d.position);
    });
    milkLevel.scale.y = 0.08 + 0.92 * clamp01((c - 2.9) / 1.0);
    const lineOn = c > 3.3 && c < 4.8;
    dropsB.forEach((d) => {
      d.visible = lineOn;
      if (d.visible) curveB.getPointAt((t * 0.12 + d.userData.off) % 1, d.position);
    });

    // packaging: belt moves, cartons ride, the filler pours
    const beltOn = c > 3.4;
    rollers.forEach((r) => { if (beltOn) r.rotation.y += dt * 4; });
    let pouring = false;
    conveyor.forEach((cc) => {
      cc.visible = c > 3.3 && c < 4.9;
      const u = beltOn ? (t * 0.09 + cc.userData.off) % 1 : cc.userData.off;
      const x = X.pack - 3 + u * 6;
      cc.position.set(x, 0.8 + 0.37, 0);
      cc.rotation.y = 0.35;
      if (Math.abs(x - (X.pack - 1)) < 0.18) pouring = true;
    });
    stream.visible = beltOn && pouring && c < 4.9;
    stream.position.set(X.pack - 1, 1.95, 0);
    stream.scale.y = 0.55;

    // home: the carton turns, leaves open like the original bottle's crown
    const homeK = clamp01((c - 4.4) / 0.6);
    burst.userData.set(homeK, dt);
    if (heroCarton) {
      heroCarton.rotation.y = -0.4 + (1 - homeK) * 2.2 + (reduced ? 0 : Math.sin(t * 0.6) * 0.12);
      heroCarton.position.y = 1.39 + (reduced ? 0 : Math.sin(t * 1.2) * 0.04);
    }

    renderer.render(scene, camera);

    const ch = Math.min(5, Math.round(c));
    if (ch !== lastChapter) { lastChapter = ch; onChapter?.(ch); }
  }

  function loop() {
    if (running) return;
    running = true;
    clock.getDelta();
    const step = () => {
      if (!visible) { running = false; return; }
      frame(Math.min(clock.getDelta(), 0.05));
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    canvas.style.display = visible ? '' : 'none';
    if (visible) loop();
  }).observe(section);

  frame(0.016);
  loop();
  return { get chapter() { return lastChapter; } };
}
