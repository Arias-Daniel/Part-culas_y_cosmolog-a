export function initProtonMassLab() {
  const mount = document.querySelector('[data-lab-mount="proton"]');
  if (!mount) return;

  mount.innerHTML = '';
  mount.style.padding = '0';

  const canvas = document.createElement('canvas');
  canvas.className = 'lab-canvas';
  canvas.setAttribute('aria-label', 'Simulación de la masa del protón: quarks frente a energía QCD');

  const metrics = document.createElement('div');
  metrics.className = 'lab-metrics';
  metrics.innerHTML = `
    <div class="lab-metric">
      <span class="lab-metric__label">Masa total mostrada</span>
      <span class="lab-metric__value" data-mass-value>938.3 MeV/c²</span>
    </div>
    <div class="lab-metric">
      <span class="lab-metric__label">Quarks de valencia (Higgs)</span>
      <span class="lab-metric__value" data-higgs-share>~1.0 % (9.1 MeV/c²)</span>
    </div>
    <div class="lab-metric">
      <span class="lab-metric__label">Energía de enlace y cinética QCD</span>
      <span class="lab-metric__value" data-qcd-share>~99.0 % (929.2 MeV/c²)</span>
    </div>
    <div class="lab-bar" aria-hidden="true">
      <div class="lab-bar__higgs" data-bar-higgs></div>
      <div class="lab-bar__qcd" data-bar-qcd></div>
    </div>
  `;

  const controls = document.createElement('div');
  controls.className = 'lab-controls';
  controls.innerHTML = `
    <div class="lab-btn-group" role="group" aria-label="Modo de visualización del protón">
      <button type="button" class="lab-btn" data-mode="quarks" aria-pressed="false">
        Quarks desnudos (~1 %)
      </button>
      <button type="button" class="lab-btn" data-mode="qcd" aria-pressed="true">
        Energía de enlace QCD (~99 %)
      </button>
    </div>
    <span class="lab-status" data-status>Gluones y pares virtuales activos</span>
  `;

  mount.append(canvas, metrics, controls);

  const ctx = canvas.getContext('2d');
  const massEl = metrics.querySelector('[data-mass-value]');
  const qcdShareEl = metrics.querySelector('[data-qcd-share]');
  const barHiggs = metrics.querySelector('[data-bar-higgs]');
  const barQcd = metrics.querySelector('[data-bar-qcd]');
  const statusEl = controls.querySelector('[data-status]');
  const buttons = controls.querySelectorAll('[data-mode]');

  let mode = 'qcd';
  let qcdBlend = 1;
  let width = 600;
  let height = 320;
  let time = 0;
  let rafId = null;
  let isVisible = false;

  const quarks = [
    { label: 'u', color: '#dc2626', angle: 0, speed: 1.4, phase: 0.4 },
    { label: 'u', color: '#16a34a', angle: (Math.PI * 2) / 3, speed: 1.55, phase: 2.1 },
    { label: 'd', color: '#2563eb', angle: (Math.PI * 4) / 3, speed: 1.3, phase: 4.3 }
  ];

  const virtualPairs = Array.from({ length: 14 }, () => ({
    angle: Math.random() * Math.PI * 2,
    radius: Math.random() * 0.72,
    life: Math.random(),
    speed: 0.012 + Math.random() * 0.02
  }));

  function updateReadout() {
    const displayedMass = 9.1 + qcdBlend * (938.3 - 9.1);
    const qcdMass = qcdBlend * 929.2;
    massEl.textContent = `${displayedMass.toFixed(1)} MeV/c²`;
    qcdShareEl.textContent =
      qcdBlend > 0.05
        ? `~${((qcdMass / displayedMass) * 100).toFixed(1)} % (${qcdMass.toFixed(1)} MeV/c²)`
        : '0.0 % (desactivada)';

    barHiggs.style.width = `${Math.max(1.5, (9.1 / 938.3) * 100)}%`;
    barQcd.style.width = `${qcdBlend * (929.2 / 938.3) * 100}%`;
  }

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      mode = btn.dataset.mode;
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      statusEl.textContent =
        mode === 'qcd'
          ? 'Gluones y pares virtuales activos'
          : 'Solo masa de los 3 quarks de valencia';
    });
  });

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width || 600;
    height = rect.height || 320;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawGluonFlux(p1, p2, alpha) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = -dy / dist;
    const ny = dx / dist;
    const segments = 28;

    ctx.beginPath();
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const envelope = Math.sin(t * Math.PI);
      const wave = Math.sin(t * 22 - time * 11) * 7 * envelope * alpha;
      const x = p1.x + dx * t + nx * wave;
      const y = p1.y + dy * t + ny * wave;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(180, 83, 9, ${0.72 * alpha})`;
    ctx.lineWidth = 2.2;
    ctx.stroke();
  }

  function draw() {
    const target = mode === 'qcd' ? 1 : 0;
    qcdBlend += (target - qcdBlend) * 0.08;
    updateReadout();

    ctx.clearRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;
    const protonRadius = Math.min(width, height) * 0.36;

    const glow = ctx.createRadialGradient(cx, cy, protonRadius * 0.1, cx, cy, protonRadius * 1.15);
    glow.addColorStop(0, `rgba(180, 83, 9, ${0.22 * qcdBlend})`);
    glow.addColorStop(0.7, `rgba(15, 82, 186, ${0.08 + 0.08 * qcdBlend})`);
    glow.addColorStop(1, 'rgba(15, 82, 186, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, protonRadius * 1.15, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, protonRadius, 0, Math.PI * 2);
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = 'rgba(24, 26, 31, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);

    if (qcdBlend > 0.03) {
      virtualPairs.forEach((pair) => {
        pair.life += pair.speed;
        if (pair.life > 1) {
          pair.life = 0;
          pair.angle = Math.random() * Math.PI * 2;
          pair.radius = 0.15 + Math.random() * 0.68;
        }
        const opacity = Math.sin(pair.life * Math.PI) * 0.5 * qcdBlend;
        const px = cx + Math.cos(pair.angle) * protonRadius * pair.radius;
        const py = cy + Math.sin(pair.angle) * protonRadius * pair.radius;
        const spread = 4 + pair.life * 8;

        ctx.fillStyle = `rgba(15, 82, 186, ${opacity})`;
        ctx.beginPath();
        ctx.arc(px - spread * 0.5, py, 2.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(180, 83, 9, ${opacity})`;
        ctx.beginPath();
        ctx.arc(px + spread * 0.5, py, 2.3, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    const positions = quarks.map((q) => {
      const rate = 0.5 + qcdBlend * 1.9;
      const a = q.angle + time * q.speed * rate;
      const r = protonRadius * (0.48 + 0.14 * Math.sin(time * 2.4 + q.phase));
      const jitter = qcdBlend * 3.5;
      return {
        ...q,
        x: cx + Math.cos(a) * r + Math.sin(time * 17 + q.phase) * jitter,
        y: cy + Math.sin(a) * r + Math.cos(time * 15 + q.phase) * jitter
      };
    });

    if (qcdBlend > 0.03) {
      drawGluonFlux(positions[0], positions[1], qcdBlend);
      drawGluonFlux(positions[1], positions[2], qcdBlend);
      drawGluonFlux(positions[2], positions[0], qcdBlend);
    }

    positions.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 15, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '600 13px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.label, p.x, p.y + 0.5);
    });

    ctx.fillStyle = 'rgba(24, 26, 31, 0.55)';
    ctx.font = '500 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('PROTÓN (uud)  r ≈ 0.84 fm', 14, 22);
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
  draw();
}