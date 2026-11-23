export function initHeroField(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let width = 0;
  let height = 0;
  let cols = 0;
  let rows = 0;
  let spacing = 32;
  let current = new Float32Array(0);
  let previous = new Float32Array(0);
  let rafId = null;
  let isVisible = true;
  let frameCount = 0;

  const DAMPING = 0.975;
  const WAVE_SPEED = 0.42;

  function idx(x, y) {
    return y * cols + x;
  }

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    width = rect.width;
    height = rect.height;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    spacing = width < 640 ? 28 : 34;
    cols = Math.ceil(width / spacing) + 2;
    rows = Math.ceil(height / spacing) + 2;

    current = new Float32Array(cols * rows);
    previous = new Float32Array(cols * rows);
  }

  function excite(clientX, clientY, amplitude) {
    const rect = canvas.getBoundingClientRect();
    const gx = Math.round((clientX - rect.left) / spacing);
    const gy = Math.round((clientY - rect.top) / spacing);

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

    if (frameCount % 110 === 0) {
      const rx = Math.floor(2 + Math.random() * (cols - 4));
      const ry = Math.floor(2 + Math.random() * (rows - 4));
      current[idx(rx, ry)] += (Math.random() > 0.5 ? 1 : -1) * 14;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    ctx.lineWidth = 1;
    for (let y = 1; y < rows - 1; y++) {
      ctx.beginPath();
      for (let x = 1; x < cols - 1; x++) {
        const val = current[idx(x, y)];
        const px = x * spacing;
        const py = y * spacing + val * 0.65;
        if (x === 1) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = 'rgba(76, 201, 240, 0.14)';
      ctx.stroke();
    }

    for (let x = 1; x < cols - 1; x++) {
      ctx.beginPath();
      for (let y = 1; y < rows - 1; y++) {
        const val = current[idx(x, y)];
        const px = x * spacing + val * 0.25;
        const py = y * spacing + val * 0.65;
        if (y === 1) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
      ctx.stroke();
    }

    for (let y = 1; y < rows - 1; y++) {
      for (let x = 1; x < cols - 1; x++) {
        const val = current[idx(x, y)];
        const energy = Math.min(Math.abs(val) / 14, 1);
        if (energy < 0.06) continue;

        const px = x * spacing + val * 0.25;
        const py = y * spacing + val * 0.65;
        const radius = 1.4 + energy * 3.2;

        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fillStyle =
          val >= 0
            ? `rgba(76, 201, 240, ${0.25 + energy * 0.7})`
            : `rgba(245, 183, 0, ${0.22 + energy * 0.65})`;
        ctx.fill();
      }
    }
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

  resize();
  draw();

  if (!reducedMotion) {
    canvas.addEventListener('pointermove', (event) => {
      excite(event.clientX, event.clientY, 8);
    });

    canvas.addEventListener('pointerdown', (event) => {
      excite(event.clientX, event.clientY, 24);
    });

    const observer = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0].isIntersecting;
        if (isVisible) start();
        else stop();
      },
      { threshold: 0.05 }
    );
    observer.observe(canvas);
    start();
  }

  window.addEventListener('resize', () => {
    resize();
    draw();
  });
}