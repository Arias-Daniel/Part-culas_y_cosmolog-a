import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initScrollThemes() {
  const sections = document.querySelectorAll('[data-theme-section]');

  sections.forEach((section) => {
    const theme = section.getAttribute('data-theme-section');

    ScrollTrigger.create({
      trigger: section,
      start: 'top 52%',
      end: 'bottom 52%',
      onEnter: () => {
        document.documentElement.dataset.theme = theme;
      },
      onEnterBack: () => {
        document.documentElement.dataset.theme = theme;
      }
    });
  });

  const progressBar = document.getElementById('reading-progress-bar');
  if (progressBar) {
    ScrollTrigger.create({
      trigger: document.body,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        progressBar.style.width = `${(self.progress * 100).toFixed(2)}%`;
      }
    });
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reducedMotion) {
    gsap.utils.toArray('.reveal').forEach((element) => {
      gsap.from(element, {
        y: 28,
        opacity: 0,
        duration: 0.75,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: element,
          start: 'top 84%',
          once: true
        }
      });
    });
  }
}