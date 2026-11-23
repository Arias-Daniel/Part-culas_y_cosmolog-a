export function initAtomCollapseLab() {
  const mount = document.querySelector('[data-lab-mount="atom-collapse"]');
  if (!mount) return;

  mount.innerHTML = '';
  mount.style.padding = '0';

  const canvas = document.createElement('canvas');
  canvas.className = 'lab-canvas';
  canvas.setAttribute('aria-label', 'Simulación del colapso atómico al apagar el campo de Higgs');

  const metrics = document.createElement('div');
  metrics.className = 'lab-metrics';
  metrics.innerHTML = `
    <div class="lab-metric">
      <span class="lab-metric__label">Intensidad del campo (v / v0)</span>
      <span class="lab-metric__value" data-field-val>100 %</span>
    </div>
    <div class="lab-metric">
      <span class="lab-metric__label">Masa del electrón</span>
      <span class="lab-metric__value" data-me-val>0.511 MeV/c²</span>
    </div>
    <div class="lab-metric">
      <span class="lab-metric__label">Masa del protón</span>
      <span class="lab-metric__value" data-mp-val>938.3 MeV/c²</span>
    </div>
    <div class="lab-metric">
      <span class="lab-metric__label">Radio de Bohr (a0)</span>
      <span class="lab-metric__value" data-bohr-val>0.053 nm (1.0×)</span>
    </div>
  `;

  const controls = document.createElement('div');
  controls.className = 'lab-controls';
  controls.innerHTML = `
    <div class="lab-slider-group">
      <label class="lab-slider-label" for="higgs-field-slider">Campo de Higgs</label>
      <input
        id="higgs-field-slider"
        class="lab-slider"
        type="range"
        min="0"
        max="100"
        step="1"
        value="100"
      />
    </div>
    <div class="lab-btn-group" role="group" aria-label="Valores rápidos del campo de Higgs">
      <button type="button" class="lab-btn" data-preset="100" aria-pressed="true">100 %</button>
      <button type="button" class="lab-btn" data-preset="50" aria-pressed="false">50 %</button>
      <button type="button" class="lab-btn" data-preset="10" aria-pressed="false">10 %</button>
      <button type="button" class="lab-btn" data-preset="0" aria-pressed="false">0 % (Apagado)</button>
    </div>
  `;

  mount.append(canvas, metrics, controls);

  const ctx = canvas.getContext('2d');
  const fieldValEl = metrics.querySelector('[data-field-val]');
  const meValEl = metrics.querySelector('[data-me-val]');
  const mpValEl = metrics.querySelector('[data-mp-val]');
  const bohrValEl = metrics.querySelector('[data-bohr-val]');
  const slider = controls.querySelector('#higgs-field-slider');
  const presetBtns = controls.querySelectorAll('[data-preset]');

  let width = 600;
  let height = 310;
  let fieldPercent = 100;
  let time = 0;
  let rafId = null;
  let isVisible = false;

  let electronAngle = 0;
  let escapePos = { x: 0, y: 0 };
  let escapeDir = { x: 1, y: -0.35 };
  let isEscaping = false;

  const cloudDots = Array.from({ length: 120 }, () => ({
    angle: Math.random() * Math.PI * 2,
    radialFactor: 0.45 + Math.random() * 0.95,
    speed: (Math.random() - 0.5) * 0.015,
    size: 1.2 + Math.random() * 1.6
  }));

  function updateMetrics() {
    const f = fieldPercent / 100;
    const me = 0.511 * f;
    const mp = 929.2 + 9.1 * f;

    fieldValEl.textContent = `${fieldPercent} %`;
    meValEl.textContent = f === 0 ? '0.000 MeV/c²' : `${me.toFixed(3)} MeV/c²`;
    mpValEl.textContent = `${mp.toFixed(1)} MeV/c²`;

    if (f === 0) {
      bohrValEl.textContent = 'Infinito (sin átomo)';
    } else {
      const ratio = 1 / f;
      const nm = 0.0529 * ratio;
      bohrValEl.textContent = `${nm.toFixed(3)} nm (${ratio.toFixed(1)}×)`;
    }

    presetBtns.forEach((btn) =>
      btn.setAttribute('aria-pressed', String(Number(btn.dataset.preset) === fieldPercent))
    );
  }

  function setField(value) {
    const prev = fieldPercent;
    fieldPercent = value;
    slider.value = String(value);

    if (fieldPercent === 0 && prev > 0) {
      isEscaping = true;
      const cx = width / 2;
      const cy = height / 2;
      const r = Math.min(width, height) * 0.42;
      escapePos = {
        x: cx + Math.cos(electronAngle) * r * 0.6,
        y: cy + Math.sin(electronAngle) * r * 0.6
      };
      const tx = -Math.sin(electronAngle);
      const ty = Math.cos(electronAngle);
      const mag = Math.hypot(tx, ty) || 1;
      escapeDir = { x: tx / mag, y: ty / mag };
    } else if (fieldPercent > 0) {
      isEscaping = false;
    }

    updateMetrics();
  }

  slider.addEventListener('input', () => setField(Number(slider.value)));
  presetBtns.forEach((btn) => {
    btn.addEventListener('click', () => setField(Number(btn.dataset.preset)));
  });

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width || 600;
    height = rect.height || 310;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function visualRadius(percent) {
    const maxVisual = Math.min(width, height) * 0.44;
    const base = Math.min(width, height) * 0.14;
    if (percent <= 0) return maxVisual * 1.4;
    const inv = 100 / Math.max(percent, 4);
    const scaled = base * (1 + Math.log2(inv) * 0.56);
    return Math.min(scaled, maxVisual);
  }

  function drawNucleus(cx, cy) {
    ctx.beginPath();
    ctx.arc(cx, cy, 13, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(180, 83, 9, 0.16)';
    ctx.fill();

    const offsets = [
      { dx: -3.5, dy: -2.5, c: '#dc2626' },
      { dx: 3.8, dy: -2.2, c: '#16a34a' },
      { dx: 0, dy: 3.8, c: '#2563eb' }
    ];

    offsets.forEach((o, i) => {
      const jx = Math.sin(time * 9 + i * 2) * 0.9;
      const jy = Math.cos(time * 8 + i * 2) * 0.9;
      ctx.beginPath();
      ctx.arc(cx + o.dx + jx, cy + o.dy + jy, 4.2, 0, Math.PI * 2);
      ctx.fillStyle = o.c;
      ctx.fill();
    });
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;
    const f = fieldPercent / 100;
    const orbitalR = visualRadius(fieldPercent);

    if (!isEscaping) {
      const cloudAlpha = 0.08 + f * 0.14;
      const grad = ctx.createRadialGradient(cx, cy, 8, cx, cy, orbitalR * 1.3);
      grad.addColorStop(0, `rgba(15, 82, 186, ${cloudAlpha})`);
      grad.addColorStop(0.65, `rgba(15, 82, 186, ${cloudAlpha * 0.55})`);
      grad.addColorStop(1, 'rgba(15, 82, 186, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, orbitalR * 1.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, orbitalR, 0, Math.PI * 2);
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = `rgba(15, 82, 186, ${0.22 + f * 0.35})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);

      cloudDots.forEach((dot) => {
        dot.angle += dot.speed;
        const r = orbitalR * dot.radialFactor;
        const x = cx + Math.cos(dot.angle) * r;
        const y = cy + Math.sin(dot.angle) * r;
        ctx.fillStyle = `rgba(15, 82, 186, ${0.15 + f * 0.32})`;
        ctx.beginPath();
        ctx.arc(x, y, dot.size, 0, Math.PI * 2);
        ctx.fill();
      });

      electronAngle += 0.025 + (1 - f) * 0.035;
      const ex = cx + Math.cos(electronAngle) * orbitalR;
      const ey = cy + Math.sin(electronAngle) * orbitalR;

      ctx.beginPath();
      ctx.arc(ex, ey, 7.5, 0, Math.PI * 2);
      ctx.fillStyle = '#0f52ba';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      ctx.fillStyle = '#181a1f';
      ctx.font = '600 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText('e⁻', ex + 11, ey + 4);
    } else {
      escapePos.x += escapeDir.x * 7.5;
      escapePos.y += escapeDir.y * 7.5;

      if (
        escapePos.x < -30 ||
        escapePos.x > width + 30 ||
        escapePos.y < -30 ||
        escapePos.y > height + 30
      ) {
        const a = Math.random() * Math.PI * 2;
        escapeDir = { x: Math.cos(a), y: Math.sin(a) };
        escapePos = { x: cx + escapeDir.x * 18, y: cy + escapeDir.y * 18 };
      }

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(escapePos.x, escapePos.y);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(220, 38, 38, 0.55)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(escapePos.x, escapePos.y, 7.5, 0, Math.PI * 2);
      ctx.fillStyle = '#dc2626';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      ctx.fillStyle = '#b91c1c';
      ctx.font = '600 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText('e⁻ (v = c)', escapePos.x + 11, escapePos.y + 4);
    }

    drawNucleus(cx, cy);

    ctx.fillStyle = 'rgba(24, 26, 31, 0.62)';
    ctx.font = '500 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(
      isEscaping
        ? 'SIN ESTADO LIGADO: EL ELECTRÓN ESCAPA A VELOCIDAD c'
        : 'ÁTOMO DE HIDRÓGENO (1p⁺ + 1e⁻)',
      14,
      22
    );
  }

  function loop() {
    if (!isVisible) return;
    time += 0.016;
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
  updateMetrics();
  draw();
}