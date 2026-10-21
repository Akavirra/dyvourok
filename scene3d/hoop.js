/* Перший екран: 3D-вишивка в п'яльцях. Голка на очах вишиває хрестиками знак «Дивоурока» (зірку 15×15 з паспорта бренду)
   на лляному полотні. Миша нахиляє п'яльця, а стібки під курсором злегка підіймаються; під час прокрутки стібки
   відриваються від полотна й здіймаються, як іскри «дива». Без руху — одразу готова вишивка, статично.
   Збирання: python scripts/build_hoop.py → public/js/hoop.js */
import * as THREE from './vendor/three.module.js';

const RED = new THREE.Color('#C8341F'), YELLOW = new THREE.Color('#F2B530');
const box = document.querySelector('.hoop');
const canvas = box && box.querySelector('canvas');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

function webgl() {
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch (e) { return false; }
}

if (canvas && webgl()) start();

function start() {
  // ---------- знак: клітини 15×15 → стібки 3×3 у кожній клітині ----------
  const N = 15, C = 7, S = 3;
  const PETAL = [[7, 1], [6, 2], [7, 2], [8, 2], [6, 3], [7, 3], [8, 3], [6, 4], [7, 4], [8, 4]];
  const DIAG = [[5, 5], [4, 4], [3, 3]];
  const cells = [];
  for (let r = 0; r < 4; r++) {
    const rot = ([x, y]) => { let dx = x - C, dy = y - C; for (let i = 0; i < r; i++) [dx, dy] = [-dy, dx]; return [C + dx, C + dy]; };
    PETAL.concat(DIAG).forEach(p => { const [x, y] = rot(p); cells.push({ x, y, color: RED }); });
  }
  for (let x = 6; x <= 8; x++) for (let y = 6; y <= 8; y++) cells.push({ x, y, color: YELLOW });

  const CELL = 1.08;                       // розмір клітини в одиницях сцени
  const stitches = [];
  const rnd = (i, k) => { const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };
  cells.forEach(c => {
    for (let i = 0; i < S; i++) for (let j = 0; j < S; j++) {
      const x = (c.x - C + (i + .5) / S - .5) * CELL, y = -(c.y - C + (j + .5) / S - .5) * CELL;
      stitches.push({ x, y, color: c.color, d: Math.hypot(x, y) });
    }
  });
  // порядок вишивання: від серця назовні, по колу — як розквітання логотипа
  stitches.sort((a, b) => (Math.round(a.d * 1.6) - Math.round(b.d * 1.6)) || (Math.atan2(a.y, a.x) - Math.atan2(b.y, b.x)));
  stitches.forEach((s, i) => {
    const a = rnd(i, 1) * Math.PI * 2, up = .4 + rnd(i, 2);
    s.fly = new THREE.Vector3(Math.cos(a) * (1 + rnd(i, 3) * 3.5), Math.sin(a) * (1 + rnd(i, 4) * 3.5) + 2, 7 + up * 12);
    s.spin = (rnd(i, 5) - .5) * 9;
    s.tone = .9 + rnd(i, 6) * .16;
    s.lift = 0;
  });

  // ---------- сцена ----------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, .1, 200);
  camera.position.set(-.6, -5, 64);
  camera.lookAt(-.6, -.9, 0);

  scene.add(new THREE.HemisphereLight('#FFF8EC', '#9A7650', 1.5));
  const sun = new THREE.DirectionalLight('#FFE6BF', 2.8);
  sun.position.set(-11, 12, 17);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 80 });
  sun.shadow.radius = 4;
  sun.shadow.bias = -.0004;
  scene.add(sun);

  const hoop = new THREE.Group();
  scene.add(hoop);
  // «стіл»: невидима площина під п'яльцями, на яку падають тіні всього натюрморту
  const TABLE = -.55;
  const table = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.ShadowMaterial({ opacity: .16 }));
  table.position.z = TABLE;
  table.receiveShadow = true;
  hoop.add(table);

  // ---------- текстури, намальовані кодом ----------
  function tex(size, draw, repeat) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    draw(c.getContext('2d'), size);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (repeat) t.repeat.set(repeat, repeat);
    t.anisotropy = 8;
    return t;
  }
  // льон: переплетення ниток
  const linen = tex(512, (g, s) => {
    g.fillStyle = '#F1E8D6'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < s; i += 4) {
      g.fillStyle = `rgba(120,90,55,${.05 + ((i * 7) % 11) / 160})`; g.fillRect(i, 0, 2, s);
      g.fillStyle = `rgba(120,90,55,${.04 + ((i * 5) % 13) / 190})`; g.fillRect(0, i, s, 2);
    }
    for (let k = 0; k < 2600; k++) { g.fillStyle = `rgba(90,60,30,${Math.random() * .06})`; g.fillRect(Math.random() * s, Math.random() * s, 1 + Math.random() * 3, 1); }
  }, 6);
  // нитка муліне: скручені волокна
  const thread = tex(64, (g, s) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, s, s);
    g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = 3;
    for (let i = -s; i < s * 2; i += 9) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + s * .6, s); g.stroke(); }
  });
  thread.colorSpace = THREE.NoColorSpace;
  // дерево обруча
  const wood = tex(256, (g, s) => {
    g.fillStyle = '#C9965E'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 70; i++) {
      g.strokeStyle = `rgba(${110 + Math.random() * 40},${70 + Math.random() * 25},35,${.12 + Math.random() * .2})`;
      g.lineWidth = .6 + Math.random() * 2; g.beginPath();
      const y = Math.random() * s; g.moveTo(0, y);
      for (let x = 0; x <= s; x += 16) g.lineTo(x, y + Math.sin(x / 30 + i) * 3);
      g.stroke();
    }
  });

  // ---------- полотно й обруч ----------
  const R = 10.4;
  const cloth = new THREE.Mesh(new THREE.CircleGeometry(R, 96),
    new THREE.MeshStandardMaterial({ map: linen, bumpMap: linen, bumpScale: .9, roughness: 1, color: '#FFFFFF' }));
  cloth.receiveShadow = true;
  hoop.add(cloth);

  const woodMat = new THREE.MeshStandardMaterial({ map: wood, roughness: .62, color: '#FFFFFF' });
  const inner = new THREE.Mesh(new THREE.TorusGeometry(R + .25, .32, 24, 160), woodMat);
  const outer = new THREE.Mesh(new THREE.TorusGeometry(R + .62, .42, 24, 160), woodMat);
  inner.position.z = -.1; outer.position.z = .08;
  outer.scale.set(1, 1, 1.25);
  [inner, outer].forEach(m => { m.castShadow = true; m.receiveShadow = true; hoop.add(m); });
  // гвинт-замок угорі
  const brass = new THREE.MeshStandardMaterial({ color: '#B88A4A', metalness: .65, roughness: .38 });
  const clampA = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.3, .9), woodMat);
  clampA.position.set(0, R + 1.25, .08);
  const screw = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, 2.2, 20), brass);
  screw.rotation.z = Math.PI / 2; screw.position.set(0, R + 1.35, .08);
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(.42, .42, .5, 24), brass);
  knob.rotation.z = Math.PI / 2; knob.position.set(1.3, R + 1.35, .08);
  [clampA, screw, knob].forEach(m => { m.castShadow = true; hoop.add(m); });

  // складки полотна, що вилазять з-під обруча
  const skirt = new THREE.Mesh(new THREE.RingGeometry(R + .9, R + 1.7, 96, 1),
    new THREE.MeshStandardMaterial({ map: linen, roughness: 1, color: '#F7EFE0' }));
  skirt.position.z = -.25; skirt.receiveShadow = true;
  hoop.add(skirt);

  // обвідка «уперед голкою» по колу — червоні й чорні стібки
  const runGeo = new THREE.BoxGeometry(.42, .07, .05);
  const runs = 132;
  const run = new THREE.InstancedMesh(runGeo, new THREE.MeshStandardMaterial({ roughness: .8, map: thread }), runs);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v3 = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < runs; i++) {
    const a = i / runs * Math.PI * 2, r = R - .85;
    q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), a + Math.PI / 2);
    m4.compose(v3.set(Math.cos(a) * r, Math.sin(a) * r, .03), q, sc);
    run.setMatrixAt(i, m4);
    run.setColorAt(i, i % 6 < 3 ? RED : new THREE.Color('#2A1714'));
  }
  run.castShadow = true;
  hoop.add(run);

  // ---------- хрестики ----------
  function cross() {
    const a = new THREE.BoxGeometry(.5, .11, .11), b = a.clone();
    a.rotateZ(Math.PI / 4); b.rotateZ(-Math.PI / 4); b.translate(0, 0, .035);
    const g = new THREE.BufferGeometry();
    ['position', 'normal', 'uv'].forEach(k => {
      const A = a.attributes[k].array, B = b.attributes[k].array;
      const arr = new Float32Array(A.length + B.length); arr.set(A); arr.set(B, A.length);
      g.setAttribute(k, new THREE.BufferAttribute(arr, a.attributes[k].itemSize));
    });
    const ia = a.index.array, ib = b.index.array, off = a.attributes.position.count;
    const idx = new Uint16Array(ia.length + ib.length); idx.set(ia); ib.forEach((v, i) => { idx[ia.length + i] = v + off; });
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    return g;
  }
  const xs = new THREE.InstancedMesh(cross(), new THREE.MeshStandardMaterial({ roughness: .78, map: thread, bumpMap: thread, bumpScale: .4 }), stitches.length);
  xs.castShadow = true; xs.receiveShadow = true;
  const col = new THREE.Color();
  stitches.forEach((s, i) => { col.copy(s.color).multiplyScalar(s.tone); xs.setColorAt(i, col); });
  hoop.add(xs);

  // ---------- голка з ниткою ----------
  const needle = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: '#D9DCE0', metalness: .85, roughness: .28 });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, 3.6, 12), steel);
  shaft.position.y = 1.8 + .25;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(.055, .5, 12), steel);
  tip.rotation.x = Math.PI; tip.position.y = .25;
  const eye = new THREE.Mesh(new THREE.TorusGeometry(.09, .03, 8, 16), steel);
  eye.position.y = 3.75;
  [shaft, tip, eye].forEach(m => { m.castShadow = true; needle.add(m); });
  needle.rotation.set(.85, 0, -.55);
  needle.scale.setScalar(1.7);
  hoop.add(needle);
  const threadLine = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ color: RED, roughness: .8 }));
  threadLine.castShadow = true;
  hoop.add(threadLine);
  const eyeWorld = new THREE.Vector3();
  // коли голка відпочиває, нитка тягнеться до найближчого стібка
  const restStitch = stitches.reduce((b, s) => (Math.hypot(s.x - 6.2, s.y + 4.6) < Math.hypot(b.x - 6.2, b.y + 4.6) ? s : b));
  function drawThread(from, to, sag) {
    const mid = from.clone().lerp(to, .5); mid.z += sag; mid.y -= sag * .4;
    const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
    threadLine.geometry.dispose();
    threadLine.geometry = new THREE.TubeGeometry(curve, 24, .035, 6, false);
  }

  // ---------- натюрморт вишивальниці: котушки муліне, наперсток, клубок ----------
  const woodEnd = new THREE.MeshStandardMaterial({ map: wood, roughness: .6 });
  function spool(color, x, y, rot) {
    const g = new THREE.Group();
    const tm = thread.clone(); tm.repeat.set(10, 3); tm.needsUpdate = true;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(.82, .82, 1.5, 32),
      new THREE.MeshStandardMaterial({ color, map: tm, bumpMap: tm, bumpScale: .6, roughness: .85 }));
    const a = new THREE.Mesh(new THREE.CylinderGeometry(1.08, 1.08, .26, 32), woodEnd);
    const b = a.clone();
    a.position.y = .88; b.position.y = -.88;
    [body, a, b].forEach(m => { m.castShadow = true; m.receiveShadow = true; g.add(m); });
    g.rotation.set(0, 0, rot);                        // лежить на боці
    g.position.set(x, y, TABLE + 1.08);
    hoop.add(g);
    return g;
  }
  spool('#C8341F', 11.6, -9.4, 1.2);
  spool('#1F3A6B', 13.0, -6.2, 2.1);
  spool('#2E7D4F', 9.2, -12.0, .5);
  const thimble = new THREE.Mesh(new THREE.CylinderGeometry(.48, .6, 1.05, 28),
    new THREE.MeshStandardMaterial({ color: '#C9A15B', metalness: .7, roughness: .35 }));
  thimble.rotation.x = Math.PI / 2; thimble.position.set(6.6, -13.6, TABLE + .53);
  thimble.castShadow = true; hoop.add(thimble);

  // клубок: з нього йде нитка до голки
  const yarnTex = tex(256, (g, sz) => {
    g.fillStyle = '#C8341F'; g.fillRect(0, 0, sz, sz);
    for (let i = 0; i < 160; i++) {
      g.strokeStyle = `rgba(${Math.random() < .5 ? '255,210,190' : '90,15,8'},${.12 + Math.random() * .18})`;
      g.lineWidth = 1.5 + Math.random() * 2.5; g.beginPath();
      const y = Math.random() * sz, k = (Math.random() - .5) * 1.4;
      g.moveTo(0, y); g.bezierCurveTo(sz * .3, y + k * 60, sz * .7, y - k * 60, sz, y + k * 20); g.stroke();
    }
  });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(1.5, 48, 32),
    new THREE.MeshStandardMaterial({ map: yarnTex, bumpMap: yarnTex, bumpScale: 1.2, roughness: .9 }));
  ball.position.set(-4.2, -15.2, TABLE + 1.5);
  ball.castShadow = true; hoop.add(ball);
  const yarnLine = new THREE.Mesh(new THREE.BufferGeometry(), threadLine.material);
  yarnLine.castShadow = true; hoop.add(yarnLine);
  const ballTop = new THREE.Vector3();

  // ---------- маскоти: паперові фігурки на «столі», повернуті до глядача ----------
  const loader = new THREE.TextureLoader();
  const base = (document.querySelector('script[src*="hoop.js"]') || {}).src || location.href;
  const T = n => { const t = loader.load(new URL(`../img/hoop/${n}.webp`, base).href, () => loop()); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  // основні пози — одразу, решту — через кілька секунд (щоб не гальмувати перший екран)
  const POSES = { soroka: { stand: T('soroka-stand') }, vorkit: { look: T('vorkit-look') } };
  const pose = (who, name) => POSES[who][name] || (POSES[who][name] = T(`${who}-${name}`));
  setTimeout(() => { ['talk', 'wings', 'fly'].forEach(n => pose('soroka', n)); ['happy', 'sleep'].forEach(n => pose('vorkit', n)); }, 4000);
  function standee(who, p0, h, at) {
    const geo = new THREE.PlaneGeometry(h, h); geo.translate(0, h / 2, 0);
    const mat = new THREE.MeshStandardMaterial({ map: pose(who, p0), alphaTest: .5, side: THREE.DoubleSide, roughness: .9 });
    const m = new THREE.Mesh(geo, mat);
    m.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: mat.map, alphaTest: .5 });
    m.castShadow = true;
    m.userData = { who, at: at.clone(), h, pose: p0, hop: 0, away: 0, hover: 0, turn: 0 };
    hoop.add(m);
    return m;
  }
  const sorokaM = standee('soroka', 'stand', 7.2, new THREE.Vector3(-6.4, Math.sqrt((R + .62) ** 2 - 6.4 ** 2) - .1, .5));
  const vorkitM = standee('vorkit', 'look', 7.2, new THREE.Vector3(-10.2, -13.8, TABLE));
  const mascots = [sorokaM, vorkitM];
  function setPose(m, name) {
    if (m.userData.pose === name) return;
    m.userData.pose = name;
    m.material.map = pose(m.userData.who, name);
    m.customDepthMaterial.map = m.material.map;
    m.customDepthMaterial.needsUpdate = true;
  }
  // фігурка стоїть перпендикулярно до столу (вгору = +z п'ялець) і дивиться на камеру, трохи відхилена назад
  // фігурка завжди повернута прямо до глядача (без перспективного сплющення), ноги — на «столі»
  const camQ = new THREE.Quaternion(), hoopQ = new THREE.Quaternion();
  function placeStandee(m, t) {
    const u = m.userData;
    hoop.getWorldQuaternion(hoopQ);
    m.quaternion.copy(hoopQ.invert()).multiply(camQ.copy(camera.quaternion));
    m.rotateZ(u.turn * .25);
    m.position.copy(u.at);
    m.position.z += Math.sin(Math.min(1, u.hop) * Math.PI) * 1.1;
    if (u.away > .001) {
      const a = u.away;
      m.position.x -= a * 16; m.position.y += a * 8; m.position.z += a * 14;
      m.scale.setScalar(Math.max(.01, 1 - a * .4));
    } else m.scale.setScalar(1 + u.hover * .05);
    if (!reduce && u.who === 'vorkit') m.scale.y *= 1 + Math.sin(t * 1.9) * .012;
  }

  // ---------- репліки ----------
  const bubble = box.querySelector('.hoop-bubble');
  const LINES = {
    soroka: ['Принесла новину: щоп’ятниці в каталозі — новий безкоштовний матеріал.',
      'Кажуть, цей урок можна провести без підготовки. Я перевіряла — можна!',
      'Наступні уроки-свята вже вишиваються: Миколай і Різдво.'],
    vorkit: ['А звідки це відомо? …Перевірив джерела. Правда. Мрр.',
      'Кожен факт у наших уроках перевірено. Я пильную і клубок, і факти.',
      'Стібок за стібком — і урок готовий. Можна подрімати.']
  };
  const NAMES = { soroka: 'Сорока', vorkit: 'Воркіт' };
  const said = { soroka: 0, vorkit: 0 };
  let bubbleFor = null, bubbleUntil = 0, ballRoll = 0;
  const headPt = new THREE.Vector3();
  function say(m) {
    const who = m.userData.who;
    if (m.userData.away > .05) return;
    bubble.querySelector('b').textContent = NAMES[who];
    bubble.querySelector('span').textContent = LINES[who][said[who]++ % LINES[who].length];
    bubbleFor = m; bubbleUntil = performance.now() + 4500;
    bubble.classList.add('show');
    m.userData.hop = .001;
    if (who === 'soroka') { setPose(m, 'talk'); setTimeout(() => { if (!m.userData.leaving) setPose(m, 'stand'); loop(); }, 2200); }
    else { setPose(m, 'happy'); ballRoll = 1; setTimeout(() => { setPose(m, scrollP > .22 ? 'sleep' : 'look'); loop(); }, 2400); }
    loop();
  }
  function placeBubble() {
    if (!bubbleFor || performance.now() > bubbleUntil || bubbleFor.userData.away > .05) { bubble.classList.remove('show'); bubbleFor = null; return; }
    headPt.set(0, bubbleFor.userData.h * .95, 0); bubbleFor.localToWorld(headPt); headPt.project(camera);
    const x = (headPt.x + 1) / 2 * 100, y = (1 - headPt.y) / 2 * 100;
    const cx = Math.min(Math.max(x, 28), 72);
    bubble.style.left = cx + '%';
    bubble.style.top = Math.max(y, 14) + '%';
    bubble.style.setProperty('--tail', (x - cx) * box.clientWidth / 100 + 'px');
  }
  const alphaCtx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  function hitMascot(nx, ny) {
    ndc.set(nx, ny); ray.setFromCamera(ndc, camera);
    const h = ray.intersectObjects(mascots, false)[0];
    if (!h || !h.uv) return null;
    const img = h.object.material.map.image;                  // прозорі місця фігурки не клікаються
    if (img && img.width) {
      alphaCtx.canvas.width = alphaCtx.canvas.height = 1;
      alphaCtx.clearRect(0, 0, 1, 1);
      alphaCtx.drawImage(img, h.uv.x * img.width, (1 - h.uv.y) * img.height, 1, 1, 0, 0, 1, 1);
      if (alphaCtx.getImageData(0, 0, 1, 1).data[3] < 40) return null;
    }
    return h.object;
  }

  // ---------- розмір, миша, прокрутка ----------
  function resize() {
    const r = box.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.fov = r.width / r.height < .9 ? 34 : 30;
    camera.updateProjectionMatrix();
  }
  resize();
  addEventListener('resize', resize);

  const pointer = { x: 0, y: 0, tx: 0, ty: 0, on: false };
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), hit = new THREE.Vector3(), local = new THREE.Vector3();
  const plane = new THREE.Plane();
  box.addEventListener('pointermove', e => {
    const r = box.getBoundingClientRect();
    pointer.tx = (e.clientX - r.left) / r.width * 2 - 1;
    pointer.ty = -((e.clientY - r.top) / r.height * 2 - 1);
    pointer.on = true;
  });
  box.addEventListener('pointerleave', () => { pointer.tx = pointer.ty = 0; pointer.on = false; box.style.cursor = ''; mascots.forEach(m => { m.userData.hover = 0; }); });
  let hovered = null;
  box.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const m = hitMascot(pointer.tx, pointer.ty);
    if (m !== hovered) { hovered = m; box.style.cursor = m ? 'pointer' : ''; mascots.forEach(x => { x.userData.hover = x === m ? 1 : 0; }); loop(); }
  });
  box.addEventListener('click', e => {
    const r = box.getBoundingClientRect();
    const m = hitMascot((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height * 2 - 1));
    if (m) say(m);
  });
  let kb = 0;   // з клавіатури: Enter або пробіл — по черзі Сорока й Воркіт
  box.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); say(mascots[kb++ % 2]); } });

  let scrollP = 0;
  const readScroll = () => {
    const r = box.getBoundingClientRect();
    scrollP = Math.min(1, Math.max(0, -r.top / (r.height * .85)));
  };
  addEventListener('scroll', readScroll, { passive: true });
  readScroll();

  // ---------- кадр ----------
  const ease = t => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
  const back = t => { t = Math.min(1, Math.max(0, t)); const k = 2.2; return 1 + (k + 1) * Math.pow(t - 1, 3) + k * Math.pow(t - 1, 2); };
  const SEW = reduce ? 0 : 3.4;               // секунд на вишивання
  const per = SEW / stitches.length;
  const t0 = performance.now();
  let visible = true;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) loop(); }).observe(box);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) loop(); });

  const tmpQ = new THREE.Quaternion(), zAxis = new THREE.Vector3(0, 0, 1), pos = new THREE.Vector3();
  let raf = 0;
  function loop() { if (!raf) raf = requestAnimationFrame(frame); }
  function frame(now) {
    raf = 0;
    const t = (now - t0) / 1000;
    pointer.x += (pointer.tx - pointer.x) * .06;
    pointer.y += (pointer.ty - pointer.y) * .06;
    const p = reduce ? 0 : scrollP;
    const ep = ease(p);

    // п'яльця: легке дихання + нахил до курсора + розворот під час прокрутки
    const breathe = reduce ? 0 : Math.sin(t * .5) * .03;
    hoop.rotation.set(-.62 + pointer.y * .18 - ep * .45 + breathe, .2 + pointer.x * .26 + Math.sin(t * .37) * .03 * !reduce, -.08 + pointer.x * .04);
    hoop.position.set(0, -ep * 3, -ep * 6);
    box.parentElement.style.setProperty('--sp', p.toFixed(3));

    // курсор на полотні (локальні координати п'ялець)
    let hx = 99, hy = 99;
    if (pointer.on && !reduce) {
      ndc.set(pointer.tx, pointer.ty);
      ray.setFromCamera(ndc, camera);
      hoop.updateMatrixWorld();
      plane.setFromNormalAndCoplanarPoint(zAxis.clone().applyQuaternion(hoop.quaternion), hoop.position);
      if (ray.ray.intersectPlane(plane, hit)) { local.copy(hit); hoop.worldToLocal(local); hx = local.x; hy = local.y; }
    }

    let sewing = -1;
    stitches.forEach((s, i) => {
      const k = SEW ? (t - .4 - i * per) / .35 : 1;      // поява стібка
      if (k <= 0) { m4.makeScale(0, 0, 0); xs.setMatrixAt(i, m4); return; }
      if (k < 1 && sewing < 0) sewing = i;
      const near = Math.max(0, 1 - Math.hypot(s.x - hx, s.y - hy) / 3);
      s.lift += (near - s.lift) * .12;
      const appear = back(k);
      pos.set(s.x, s.y, .06 + (1 - ease(k)) * .6 + s.lift * .7);
      // прокрутка: стібки відриваються й летять угору, обертаючись
      const f = ease(p * 1.25 - s.d / 40);
      pos.addScaledVector(s.fly, f);
      tmpQ.setFromAxisAngle(zAxis, s.spin * f + s.lift * .5);
      const sz = appear * (1 + s.lift * .25) * (1 - f * .2);
      m4.compose(pos, tmpQ, sc.set(sz, sz, sz));
      xs.setMatrixAt(i, m4);
    });
    xs.instanceMatrix.needsUpdate = true;

    // голка: ходить за стібком, що зараз з'являється, потім відпочиває, встромлена в полотно
    const doneSewing = sewing < 0 && t > .4 + SEW;
    let target;
    if (!doneSewing && sewing >= 0) {
      const s = stitches[sewing];
      const dip = Math.abs(Math.sin(t * 22)) * .5;
      target = v3.set(s.x + .1, s.y + .1, .05 + dip);
      needle.position.lerp(target, .5);
    } else {
      target = v3.set(6.2, -4.6, .15);
      needle.position.lerp(target, reduce ? 1 : .06);
    }
    needle.visible = p < .55;
    hoop.updateMatrixWorld();
    eye.getWorldPosition(eyeWorld); hoop.worldToLocal(eyeWorld);
    const last = sewing >= 0 ? stitches[Math.max(0, sewing - 1)] : restStitch;
    drawThread(eyeWorld, v3.set(last.x, last.y, .06), 1.1 + Math.sin(t * 1.7) * .15);
    threadLine.visible = needle.visible;

    // клубок і нитка від нього до вушка голки
    ballRoll *= .96;
    ball.rotation.x += ballRoll * .06; ball.position.x = -4.2 + Math.sin(ballRoll * 3) * .3;
    ballTop.copy(ball.position); ballTop.z += 1.25;
    {
      const mid = ballTop.clone().lerp(eyeWorld, .5); mid.z = TABLE + .25;
      const curve = new THREE.CatmullRomCurve3([ballTop, ballTop.clone().lerp(mid, .5).setZ(TABLE + .9), mid, eyeWorld]);
      yarnLine.geometry.dispose();
      yarnLine.geometry = new THREE.TubeGeometry(curve, 48, .04, 6, false);
      yarnLine.visible = needle.visible;
    }

    // маскоти: прокрутка вниз — Сорока відлітає, Воркіт засинає; угору — повертається
    const su = sorokaM.userData;
    if (p > .22 && !su.leaving) { su.leaving = true; setPose(sorokaM, 'fly'); setPose(vorkitM, 'sleep'); bubbleFor = null; }
    if (p < .08 && su.leaving) { su.leaving = false; setPose(vorkitM, 'look'); }
    su.away += ((su.leaving ? 1 : 0) - su.away) * (reduce ? 1 : .05);
    if (!su.leaving && su.pose === 'fly' && su.away < .02) { su.away = 0; setPose(sorokaM, 'wings'); su.hop = .001; setTimeout(() => { if (!su.leaving) setPose(sorokaM, 'stand'); loop(); }, 900); }
    su.turn = reduce ? 0 : (pointer.on ? pointer.x * .35 : Math.sin(t * .6) * .08);
    mascots.forEach(m => {
      const u = m.userData;
      if (u.hop) { u.hop += .045; if (u.hop >= 1) u.hop = 0; }
      placeStandee(m, t);
    });
    placeBubble();

    renderer.render(scene, camera);
    if (!box.classList.contains('live')) box.classList.add('live');
    const busy = !reduce || pointer.on || mascots.some(m => m.userData.hop) || !!bubbleFor || (su.away > .01 && su.away < .99);
    if (visible && !document.hidden && busy) loop();
  }
  if (reduce) {
    addEventListener('scroll', () => loop(), { passive: true });
    box.addEventListener('pointermove', () => loop());
  }
  loop();
}
