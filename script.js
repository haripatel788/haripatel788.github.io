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