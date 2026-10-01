/* Home hero: the Erbalatte cow on her little round meadow.
   She grazes, looks up at you (and follows the pointer), blinks,
   swishes her tail; bees work the clover. Light, toon-shaded, on white. */

import * as THREE from 'three';
import { buildRealCow, buildBee, buildMeadow, buildIsland } from './cow.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initHero(stage) {
  const canvas = stage.querySelector('canvas');
  const small = matchMedia('(max-width: 700px)').matches;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    stage.classList.add('no-webgl');
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0xfdfdf7, 0xc9dcbf, 1.9));
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.6);
  sun.position.set(4, 8, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4 });
  sun.shadow.radius = 6;
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  const world = new THREE.Group();
  scene.add(world);
  const R = 2.6;
  world.add(buildIsland(R));
  const uniforms = { uTime: { value: 0 } };
  world.add(buildMeadow(R, small ? 2600 : 4200, uniforms, 0.7));
  const shadowCatcher = new THREE.Mesh(new THREE.CircleGeometry(R, 64), new THREE.ShadowMaterial({ opacity: 0.18 }));
  shadowCatcher.rotation.x = -Math.PI / 2;
  shadowCatcher.position.y = 0.01;
  shadowCatcher.receiveShadow = true;
  world.add(shadowCatcher);

  const cow = buildRealCow({ seed: 7, hero: true, scale: 1.3 });
  cow.root.position.set(0.45, 0, 0.1);
  cow.root.rotation.y = -2.55;
  world.add(cow.root);

  const bees = [0, 1].map((i) => {
    const b = buildBee();
    world.add(b);
    return { mesh: b, phase: i * 2.6, rad: 1.5 + i * 0.5, h: 0.9 + i * 0.25, speed: 0.6 + i * 0.15 };
  });

  let dist = 11;
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    dist = w < 420 ? 12 : 10.6;
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  let tx = 0, ty = 0, px = 0, py = 0;
  stage.addEventListener('pointermove', (e) => {
    const r = stage.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
  });
  stage.addEventListener('pointerleave', () => { tx = 0; ty = 0; });

  let visible = true, running = false, t = 0;
  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    canvas.style.display = visible ? '' : 'none';
    if (visible) loop();
  }).observe(stage);

  const clock = new THREE.Clock();
  function frame(dt) {
    t += dt;
    uniforms.uTime.value = t;
    px += (tx - px) * Math.min(1, dt * 3);
    py += (ty - py) * Math.min(1, dt * 3);
    // 9s rhythm: look up at you 4s, then graze 5s; always looks up while the pointer is on her
    const hovering = Math.abs(tx) + Math.abs(ty) > 0.01;
    const graze = hovering ? 0 : (t % 9) < 4 ? 0 : 1;
    cow.update(dt, { graze, look: px * 0.9 });
    bees.forEach((b) => {
      const a = t * b.speed + b.phase;
      b.mesh.position.set(Math.cos(a) * b.rad, b.h + Math.sin(a * 3) * 0.15, Math.sin(a * 1.3) * b.rad * 0.7);
      b.mesh.rotation.y = -a + Math.PI / 2;
      b.mesh.userData.wings.forEach((w, i) => { w.rotation.x = (i ? 1 : -1) * 0.4 - Math.PI / 2 + Math.sin(t * 55) * 0.5; });
    });
    world.rotation.y = 0.35 + px * 0.35 + (reduced ? 0 : Math.sin(t * 0.15) * 0.1);
    const el = 0.42 - py * 0.06;
    camera.position.set(0, 0.2 + Math.sin(el) * dist, Math.cos(el) * dist);
    camera.lookAt(0, 0.7, 0);
    renderer.render(scene, camera);
  }
  function loop() {
    if (running) return;
    running = true;
    clock.getDelta();
    const step = () => {
      if (!visible) { running = false; return; }
      frame(Math.min(clock.getDelta(), 0.05));
      if (reduced) { running = false; return; }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  frame(0.016);
  loop();
}
