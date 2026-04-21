const hamBtn = document.getElementById('hamBtn');
const mobileMenu = document.getElementById('mobileMenu');
hamBtn.addEventListener('click', () => { hamBtn.classList.toggle('open'); mobileMenu.classList.toggle('open'); });
document.querySelectorAll('.mobile-menu a').forEach(a => a.addEventListener('click', () => { hamBtn.classList.remove('open'); mobileMenu.classList.remove('open'); }));

const obs = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }), { threshold: 0.12 });
document.querySelectorAll('.reveal, .stagger-parent').forEach(el => obs.observe(el));

const emailBtn = document.getElementById('emailBtn');
const emailBtnText = document.getElementById('emailBtnText');
emailBtn.addEventListener('click', () => {
  navigator.clipboard.writeText('haripatel788@gmail.com').then(() => {
    emailBtnText.textContent = 'Copied!'; emailBtn.classList.add('copied');
    setTimeout(() => { emailBtnText.textContent = 'haripatel788@gmail.com'; emailBtn.classList.remove('copied'); }, 2000);
  });
});

document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => { const t = document.querySelector(a.getAttribute('href')); if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth' }); } }));

const modal = document.getElementById('resumeModal');
const openBtns = [document.getElementById('openResume'), document.getElementById('openResume2')];
openBtns.forEach(btn => btn && btn.addEventListener('click', () => modal.classList.add('open')));

const closeResume = document.getElementById('closeResume');
if (closeResume) closeResume.addEventListener('click', () => modal.classList.remove('open'));

modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') modal.classList.remove('open'); });

// ── Parallax ────────────────────────────────────────────────
const parallaxLayers = [
  { el: document.querySelector('.hero-eyebrow'),   speed: 0.12 },
  { el: document.querySelector('.hero-name'),      speed: 0.22 },
  { el: document.querySelector('.hero-title'),     speed: 0.14 },
  { el: document.querySelector('.hero-ctas'),      speed: 0.08 },
  { el: document.querySelector('.glow-blob-1'),    speed: 0.18, fixed: true },
  { el: document.querySelector('.glow-blob-2'),    speed: 0.10, fixed: true },
  { el: document.querySelector('.glow-blob-3'),    speed: 0.14, fixed: true },
  { el: document.querySelector('.about-photo-wrap'), speed: 0.07 },
];

let ticking = false;
window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      const scrollY = window.scrollY;
      parallaxLayers.forEach(({ el, speed, fixed }) => {
        if (!el) return;
        const offset = scrollY * speed;
        if (fixed) {
          // blobs are position:fixed — shift them on scroll for depth
          el.style.transform = `translateY(${offset}px)`;
        } else {
          el.style.transform = `translateY(${offset}px)`;
          el.style.willChange = 'transform';
        }
      });
      ticking = false;
    });
    ticking = true;
  }
});