import { quantumAudio } from '../utils/quantumAudio.js';

const PARTICLES = {
  photon: {
    name: 'Fotón',
    symbol: 'γ',
    yukawa: '0',
    mass: '0 MeV/c²',
    speed: 4.2,
    flipInterval: Infinity,
    audioIntensity: 0,
    color: '#fde047',
    note: 'No interactúa con el campo de Higgs; viaja siempre a velocidad c.'
  },
  electron: {
    name: 'Electrón',
    symbol: 'e⁻',
    yukawa: '2.9 × 10⁻⁶',
    mass: '0.511 MeV/c²',
    speed: 3.1,
    flipInterval: 78,
    audioIntensity: 0.2,
    color: '#38bdf8',
    note: 'Acoplamiento muy débil: intercambia quiralidad L/R de forma espaciada.'
  },
  down: {
    name: 'Quark Down',
    symbol: 'd',
    yukawa: '2.7 × 10⁻⁵',
    mass: '4.7 MeV/c²',
    speed: 2.35,
    flipInterval: 42,
    audioIntensity: 0.48,
    color: '#a78bfa',
    note: 'Interacción intermedia con el campo de fondo; mayor inercia que el electrón.'
  },
  top: {
    name: 'Quark Top',
    symbol: 't',
    yukawa: '0.99',
    mass: '172.6 GeV/c²',
    speed: 1.25,
    flipInterval: 13,
    audioIntensity: 0.95,
    color: '#fb7185',
    note: 'Acoplamiento casi máximo: alterna su quiralidad L/R constantemente.'
  }
};

export function initYukawaCoupling() {
  const mount = document.querySelector('[data-lab-mount="yukawa"]');
  if (!mount) return;

  mount.innerHTML = '';
  mount.style.padding = '0';

  const canvas = document.createElement('canvas');
  canvas.className = 'lab-canvas';
  canvas.setAttribute('aria-label', 'Simulación de acoplamiento de Yukawa con el campo de Higgs');

  const metrics = document.createElement('div');
  metrics.className = 'lab-metrics';
  metrics.innerHTML = `
    <div class="lab-metric">
      <span class="lab-metric__label">Acoplamiento de Yukawa (y)</span>
      <span class="lab-metric__value" data-yukawa-val>2.9 × 10⁻⁶</span>
    </div>
    <div class="lab-metric">
      <span class="lab-metric__label">Masa resultante</span>
      <span class="lab-metric__value" data-mass-val>0.511 MeV/c²</span>
    </div>
    <div class="lab-metric">
      <span class="lab-metric__label">Estado de quiralidad</span>
      <span class="lab-metric__value" data-chirality-val>Izquierda (L)</span>
    </div>
  `;

  const controls = document.createElement('div');
  controls.className = 'lab-controls';
  controls.innerHTML = `
    <div class="lab-btn-group" role="group" aria-label="Selector de partícula elemental">
      <button type="button" class="lab-btn" data-particle="photon" aria-pressed="false">Fotón (γ)</button>
      <button type="button" class="lab-btn" data-particle="electron" aria-pressed="true">Electrón (e⁻)</button>
      <button type="button" class="lab-btn" data-particle="down" aria-pressed="false">Quark Down (d)</button>
      <button type="button" class="lab-btn" data-particle="top" aria-pressed="false">Quark Top (t)</button>
    </div>
    <span class="lab-status" data-particle-note>${PARTICLES.electron.note}</span>
  `;

  mount.append(canvas, metrics, controls);

  const ctx = canvas.getContext('2d');
  const yukawaEl = metrics.querySelector('[data-yukawa-val]');
  const massEl = metrics.querySelector('[data-mass-val]');
  const chiralityEl = metrics.querySelector('[data-chirality-val]');
  const noteEl = controls.querySelector('[data-particle-note]');
  const buttons = controls.querySelectorAll('[data-particle]');

  let currentKey = 'electron';
  let width = 600;
  let height = 300;
  let rafId = null;
  let isVisible = false;
  let framesSinceFlip = 0;
  let chirality = 'L';
  let px = 40;
  let py = 150;
  let trail = [];
  let pulses = [];
  let time = 0;

  function selectParticle(key) {
    currentKey = key;
    const p = PARTICLES[key];
    buttons.forEach((btn) => btn.setAttribute('aria-pressed', String(btn.dataset.particle === key)));
    yukawaEl.textContent = p.yukawa;
    massEl.textContent = p.mass;
    noteEl.textContent = p.note;
    chirality = 'L';
    framesSinceFlip = 0;
    px = 36;
    py = height / 2;
    trail = [];
    pulses = [];
    chiralityEl.textContent = key === 'photon' ? 'Helicidad constante' : 'Izquierda (L)';
  }

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => selectParticle(btn.dataset.particle));
  });

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width || 600;
    height = rect.height || 300;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    py = height / 2;
  }

  function step() {
    const p = PARTICLES[currentKey];
    time += 0.025;
    px += p.speed;

    if (px > width - 20) {
      px = 20;
      trail = [];
    }

    if (Number.isFinite(p.flipInterval)) {
      framesSinceFlip += 1;
      const verticalDir = chirality === 'L' ? -1 : 1;
      const amplitude = Math.min(26, p.flipInterval * 0.45);
      py = height / 2 + verticalDir * Math.sin((framesSinceFlip / p.flipInterval) * Math.PI) * amplitude;

      if (framesSinceFlip >= p.flipInterval) {
        framesSinceFlip = 0;
        chirality = chirality === 'L' ? 'R' : 'L';
        chiralityEl.textContent = chirality === 'L' ? 'Izquierda (L)' : 'Derecha (R)';
        pulses.push({ x: px, y: py, radius: 6, alpha: 0.9 });
        quantumAudio.playChiralityFlip(p.audioIntensity);
      }
    } else {
      py = height / 2;
    }

    trail.push({ x: px, y: py, chirality });
    if (trail.length > 90) trail.shift();

    pulses.forEach((pulse) => {
      pulse.radius += 1.4;
      pulse.alpha *= 0.94;
    });
    pulses = pulses.filter((pulse) => pulse.alpha > 0.04);
  }

  function drawBackgroundField() {
    const cols = 15;
    const rows = 7;
    const stepX = width / (cols + 1);
    const stepY = height / (rows + 1);

    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) {
        const x = c * stepX;
        const y = r * stepY;
        const dist = Math.hypot(x - px, y - py);
        const couplingBoost = currentKey === 'photon' ? 0 : Math.max(0, 1 - dist / 95);
        const radius = 2 + couplingBoost * 2.6;
        const alpha = 0.16 + 0.06 * Math.sin(time * 2 + c * 0.5 + r * 0.7) + couplingBoost * 0.45;

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(148, 163, 184, ${alpha})`;
        ctx.fill();
      }
    }
  }

  function draw() {
    const p = PARTICLES[currentKey];
    ctx.clearRect(0, 0, width, height);

    drawBackgroundField();

    pulses.forEach((pulse) => {
      ctx.beginPath();
      ctx.arc(pulse.x, pulse.y, pulse.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(56, 189, 248, ${pulse.alpha})`;
      ctx.lineWidth = 1.6;
      ctx.stroke();
    });

    if (trail.length > 1) {
      for (let i = 1; i < trail.length; i++) {
        const a = trail[i - 1];
        const b = trail[i];
        const fade = i / trail.length;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle =
          currentKey === 'photon'
            ? `rgba(253, 224, 71, ${fade * 0.8})`
            : b.chirality === 'L'
              ? `rgba(56, 189, 248, ${fade * 0.85})`
              : `rgba(167, 139, 250, ${fade * 0.85})`;
        ctx.lineWidth = 2.4;
        ctx.stroke();
      }
    }

    ctx.beginPath();
    ctx.arc(px, py, 14, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();

    ctx.fillStyle = '#080c12';
    ctx.font = '600 12px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.symbol, px, py + 0.5);

    if (currentKey !== 'photon') {
      ctx.fillStyle = '#e8eef7';
      ctx.font = '500 11px "IBM Plex Mono", monospace';
      ctx.fillText(chirality, px, py - 22);
    }

    ctx.fillStyle = 'rgba(232, 238, 247, 0.55)';
    ctx.font = '500 11px "IBM Plex Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('CAMPO DE HIGGS EN EL VACÍO: v ≈ 246.2 GeV (SIN FRICCIÓN)', 14, 22);
  }

  function loop() {
    if (!isVisible) return;
    step();
    draw();
    rafId = requestAnimationFrame(loop);
  }

  const resizeObserver = new ResizeObserver(() => {
    resize();
    draw();
  });
  resizeObserver.observe(canvas);

  const intersectionObserver = new IntersectionObserver(
    (entries) => {
      isVisible = entries[0].isIntersecting;
      if (isVisible && rafId === null) {
        rafId = requestAnimationFrame(loop);
      } else if (!isVisible && rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    },
    { threshold: 0.05 }
  );
  intersectionObserver.observe(mount);

  resize();
  selectParticle('electron');
  draw();
}