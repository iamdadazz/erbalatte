/* "Dal prato al cartone" — the scroll-driven 3D story on storia.html.
   One continuous little world laid out along x. Scroll moves the camera
   from station to station; our cow walks with it and meets the herd.
     0 meadow · 1 breakfast · 2 care (barn + herd) · 3 milking · 4 packaging · 5 at the table
   initStory(section, { onChapter }) — section is the tall scroll container. */

import * as THREE from 'three';
import { buildRealCow, buildBee, buildMeadow, buildIsland, buildLeafBurst, toon } from './cow.js';
import { buildCarton } from './carton3d.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const snap = new URLSearchParams(location.search).has('snap'); // debug/capture: no camera easing
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (v) => { v = clamp01(v); return v * v * v * (v * (v * 6 - 15) + 10); };
const lerp = THREE.MathUtils.lerp;
const std = (color, roughness = 0.85, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, ...extra });

const X = { meadow: 0, barn: 15, milk: 30, pack: 44, home: 58 };

/* painted textures: wood planks, gingham, plaster, rubber mat */
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
    for (let g = 0; g < 26; g++) { // grain
      x.strokeStyle = `rgba(90,55,25,${0.05 + Math.random() * 0.08})`; x.lineWidth = 1 + Math.random() * 1.5;
      const yy = y0 + Math.random() * ph; x.beginPath(); x.moveTo(0, yy);
      for (let xx = 0; xx <= w; xx += 32) x.lineTo(xx, yy + Math.sin(xx * 0.02 + g) * 2.5);
      x.stroke();
    }
    x.fillStyle = 'rgba(60,35,15,.45)'; x.fillRect(0, y0, w, 2.5); // plank seam
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
  x.fillStyle = '#f4eadb'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 1800; i++) { x.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '160,120,80'},${Math.random() * 0.06})`; x.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
});
const strawTex = canvasTex(512, 512, (x, w, h) => {
  x.fillStyle = '#e8d29a'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++) {
    x.strokeStyle = `hsla(${38 + Math.random() * 14}, ${45 + Math.random() * 25}%, ${55 + Math.random() * 25}%, .8)`; x.lineWidth = 1 + Math.random() * 1.6;
    const px = Math.random() * w, py = Math.random() * h, a = Math.random() * Math.PI, l = 8 + Math.random() * 22;
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
  }
}, [3, 3]);

export async function initStory(section, { onChapter } = {}) {
  const stage = section.querySelector('[data-story-stage]');
  const canvas = stage.querySelector('canvas');
  const small = matchMedia('(max-width: 760px)').matches;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); }
  catch { stage.classList.add('no-webgl'); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xf3f8ef, 28, 64);
  const camera = new THREE.PerspectiveCamera(small ? 44 : 32, 1, 0.1, 200);
  scene.add(new THREE.HemisphereLight(0xfdfdf7, 0xc9dcbf, 1.9));
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.6); // warm, late-morning light
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, far: 40 });
  sun.shadow.radius = 6;
  sun.shadow.bias = -0.0005;
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
  const cloudM = toon(0xffffff);
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
    meadow.add(tr);
  });
  scene.add(meadow);
  catcher(5, X.meadow);
  const meadowCows = [[-2.2, -1.6, 0.6, 21], [2.6, -1.9, 2.6, 33]].map(([x, z, r, seed]) => {
    const c = buildRealCow({ seed, scale: 0.92 });
    c.root.position.set(X.meadow + x, 0, z); c.root.rotation.y = r;
    scene.add(c.root); return c;
  });
  const bees = [0, 1, 2].map((i) => {
    const b = buildBee(); b.scale.setScalar(1.3); scene.add(b);
    return { mesh: b, phase: i * 2.1, rad: 1.8 + i * 0.7, h: 0.9 + i * 0.3, speed: 0.55 + i * 0.12 };
  });

  /* a farm track between stations */
  const trackM = std(0xd9c7a2, 1);
  const track = (x0, x1) => {
    const t = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.1, 1.3), trackM);
    t.position.set((x0 + x1) / 2, -0.06, 0.2); t.receiveShadow = true; scene.add(t);
    for (let x = x0; x < x1; x += 0.35) { // grass verges
      [-0.75, 1.15].forEach((z) => { const g = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22 + Math.random() * 0.2, 4), std(0x7fbf5c)); g.position.set(x + Math.random() * 0.3, 0.08, z + (Math.random() - 0.5) * 0.2); scene.add(g); });
    }
  };
  track(X.meadow + 4.8, X.barn - 4.8);
  track(X.barn + 4.8, X.milk - 4.2);

  /* ---------- 2 · care: an open barn like theirs, with the herd ---------- */
  const barn = new THREE.Group();
  barn.position.x = X.barn;
  const strawFloor = new THREE.Mesh(new THREE.CylinderGeometry(5, 4.7, 0.7, 72), [std(0xc4a77c), std(0xffffff, 1, { map: strawTex }), std(0xb09068)]);
  strawFloor.position.y = -0.35; strawFloor.receiveShadow = true;
  barn.add(strawFloor);
  const beamM = std(0xffffff, 0.8, { map: woodTex([214, 172, 124], 3) });
  const post = (x, z, h = 3.4) => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.2, h, 0.2), beamM); p.position.set(x, h / 2, z); return p; };
  [[-3.6, -2.5], [0, -2.5], [3.6, -2.5], [-3.6, 2.2], [3.6, 2.2]].forEach(([x, z]) => barn.add(post(x, z)));
  // back wall: plastered, with a wooden plinth
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(7.6, 2.4, 0.18), std(0xffffff, 0.95, { map: plasterTex }));
  backWall.position.set(0, 1.2, -2.62);
  const plinthW = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.7, 0.2), std(0xffffff, 0.85, { map: woodTex([150, 104, 66], 3) }));
  plinthW.position.set(0, 0.35, -2.5);
  barn.add(backWall, plinthW);
  // pitched roof with a ridge, in brand sage
  const roofM = std(0x7fae74, 0.75);
  [-1, 1].forEach((s) => {
    const r = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.12, 5.6), roofM);
    r.position.set(s * 1.9, 4.05, -0.15); r.rotation.z = -s * 0.36; barn.add(r);
  });
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 5.7), beamM); ridge.position.set(0, 4.78, -0.15); barn.add(ridge);
  const tie = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.16, 0.16), beamM); tie.position.set(0, 3.35, -2.5); barn.add(tie);
  // feed alley along the back: a low wall, the feed rail, hay spread on the floor
  const feedWall = new THREE.Mesh(new THREE.BoxGeometry(7, 0.5, 0.18), std(0xe9e1d0));
  feedWall.position.set(0, 0.25, -1.65);
  const railM = std(0xc9d2cf, 0.4, { metalness: 0.5 });
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 7, 10), railM); rail.rotation.z = Math.PI / 2; rail.position.set(0, 1.25, -1.65);
  barn.add(feedWall, rail);
  for (let x = -3.3; x <= 3.31; x += 0.55) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.75, 8), railM); b.position.set(x, 0.87, -1.65); barn.add(b); }
  const hayM = std(0xd9bd6e, 1);
  for (let i = 0; i < 60; i++) { const h = new THREE.Mesh(new THREE.SphereGeometry(0.16 + Math.random() * 0.1, 8, 6), hayM); h.scale.y = 0.4; h.position.set(-3.2 + Math.random() * 6.4, 0.04, -2.05 + Math.random() * 0.3); barn.add(h); }
  // round bales
  [[-3.5, -0.5, 0.2], [3.1, 1.6, -0.3]].forEach(([x, z, r]) => {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.9, 28), std(0xe2c97f, 1, { map: strawTex }));
    b.rotation.set(Math.PI / 2, 0, r); b.position.set(x, 0.55, z); barn.add(b);
  });
  shadowy(barn);
  scene.add(barn);
  // the herd: two eating at the rail, one lying on the straw, one standing
  const herd = [
    { x: -1.7, z: -0.5, r: 2.15, seed: 41, pose: { graze: 1 } },
    { x: 0.4, z: -0.55, r: 2.35, seed: 52, pose: { graze: 1 } },
    { x: -2.4, z: 1.1, r: -0.4, seed: 63, pose: { lie: 1 } },
    { x: 2.5, z: 0.1, r: 2.6, seed: 74, pose: { look: 0.4 } },
  ].map((h) => { const c = buildRealCow({ seed: h.seed }); c.root.position.set(X.barn + h.x, 0, h.z); c.root.rotation.y = h.r; scene.add(c.root); c.pose = h.pose; return c; });
  // hearts: a soft, occasional touch while she is cared for
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
  const tiles = canvasTex(512, 512, (x, w, h) => {
    x.fillStyle = '#cfe4d6'; x.fillRect(0, 0, w, h);
    const s = w / 8;
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { x.fillStyle = `hsl(${148 + Math.random() * 8}, ${22 + Math.random() * 8}%, ${80 + Math.random() * 6}%)`; x.fillRect(i * s + 2, j * s + 2, s - 4, s - 4); }
  }, [3, 3]);
  const mFloor = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 4.5, 0.7, 72), [std(0xb7c9bb), std(0xffffff, 0.7, { map: tiles }), std(0xa9bcae)]);
  mFloor.position.y = -0.35; mFloor.receiveShadow = true; milking.add(mFloor);
  // back wall: wood below, plaster above, two windows with sky and flower boxes
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
  // stalls: steel rails on green rubber mats
  const mats = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.05, 3.4), std(0x3c6e3a, 0.95)); mats.position.set(-0.6, 0.02, -0.2); mats.receiveShadow = true; milking.add(mats);
  const steel = std(0xdfe6e8, 0.3, { metalness: 0.6 });
  [-1.6, 0.05, 1.2].forEach((z) => {
    const r1 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 3.2, 12), steel); r1.rotation.z = Math.PI / 2; r1.position.set(-0.6, 1.15, z); milking.add(r1);
    [-2.1, 0.9].forEach((x) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.2, 12), steel); p.position.set(x, 0.6, z); milking.add(p); });
  });
  // the bulk tank: stainless with the brand-green band and a sight glass
  const tank = new THREE.Group();
  tank.position.set(2.7, 0, -1.2);
  const tankM = std(0xf4f7f8, 0.3, { metalness: 0.12 });
  const tankBody = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 1.9, 48), tankM); tankBody.position.y = 1.15;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.95, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), tankM); dome.position.y = 2.1; dome.scale.y = 0.35;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.965, 0.965, 0.22, 48), std(0x509a48, 0.5)); band.position.y = 1.8;
  const legsT = [0, 1, 2].map((i) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 8), steel); const a = i * 2.1; l.position.set(Math.cos(a) * 0.7, 0.1, Math.sin(a) * 0.7); return l; });
  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.3, 0.04), std(0xbfd0d6, 0.1));
  glass.position.set(0, 1.1, 0.96);
  const milkLevel = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.26, 0.05), new THREE.MeshBasicMaterial({ color: 0xfffdf7 }));
  milkLevel.geometry.translate(0, 0.63, 0); milkLevel.position.set(0, 0.47, 0.975);
  tank.add(tankBody, dome, band, ...legsT, glass, milkLevel);
  milking.add(tank);
  // potted plant and a milk can for warmth
  const pot = new THREE.Group(); pot.position.set(3.4, 0, 1.0);
  const potM = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.45, 18), std(0xb5653d, 0.8)); potM.position.y = 0.22;
  pot.add(potM);
  for (let i = 0; i < 9; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), std(0x4f8a3a)); l.position.set((Math.random() - 0.5) * 0.4, 0.55 + Math.random() * 0.45, (Math.random() - 0.5) * 0.4); l.scale.set(0.7, 1.2, 0.7); pot.add(l); }
  const can = new THREE.Group(); can.position.set(-3.1, 0, 1.3);
  const canB = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.28, 0.6, 24), steel); canB.position.y = 0.3;
  const canN = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.25, 0.2, 24), steel); canN.position.y = 0.7;
  const canL = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.08, 24), std(0x509a48, 0.5)); canL.position.y = 0.84;
  can.add(canB, canN, canL);
  milking.add(pot, can);
  shadowy(milking);
  scene.add(milking);
  catcher(4.8, X.milk);
  const neighbour = buildRealCow({ seed: 88 });
  neighbour.root.position.set(X.milk - 0.7, 0, -0.85); neighbour.root.rotation.y = 0;
  scene.add(neighbour.root);
  // milking cluster: four cups with clear short tubes to a claw
  const cupM = std(0xd2d9dc, 0.25, { metalness: 0.7 });
  const cups = Array.from({ length: 4 }, () => { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.15, 12), cupM); c.castShadow = true; scene.add(c); return c; });
  const claw = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), std(0xe8eef0, 0.2, { transparent: true, opacity: 0.85 }));
  scene.add(claw);

  /* the milk line: claw → tank → (long run) → filler */
  const cowX = { milk: X.milk - 0.6 };
  const pipeM = std(0xeaf2f2, 0.12, { transparent: true, opacity: 0.6 });
  const curveA = new THREE.CatmullRomCurve3([
    new THREE.Vector3(cowX.milk - 0.32, 0.3, 0.12), new THREE.Vector3(cowX.milk - 0.1, 0.12, 0.45),
    new THREE.Vector3(cowX.milk + 1.4, 0.12, 0.35), new THREE.Vector3(X.milk + 1.9, 0.35, -0.5), new THREE.Vector3(X.milk + 1.8, 0.6, -1.2),
  ]);
  const curveB = new THREE.CatmullRomCurve3([
    new THREE.Vector3(X.milk + 3.6, 0.5, -1.2), new THREE.Vector3(X.milk + 4.6, 0.18, -1.0), new THREE.Vector3(X.pack - 4.6, 0.18, -0.9),
    new THREE.Vector3(X.pack - 2.2, 0.3, -0.9), new THREE.Vector3(X.pack - 1.4, 2.6, -0.6), new THREE.Vector3(X.pack - 1.0, 2.95, -0.2),
  ]);
  [curveA, curveB].forEach((cv) => scene.add(new THREE.Mesh(new THREE.TubeGeometry(cv, 140, 0.06, 10), pipeM)));
  const dropM = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const dropsA = Array.from({ length: 16 }, (_, i) => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), dropM); d.userData.off = i / 16; scene.add(d); return d; });
  const dropsB = Array.from({ length: 28 }, (_, i) => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), dropM); d.userData.off = i / 28; scene.add(d); return d; });

  /* ---------- 4 · packaging line (unchanged in spirit) ---------- */
  const pack = new THREE.Group();
  pack.position.x = X.pack;
  const pfloor = new THREE.Mesh(new THREE.CylinderGeometry(4.3, 4, 0.7, 64), [std(0xb7c9bb), std(0xffffff, 0.7, { map: tiles }), std(0xa9bcae)]);
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

  /* ---------- 5 · at the table: breakfast in the farmhouse kitchen ---------- */
  const home = new THREE.Group();
  home.position.x = X.home;
  const tableTop = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.14, 2.2), std(0xffffff, 0.75, { map: woodTex([190, 140, 92], 5) }));
  tableTop.position.y = 0.95;
  const tLegs = [[-1.9, -0.9], [1.9, -0.9], [-1.9, 0.9], [1.9, 0.9]].map(([x, z]) => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.9, 0.14), std(0x9a6a40, 0.8)); l.position.set(x, 0.45, z); return l; });
  const runner = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.012, 0.9), std(0xffffff, 0.9, { map: ginghamTex }));
  runner.position.set(0, 1.03, 0.05);
  home.add(tableTop, ...tLegs, runner);
  // a glass of milk, a jug of wildflowers, a small loaf
  const glassMilk = new THREE.Group(); glassMilk.position.set(0.95, 1.03, 0.45);
  const gl = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.48, 32, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transmission: 0.9, thickness: 0.05, transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
  gl.position.y = 0.24;
  const milk = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.14, 0.38, 32), std(0xfffdf8, 0.35));
  milk.position.y = 0.19;
  glassMilk.add(milk, gl);
  const jug = new THREE.Group(); jug.position.set(-1.45, 1.03, -0.35);
  const jugB = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.5, 24), std(0xf2ede2, 0.5)); jugB.position.y = 0.25;
  const jugBand = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.21, 0.06, 24), std(0x509a48, 0.5)); jugBand.position.y = 0.36;
  jug.add(jugB, jugBand);
  const bloomCols = [0xffffff, 0xf7e27a, 0xd98ab8, 0xb58ad6, 0xffffff, 0xf2c230];
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.random() * 0.22;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.5, 4), std(0x5f9e4a)); stem.position.set(Math.cos(a) * r * 0.6, 0.65, Math.sin(a) * r * 0.6); stem.rotation.set(Math.sin(a) * 0.3, 0, Math.cos(a) * 0.3); jug.add(stem);
    const fl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05, 1), std(bloomCols[i % bloomCols.length], 0.6)); fl.position.set(Math.cos(a) * r, 0.88 + Math.random() * 0.12, Math.sin(a) * r); jug.add(fl);
  }
  const loaf = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 16), std(0xc98a4b, 0.85)); loaf.scale.set(1.3, 0.55, 0.85); loaf.position.set(-0.5, 1.12, 0.6);
  home.add(glassMilk, jug, loaf);
  const burst = buildLeafBurst(60, 2.8);
  burst.position.set(-0.1, 2.3, -0.9);
  home.add(burst);
  shadowy(home);
  scene.add(home);
  catcher(3.4, X.home);

  let heroCarton, sideCarton;
  const conveyor = [];
  Promise.all([buildCarton('intero'), buildCarton('scremato')]).then(([a, b]) => {
    heroCarton = a; heroCarton.position.set(-0.2, 1.03 + 0.89, 0.05);
    sideCarton = b; sideCarton.position.set(0.5, 1.03 + 0.72, -0.45); sideCarton.scale.setScalar(0.8); sideCarton.rotation.y = -0.4;
    home.add(heroCarton, sideCarton);
    for (let i = 0; i < 7; i++) {
      const c = (i % 3 === 2 ? b : a).clone();
      c.scale.setScalar(0.42); c.userData.off = i / 7;
      scene.add(c); conveyor.push(c);
    }
  });

  /* ---------- our cow ---------- */
  const cow = buildRealCow({ seed: 7, hero: true, scale: 1 });
  scene.add(cow.root);

  /* ---------- camera path: [position, lookAt] per chapter ---------- */
  const shots = [
    [[-5, 2.4, 10], [0.2, 0.9, 0]],
    [[4.2, 2.1, 6.4], [0.9, 1.0, 0.2]],
    [[X.barn + 1.2, 3.0, 9.4], [X.barn, 1.2, -0.4]],
    [[X.milk - 0.4, 2.5, 8.4], [X.milk + 0.5, 1.1, -0.6]],
    [[X.pack + 0.6, 4.4, 10.4], [X.pack, 1.8, 0]],
    [[X.home + 0.3, 2.9, 6.4], [X.home, 1.55, 0]],
  ];
  if (small) shots.forEach((s) => { s[0][2] += 3.4; s[0][1] += 0.5; });
  const P = shots.map((s) => new THREE.Vector3(...s[0]));
  const L = shots.map((s) => new THREE.Vector3(...s[1]));

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // keep the subject clear of the chapter card: right of it on desktop, above it on phones
    if (w > 900) camera.setViewOffset(w, h, -w * 0.16, 0, w, h);
    else camera.setViewOffset(w, h, 0, h * 0.17, w, h);
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
  function cameraAt(c) {
    const k = Math.min(4, Math.floor(c));
    const e = smooth((c - k - 0.35) / 0.65);
    camPos.lerpVectors(P[k], P[k + 1], e);
    camLook.lerpVectors(L[k], L[k + 1], e);
    camPos.y += Math.sin(Math.PI * e) * (Math.abs(P[k + 1].x - P[k].x) > 4 ? 2.2 : 0.4);
    camera.position.copy(camPos);
    camera.lookAt(camLook);
    sun.position.set(camLook.x + 5, 10, 6);
    sun.target.position.set(camLook.x, 0, 0);
  }

  function cowAt(c, dt) {
    const w1 = smooth((c - 1.35) / 0.65); // meadow → barn
    const w2 = smooth((c - 2.35) / 0.65); // barn → milking
    const walking = (c > 1.35 && c < 2.0) || (c > 2.35 && c < 3.0);
    let x = lerp(0.9, X.barn + 0.9, w1);
    x = lerp(x, cowX.milk, w2);
    cow.root.position.set(x, 0, c < 1.35 ? 0.3 : c < 2.35 ? lerp(0.3, 0.7, w1) : lerp(0.7, 0.85, w2));
    let face = c < 1.35 ? lerp(-2.1, -1.15, smooth(c)) : c < 2.35 ? lerp(0, -0.9, smooth((c - 2.0) / 0.25)) : 0;
    if (walking) face = 0;
    cow.root.rotation.y += (face - cow.root.rotation.y) * Math.min(1, dt * 5);
    const graze = c < 0.35 ? 1 : c < 1.3 ? (Math.sin(c * 9) > -0.3 ? 1 : 0) : 0;
    cow.update(dt, { graze: walking ? 0 : graze, walk: walking ? 1 : 0, look: c > 2 && c < 2.4 ? 0.35 : 0 });
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
    // other cows only animate when their station is near (cheap on phones)
    if (c < 2.2) meadowCows.forEach((m, i) => m.update(dt, { graze: (t + i * 3) % 10 < 7 ? 1 : 0 }));
    if (c > 1.2 && c < 3.4) herd.forEach((h) => h.update(dt, h.pose));
    if (c > 2.3 && c < 4.2) neighbour.update(dt, { look: Math.sin(t * 0.3) * 0.3 });

    bees.forEach((b) => {
      const a = t * b.speed + b.phase;
      b.mesh.position.set(X.meadow + Math.cos(a) * b.rad, b.h + Math.sin(a * 3) * 0.15, Math.sin(a * 1.3) * b.rad * 0.7);
      b.mesh.rotation.y = -a + Math.PI / 2;
      b.mesh.userData.wings.forEach((w, i) => { w.rotation.x = (i ? 1 : -1) * 0.4 - Math.PI / 2 + Math.sin(t * 55) * 0.5; });
    });
    clouds.forEach((cl, i) => { cl.position.x += dt * (0.12 + (i % 3) * 0.05); if (cl.position.x > 68) cl.position.x = -10; });

    // care: a gentle sensor pulse and a few hearts
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
      tt.getWorldPosition(udder);
      cups[i].visible = milkOn > 0;
      cups[i].position.set(udder.x, udder.y - 0.09, udder.z);
    });
    cow.udder.getWorldPosition(udder);
    claw.visible = milkOn > 0;
    claw.position.set(udder.x + 0.02, 0.3, udder.z + 0.12);
    dropsA.forEach((d) => { d.visible = milkOn > 0 && c < 4.6; if (d.visible) curveA.getPointAt((t * 0.25 + d.userData.off) % 1, d.position); });
    milkLevel.scale.y = 0.08 + 0.92 * clamp01((c - 2.9) / 1.0);
    const lineOn = c > 3.3 && c < 4.8;
    dropsB.forEach((d) => { d.visible = lineOn; if (d.visible) curveB.getPointAt((t * 0.12 + d.userData.off) % 1, d.position); });

    // packaging
    const beltOn = c > 3.4;
    rollers.forEach((r) => { if (beltOn) r.rotation.y += dt * 4; });
    let pouring = false;
    conveyor.forEach((cc) => {
      cc.visible = c > 3.3 && c < 4.9;
      const u = beltOn ? (t * 0.09 + cc.userData.off) % 1 : cc.userData.off;
      const x = X.pack - 3 + u * 6;
      cc.position.set(x, 0.8 + 0.37, 0); cc.rotation.y = 0.35;
      if (Math.abs(x - (X.pack - 1)) < 0.18) pouring = true;
    });
    stream.visible = beltOn && pouring && c < 4.9;
    stream.position.set(X.pack - 1, 1.95, 0); stream.scale.y = 0.55;

    // at the table: the carton turns to face you, leaves open behind it
    const homeK = clamp01((c - 4.4) / 0.6);
    burst.userData.set(homeK, dt);
    if (heroCarton) {
      heroCarton.rotation.y = -0.35 + (1 - homeK) * 2.2 + (reduced ? 0 : Math.sin(t * 0.5) * 0.08);
    }

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
