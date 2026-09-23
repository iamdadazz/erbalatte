/* Erbalatte 1 L carton in 3D. Faces are painted on canvas from the real
   pack layout (logo, tricolore rule, grass band, nutrition panel), so the
   same code renders either product. Drag to turn it; it settles back. */

import * as THREE from 'three';

const W = 0.95, D = 0.62, H = 1.78;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const PRODUCTS = {
  intero: { color: '#3FA535', dark: '#2B7F27', lines: ['LATTE UHT', 'INTERO', 'OMOGENEIZZATO'] },
  scremato: { color: '#E0322B', dark: '#B3241F', lines: ['LATTE UHT', 'PARZIALMENTE', 'SCREMATO'] },
};

// Values printed on the Intero pack (per 100 ml)
const NUTRITION_INTERO = [
  ['Energia', '278 kJ / 67 kcal'], ['Grassi', '3,8 g'], ['di cui saturi', '2,2 g'],
  ['Carboidrati', '4,8 g'], ['di cui zuccheri', '4,8 g'], ['Proteine', '3,3 g'],
  ['Sale', '0,12 g'], ['Calcio', '120 mg (15% VNR)'],
];

let logoImg;
function loadLogo() {
  if (logoImg) return logoImg;
  logoImg = new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = 'assets/img/erbalatte.png'; });
  return logoImg;
}

function tinted(img, color) {
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = color;
  x.fillRect(0, 0, c.width, c.height);
  return c;
}

function grassBand(x, w, y, h) {
  const g = x.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(1, '#eef0ee');
  x.fillStyle = g; x.fillRect(0, y, w, h);
  for (let i = 0; i < 520; i++) {
    const bx = Math.random() * w, bh = h * (0.35 + Math.random() * 0.65);
    x.strokeStyle = `hsl(${95 + Math.random() * 25}, ${55 + Math.random() * 25}%, ${32 + Math.random() * 22}%)`;
    x.lineWidth = 1.2 + Math.random() * 2.2;
    x.beginPath(); x.moveTo(bx, y + h);
    x.quadraticCurveTo(bx + (Math.random() - 0.5) * 18, y + h - bh * 0.6, bx + (Math.random() - 0.5) * 26, y + h - bh);
    x.stroke();
  }
}

function tricolore(x, cx, y, w) {
  const seg = w / 3;
  x.fillStyle = '#2E9E43'; x.fillRect(cx - w / 2, y, seg * 0.9, 5);
  x.fillStyle = '#D5302C'; x.fillRect(cx + w / 2 - seg * 0.9, y, seg * 0.9, 5);
}

async function paint(kind) {
  const p = PRODUCTS[kind];
  const logo = await loadLogo();
  const tLogo = tinted(logo, p.color);
  const FW = 540, FH = Math.round(540 * H / W), SW = Math.round(FH * D / H);
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.fillStyle = '#fbfbfa'; x.fillRect(0, 0, w, h); return [c, x]; };
  const font = (wt, sz) => `${wt} ${sz}px Poppins, sans-serif`;

  /* front */
  const [front, f] = mk(FW, FH);
  const lw = FW * 0.9;
  // logo mark = left 20% of the lockup; wordmark = the rest. Draw mark big, word under it.
  f.drawImage(tLogo, 0, 0, logo.width * 0.26, logo.height, FW * 0.3, FH * 0.07, FW * 0.4, FW * 0.4 * logo.height / (logo.width * 0.26));
  const wordY = FH * 0.07 + FW * 0.4 * logo.height / (logo.width * 0.26) - 6;
  f.drawImage(tLogo, logo.width * 0.27, logo.height * 0.2, logo.width * 0.73, logo.height * 0.6, FW * 0.14, wordY, lw * 0.8, lw * 0.8 * (logo.height * 0.6) / (logo.width * 0.73));
  const ruleY = wordY + lw * 0.8 * 0.6 * logo.height / (logo.width * 0.73) + 18;
  tricolore(f, FW / 2, ruleY, FW * 0.62);
  f.fillStyle = p.dark; f.textAlign = 'center';
  f.font = font(500, 30); f.fillText('1 0 0 %   I T A L I A N O', FW / 2, ruleY + 50);
  f.fillStyle = p.color;
  f.font = font(700, 40); f.fillText(p.lines[0], FW / 2, ruleY + 118);
  f.font = font(800, 46); f.fillText(p.lines[1], FW / 2, ruleY + 166);
  f.fillText(p.lines[2], FW / 2, ruleY + 214);
  f.font = font(500, 30); f.fillText('da Agricoltura Simbiotica', FW / 2, ruleY + 258);
  grassBand(f, FW, FH * 0.8, FH * 0.1);
  f.fillStyle = '#eef0ee'; f.fillRect(0, FH * 0.9, FW, FH * 0.1);
  f.fillStyle = '#333'; f.textAlign = 'right'; f.font = font(700, 48); f.fillText('1 L', FW - 36, FH * 0.955);
  f.textAlign = 'left'; f.font = font(500, 18); f.fillText('ORIGINE DEL LATTE: ITALIA', 36, FH * 0.955);

  /* back: nutrition panel (intero) or the story (scremato, values to be supplied) */
  const [back, b] = mk(FW, FH);
  b.textAlign = 'center';
  b.drawImage(tLogo, logo.width * 0.27, logo.height * 0.2, logo.width * 0.73, logo.height * 0.6, FW * 0.22, 70, FW * 0.56, FW * 0.56 * (logo.height * 0.6) / (logo.width * 0.73));
  b.fillStyle = p.color; b.font = font(700, 30);
  b.fillText(`${p.lines[0]} ${p.lines[1]}`, FW / 2, 240);
  b.font = font(500, 24); b.fillText('da Agricoltura Simbiotica', FW / 2, 276);
  if (kind === 'intero') {
    b.font = font(700, 22); b.fillText('VALORI NUTRIZIONALI MEDI PER 100 ML', FW / 2, 340);
    b.textAlign = 'left'; b.font = font(500, 24);
    NUTRITION_INTERO.forEach(([k, v], i) => {
      const y = 390 + i * 44;
      b.strokeStyle = p.color; b.lineWidth = 1.5; b.beginPath(); b.moveTo(60, y + 14); b.lineTo(FW - 60, y + 14); b.stroke();
      b.fillStyle = '#2a3a2c'; b.fillText(k, 64, y); b.textAlign = 'right'; b.fillText(v, FW - 64, y); b.textAlign = 'left';
    });
  } else {
    b.font = font(500, 26); b.fillStyle = '#2a3a2c';
    ['Le nostre frisone mangiano', 'erba, fieni e cereali', 'coltivati in azienda,', 'senza concimi chimici', 'né pesticidi sui prati.'].forEach((l, i) => b.fillText(l, FW / 2, 380 + i * 40));
  }
  b.textAlign = 'center'; b.fillStyle = '#444'; b.font = font(500, 20);
  b.fillText('Dopo l\'apertura conservare in frigorifero', FW / 2, FH * 0.7);
  b.fillText('a +4 °C e consumare entro 3-4 giorni.', FW / 2, FH * 0.7 + 28);
  grassBand(b, FW, FH * 0.76, FH * 0.08);
  b.fillStyle = '#eef0ee'; b.fillRect(0, FH * 0.84, FW, FH * 0.16);
  b.fillStyle = '#333'; b.font = font(600, 20);
  b.fillText('La Corte S.S. · Via Massao 3', FW / 2, FH * 0.89);
  b.fillText('12030 Monasterolo di Savigliano (CN)', FW / 2, FH * 0.89 + 28);

  /* sides */
  const side = (label) => {
    const [c, x] = mk(SW, FH);
    x.save(); x.translate(SW / 2, FH * 0.42); x.rotate(-Math.PI / 2);
    const ww = FH * 0.42;
    x.drawImage(tLogo, logo.width * 0.27, logo.height * 0.2, logo.width * 0.73, logo.height * 0.6, -ww / 2, -ww * 0.3, ww, ww * (logo.height * 0.6) / (logo.width * 0.73));
    x.restore();
    x.fillStyle = p.dark; x.textAlign = 'center'; x.font = font(600, 20);
    x.fillText(label, SW / 2, FH * 0.72);
    grassBand(x, SW, FH * 0.8, FH * 0.1);
    x.fillStyle = '#eef0ee'; x.fillRect(0, FH * 0.9, SW, FH * 0.1);
    return c;
  };
  const top = mk(FW, SW)[0];

  const tex = (c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  return { front: tex(front), back: tex(back), left: tex(side('Agricoltura Simbiotica')), right: tex(side('100% italiano')), top: tex(top) };
}

export function initCarton(stage, kind = 'intero') {
  const canvas = stage.querySelector('canvas');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); }
  catch { stage.classList.add('no-webgl'); return { set() {}, face() {} }; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 50);
  camera.position.set(0, 0.6, 6.2);
  camera.lookAt(0, 0.12, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb9d6b2, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(3, 5, 4); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 8;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xe8ffe6, 0.8); fill.position.set(-4, 2, 2); scene.add(fill);

  const pack = new THREE.Group();
  scene.add(pack);
  const mats = Array.from({ length: 6 }, () => new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45, metalness: 0 }));
  const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), mats);
  body.castShadow = true;
  pack.add(body);
  // slanted Edge top + screw cap
  const shape = new THREE.Shape();
  shape.moveTo(-D / 2, 0); shape.lineTo(D / 2, 0); shape.lineTo(D / 2, 0.26); shape.lineTo(-D / 2, 0.08); shape.closePath();
  const topGeo = new THREE.ExtrudeGeometry(shape, { depth: W, bevelEnabled: false });
  topGeo.rotateY(Math.PI / 2); topGeo.translate(-W / 2, H / 2, 0);
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf7f7f5, roughness: 0.5 });
  const top = new THREE.Mesh(topGeo, whiteMat);
  // after rotateY the shape's +x maps to -z: the high side (with the cap) sits at the back
  top.castShadow = true;
  pack.add(top);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.16, 32), whiteMat);
  cap.position.set(0, H / 2 + 0.24, -0.12);
  cap.rotation.x = -0.28;
  cap.castShadow = true;
  pack.add(cap);
  const ribs = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.1, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0xe8e8e6, roughness: 0.6 }));
  ribs.position.copy(cap.position); ribs.rotation.copy(cap.rotation); pack.add(ribs);

  const ground = new THREE.Mesh(new THREE.CircleGeometry(2.2, 64), new THREE.ShadowMaterial({ opacity: 0.18 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -H / 2 - 0.001; ground.receiveShadow = true;
  scene.add(ground);
  pack.position.y = 0;

  let painted = false;
  async function set(k) {
    kind = k;
    await document.fonts?.load?.('600 40px Poppins');
    const t = await paint(k);
    // Box face order: +x, -x, +y, -y, +z, -z
    [t.right, t.left, t.top, t.top, t.front, t.back].forEach((m, i) => { mats[i].map?.dispose(); mats[i].map = m; mats[i].needsUpdate = true; });
    if (painted) spin += Math.PI * 2; // a full turn when switching product
    painted = true;
    loop();
    render();
  }

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = w / h < 0.8 ? 8.6 : 7.3;
    camera.updateProjectionMatrix();
    render();
  }
  new ResizeObserver(resize).observe(stage);
  new IntersectionObserver(([en]) => { canvas.style.display = en.isIntersecting ? '' : 'none'; }).observe(stage);

  // drag to rotate
  let yaw = -0.45, targetYaw = -0.45, spin = 0, dragging = false, lastX = 0, vel = 0, idle = 0;
  canvas.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing'; });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX; lastX = e.clientX;
    targetYaw += dx * 0.012; vel = dx * 0.012; idle = 0;
    loop();
  });
  const up = () => { dragging = false; canvas.style.cursor = 'grab'; };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.style.cursor = 'grab';

  function face(which) { // 'front' | 'back'
    const base = which === 'back' ? Math.PI : 0;
    const turns = Math.round((targetYaw - base) / (Math.PI * 2));
    targetYaw = base + turns * Math.PI * 2 - 0.45;
    idle = 0; loop();
  }

  const clock = new THREE.Clock();
  let running = false;
  function render() { renderer.render(scene, camera); }
  function loop() {
    if (running) return;
    running = true; clock.getDelta();
    const step = () => {
      const dt = Math.min(clock.getDelta(), 0.05);
      idle += dt;
      if (!dragging) { targetYaw += vel; vel *= 0.9; }
      if (!reduced && idle > 4 && !dragging) targetYaw += dt * 0.25;
      const goal = targetYaw + spin;
      yaw += (goal - yaw) * Math.min(1, dt * 6);
      pack.rotation.y = yaw;
      pack.position.y = reduced ? 0 : Math.sin(performance.now() / 1400) * 0.03;
      render();
      if (!reduced || Math.abs(goal - yaw) > 0.001 || dragging) requestAnimationFrame(step);
      else running = false;
    };
    requestAnimationFrame(step);
  }

  resize();
  set(kind).then(loop);
  return { set, face };
}

/* A standalone carton (same print as the shop), for the story scenes. */
export async function buildCarton(kind = 'intero') {
  await document.fonts?.load?.('600 40px Poppins');
  const t = await paint(kind);
  const g = new THREE.Group();
  const mats = [t.right, t.left, t.top, t.top, t.front, t.back].map((map) => new THREE.MeshStandardMaterial({ map, roughness: 0.45 }));
  const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), mats);
  body.castShadow = true;
  g.add(body);
  const shape = new THREE.Shape();
  shape.moveTo(-D / 2, 0); shape.lineTo(D / 2, 0); shape.lineTo(D / 2, 0.26); shape.lineTo(-D / 2, 0.08); shape.closePath();
  const topGeo = new THREE.ExtrudeGeometry(shape, { depth: W, bevelEnabled: false });
  topGeo.rotateY(Math.PI / 2); topGeo.translate(-W / 2, H / 2, 0);
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf7f7f5, roughness: 0.5 });
  const top = new THREE.Mesh(topGeo, whiteMat);
  top.castShadow = true;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.16, 32), whiteMat);
  cap.position.set(0, H / 2 + 0.24, -0.12);
  cap.rotation.x = -0.28;
  g.add(top, cap);
  g.userData.height = H;
  return g;
}
