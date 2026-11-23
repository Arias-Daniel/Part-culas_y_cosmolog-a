import { ScrollTrigger } from 'gsap/ScrollTrigger';

const GLOSSARY = {
  qcd: {
    term: 'Cromodinámica cuántica (QCD)',
    value: 'Λ_QCD ≈ 210 MeV',
    desc: 'Teoría cuántica de la interacción nuclear fuerte. Describe cómo quarks y gluones se confinan dentro de protones y neutrones generando ~99 % de su masa.'
  },
  lattice: {
    term: 'QCD en retículo (Lattice QCD)',
    value: 'Precisión < 2 %',
    desc: 'Formulación numérica de la QCD sobre una malla discreta de espacio-tiempo 4D que permite calcular masas de hadrones desde primeros principios.'
  },
  quiralidad: {
    term: 'Quiralidad cuántica',
    value: 'Estados ψ_L y ψ_R',
    desc: 'Propiedad intrínseca de los fermiones que determina cómo se acoplan a la fuerza débil. El campo de Higgs conecta las componentes izquierda y derecha generando masa.'
  },
  yukawa: {
    term: 'Acoplamiento de Yukawa',
    value: 'y_e ≈ 2.9×10⁻⁶ | y_t ≈ 0.99',
    desc: 'Constante adimensional que mide con qué intensidad interactúa cada fermión elemental con el campo de Higgs.'
  },
  gauge: {
    term: 'Simetría de gauge',
    value: 'SU(3) × SU(2) × U(1)',
    desc: 'Principio de invariancia local de las ecuaciones cuánticas del cual emergen las interacciones fundamentales y sus bosones mediadores.'
  },
  escalar: {
    term: 'Bosón escalar',
    value: 'Espín J = 0, paridad +',
    desc: 'Partícula cuántica sin momento angular intrínseco. El bosón de Higgs es la única partícula elemental escalar confirmada experimentalmente.'
  },
  metaestable: {
    term: 'Vacío metaestable',
    value: 'Vida media >> 13.8 Ga',
    desc: 'Estado de mínimo local de energía que podría no ser el mínimo absoluto a energías extremas (~10¹⁰ GeV), pero cuya estabilidad supera ampliamente la edad del universo.'
  }
};

export function initCosmicHud() {
  const hud = document.getElementById('cosmic-hud');
  if (!hud) return;

  const scaleValEl = hud.querySelector('[data-hud-scale]');
  const regimeEl = hud.querySelector('[data-hud-regime]');
  const links = hud.querySelectorAll('.cosmic-hud__item');
  const sections = document.querySelectorAll('[data-hud-id]');

  sections.forEach((section) => {
    const id = section.getAttribute('data-hud-id');
    const scale = section.getAttribute('data-hud-scale') || 'v = 246 GeV';
    const regime = section.getAttribute('data-hud-regime') || 'Campo escalar';

    const activate = () => {
      if (scaleValEl) scaleValEl.textContent = scale;
      if (regimeEl) regimeEl.textContent = regime;
      links.forEach((link) => {
        link.classList.toggle('is-active', link.getAttribute('data-target') === id);
      });
    };

    ScrollTrigger.create({
      trigger: section,
      start: 'top 52%',
      end: 'bottom 52%',
      onEnter: activate,
      onEnterBack: activate
    });
  });
}

export function initGlossary() {
  const terms = document.querySelectorAll('.glossary-term[data-term]');
  if (!terms.length) return;

  const popover = document.createElement('aside');
  popover.className = 'glossary-popover';
  popover.setAttribute('role', 'tooltip');
  popover.hidden = true;
  popover.innerHTML = `
    <div class="glossary-popover__head">
      <span class="glossary-popover__title" data-g-title></span>
      <span class="glossary-popover__val" data-g-val></span>
    </div>
    <p class="glossary-popover__desc" data-g-desc></p>
  `;
  document.body.appendChild(popover);

  const titleEl = popover.querySelector('[data-g-title]');
  const valEl = popover.querySelector('[data-g-val]');
  const descEl = popover.querySelector('[data-g-desc]');
  let activeTrigger = null;

  function show(trigger) {
    const entry = GLOSSARY[trigger.dataset.term];
    if (!entry) return;

    activeTrigger = trigger;
    titleEl.textContent = entry.term;
    valEl.textContent = entry.value;
    descEl.textContent = entry.desc;
    popover.hidden = false;

    const rect = trigger.getBoundingClientRect();
    const popRect = popover.getBoundingClientRect();
    const margin = 14;

    let left = rect.left + rect.width / 2 - popRect.width / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - popRect.width - margin));

    let top = rect.top - popRect.height - 10;
    if (top < margin) {
      top = rect.bottom + 10;
    }

    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
    popover.classList.add('is-visible');
  }

  function hide() {
    popover.classList.remove('is-visible');
    popover.hidden = true;
    activeTrigger = null;
  }

  terms.forEach((el) => {
    el.setAttribute('tabindex', '0');
    el.addEventListener('mouseenter', () => show(el));
    el.addEventListener('mouseleave', () => hide());
    el.addEventListener('focus', () => show(el));
    el.addEventListener('blur', () => hide());
    el.addEventListener('click', (event) => {
      event.preventDefault();
      if (activeTrigger === el) hide();
      else show(el);
    });
  });

  document.addEventListener('click', (event) => {
    if (!activeTrigger) return;
    if (!event.target.closest('.glossary-term') && !event.target.closest('.glossary-popover')) {
      hide();
    }
  });

  window.addEventListener('scroll', hide, { passive: true });
}

export function initLabFullscreen() {
  const cards = document.querySelectorAll('.lab-card');
  if (!cards.length) return;

  let activeCard = null;

  function closeFullscreen() {
    if (!activeCard) return;
    activeCard.classList.remove('lab-card--fullscreen');
    const btn = activeCard.querySelector('.lab-expand-btn');
    if (btn) {
      btn.textContent = 'Expandir';
      btn.setAttribute('aria-expanded', 'false');
    }
    document.body.classList.remove('lab-fullscreen-open');
    activeCard = null;
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'));
      ScrollTrigger.refresh();
    });
  }

  cards.forEach((card) => {
    const header = card.querySelector('.lab-card__header');
    if (!header) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lab-expand-btn';
    btn.textContent = 'Expandir';
    btn.setAttribute('aria-expanded', 'false');
    header.appendChild(btn);

    btn.addEventListener('click', () => {
      if (activeCard === card) {
        closeFullscreen();
        return;
      }
      if (activeCard) closeFullscreen();

      activeCard = card;
      card.classList.add('lab-card--fullscreen');
      btn.textContent = 'Cerrar [ESC]';
      btn.setAttribute('aria-expanded', 'true');
      document.body.classList.add('lab-fullscreen-open');

      requestAnimationFrame(() => {
        window.dispatchEvent(new Event('resize'));
      });
    });
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && activeCard) {
      closeFullscreen();
    }
  });
}