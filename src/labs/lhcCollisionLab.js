import { quantumAudio } from '../utils/quantumAudio.js';

const CHANNELS = {
  gg: {
    label: 'H → γγ (dos fotones)',
    signalFraction: 0.032,
    bgDecay: 0.045,
    sigmaGeV: 1.85,
    trackColor: '#fde047',
    trackCount: 2
  },
  fourl: {
    label: 'H → ZZ* → 4ℓ (cuatro leptones)',
    signalFraction: 0.14,
    bgDecay: 0.028,
    sigmaGeV: 1.55,
    trackColor: '#22d3ee',
    trackCount: 4
  }
};

export function initLhcCollisionLab() {
  const mount = document.querySelector('[data-lab-mount="lhc-collision"]');
  if (!mount) return;

  mount.innerHTML = '';
  mount.style.padding = '0';

  const canvas = document.createElement('canvas');
  canvas.className = 'lab-canvas lab-canvas--tall';
  canvas.setAttribute('aria-label', 'Simulación de colisiones en el LHC e histograma de masa invariante');

  const inspector = document.createElement('div');
  inspector.className = 'lhc-inspector';
  inspector.hidden = true;

  const metrics = document.createElement('div');
  metrics.className = 'lab-metrics';
  metrics.innerHTML = `
    <div class="lab-metric">
      <span class="lab-metric__label">Eventos reconstruidos</span>
      <span class="lab-metric__value" data-events-val>0</span>
    </div>
    <div class="lab-metric">
      <span class="lab-metric__label">Masa del exceso</span>
      <span class="lab-metric__value" data-peak-val>Esperando datos...</span>
    </div>
    <div class="lab-metric">
      <span class="lab-metric__label">Significancia local</span>
      <span class="lab-metric__value" data-sigma-val>0.0 σ</span>
    </div>
  `;

  const controls = document.createElement('div');
  controls.className = 'lab-controls';
  controls.innerHTML = `
    <div class="lab-btn-group" role="group" aria-label="Canal de desintegración">
      <button type="button" class="lab-btn" data-channel="gg" aria-pressed="true">H → γγ</button>
      <button type="button" class="lab-btn" data-channel="fourl" aria-pressed="false">H → 4ℓ</button>
    </div>
    <div class="lab-btn-group" role="group" aria-label="Inyección de colisiones">
      <button type="button" class="lab-btn" data-inject="100">+100</button>
      <button type="button" class="lab-btn" data-inject="1000">+1000</button>
      <button type="button" class="lab-btn" data-inject="10000">+10 000</button>
      <button type="button" class="lab-btn" data-inspect>Evento candidato</button>
      <button type="button" class="lab-btn" data-reset>Reiniciar</button>
    </div>
  `;

  mount.append(canvas, inspector, metrics, controls);

  const ctx = canvas.getContext('2d');
  const eventsEl = metrics.querySelector('[data-events-val]');
  const peakEl = metrics.querySelector('[data-peak-val]');
  const sigmaEl = metrics.querySelector('[data-sigma-val]');
  const channelBtns = controls.querySelectorAll('[data-channel]');
  const injectBtns = controls.querySelectorAll('[data-inject]');
  const inspectBtn = controls.querySelector('[data-inspect]');
  const resetBtn = controls.querySelector('[data-reset]');

  const MIN_MASS = 100;
  const MAX_MASS = 160;
  const BIN_COUNT = 30;
  const BIN_WIDTH = (MAX_MASS - MIN_MASS) / BIN_COUNT;
  const HIGGS_MASS = 125.2;

  let width = 760;
  let height = 380;
  let channelKey = 'gg';
  let totalEvents = 0;
  let signalBins = new Int32Array(BIN_COUNT);
  let bgBins = new Int32Array(BIN_COUNT);
  let activeEventTracks = [];
  let flashAlpha = 0;
  let discoveryPlayed = false;
  let rafId = null;
  let isVisible = false;

  function gaussianRandom() {
    let u = 0;
    let v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function sampleBackgroundMass(decay) {
    const u = Math.random();
    const maxExp = 1 - Math.exp(-decay * (MAX_MASS - MIN_MASS));
    return MIN_MASS - Math.log(1 - u * maxExp) / decay;
  }

  function spawnDetectorEvent(isSignal) {
    const ch = CHANNELS[channelKey];
    const tracks = [];
    const baseAngle = Math.random() * Math.PI * 2;

    for (let i = 0; i < 14; i++) {
      tracks.push({
        angle: Math.random() * Math.PI * 2,
        length: 0.3 + Math.random() * 0.45,
        curve: (Math.random() - 0.5) * 0.35,
        highlight: false
      });
    }

    const count = ch.trackCount;
    for (let i = 0; i < count; i++) {
      const spread =
        count === 2
          ? i * Math.PI + (Math.random() - 0.5) * 0.35
          : (i * Math.PI * 2) / 4 + (Math.random() - 0.5) * 0.3;
      tracks.push({
        angle: baseAngle + spread,
        length: count === 2 ? 0.78 : 0.96,
        curve: count === 2 ? 0 : i % 2 === 0 ? 0.12 : -0.12,
        highlight: true,
        isSignal
      });
    }

    activeEventTracks = tracks;
    flashAlpha = 0.85;
  }

  function inspectCandidateEvent() {
    spawnDetectorEvent(true);
    inspector.hidden = false;

    if (channelKey === 'gg') {
      const pt1 = (61.4 + (Math.random() - 0.5) * 4).toFixed(1);
      const pt2 = (57.8 + (Math.random() - 0.5) * 4).toFixed(1);
      inspector.innerHTML = `
        <span>CANAL: H → γγ</span>
        <span>pT(γ₁) = ${pt1} GeV · pT(γ₂) = ${pt2} GeV</span>
        <span>Δφ = 174.2° · m_inv = 125.2 GeV/c²</span>
      `;
    } else {
      const mZ1 = (91.1 + (Math.random() - 0.5) * 0.6).toFixed(1);
      const mZ2 = (26.4 + (Math.random() - 0.5) * 1.4).toFixed(1);
      inspector.innerHTML = `
        <span>CANAL: H → ZZ* → μ⁺μ⁻e⁺e⁻</span>
        <span>m(Z₁) = ${mZ1} GeV · m(Z₂*) = ${mZ2} GeV</span>
        <span>m_inv(4ℓ) = 125.2 GeV/c²</span>
      `;
    }
    quantumAudio.playFieldRipple(0.65, 0.3);
  }

  function injectEvents(count, silent = false) {
    const ch = CHANNELS[channelKey];
    let lastWasSignal = false;

    for (let i = 0; i < count; i++) {
      const isSignal = Math.random() < ch.signalFraction;
      const mass = isSignal
        ? HIGGS_MASS + gaussianRandom() * ch.sigmaGeV
        : sampleBackgroundMass(ch.bgDecay);

      if (mass >= MIN_MASS && mass < MAX_MASS) {
        const bin = Math.floor((mass - MIN_MASS) / BIN_WIDTH);
        if (isSignal) signalBins[bin] += 1;
        else bgBins[bin] += 1;
        totalEvents += 1;
        lastWasSignal = isSignal;
      }
    }

    spawnDetectorEvent(lastWasSignal || count >= 100);
    if (!silent) quantumAudio.playLhcClick(count);
    updateStats(!silent);
  }

  function resetData() {
    totalEvents = 0;
    signalBins.fill(0);
    bgBins.fill(0);
    activeEventTracks = [];
    flashAlpha = 0;
    discoveryPlayed = false;
    inspector.hidden = true;
    updateStats(false);
  }

  function updateStats(allowChime = true) {
    eventsEl.textContent = totalEvents.toLocaleString('es-CO');

    const signalStart = Math.floor((122 - MIN_MASS) / BIN_WIDTH);
    const signalEnd = Math.floor((128 - MIN_MASS) / BIN_WIDTH);

    let sigWindow = 0;
    let bgWindow = 0;
    let weightedSum = 0;

    for (let i = signalStart; i <= signalEnd; i++) {
      const center = MIN_MASS + (i + 0.5) * BIN_WIDTH;
      sigWindow += signalBins[i];
      bgWindow += bgBins[i];
      weightedSum += signalBins[i] * center;
    }

    const significance = bgWindow > 0 ? sigWindow / Math.sqrt(bgWindow) : 0;

    if (significance >= 5) {
      sigmaEl.textContent = `${significance.toFixed(1)} σ (Descubrimiento >= 5σ)`;
      peakEl.textContent = `${(weightedSum / Math.max(sigWindow, 1)).toFixed(1)} GeV/c²`;
      if (allowChime && !discoveryPlayed) {
        discoveryPlayed = true;
        quantumAudio.playDiscoveryChime();
      }
    } else if (significance >= 2) {
      sigmaEl.textContent = `${significance.toFixed(1)} σ (Indicio)`;
      peakEl.textContent = `${(weightedSum / Math.max(sigWindow, 1)).toFixed(1)} GeV/c²`;
    } else {
      sigmaEl.textContent = `${significance.toFixed(1)} σ`;
      peakEl.textContent = totalEvents > 0 ? 'Ruido de fondo dominante' : 'Esperando datos...';
    }
  }

  channelBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      channelKey = btn.dataset.channel;
      channelBtns.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      resetData();
      injectEvents(400, true);
    });
  });

  injectBtns.forEach((btn) => {
    btn.addEventListener('click', () => injectEvents(Number(btn.dataset.inject), false));
  });

  inspectBtn.addEventListener('click', inspectCandidateEvent);
  resetBtn.addEventListener('click', resetData);

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width || 760;
    height = rect.height || 380;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawDetector(x0, y0, w, h) {
    const cx = x0 + w / 2;
    const cy = y0 + h / 2;
    const maxR = Math.min(w, h) * 0.42;
    const ch = CHANNELS[channelKey];

    const rings = [0.28, 0.56, 0.78, 1.0];
    rings.forEach((r, idx) => {
      ctx.beginPath();
      ctx.arc(cx, cy, maxR * r, 0, Math.PI * 2);
      ctx.strokeStyle =
        idx === 2 ? 'rgba(34, 211, 238, 0.28)' : 'rgba(148, 163, 184, 0.16)';
      ctx.lineWidth = idx === 2 ? 1.5 : 1;
      ctx.stroke();
    });

    activeEventTracks.forEach((tr) => {
      const endR = maxR * tr.length;
      const ex = cx + Math.cos(tr.angle) * endR;
      const ey = cy + Math.sin(tr.angle) * endR;
      const midR = endR * 0.55;
      const mx = cx + Math.cos(tr.angle + tr.curve) * midR;
      const my = cy + Math.sin(tr.angle + tr.curve) * midR;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.quadraticCurveTo(mx, my, ex, ey);
      if (tr.highlight) {
        ctx.strokeStyle = ch.trackColor;
        ctx.lineWidth = 2.2;
        if (channelKey === 'gg') ctx.setLineDash([5, 4]);
      } else {
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      if (tr.highlight) {
        ctx.beginPath();
        ctx.arc(ex, ey, 3.8, 0, Math.PI * 2);
        ctx.fillStyle = ch.trackColor;
        ctx.fill();
      }
    });

    if (flashAlpha > 0.02) {
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 24);
      grad.addColorStop(0, `rgba(255, 255, 255, ${flashAlpha})`);
      grad.addColorStop(1, 'rgba(34, 211, 238, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, 24, 0, Math.PI * 2);
      ctx.fill();
      flashAlpha *= 0.92;
    }

    ctx.fillStyle = 'rgba(230, 237, 245, 0.65)';
    ctx.font = '500 11px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`DETECTOR TRANSVERSAL (${ch.label})`, cx, y0 + 20);
  }

  function drawHistogram(x0, y0, w, h) {
    const padL = 44;
    const padR = 18;
    const padT = 34;
    const padB = 34;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;
    const left = x0 + padL;
    const bottom = y0 + h - padB;

    let maxBin = 10;
    for (let i = 0; i < BIN_COUNT; i++) {
      const total = bgBins[i] + signalBins[i];
      if (total > maxBin) maxBin = total;
    }
    maxBin *= 1.15;

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left, y0 + padT);
    ctx.lineTo(left, bottom);
    ctx.lineTo(left + plotW, bottom);
    ctx.stroke();

    const higgsX = left + ((HIGGS_MASS - MIN_MASS) / (MAX_MASS - MIN_MASS)) * plotW;
    ctx.beginPath();
    ctx.moveTo(higgsX, y0 + padT);
    ctx.lineTo(higgsX, bottom);
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(251, 113, 133, 0.6)';
    ctx.stroke();
    ctx.setLineDash([]);

    const barW = plotW / BIN_COUNT;
    for (let i = 0; i < BIN_COUNT; i++) {
      const bx = left + i * barW + 1;
      const bgH = (bgBins[i] / maxBin) * plotH;
      const sigH = (signalBins[i] / maxBin) * plotH;

      ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.fillRect(bx, bottom - bgH, Math.max(barW - 2, 1), bgH);

      if (sigH > 0) {
        ctx.fillStyle = '#fb7185';
        ctx.fillRect(bx, bottom - bgH - sigH, Math.max(barW - 2, 1), sigH);
      }
    }

    ctx.fillStyle = 'rgba(230, 237, 245, 0.65)';
    ctx.font = '500 11px "IBM Plex Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('MASA INVARIANTE (GeV/c²)', left, y0 + 20);

    ctx.fillStyle = '#fb7185';
    ctx.textAlign = 'center';
    ctx.fillText('125.2 GeV', higgsX, y0 + padT - 6);

    ctx.fillStyle = 'rgba(143, 163, 188, 0.85)';
    [100, 115, 130, 145, 160].forEach((val) => {
      const tx = left + ((val - MIN_MASS) / (MAX_MASS - MIN_MASS)) * plotW;
      ctx.fillText(String(val), tx, bottom + 18);
    });
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    if (width >= 640) {
      const splitX = width * 0.42;
      drawDetector(0, 0, splitX, height);
      drawHistogram(splitX, 0, width - splitX, height);
    } else {
      const splitY = height * 0.48;
      drawDetector(0, 0, width, splitY);
      drawHistogram(0, splitY, width, height - splitY);
    }
  }

  function loop() {
    if (!isVisible) return;
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
  injectEvents(400, true);
  draw();
}