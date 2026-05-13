const hamBtn = document.getElementById('hamBtn');
const mobileMenu = document.getElementById('mobileMenu');
hamBtn.addEventListener('click', () => { hamBtn.classList.toggle('open'); mobileMenu.classList.toggle('open'); });
document.querySelectorAll('.mobile-menu a').forEach(a => a.addEventListener('click', () => { hamBtn.classList.remove('open'); mobileMenu.classList.remove('open'); }));

const obs = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }), { threshold: 0.12 });
document.querySelectorAll('.reveal, .stagger-parent').forEach(el => obs.observe(el));

const emailBtn = document.getElementById('emailBtn');
const emailBtnText = document.getElementById('emailBtnText');
const pageProgress = document.getElementById('pageProgress');
emailBtn.addEventListener('click', () => {
  navigator.clipboard.writeText('haririteshpatel@gmail.com').then(() => {
    emailBtnText.textContent = 'Copied!'; emailBtn.classList.add('copied');
    setTimeout(() => { emailBtnText.textContent = 'haririteshpatel@gmail.com'; emailBtn.classList.remove('copied'); }, 2000);
  });
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
    t.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}));

const modal = document.getElementById('resumeModal');
const openBtns = [document.getElementById('openResume'), document.getElementById('openResume2')];
openBtns.forEach(btn => btn && btn.addEventListener('click', () => modal.classList.add('open')));

const closeResume = document.getElementById('closeResume');
if (closeResume) closeResume.addEventListener('click', () => modal.classList.remove('open'));

modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') modal.classList.remove('open'); });

const terminalFab = document.getElementById('terminalFab');
const terminalOverlay = document.getElementById('terminalLaunchOverlay');
const terminalClose = document.getElementById('terminalClose');

if (terminalFab && terminalOverlay && terminalClose) {
  const footer = document.querySelector('footer');
  const setLaunchOrigin = () => {
    const rect = terminalFab.getBoundingClientRect();
    terminalOverlay.style.setProperty('--launch-x', `${rect.left + rect.width / 2}px`);
    terminalOverlay.style.setProperty('--launch-y', `${rect.top + rect.height / 2}px`);
  };

  const updateFabFooterDocking = () => {
    if (!footer) return;
    const footerTopInViewport = footer.getBoundingClientRect().top;
    const overlap = Math.max(0, window.innerHeight - footerTopInViewport);
    terminalFab.style.setProperty('--fab-dock-shift', `${overlap}px`);
  };

  terminalFab.addEventListener('click', () => {
    setLaunchOrigin();
    terminalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  });

  const closeTerminal = () => {
    terminalOverlay.classList.remove('open');
    document.body.style.overflow = '';
  };

  updateFabFooterDocking();
  window.addEventListener('scroll', updateFabFooterDocking, { passive: true });
  window.addEventListener('resize', updateFabFooterDocking);
  window.addEventListener('resize', setLaunchOrigin);
  terminalClose.addEventListener('click', closeTerminal);
  terminalOverlay.addEventListener('click', (e) => { if (e.target === terminalOverlay) closeTerminal(); });
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'close-terminal-overlay') {
      closeTerminal();
    }
  });
}