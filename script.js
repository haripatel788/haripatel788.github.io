const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const hamBtn = document.getElementById('hamBtn');
const mobileMenu = document.getElementById('mobileMenu');
const setMenuOpen = (open) => {
  hamBtn.classList.toggle('open', open);
  mobileMenu.classList.toggle('open', open);
  hamBtn.setAttribute('aria-expanded', String(open));
  document.body.style.overflow = open ? 'hidden' : '';
};
hamBtn.addEventListener('click', () => setMenuOpen(!mobileMenu.classList.contains('open')));
document.querySelectorAll('.mobile-menu a').forEach(a => a.addEventListener('click', () => setMenuOpen(false)));

const obs = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }), { threshold: 0.12 });
document.querySelectorAll('.reveal, .stagger-parent').forEach(el => obs.observe(el));

const EMAIL = 'haririteshpatel@gmail.com';
const emailBtn = document.getElementById('emailBtn');
const emailBtnText = document.getElementById('emailBtnText');
const pageProgress = document.getElementById('pageProgress');
emailBtn.addEventListener('click', () => {
  if (!navigator.clipboard) { window.location.href = `mailto:${EMAIL}`; return; }
  navigator.clipboard.writeText(EMAIL).then(() => {
    emailBtnText.textContent = 'Copied!'; emailBtn.classList.add('copied');
    setTimeout(() => { emailBtnText.textContent = EMAIL; emailBtn.classList.remove('copied'); }, 2000);
  }).catch(() => { window.location.href = `mailto:${EMAIL}`; });
});

if (pageProgress) {
  let rafId = null;
  let current = 0;
  let target = 0;

  const getTargetProgress = () => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (maxScroll <= 0) return 0;
    return Math.min(1, Math.max(0, window.scrollY / maxScroll));
  };

  const render = () => {
    current += (target - current) * 0.14;
    if (Math.abs(target - current) < 0.0005) current = target;
    pageProgress.style.transform = `scaleX(${current})`;

    if (Math.abs(target - current) < 0.0005) {
      rafId = null;
      return;
    }
    rafId = requestAnimationFrame(render);
  };

  const queueProgressUpdate = () => {
    target = getTargetProgress();
    if (!rafId) rafId = requestAnimationFrame(render);
  };

  queueProgressUpdate();
  window.addEventListener('scroll', queueProgressUpdate, { passive: true });
  window.addEventListener('resize', queueProgressUpdate);
}

document.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
  const t = document.querySelector(a.getAttribute('href'));
  if (t) {
    e.preventDefault();
    t.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }
}));

const modal = document.getElementById('resumeModal');
const modalFrame = modal.querySelector('.resume-modal-frame');
const closeResume = document.getElementById('closeResume');
let lastFocused = null;

const openModal = () => {
  if (!modalFrame.src) modalFrame.src = modalFrame.dataset.src;
  lastFocused = document.activeElement;
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  closeResume.focus();
};
const closeModal = () => {
  if (!modal.classList.contains('open')) return;
  modal.classList.remove('open');
  document.body.style.overflow = '';
  if (lastFocused) lastFocused.focus();
};

[document.getElementById('openResume'), document.getElementById('openResume2')].forEach(btn => btn && btn.addEventListener('click', openModal));
closeResume.addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

modal.addEventListener('keydown', e => {
  if (e.key !== 'Tab') return;
  const focusable = [...modal.querySelectorAll('a[href], button, iframe')];
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  closeModal();
  if (mobileMenu.classList.contains('open')) setMenuOpen(false);
});
