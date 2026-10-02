/* "Dal prato al cartone": the scroll-driven 3D story on storia.html.
   One continuous little world laid out along x. Scroll moves the camera
   from station to station; our cow walks a real path (no clipping) and
   meets the herd.
     0 meadow · 1 breakfast · 2 care (barn + herd) · 3 milking · 4 packaging · 5 at the table
   initStory(section, { onChapter }): section is the tall scroll container. */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildCow, buildBee, buildMeadow, buildIsland, buildLeafBurst, toon } from './cow.js';
import { buildCarton } from './carton3d.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const query = new URLSearchParams(location.search);
const snap = query.has('snap'); // debug/capture: no camera easing, no intro
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (v) => { v = clamp01(v); return v * v * v * (v * (v * 6 - 15) + 10); };
const easeInOut = (v) => { v = clamp01(v); return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; };
const lerp = THREE.MathUtils.lerp;
const std = (color, roughness = 0.85, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, ...extra });

const X = { meadow: 0, barn: 15, milk: 30, pack: 44, home: 58 };

/* painted textures: wood planks, gingham, plaster, straw, tiles */
function canvasTex(w, h, draw, repeat = [1, 1]) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.anisotropy = 8;
  return t;
}
const woodTex = (base = [196, 150, 104], planks = 6) => canvasTex(512, 512, (x, w, h) => {
  for (let i = 0; i < planks; i++) {
    const y0 = (i / planks) * h, ph = h / planks;
    const k = 0.9 + Math.random() * 0.18;
    x.fillStyle = `rgb(${base.map((v) => Math.round(v * k)).join(',')})`;
    x.fillRect(0, y0, w, ph);
    for (let g = 0; g < 26; g++) {
      x.strokeStyle = `rgba(90,55,25,${0.05 + Math.random() * 0.08})`; x.lineWidth = 1 + Math.random() * 1.5;
      const yy = y0 + Math.random() * ph; x.beginPath(); x.moveTo(0, yy);
      for (let xx = 0; xx <= w; xx += 32) x.lineTo(xx, yy + Math.sin(xx * 0.02 + g) * 2.5);
      x.stroke();
    }
    x.fillStyle = 'rgba(60,35,15,.45)'; x.fillRect(0, y0, w, 2.5);
  }
});
const ginghamTex = canvasTex(256, 256, (x, w, h) => {
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h);
  const s = w / 8;
  x.fillStyle = 'rgba(80,154,72,.45)';
  for (let i = 0; i < 8; i += 2) { x.fillRect(i * s, 0, s, h); x.fillRect(0, i * s, w, s); }
  x.fillStyle = 'rgba(63,132,56,.35)';
  for (let i = 0; i < 8; i += 2) for (let j = 0; j < 8; j += 2) x.fillRect(i * s, j * s, s, s);
}, [3, 1.2]);
const plasterTex = canvasTex(512, 256, (x, w, h) => {
  x.fillStyle = '#f6efe3'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 1800; i++) { x.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '160,120,80'},${Math.random() * 0.05})`; x.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
});
const strawTex = canvasTex(512, 512, (x, w, h) => {
  x.fillStyle = '#e8d29a'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++) {
    x.strokeStyle = `hsla(${38 + Math.random() * 14}, ${45 + Math.random() * 25}%, ${55 + Math.random() * 25}%, .8)`; x.lineWidth = 1 + Math.random() * 1.6;
    const px = Math.random() * w, py = Math.random() * h, a = Math.random() * Math.PI, l = 8 + Math.random() * 22;
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
  }
}, [3, 3]);
const tilesTex = canvasTex(512, 512, (x, w, h) => {
  x.fillStyle = '#cfe4d6'; x.fillRect(0, 0, w, h);
  const s = w / 8;
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { x.fillStyle = `hsl(${148 + Math.random() * 8}, ${22 + Math.random() * 8}%, ${80 + Math.random() * 6}%)`; x.fillRect(i * s + 2, j * s + 2, s - 4, s - 4); }
}, [3, 3]);
const skyTex = canvasTex(8, 256, (x, w, h) => {
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#eaf5e6'); g.addColorStop(0.55, '#f7fbf5'); g.addColorStop(1, '#ffffff');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
});
const softDot = canvasTex(64, 64, (x, w) => {
  const g = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,250,225,.6)'); g.addColorStop(1, 'rgba(255,250,225,0)');
  x.fillStyle = g; x.fillRect(0, 0, w, w);
});

/* a polyline path the cow walks along: pointAt(s) + tangent */
function makePath(pts) {
  const v = pts.map(([x, z]) => new THREE.Vector2(x, z));
  const seg = v.slice(1).map((p, i) => p.distanceTo(v[i]));
  const total = seg.reduce((a, b) => a + b, 0);
  return {
    total,
    at(s, out = new THREE.Vector2(), tan = new THREE.Vector2()) {
      s = Math.min(total, Math.max(0, s));
      for (let i = 0; i < seg.length; i++) {
        if (s <= seg[i] || i === seg.length - 1) {
          const k = seg[i] ? Math.min(1, s / seg[i]) : 0;
          out.lerpVectors(v[i], v[i + 1], k);
          tan.subVectors(v[i + 1], v[i]).normalize();
          return { p: out, t: tan };
        }
        s -= seg[i];
      }
      return { p: out.copy(v.at(-1)), t: tan };
    },
  };
}

export async function initStory(section, { onChapter } = {}) {
  const stage = section.querySelector('[data-story-stage]');
  const canvas = stage.querySelector('canvas');
  const small = matchMedia('(max-width: 760px)').matches;
  const fancy = !small && !reduced; // sharper shadows + more motes on desktop
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); }
  catch { stage.classList.add('no-webgl'); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping; // keeps the toon colours true while taming highlights
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = skyTex;
  scene.fog = new THREE.Fog(0xf2f8ef, 30, 70);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; // soft studio reflections for steel, glass, wood
  scene.environmentIntensity = 0.55;
  const camera = new THREE.PerspectiveCamera(small ? 44 : 32, 1, 0.1, 200);
  scene.add(new THREE.HemisphereLight(0xfdfdf7, 0xb9d0ad, 1.15));
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(fancy ? 2048 : 1024, fancy ? 2048 : 1024);
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 40 });
  sun.shadow.radius = 5;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);

  const uniforms = { uTime: { value: 0 } };
  const catcher = (r, x, y = 0.012) => {
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 64), new THREE.ShadowMaterial({ opacity: 0.18 }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, y, 0); m.receiveShadow = true;
    scene.add(m);
  };
  const shadowy = (o) => { o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };

  /* ---------- clouds ---------- */
  const clouds = [];
  const cloudM = toon(0xffffff, { emissive: 0x8f978f });
  for (let i = 0; i < 12; i++) {
    const c = new THREE.Group();
    [[0, 0, 0.9], [0.8, -0.15, 0.65], [-0.8, -0.2, 0.6], [0.3, 0.35, 0.6]].forEach(([x, y, r]) => { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), cloudM); s.position.set(x, y, 0); c.add(s); });
    c.position.set(-8 + i * 6.6, 6.5 + Math.random() * 2.5, -11 - Math.random() * 6);
    c.scale.setScalar(0.7 + Math.random() * 0.6);
    scene.add(c); clouds.push(c);
  }

  /* ---------- 0–1 · the meadow, with the herd grazing ---------- */
  const meadow = new THREE.Group();
  meadow.position.x = X.meadow;
  meadow.add(buildIsland(5, 0x8cc86c, 1.1));
  meadow.add(buildMeadow(5, small ? 4500 : 7500, uniforms));
  [[-3.2, -2.6, 1.25], [3.4, -2.8, 1], [-4, 0.9, 0.85]].forEach(([x, z, s]) => {
    const tr = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.17, 1.2, 10), std(0x8a6a4a, 0.95));
    trunk.position.y = 0.6;
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.85, 3), std(0x5f9e4a, 0.9));
    crown.position.y = 1.65;
    const crown2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.58, 3), std(0x7fb85e, 0.9));
    crown2.position.set(0.38, 2.05, 0.2);
    tr.add(trunk, crown, crown2);
    shadowy(tr); tr.position.set(x, 0, z); tr.scale.setScalar(s);
    tr.userData.sway = Math.random() * 6;
    meadow.add(tr);
  });
  scene.add(meadow);
  catcher(5, X.meadow);
  const meadowCows = [[-2.0, -1.3, 0.6, 21], [2.4, -1.5, 2.6, 33]].map(([x, z, r, seed]) => {
    const c = buildCow({ seed, hero: false, scale: 0.92 });
    c.root.position.set(X.meadow + x, 0, z); c.root.rotation.y = r;
    scene.add(c.root); return c;
  });
  const bees = [0, 1, 2].map((i) => {
    const b = buildBee(); b.scale.setScalar(1.3); scene.add(b);
    return { mesh: b, phase: i * 2.1, rad: 1.8 + i * 0.7, h: 0.9 + i * 0.3, speed: 0.55 + i * 0.12 };
  });

  /* drifting motes: pollen over the meadow, dust in the barn's light */
  const motes = (n, cx, w, h, d, size, color) => {
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(n * 3), seed = new Float32Array(n);
    for (let i = 0; i < n; i++) { p.set([cx + (Math.random() - 0.5) * w, Math.random() * h, (Math.random() - 0.5) * d], i * 3); seed[i] = Math.random() * 100; }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const m = new THREE.PointsMaterial({ map: softDot, color, size, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
    const pts = new THREE.Points(g, m);
    pts.userData = { base: p.slice(), seed, h };
    pts.frustumCulled = false;
    scene.add(pts);
    return pts;
  };
  const pollen = motes(fancy ? 140 : 60, X.meadow, 10, 3.5, 8, 0.09, 0xfff3c4);
  const dust = motes(fancy ? 160 : 60, X.barn - 1.5, 5, 3.4, 3, 0.07, 0xfff0cf);
  const driftMotes = (pts, t) => {
    const a = pts.geometry.attributes.position, { base, seed, h } = pts.userData;
    for (let i = 0; i < seed.length; i++) {
      const s = seed[i];
      a.array[i * 3] = base[i * 3] + Math.sin(t * 0.21 + s) * 0.45;
      a.array[i * 3 + 1] = (base[i * 3 + 1] + t * 0.06 + Math.sin(t * 0.5 + s) * 0.08) % h;
      a.array[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.17 + s * 1.3) * 0.4;
    }
    a.needsUpdate = true;
  };

  /* a farm track between stations */
  const trackM = std(0xd9c7a2, 1);
  const verge = std(0x5f9e4a, 0.9);
  const vergeStrip = std(0x84bd62, 1);
  const tuftGeo = new THREE.ConeGeometry(0.035, 1, 4); tuftGeo.translate(0, 0.5, 0);
  const track = (x0, x1, z = 0.3) => {
    const bank = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0 + 1.2, 0.5, 3.4), vergeStrip);
    bank.position.set((x0 + x1) / 2, -0.33, z); bank.receiveShadow = true; scene.add(bank);
    const t = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0 + 1.2, 0.1, 1.3), trackM);
    t.position.set((x0 + x1) / 2, -0.05, z); t.receiveShadow = true; scene.add(t);
    // soft tufts along both verges, a few blades each, leaning a little
    const n = Math.round((x1 - x0) * 22);
    const tufts = new THREE.InstancedMesh(tuftGeo, verge, n);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? 1 : -1;
      ps.set(x0 + Math.random() * (x1 - x0), 0, z + side * (0.75 + Math.random() * 0.9));
      e.set((Math.random() - 0.5) * 0.5, Math.random() * 3, (Math.random() - 0.5) * 0.5); q.setFromEuler(e);
      sc.set(1, 0.1 + Math.random() * 0.16, 1);
      tufts.setMatrixAt(i, m4.compose(ps, q, sc));
    }
    tufts.receiveShadow = true; scene.add(tufts);
  };
  track(X.meadow + 4.8, X.barn - 4.8, 0.3);
  track(X.barn + 4.8, X.milk - 4.4, 0.4);

  /* ---------- 2 · care: an open barn like theirs, with the herd ---------- */
  const barn = new THREE.Group();
  barn.position.x = X.barn;
  const strawFloor = new THREE.Mesh(new THREE.CylinderGeometry(5, 4.7, 0.7, 72), [std(0xc4a77c), std(0xffffff, 1, { map: strawTex }), std(0xb09068)]);
  strawFloor.position.y = -0.35; strawFloor.receiveShadow = true;
  barn.add(strawFloor);
  const beamM = std(0xffffff, 0.8, { map: woodTex([214, 172, 124], 3) });
  const post = (x, z, h = 3.4) => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.2, h, 0.2), beamM); p.position.set(x, h / 2, z); return p; };
  [[-3.8, -2.5], [0, -2.5], [3.8, -2.5], [-4.2, 2.6], [4.2, 2.6]].forEach(([x, z]) => barn.add(post(x, z)));
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(8, 2.4, 0.18), std(0xffffff, 0.95, { map: plasterTex }));
  backWall.position.set(0, 1.2, -2.62);
  const plinthW = new THREE.Mesh(new THREE.BoxGeometry(8, 0.7, 0.2), std(0xffffff, 0.85, { map: woodTex([150, 104, 66], 3) }));
  plinthW.position.set(0, 0.35, -2.5);
  barn.add(backWall, plinthW);
  const roofM = std(0x7fae74, 0.75);
  [-1, 1].forEach((s) => {
    const r = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.12, 5.8), roofM);
    r.position.set(s * 2.0, 4.05, 0.05); r.rotation.z = -s * 0.36; barn.add(r);
  });
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 5.9), beamM); ridge.position.set(0, 4.8, 0.05); barn.add(ridge);
  const tie = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.16, 0.16), beamM); tie.position.set(0, 3.35, -2.5); barn.add(tie);
  // feed fence along the front-right: the cows stand behind it and eat through the gaps
  const FENCE_Z = 0.9, FENCE_X0 = 0.2, FENCE_X1 = 3.7;
  const fenceWall = new THREE.Mesh(new THREE.BoxGeometry(FENCE_X1 - FENCE_X0, 0.48, 0.16), std(0xf1ebde, 0.9));
  fenceWall.position.set((FENCE_X0 + FENCE_X1) / 2, 0.24, FENCE_Z);
  const railM = std(0xc9d2cf, 0.35, { metalness: 0.6 });
  const topRail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, FENCE_X1 - FENCE_X0, 12), railM);
  topRail.rotation.z = Math.PI / 2; topRail.position.set((FENCE_X0 + FENCE_X1) / 2, 1.62, FENCE_Z);
  barn.add(fenceWall, topRail);
  [FENCE_X0 + 0.05, 1.75, 3.25, FENCE_X1 - 0.05].forEach((x) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.4, 10), railM); p.position.set(x, 0.92, FENCE_Z); barn.add(p); });
  // hay along the feed alley, in front of the fence
  const hayM = std(0xd9bd6e, 1, { map: strawTex });
  for (let i = 0; i < 44; i++) { const h = new THREE.Mesh(new THREE.SphereGeometry(0.17 + Math.random() * 0.1, 10, 8), hayM); h.scale.y = 0.42; h.position.set(FENCE_X0 + 0.2 + Math.random() * (FENCE_X1 - FENCE_X0 - 0.4), 0.05, FENCE_Z + 0.35 + Math.random() * 0.45); barn.add(h); }
  const bale = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.9, 28), std(0xe2c97f, 1, { map: strawTex }));
  bale.rotation.set(Math.PI / 2, 0, 0.3); bale.position.set(4.0, 0.55, -1.25); barn.add(bale);
  shadowy(barn);
  scene.add(barn);
  // the herd: two eating at the fence (facing you, heads through the gaps), one lying, one standing
  const FACE_CAM = -Math.PI / 2; // local +x → world +z (toward the camera)
  const herd = [
    { x: 1.0, z: FENCE_Z - 1.05, r: FACE_CAM, seed: 41, pose: { graze: 1 } },
    { x: 2.5, z: FENCE_Z - 1.05, r: FACE_CAM + 0.06, seed: 52, pose: { graze: 1 } },
    { x: -3.0, z: -1.25, r: 0.45, seed: 63, pose: { lie: 1 }, looks: true },
    { x: -0.9, z: -1.75, r: 0.15, seed: 74, pose: {}, looks: true },
  ].map((h) => { const c = buildCow({ seed: h.seed, hero: false }); c.root.position.set(X.barn + h.x, 0, h.z); c.root.rotation.y = h.r; scene.add(c.root); c.pose = h.pose; c.looks = h.looks; return c; });
  // hearts and the sensor pulse while she is cared for
  const heartShape = new THREE.Shape();
  heartShape.moveTo(0, -0.3);
  heartShape.bezierCurveTo(-0.5, 0.05, -0.28, 0.42, 0, 0.18);
  heartShape.bezierCurveTo(0.28, 0.42, 0.5, 0.05, 0, -0.3);
  const heartGeo = new THREE.ExtrudeGeometry(heartShape, { depth: 0.08, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 3 });
  const heartM = std(0xff8fa3, 0.6);
  const hearts = Array.from({ length: 3 }, (_, i) => { const h = new THREE.Mesh(heartGeo, heartM); h.userData.off = i / 3; h.visible = false; scene.add(h); return h; });
  const pulse = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.012, 8, 40), new THREE.MeshBasicMaterial({ color: 0xf2c230, transparent: true }));
  scene.add(pulse);

  /* ---------- 3 · milking: a warm parlour with windows and geraniums ---------- */
  const milking = new THREE.Group();
  milking.position.x = X.milk;
  const mFloor = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 4.5, 0.7, 72), [std(0xb7c9bb), std(0xffffff, 0.7, { map: tilesTex }), std(0xa9bcae)]);
  mFloor.position.y = -0.35; mFloor.receiveShadow = true; milking.add(mFloor);
  const mWallLow = new THREE.Mesh(new THREE.BoxGeometry(8.4, 1.1, 0.2), std(0xffffff, 0.85, { map: woodTex([176, 120, 74], 4) }));
  mWallLow.position.set(0, 0.55, -2.4);
  const mWallHigh = new THREE.Mesh(new THREE.BoxGeometry(8.4, 2.4, 0.18), std(0xffffff, 0.95, { map: plasterTex }));
  mWallHigh.position.set(0, 2.3, -2.42);
  milking.add(mWallLow, mWallHigh);
  const skyM = new THREE.MeshBasicMaterial({ color: 0xbfe2f2 });
  const frameM = std(0x3f8438, 0.6);
  const flowerCols = [0xd63a3a, 0xe8505b, 0xf06d7c, 0xd63a3a, 0xffffff];
  [-2.2, 1.6].forEach((wx) => {
    const win = new THREE.Group(); win.position.set(wx, 2.25, -2.3);
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1), skyM);
    const hills = new THREE.Mesh(new THREE.CircleGeometry(0.9, 24, 0, Math.PI), std(0x8cc86c)); hills.position.set(0.2, -0.5, 0.005); hills.scale.y = 0.35;
    const fr = [[0, 0.52, 1.42, 0.08], [0, -0.52, 1.42, 0.08], [-0.67, 0, 0.08, 1.1], [0.67, 0, 0.08, 1.1], [0, 0, 0.05, 1], [0, 0, 1.3, 0.05]]
      .map(([x, y, w, h]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.06), frameM); m.position.set(x, y, 0.03); return m; });
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.22, 0.32), std(0xa0623a, 0.8)); box.position.set(0, -0.66, 0.16);
    win.add(pane, hills, ...fr, box);
    for (let i = 0; i < 16; i++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), std(0x4f8a3a)); leaf.position.set(-0.6 + Math.random() * 1.2, -0.5 + Math.random() * 0.06, 0.1 + Math.random() * 0.2); win.add(leaf);
      const fl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 1), std(flowerCols[i % flowerCols.length], 0.6)); fl.position.set(-0.6 + Math.random() * 1.2, -0.42 + Math.random() * 0.1, 0.12 + Math.random() * 0.2); win.add(fl);
    }
    milking.add(win);
  });
  // stalls: rails spaced wider than a cow, so nobody clips through the steel
  const STALL = { rails: [-1.85, -0.1, 1.65], hero: 0.78, neighbour: -0.98 };
  const mats = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.05, 3.8), std(0x3c6e3a, 0.95)); mats.position.set(-0.6, 0.02, -0.1); mats.receiveShadow = true; milking.add(mats);
  const steel = std(0xdfe6e8, 0.3, { metalness: 0.6 });
  STALL.rails.forEach((z) => {
    const r1 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 3.2, 12), steel); r1.rotation.z = Math.PI / 2; r1.position.set(-0.6, 1.15, z); milking.add(r1);
    [-2.1, 0.9].forEach((x) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.2, 12), steel); p.position.set(x, 0.6, z); milking.add(p); });
  });
  const tank = new THREE.Group();
  tank.position.set(2.75, 0, -1.25);
  const tankM = std(0xf4f7f8, 0.22, { metalness: 0.35 });
  const tankBody = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 1.9, 48), tankM); tankBody.position.y = 1.15;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.95, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), tankM); dome.position.y = 2.1; dome.scale.y = 0.35;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.965, 0.965, 0.22, 48), std(0x509a48, 0.5)); band.position.y = 1.8;
  const legsT = [0, 1, 2].map((i) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 8), steel); const a = i * 2.1; l.position.set(Math.cos(a) * 0.7, 0.1, Math.sin(a) * 0.7); return l; });
  const sight = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.3, 0.04), std(0xbfd0d6, 0.1));
  sight.position.set(0, 1.1, 0.96);
  const milkLevel = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.26, 0.05), new THREE.MeshBasicMaterial({ color: 0xfffdf7 }));
  milkLevel.geometry.translate(0, 0.63, 0); milkLevel.position.set(0, 0.47, 0.975);
  tank.add(tankBody, dome, band, ...legsT, sight, milkLevel);
  milking.add(tank);
  const pot = new THREE.Group(); pot.position.set(3.4, 0, 1.2);
  const potM = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.45, 18), std(0xb5653d, 0.8)); potM.position.y = 0.22;
  pot.add(potM);
  for (let i = 0; i < 9; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), std(0x4f8a3a)); l.position.set((Math.random() - 0.5) * 0.4, 0.55 + Math.random() * 0.45, (Math.random() - 0.5) * 0.4); l.scale.set(0.7, 1.2, 0.7); pot.add(l); }
  const can = new THREE.Group(); can.position.set(-3.3, 0, 1.6);
  const canB = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.28, 0.6, 24), steel); canB.position.y = 0.3;
  const canN = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.25, 0.2, 24), steel); canN.position.y = 0.7;
  const canL = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.08, 24), std(0x509a48, 0.5)); canL.position.y = 0.84;
  can.add(canB, canN, canL);
  milking.add(pot, can);
  shadowy(milking);
  scene.add(milking);
  catcher(4.8, X.milk);
  const neighbour = buildCow({ seed: 88, hero: false });
  neighbour.root.position.set(X.milk - 0.7, 0, STALL.neighbour); neighbour.root.rotation.y = 0;
  scene.add(neighbour.root);
  const cupM = std(0xd2d9dc, 0.25, { metalness: 0.7 });
  const cups = Array.from({ length: 4 }, () => { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.15, 12), cupM); c.castShadow = true; scene.add(c); return c; });
  const claw = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), std(0xe8eef0, 0.2, { transparent: true, opacity: 0.85 }));
  scene.add(claw);

  /* the milk line: claw → tank → (long run) → filler */
  const cowMilkX = X.milk - 0.6;
  const pipeM = std(0xeaf2f2, 0.12, { transparent: true, opacity: 0.6 });
  const curveA = new THREE.CatmullRomCurve3([
    new THREE.Vector3(cowMilkX - 0.3, 0.3, STALL.hero + 0.1), new THREE.Vector3(cowMilkX - 0.05, 0.12, STALL.hero + 0.55),
    new THREE.Vector3(cowMilkX + 1.4, 0.12, 2.0), new THREE.Vector3(X.milk + 2.0, 0.3, 0.2), new THREE.Vector3(X.milk + 1.85, 0.6, -1.25),
  ]);
  const curveB = new THREE.CatmullRomCurve3([
    new THREE.Vector3(X.milk + 3.65, 0.5, -1.25), new THREE.Vector3(X.milk + 4.6, 0.18, -1.0), new THREE.Vector3(X.pack - 4.6, 0.18, -0.9),
    new THREE.Vector3(X.pack - 2.2, 0.3, -0.9), new THREE.Vector3(X.pack - 1.4, 2.6, -0.6), new THREE.Vector3(X.pack - 1.0, 2.95, -0.2),
  ]);
  [curveA, curveB].forEach((cv) => scene.add(new THREE.Mesh(new THREE.TubeGeometry(cv, 140, 0.06, 10), pipeM)));
  const dropM = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const dropsA = Array.from({ length: 16 }, (_, i) => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), dropM); d.userData.off = i / 16; scene.add(d); return d; });
  const dropsB = Array.from({ length: 28 }, (_, i) => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), dropM); d.userData.off = i / 28; scene.add(d); return d; });

  /* ---------- 4 · packaging line ---------- */
  const pack = new THREE.Group();
  pack.position.x = X.pack;
  const pfloor = new THREE.Mesh(new THREE.CylinderGeometry(4.3, 4, 0.7, 64), [std(0xb7c9bb), std(0xffffff, 0.7, { map: tilesTex }), std(0xa9bcae)]);
  pfloor.position.y = -0.35; pfloor.receiveShadow = true; pack.add(pfloor);
  const belt = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.16, 1.0), std(0x55624f, 0.9)); belt.position.set(0, 0.72, 0); pack.add(belt);
  const beltFrame = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.1, 1.15), steel); beltFrame.position.set(0, 0.6, 0); pack.add(beltFrame);
  [-2.8, 0, 2.8].forEach((x) => [-0.45, 0.45].forEach((z) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 8), steel); l.position.set(x, 0.3, z); pack.add(l); }));
  const rollers = Array.from({ length: 14 }, (_, i) => { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.02, 10), std(0x8a978a, 0.6)); r.rotation.x = Math.PI / 2; r.position.set(-3.1 + i * 0.48, 0.64, 0); pack.add(r); return r; });
  const filler = new THREE.Group(); filler.position.set(-1, 0, 0);
  const fBody = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.1, 1.5), std(0xfbfbf9, 0.6)); fBody.position.y = 3.05;
  const fBand = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.22, 1.52), std(0x509a48, 0.5)); fBand.position.y = 2.75;
  const fLegs = [-0.55, 0.55].map((x) => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.5, 0.12), steel); l.position.set(x, 1.25, -0.65); return l; });
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.05, 0.35, 16), steel); nozzle.position.y = 2.35;
  filler.add(fBody, fBand, ...fLegs, nozzle);
  pack.add(filler);
  shadowy(pack);
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  stream.visible = false;
  scene.add(pack, stream);
  catcher(4.3, X.pack);

  /* ---------- 5 · at the table: the carton pours a glass of milk ---------- */
  const home = new THREE.Group();
  home.position.x = X.home;
  const TOP = 1.036; // tabletop + runner surface
  const tableTop = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.14, 2.2), std(0xffffff, 0.7, { map: woodTex([190, 140, 92], 5) }));
  tableTop.position.y = 0.95;
  const tLegs = [[-1.9, -0.9], [1.9, -0.9], [-1.9, 0.9], [1.9, 0.9]].map(([x, z]) => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.9, 0.14), std(0x9a6a40, 0.8)); l.position.set(x, 0.45, z); return l; });
  const runner = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.012, 0.9), std(0xffffff, 0.9, { map: ginghamTex }));
  runner.position.set(0, 1.03, 0.05);
  home.add(tableTop, ...tLegs, runner);
  // the glass: clear (no transmission pass: it flickered on some desktop GPUs), milk inside it
  const GLASS = new THREE.Vector3(0.95, TOP, 0.45);
  const GS = 1.4; // a 1 L carton next to a proper tumbler
  const glassG = new THREE.Group(); glassG.position.copy(GLASS); glassG.scale.setScalar(GS);
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.6 });
  const glassWall = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.155, 0.5, 40, 1, true), glassM);
  glassWall.position.y = 0.25; glassWall.renderOrder = 5;
  const glassBase = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.04, 40), glassM);
  glassBase.position.y = 0.02; glassBase.renderOrder = 5;
  const glassRim = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.006, 8, 48), glassM);
  glassRim.rotation.x = Math.PI / 2; glassRim.position.y = 0.5; glassRim.renderOrder = 5;
  const milkGeo = new THREE.CylinderGeometry(0.168, 0.152, 1, 40); milkGeo.translate(0, 0.5, 0);
  const milkM = std(0xfffdf8, 0.32);
  const milkIn = new THREE.Mesh(milkGeo, milkM); milkIn.position.y = 0.04; milkIn.scale.y = 0.001;
  glassG.add(milkIn, glassWall, glassBase, glassRim);
  // splash at the surface while pouring
  const splash = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 8, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true }));
  splash.rotation.x = Math.PI / 2; splash.visible = false;
  glassG.add(splash);
  const droplets = Array.from({ length: 8 }, (_, i) => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), milkM); d.userData.a = (i / 8) * Math.PI * 2; d.visible = false; glassG.add(d); return d; });
  // jug of wildflowers, a loaf
  const jug = new THREE.Group(); jug.position.set(1.75, TOP, -0.4);
  const jugB = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.5, 24), std(0xf2ede2, 0.5)); jugB.position.y = 0.25;
  const jugBand = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.21, 0.06, 24), std(0x509a48, 0.5)); jugBand.position.y = 0.36;
  jug.add(jugB, jugBand);
  const bloomCols = [0xffffff, 0xf7e27a, 0xd98ab8, 0xb58ad6, 0xffffff, 0xf2c230];
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.random() * 0.22;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.5, 4), std(0x5f9e4a)); stem.position.set(Math.cos(a) * r * 0.6, 0.65, Math.sin(a) * r * 0.6); stem.rotation.set(Math.sin(a) * 0.3, 0, Math.cos(a) * 0.3); jug.add(stem);
    const fl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05, 1), std(bloomCols[i % bloomCols.length], 0.6)); fl.position.set(Math.cos(a) * r, 0.88 + Math.random() * 0.12, Math.sin(a) * r); jug.add(fl);
  }
  const loaf = new THREE.Group(); loaf.position.set(-0.75, TOP, 0.62);
  const loafB = new THREE.Mesh(new THREE.SphereGeometry(0.3, 32, 20), std(0xc98a4b, 0.8)); loafB.scale.set(1.3, 0.55, 0.85); loafB.position.y = 0.1;
  [-0.14, 0, 0.14].forEach((x) => { const cut = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.32), std(0xe9c48f, 0.9)); cut.position.set(x, 0.265, 0); cut.rotation.y = 0.5; loaf.add(cut); });
  loaf.add(loafB);
  home.add(glassG, jug, loaf);
  const burst = buildLeafBurst(60, 2.8);
  burst.position.set(-0.1, 2.3, -0.9);
  burst.frustumCulled = false; // its bounds change as it opens: never cull it (this was the desktop flicker)
  home.add(burst);
  shadowy(home);
  [glassWall, glassBase, glassRim, splash].forEach((m) => { m.castShadow = false; m.receiveShadow = false; });
  scene.add(home);
  catcher(3.4, X.home);
  // milk stream from the carton spout into the glass (rebuilt while pouring)
  const streamM = std(0xfffdf8, 0.3);
  let pourStream = new THREE.Mesh(new THREE.BufferGeometry(), streamM);
  pourStream.visible = false;
  home.add(pourStream);

  const CARTON_REST = new THREE.Vector3(-0.1, TOP + 0.89, 0.05);
  let heroCarton, sideCarton;
  const conveyor = [];
  Promise.all([buildCarton('intero'), buildCarton('scremato')]).then(([a, b]) => {
    heroCarton = a; heroCarton.position.copy(CARTON_REST);
    sideCarton = b; sideCarton.position.set(-1.1, TOP + 0.712, -0.5); sideCarton.scale.setScalar(0.8); sideCarton.rotation.y = 0.35;
    shadowy(heroCarton); shadowy(sideCarton);
    home.add(heroCarton, sideCarton);
    for (let i = 0; i < 7; i++) {
      const c = (i % 3 === 2 ? b : a).clone();
      c.scale.setScalar(0.42); c.userData.off = i / 7;
      scene.add(c); conveyor.push(c);
    }
  });

  /* ---------- our cow and her route ---------- */
  const cow = buildCow();
  scene.add(cow.root);
  const SPOT = { meadow: [X.meadow + 0.9, 0.3], barn: [X.barn - 1.3, 0.45], milk: [cowMilkX, STALL.hero] };
  const path1 = makePath([SPOT.meadow, [X.meadow + 4.6, 0.3], [X.barn - 4.6, 0.3], SPOT.barn]);
  // around the feed alley (never through the fence), out of the barn, into her stall from behind
  const path2 = makePath([SPOT.barn, [X.barn - 0.5, 2.3], [X.barn + 3.2, 2.3], [X.barn + 4.9, 0.4], [X.milk - 4.4, 0.4], [X.milk - 2.6, STALL.hero], SPOT.milk]);

  /* ---------- camera path: [position, lookAt] per chapter ---------- */
  const shots = [
    [[-5, 2.4, 10], [0.2, 0.9, 0]],
    [[4.2, 2.1, 6.4], [0.9, 1.0, 0.2]],
    [[X.barn + 0.4, 2.9, 9.6], [X.barn + 0.2, 1.05, 0]],
    [[X.milk - 0.4, 2.5, 8.6], [X.milk + 0.5, 1.1, -0.4]],
    [[X.pack + 0.6, 4.4, 10.4], [X.pack, 1.8, 0]],
    [[X.home + 0.35, 2.85, 6.6], [X.home + 0.1, 1.7, 0]],
  ];
  if (small) shots.forEach((s) => { s[0][2] += 3.4; s[0][1] += 0.5; });
  const P = shots.map((s) => new THREE.Vector3(...s[0]));
  const L = shots.map((s) => new THREE.Vector3(...s[1]));
  const INTRO_FROM = new THREE.Vector3(-18, 16, 26), INTRO_LOOK = new THREE.Vector3(6, 0, 0);

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    if (w > 900) camera.setViewOffset(w, h, -w * 0.16, 0, w, h);
    else camera.setViewOffset(w, h, 0, h * 0.06, w, h);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  /* ---------- scroll → chapter float ---------- */
  let target = 0, prog = 0, lastChapter = -1;
  const readScroll = () => {
    const r = section.getBoundingClientRect();
    target = clamp01(-r.top / (section.offsetHeight - innerHeight)) * 5;
  };
  addEventListener('scroll', readScroll, { passive: true });
  addEventListener('resize', readScroll);
  readScroll();
  prog = target;

  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  let intro = snap || reduced || target > 0.15 ? 1 : 0; // establishing swoop on first view
  const stations = Object.values(X);
  function cameraAt(c) {
    const k = Math.min(4, Math.floor(c));
    const e = smooth((c - k - 0.35) / 0.65);
    camPos.lerpVectors(P[k], P[k + 1], e);
    camLook.lerpVectors(L[k], L[k + 1], e);
    camPos.y += Math.sin(Math.PI * e) * (Math.abs(P[k + 1].x - P[k].x) > 4 ? 2.2 : 0.4);
    if (intro < 1) {
      const i = easeInOut(intro);
      camPos.lerpVectors(INTRO_FROM, camPos, i);
      camLook.lerpVectors(INTRO_LOOK, camLook, i);
    }
    camera.position.copy(camPos);
    camera.lookAt(camLook);
    // shadows follow the nearest station, not the moving camera: no shimmering
    const st = stations.reduce((a, b) => (Math.abs(b - camLook.x) < Math.abs(a - camLook.x) ? b : a));
    sun.position.set(st + 6, 11, 7);
    sun.target.position.set(st, 0, 0);
  }

  const tmp2 = new THREE.Vector2();
  let faceY = -2.1;
  function cowAt(c, dt) {
    const k1 = smooth((c - 1.35) / 0.65), k2 = smooth((c - 2.35) / 0.65);
    let pos, tan, moving = false;
    if (c < 1.35) { pos = tmp2.set(...SPOT.meadow); }
    else if (k1 < 1) { const r = path1.at(k1 * path1.total, tmp2); pos = r.p; tan = r.t; moving = k1 > 0 && k1 < 1; }
    else if (c < 2.35) { pos = tmp2.set(...SPOT.barn); }
    else { const r = path2.at(k2 * path2.total, tmp2); pos = r.p; tan = r.t; moving = k2 > 0 && k2 < 1; }
    cow.root.position.set(pos.x, 0, pos.y);
    // facing: along the path while walking; at rest, toward the camera (3/4) or into the stall
    let face;
    if (moving && tan) face = Math.atan2(-tan.y, tan.x);
    else if (c < 1.35) face = lerp(-2.1, -1.15, smooth(c));
    else if (c < 2.35) face = -1.0;
    else face = 0;
    let d = face - faceY; d = Math.atan2(Math.sin(d), Math.cos(d));
    faceY += d * Math.min(1, dt * (moving ? 7 : 4));
    cow.root.rotation.y = faceY;
    const graze = c < 0.35 ? 1 : c < 1.3 ? (Math.sin(c * 9) > -0.3 ? 1 : 0) : 0;
    cow.update(dt, { graze, lookAt: (c > 0.6 && c < 2.6) ? camera.position : null });
  }

  /* ---------- the pour: time-based once you arrive at the table ---------- */
  let pourT = 0;
  const spoutL = new THREE.Vector3(0, 0.89 + 0.24, -0.12); // carton cap, carton-local
  const spoutW = new THREE.Vector3(), fillTop = new THREE.Vector3();
  const POUR_POS = new THREE.Vector3(GLASS.x - 0.98, 2.5, GLASS.z - 0.02);
  function pourAt(dt, c) {
    const want = c > 4.55 ? 1 : c < 4.4 ? 0 : null;
    if (want === 1) pourT = Math.min(1, pourT + dt / 4.6);
    else if (want === 0) pourT = Math.max(0, pourT - dt / 1.2);
    if (snap) pourT = c > 4.55 ? 0.55 : 0;
    const p = pourT;
    const lift = smooth(p / 0.2) * (1 - smooth((p - 0.84) / 0.16));
    const tilt = smooth((p - 0.2) / 0.14) * (1 - smooth((p - 0.72) / 0.12));
    const fill = smooth((p - 0.34) / 0.4);
    if (heroCarton) {
      heroCarton.position.lerpVectors(CARTON_REST, POUR_POS, lift);
      heroCarton.rotation.set(0, lerp(-0.35, 0, lift) + (reduced ? 0 : Math.sin(performance.now() / 2000) * 0.05 * (1 - lift)), -1.95 * tilt);
      heroCarton.updateMatrixWorld();
    }
    milkIn.scale.y = Math.max(0.001, 0.4 * fill);
    const pouring = heroCarton && tilt > 0.92 && fill < 1;
    pourStream.visible = pouring;
    splash.visible = pouring; droplets.forEach((d) => { d.visible = pouring; });
    if (pouring) {
      heroCarton.localToWorld(spoutW.copy(spoutL)); home.worldToLocal(spoutW);
      fillTop.set(GLASS.x, GLASS.y + (0.04 + 0.4 * fill) * GS, GLASS.z);
      const wob = Math.sin(performance.now() / 90) * 0.012;
      const curve = new THREE.CatmullRomCurve3([spoutW.clone(), new THREE.Vector3(lerp(spoutW.x, fillTop.x, 0.55) + wob, lerp(spoutW.y, fillTop.y, 0.3) + 0.05, lerp(spoutW.z, fillTop.z, 0.6)), fillTop.clone()]);
      pourStream.geometry.dispose();
      pourStream.geometry = new THREE.TubeGeometry(curve, 24, 0.034, 10);
      const s = (performance.now() / 380) % 1;
      splash.position.y = 0.04 + 0.4 * fill + 0.005;
      splash.scale.setScalar(0.6 + s * 1.4); splash.material.opacity = 0.9 * (1 - s);
      droplets.forEach((d, i) => {
        const k = ((performance.now() / 520) + i / droplets.length) % 1;
        d.position.set(Math.cos(d.userData.a) * 0.06 * (1 + k * 1.6), splash.position.y + Math.sin(k * Math.PI) * 0.09, Math.sin(d.userData.a) * 0.06 * (1 + k * 1.6));
      });
    }
    return smooth((p - 0.8) / 0.2);
  }

  const clock = new THREE.Clock();
  let t = 0, visible = true, running = false;
  const udderW = new THREE.Vector3(), tagW = new THREE.Vector3();

  function frame(dt) {
    t += dt;
    uniforms.uTime.value = t;
    prog = snap ? target : prog + (target - prog) * Math.min(1, dt * (reduced ? 20 : 4.5));
    // the swoop plays as the story docks; until then you see the whole little world from above
    if (intro < 1 && section.getBoundingClientRect().top < innerHeight * 0.25) intro = Math.min(1, intro + dt / 2.6);
    if (prog > 0.2) intro = 1;
    const c = prog;
    cameraAt(c);
    cowAt(c, dt);
    // the rest of the cast animates only when its station is near (cheap on phones)
    if (c < 2.2) meadowCows.forEach((m, i) => m.update(dt, { graze: (t + i * 3) % 11 < 8 ? 1 : 0, lookAt: (t + i * 3) % 11 >= 8 ? camera.position : null }));
    if (c > 1.2 && c < 3.4) herd.forEach((h) => h.update(dt, { ...h.pose, lookAt: h.looks ? camera.position : null }));
    if (c > 2.3 && c < 4.2) neighbour.update(dt, { lookAt: camera.position });

    bees.forEach((b) => {
      const a = t * b.speed + b.phase;
      b.mesh.position.set(X.meadow + Math.cos(a) * b.rad, b.h + Math.sin(a * 3) * 0.15, Math.sin(a * 1.3) * b.rad * 0.7);
      b.mesh.rotation.y = -a + Math.PI / 2;
      b.mesh.userData.wings.forEach((w, i) => { w.rotation.x = (i ? 1 : -1) * 0.4 - Math.PI / 2 + Math.sin(t * 55) * 0.5; });
    });
    clouds.forEach((cl, i) => { cl.position.x += dt * (0.12 + (i % 3) * 0.05); if (cl.position.x > 68) cl.position.x = -10; });
    meadow.children.forEach((ch) => { if (ch.userData.sway != null) ch.rotation.z = Math.sin(t * 0.6 + ch.userData.sway) * 0.012; });
    if (c < 2.4) driftMotes(pollen, t);
    if (c > 1.4 && c < 3.2) driftMotes(dust, t);

    // care: sensor pulse and a few hearts
    const careOn = c > 1.9 && c < 2.6;
    cow.tag.getWorldPosition(tagW);
    pulse.visible = careOn;
    if (careOn) {
      const k = (t * 0.7) % 1;
      pulse.position.copy(tagW); pulse.lookAt(camera.position);
      pulse.scale.setScalar(1 + k * 1.6); pulse.material.opacity = (1 - k) * 0.9;
    }
    hearts.forEach((h) => {
      h.visible = careOn;
      if (!careOn) return;
      const k = (t * 0.28 + h.userData.off) % 1;
      h.position.set(cow.root.position.x + 0.5 + Math.sin(k * 5 + h.userData.off * 9) * 0.3, 2.2 + k * 1.3, cow.root.position.z + 0.2);
      h.scale.setScalar(0.28 * Math.sin(k * Math.PI));
      h.lookAt(camera.position);
    });

    // milking: cups on the teats, milk flows, tank fills
    const milkOn = clamp01((c - 2.85) / 0.3);
    cow.root.updateMatrixWorld();
    cow.teats.forEach((tt, i) => {
      tt.getWorldPosition(udderW);
      cups[i].visible = milkOn > 0;
      cups[i].position.set(udderW.x, udderW.y - 0.09, udderW.z);
    });
    cow.udder.getWorldPosition(udderW);
    claw.visible = milkOn > 0;
    claw.position.set(udderW.x + 0.02, 0.3, udderW.z + 0.12);
    dropsA.forEach((d) => { d.visible = milkOn > 0 && c < 4.6; if (d.visible) curveA.getPointAt((t * 0.25 + d.userData.off) % 1, d.position); });
    milkLevel.scale.y = 0.08 + 0.92 * clamp01((c - 2.9) / 1.0);
    const lineOn = c > 3.3 && c < 4.8;
    dropsB.forEach((d) => { d.visible = lineOn; if (d.visible) curveB.getPointAt((t * 0.12 + d.userData.off) % 1, d.position); });

    // packaging
    const beltOn = c > 3.4;
    rollers.forEach((r) => { if (beltOn) r.rotation.y += dt * 4; });
    let pouringLine = false;
    conveyor.forEach((cc) => {
      cc.visible = c > 3.3 && c < 4.9;
      const u = beltOn ? (t * 0.09 + cc.userData.off) % 1 : cc.userData.off;
      const x = X.pack - 3 + u * 6;
      cc.position.set(x, 0.8 + 0.37, 0); cc.rotation.y = 0.35;
      if (Math.abs(x - (X.pack - 1)) < 0.18) pouringLine = true;
    });
    stream.visible = beltOn && pouringLine && c < 4.9;
    stream.position.set(X.pack - 1, 1.95, 0); stream.scale.y = 0.55;

    // at the table: pour, then the leaves open like the original bottle's crown
    const done = pourAt(dt, c);
    burst.userData.set(Math.max(done, snap && c > 4.9 ? 1 : 0), dt);

    renderer.render(scene, camera);
    const ch = Math.min(5, Math.round(c));
    if (ch !== lastChapter) { lastChapter = ch; onChapter?.(ch); }
  }

  function loop() {
    if (running) return;
    running = true; clock.getDelta();
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
