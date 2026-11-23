import { quantumAudio } from '../utils/quantumAudio.js';

export function initHeroField(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const host = canvas.parentElement;
  const ctx = canvas.getContext('2d');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let width = 0;
  let height = 0;
  let cols = 0;
  let rows = 0;
  let spacing = 30;
  let current = new Float32Array(0);
  let previous = new Float32Array(0);
  let ripples = [];
  let rafId = null;
  let isVisible = true;
  let frameCount = 0;

  const DAMPING = 0.978;
  const WAVE_SPEED = 0.42;

  function idx(x, y) {
    return y * cols + x;
  }

  function resize(force = false) {
    const rect = host.getBoundingClientRect();
    const widthChanged = Math.abs(rect.width - width) > 2;
    const heightChangedSignificantly = Math.abs(rect.height - height) > 140;

    if (!force && !widthChanged && !heightChangedSignificantly) {
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    width = rect.width || window.innerWidth;
    height = rect.height || window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    spacing = width < 640 ? 24 : 34;
    cols = Math.ceil(width / spacing) + 2;
    rows = Math.ceil(height / spacing) + 2;

    current = new Float32Array(cols * rows);
    previous = new Float32Array(cols * rows);
  }

  function excite(clientX, clientY, amplitude, addRing = false) {
    const rect = canvas.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;

    if (localX < 0 || localX > rect.width || localY < 0 || localY > rect.height) {
      return;
    }

    const gx = Math.round(localX / spacing);
    const gy = Math.round(localY / spacing);

    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const nx = gx + dx;
        const ny = gy + dy;
        if (nx > 1 && nx < cols - 2 && ny > 1 && ny < rows - 2) {
          const dist2 = dx * dx + dy * dy;
          const falloff = Math.exp(-dist2 / 2.2);
          current[idx(nx, ny)] += amplitude * falloff;
        }
      }
    }

    if (addRing) {
      ripples.push({
        x: localX,
        y: localY,
        radius: 6,
        alpha: 0.78
      });
      quantumAudio.playFieldRipple(localX / rect.width, localY / rect.height);
    }
  }

  function stepWave() {
    const next = new Float32Array(cols * rows);

    for (let y = 1; y < rows - 1; y++) {
      for (let x = 1; x < cols - 1; x++) {
        const i = idx(x, y);
        const laplacian =
          current[i - 1] +
          current[i + 1] +
          current[i - cols] +
          current[i + cols] -
          4 * current[i];

        next[i] = (2 * current[i] - previous[i] + WAVE_SPEED * laplacian) * DAMPING;
      }
    }

    previous = current;
    current = next;

    if (!reducedMotion && frameCount % 95 === 0) {
      const rx = Math.floor(2 + Math.random() * (cols - 4));
      const ry = Math.floor(2 + Math.random() * (rows - 4));
      current[idx(rx, ry)] += (Math.random() > 0.5 ? 1 : -1) * 18;
    }

    ripples.forEach((r) => {
      r.radius += 3.2;
      r.alpha *= 0.945;
    });
    ripples = ripples.filter((r) => r.alpha > 0.03);
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    ctx.lineWidth = 1;
    for (let y = 1; y < rows - 1; y++) {
      ctx.beginPath();
      for (let x = 1; x < cols - 1; x++) {
        const val = current[idx(x, y)];
        const px = x * spacing;
        const py = y * spacing + val * 0.72;
        if (x === 1) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.16)';
      ctx.stroke();
    }

    for (let x = 1; x < cols - 1; x++) {
      ctx.beginPath();
      for (let y = 1; y < rows - 1; y++) {
        const val = current[idx(x, y)];
        const px = x * spacing + val * 0.3;
        const py = y * spacing + val * 0.72;
        if (y === 1) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
      ctx.stroke();
    }

    for (let y = 1; y < rows - 1; y++) {
      for (let x = 1; x < cols - 1; x++) {
        const val = current[idx(x, y)];
        const energy = Math.min(Math.abs(val) / 11, 1);
        if (energy < 0.04) continue;

        const px = x * spacing + val * 0.3;
        const py = y * spacing + val * 0.72;
        const radius = 1.6 + energy * 3.4;

        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fillStyle =
          val >= 0
            ? `rgba(56, 189, 248, ${0.32 + energy * 0.68})`
            : `rgba(245, 183, 0, ${0.28 + energy * 0.65})`;
        ctx.fill();
      }
    }

    ripples.forEach((r) => {
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(56, 189, 248, ${r.alpha})`;
      ctx.lineWidth = 1.25;
      ctx.stroke();
    });
  }

  function loop() {
    if (!isVisible) return;
    frameCount += 1;
    stepWave();
    draw();
    rafId = requestAnimationFrame(loop);
  }

  function start() {
    if (rafId !== null) return;
    rafId = requestAnimationFrame(loop);
  }

  function stop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  resize(true);
  draw();

  host.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch') return;
    excite(event.clientX, event.clientY, 10, false);
  });

  host.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'touch') return;
    excite(event.clientX, event.clientY, 28, true);
  });

  window.addEventListener(
    'touchstart',
    (event) => {
      if (!isVisible) return;
      for (const touch of event.changedTouches) {
        excite(touch.clientX, touch.clientY, 34, true);
      }
    },
    { passive: true }
  );

  window.addEventListener(
    'touchmove',
    (event) => {
      if (!isVisible) return;
      for (const touch of event.touches) {
        excite(touch.clientX, touch.clientY, 16, false);
      }
    },
    { passive: true }
  );

  const observer = new IntersectionObserver(
    (entries) => {
      isVisible = entries[0].isIntersecting;
      if (isVisible) start();
      else stop();
    },
    { threshold: 0.01 }
  );
  observer.observe(host);
  start();

  window.addEventListener('resize', () => {
    resize(false);
    draw();
  });
}