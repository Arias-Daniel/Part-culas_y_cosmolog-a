import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const VERTEX_SHADER = `
  varying vec3 vPos;
  varying vec3 vNormal;

  void main() {
    vPos = position;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  uniform float uRMin;
  uniform float uTime;
  varying vec3 vPos;
  varying vec3 vNormal;

  void main() {
    float r = length(vPos.xz);
    float normY = clamp((vPos.y + 1.05) / 2.9, 0.0, 1.0);

    vec3 colValley = vec3(0.96, 0.62, 0.04);
    vec3 colMid = vec3(0.49, 0.23, 0.93);
    vec3 colRim = vec3(0.22, 0.74, 0.97);

    vec3 baseCol = normY < 0.45
      ? mix(colValley, colMid, normY / 0.45)
      : mix(colMid, colRim, (normY - 0.45) / 0.55);

    vec3 lightDir = normalize(vec3(0.55, 0.85, 0.45));
    float diff = 0.58 + 0.42 * max(dot(normalize(vNormal), lightDir), 0.0);
    baseCol *= diff;

    // Curvas equipotenciales luminosas
    float contour = abs(fract(vPos.y * 4.2 + 0.5) - 0.5);
    float lineMask = 1.0 - smoothstep(0.018, 0.045, contour);
    baseCol += vec3(0.32, 0.28, 0.45) * lineMask * 0.42;

    // Resplandor en el valle circular degenerado
    if (uRMin > 0.05) {
      float valleyDist = abs(r - uRMin);
      float valleyGlow = exp(-valleyDist * valleyDist * 55.0);
      float pulse = 0.82 + 0.18 * sin(uTime * 3.0);
      baseCol += vec3(0.98, 0.75, 0.18) * valleyGlow * 0.65 * pulse;
    }

    gl_FragColor = vec4(baseCol, 0.92);
  }
`;

export function initMexicanHat3D() {
  const mount = document.querySelector('[data-lab-mount="mexican-hat"]');
  if (!mount) return;

  mount.innerHTML = '';
  mount.style.padding = '0';

  const stage = document.createElement('div');
  stage.className = 'lab-canvas lab-canvas--tall';
  stage.setAttribute('aria-label', 'Superficie 3D interactiva del potencial del sombrero mexicano');

  const metrics = document.createElement('div');
  metrics.className = 'lab-metrics';
  metrics.innerHTML = `
    <div class="lab-metric">
      <span class="lab-metric__label">Temperatura cósmica (T)</span>
      <span class="lab-metric__value" data-temp-val>20 GeV (T &lt; Tc)</span>
    </div>
    <div class="lab-metric">
      <span class="lab-metric__label">Estado de simetría</span>
      <span class="lab-metric__value" data-sym-val>Rota espontáneamente</span>
    </div>
    <div class="lab-metric">
      <span class="lab-metric__label">Valor de vacío |φ|</span>
      <span class="lab-metric__value" data-vev-val>246.2 GeV</span>
    </div>
  `;

  const controlsBar = document.createElement('div');
  controlsBar.className = 'lab-controls';
  controlsBar.innerHTML = `
    <div class="lab-slider-group">
      <label class="lab-slider-label" for="higgs-temp-slider">Temperatura cósmica</label>
      <input
        id="higgs-temp-slider"
        class="lab-slider"
        type="range"
        min="0"
        max="220"
        step="1"
        value="20"
      />
    </div>
    <div class="lab-btn-group" role="group" aria-label="Modos de excitación del campo">
      <button type="button" class="lab-btn" data-mode="fall" aria-pressed="true">
        Soltar desde la cima
      </button>
      <button type="button" class="lab-btn" data-mode="angular" aria-pressed="false">
        Oscilación angular (W/Z)
      </button>
      <button type="button" class="lab-btn" data-mode="radial" aria-pressed="false">
        Oscilación radial (Higgs)
      </button>
    </div>
  `;

  mount.append(stage, metrics, controlsBar);

  const tempValEl = metrics.querySelector('[data-temp-val]');
  const symValEl = metrics.querySelector('[data-sym-val]');
  const vevValEl = metrics.querySelector('[data-vev-val]');
  const tempSlider = controlsBar.querySelector('#higgs-temp-slider');
  const modeButtons = controlsBar.querySelectorAll('[data-mode]');

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(4.1, 3.2, 4.4);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  stage.appendChild(renderer.domElement);

  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enableDamping = true;
  orbit.dampingFactor = 0.06;
  orbit.enablePan = false;
  orbit.minDistance = 3.2;
  orbit.maxDistance = 9.5;
  orbit.maxPolarAngle = Math.PI * 0.48;

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xfff1d6, 1.1);
  dirLight.position.set(5, 8, 4);
  scene.add(dirLight);

  const RADIAL_SEGMENTS = 56;
  const ANGULAR_SEGMENTS = 80;
  const MAX_R = 2.15;
  const LAMBDA = 0.56;
  const TC = 160;

  let temperature = 20;
  let mode = 'fall';
  let time = 0;
  let isVisible = false;
  let rafId = null;

  let stateR = 0.06;
  let stateVr = 0;
  let stateTheta = 0.5;

  function mu2FromTemp(temp) {
    return ((temp - TC) / TC) * 2.1;
  }

  function potential(r, mu2) {
    return mu2 * r * r + LAMBDA * r * r * r * r;
  }

  function dPotentialDr(r, mu2) {
    return 2 * mu2 * r + 4 * LAMBDA * r * r * r;
  }

  function rMinFromMu2(mu2) {
    if (mu2 >= 0) return 0;
    return Math.sqrt(-mu2 / (2 * LAMBDA));
  }

  const geometry = new THREE.BufferGeometry();
  const vertexCount = (RADIAL_SEGMENTS + 1) * (ANGULAR_SEGMENTS + 1);
  const positions = new Float32Array(vertexCount * 3);
  const indices = [];

  for (let i = 0; i < RADIAL_SEGMENTS; i++) {
    for (let j = 0; j < ANGULAR_SEGMENTS; j++) {
      const a = i * (ANGULAR_SEGMENTS + 1) + j;
      const b = (i + 1) * (ANGULAR_SEGMENTS + 1) + j;
      const c = (i + 1) * (ANGULAR_SEGMENTS + 1) + (j + 1);
      const d = i * (ANGULAR_SEGMENTS + 1) + (j + 1);
      indices.push(a, b, d, b, c, d);
    }
  }

  geometry.setIndex(indices);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const shaderMat = new THREE.ShaderMaterial({
    uniforms: {
      uRMin: { value: 1.35 },
      uTime: { value: 0 }
    },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    side: THREE.DoubleSide,
    transparent: true
  });

  const surfaceMesh = new THREE.Mesh(geometry, shaderMat);
  scene.add(surfaceMesh);

  // Estela 3D de trayectoria del estado del campo
  const TRAIL_LENGTH = 48;
  const trailPoints = Array.from({ length: TRAIL_LENGTH }, () => new THREE.Vector3());
  const trailGeo = new THREE.BufferGeometry().setFromPoints(trailPoints);
  const trailMat = new THREE.LineBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.72
  });
  const trailLine = new THREE.Line(trailGeo, trailMat);
  scene.add(trailLine);

  const ballGeo = new THREE.SphereGeometry(0.11, 24, 24);
  const ballMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.65,
    roughness: 0.22
  });
  const ballMesh = new THREE.Mesh(ballGeo, ballMat);
  scene.add(ballMesh);

  function resetTrail(pos) {
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      trailPoints[i].copy(pos);
    }
    trailGeo.setFromPoints(trailPoints);
  }

  function updateSurface() {
    const mu2 = mu2FromTemp(temperature);
    const posAttr = geometry.attributes.position;
    const yScale = 0.52;

    let ptr = 0;
    for (let i = 0; i <= RADIAL_SEGMENTS; i++) {
      const r = (i / RADIAL_SEGMENTS) * MAX_R;
      const v = potential(r, mu2);
      const y = Math.min(v * yScale, 2.1);

      for (let j = 0; j <= ANGULAR_SEGMENTS; j++) {
        const theta = (j / ANGULAR_SEGMENTS) * Math.PI * 2;
        const x = r * Math.cos(theta);
        const z = r * Math.sin(theta);

        posAttr.setXYZ(ptr, x, y, z);
        ptr += 1;
      }
    }

    posAttr.needsUpdate = true;
    geometry.computeVertexNormals();
    shaderMat.uniforms.uRMin.value = rMinFromMu2(mu2);
  }

  function updateMetrics() {
    const isBroken = temperature < TC;
    const ratio = isBroken ? Math.sqrt(1 - temperature / TC) : 0;
    const vev = 246.22 * ratio;

    tempValEl.textContent = `${temperature} GeV (${isBroken ? 'T < Tc' : 'T >= Tc'})`;
    symValEl.textContent = isBroken ? 'Rota espontáneamente' : 'Simetría restaurada';
    vevValEl.textContent = `${vev.toFixed(1)} GeV`;
  }

  function setMode(nextMode) {
    mode = nextMode;
    modeButtons.forEach((btn) =>
      btn.setAttribute('aria-pressed', String(btn.dataset.mode === nextMode))
    );

    const mu2 = mu2FromTemp(temperature);
    const rMin = rMinFromMu2(mu2);

    if (nextMode === 'fall') {
      stateR = 0.07;
      stateVr = 0.02;
      stateTheta = Math.random() * Math.PI * 2;
      ballMat.color.setHex(0xf59e0b);
      ballMat.emissive.setHex(0xd97706);
      trailMat.color.setHex(0xfef08a);
    } else if (nextMode === 'angular') {
      stateR = Math.max(rMin, 0.05);
      stateVr = 0;
      ballMat.color.setHex(0xc084fc);
      ballMat.emissive.setHex(0x9333ea);
      trailMat.color.setHex(0xd8b4fe);
    } else if (nextMode === 'radial') {
      stateR = rMin;
      stateVr = 0;
      ballMat.color.setHex(0x38bdf8);
      ballMat.emissive.setHex(0x0284c7);
      trailMat.color.setHex(0x7dd3fc);
    }

    const bx = stateR * Math.cos(stateTheta);
    const bz = stateR * Math.sin(stateTheta);
    const by = Math.min(potential(stateR, mu2) * 0.52, 2.1) + 0.12;
    ballMesh.position.set(bx, by, bz);
    resetTrail(ballMesh.position);
  }

  tempSlider.addEventListener('input', () => {
    temperature = Number(tempSlider.value);
    updateSurface();
    updateMetrics();
  });

  modeButtons.forEach((btn) => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode));
  });

  function stepBall() {
    const mu2 = mu2FromTemp(temperature);
    const rMin = rMinFromMu2(mu2);
    const yScale = 0.52;

    if (mode === 'fall') {
      const force = -dPotentialDr(stateR, mu2);
      stateVr = (stateVr + force * 0.008) * 0.965;
      stateR += stateVr;
      if (stateR < 0) {
        stateR = -stateR;
        stateVr = -stateVr;
        stateTheta += Math.PI;
      }
      stateR = Math.min(stateR, MAX_R - 0.15);
      stateTheta += 0.006;
    } else if (mode === 'angular') {
      stateR += (rMin - stateR) * 0.1;
      stateTheta += rMin > 0.05 ? 0.032 : 0.01;
    } else if (mode === 'radial') {
      const amp = rMin > 0.05 ? 0.34 : 0.25;
      stateR = Math.max(0.02, rMin + Math.sin(time * 5.2) * amp);
      stateTheta += 0.004;
    }

    const bx = stateR * Math.cos(stateTheta);
    const bz = stateR * Math.sin(stateTheta);
    const by = Math.min(potential(stateR, mu2) * yScale, 2.1) + 0.12;
    ballMesh.position.set(bx, by, bz);

    trailPoints.pop();
    trailPoints.unshift(ballMesh.position.clone());
    trailGeo.setFromPoints(trailPoints);
  }

  function resize() {
    const width = stage.clientWidth || 640;
    const height = stage.clientHeight || 390;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  function renderFrame() {
    if (!isVisible) return;
    time += 0.016;
    shaderMat.uniforms.uTime.value = time;
    stepBall();
    orbit.update();
    renderer.render(scene, camera);
    rafId = requestAnimationFrame(renderFrame);
  }

  const resizeObserver = new ResizeObserver(() => {
    resize();
    renderer.render(scene, camera);
  });
  resizeObserver.observe(stage);

  const intersectionObserver = new IntersectionObserver(
    (entries) => {
      isVisible = entries[0].isIntersecting;
      if (isVisible && rafId === null) {
        rafId = requestAnimationFrame(renderFrame);
      } else if (!isVisible && rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    },
    { threshold: 0.05 }
  );
  intersectionObserver.observe(mount);

  updateSurface();
  updateMetrics();
  setMode('fall');
  resize();
  renderer.render(scene, camera);
}