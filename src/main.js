import 'lenis/dist/lenis.css';
import 'katex/dist/katex.min.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/labs.css';

import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import renderMathInElement from 'katex/contrib/auto-render';

import { initHeroField } from './animations/heroField.js';
import { initScrollThemes } from './animations/scrollThemes.js';
import { initAudioToggle } from './utils/quantumAudio.js';
import { initCosmicHud, initGlossary, initLabFullscreen } from './utils/uiEnhancements.js';
import { initProtonMassLab } from './labs/protonMassLab.js';
import { initYukawaCoupling } from './labs/yukawaCoupling.js';
import { initMexicanHat3D } from './labs/mexicanHat3D.js';
import { initAtomCollapseLab } from './labs/atomCollapseLab.js';
import { initLhcCollisionLab } from './labs/lhcCollisionLab.js';

gsap.registerPlugin(ScrollTrigger);

function initSmoothScroll() {
  const lenis = new Lenis({
    duration: 1.05,
    smoothWheel: true
  });

  lenis.on('scroll', ScrollTrigger.update);

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (event) => {
      const targetId = anchor.getAttribute('href');
      const target = document.querySelector(targetId);
      if (!target) return;
      event.preventDefault();
      lenis.scrollTo(target, { offset: -24 });
    });
  });
}

function initMath() {
  renderMathInElement(document.body, {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '$', right: '$', display: false }
    ],
    throwOnError: false
  });
}

function initPhysicsBoxes() {
  document.querySelectorAll('.physics-box').forEach((box) => {
    box.addEventListener('toggle', () => {
      requestAnimationFrame(() => ScrollTrigger.refresh());
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initMath();
  initSmoothScroll();
  initHeroField('hero-field-canvas');
  initScrollThemes();
  initPhysicsBoxes();
  initAudioToggle();
  initCosmicHud();
  initGlossary();
  initLabFullscreen();
  initProtonMassLab();
  initYukawaCoupling();
  initMexicanHat3D();
  initAtomCollapseLab();
  initLhcCollisionLab();
});