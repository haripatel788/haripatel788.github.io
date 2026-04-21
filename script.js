const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const bootOverlay = document.getElementById('bootOverlay');
const bootLines = document.getElementById('bootLines');
const bootSkip = document.getElementById('bootSkip');
const terminalOutput = document.getElementById('terminalOutput');
const terminalSuggestions = document.getElementById('terminalSuggestions');
const terminalForm = document.getElementById('terminalForm');
const terminalInput = document.getElementById('terminalInput');
const quickChips = document.querySelectorAll('.quick-chip');
const source = document.getElementById('portfolioSource');

let history = [];
let historyIndex = -1;
let bootDone = false;
let commandQueue = Promise.resolve();

const getText = (selector) => {
  const el = source ? source.querySelector(selector) : null;
  return el ? el.textContent.trim().replace(/\s+/g, ' ') : '';
};

const getList = (selector) => {
  if (!source) return [];
  return [...source.querySelectorAll(selector)].map((n) => n.textContent.trim().replace(/\s+/g, ' '));
};

const projects = source
  ? [...source.querySelectorAll('.project-card')].map((card) => ({
      name: card.querySelector('.project-name')?.textContent.trim() || '',
      desc: card.querySelector('.project-desc')?.textContent.trim() || '',
      tag: card.querySelector('.project-tag')?.textContent.trim() || '',
      link: card.querySelector('.project-link')?.getAttribute('href') || '#',
      linkLabel: card.querySelector('.project-link')?.textContent.trim().replace(/\s+/g, ' ') || 'Link',
    }))
  : [];

const data = {
  intro: getText('.hero-title'),
  aboutHeading: getText('#about .section-title'),
  aboutParagraphs: getList('#about .about-text p:not(.section-label)'),
  stackItems: getList('#experience .tech-pill'),
  resumeSummary: getText('#resume .resume-block p'),
  resumeStats: getList('#resume .resume-stat'),
  resumePdf: source?.querySelector('a[href$="hari_resume.pdf"]')?.getAttribute('href') || 'hari_resume.pdf',
  contactText: getText('#contact .contact-sub'),
  contactLinks: [...(source?.querySelectorAll('#contact .social-link') || [])].map((a) => ({
    label: a.textContent.trim().replace(/\s+/g, ' '),
    href: a.getAttribute('href') || '#',
  })),
  email: getText('#emailBtnText') || 'haripatel788@gmail.com',
};

const commandList = ['help', 'menu', 'about', 'stack', 'projects', 'resume', 'contact', 'clear', 'history', 'home', 'admin', 'exit'];

const createEntry = (type, html) => {
  const el = document.createElement('article');
  el.className = `entry ${type}`;
  el.innerHTML = html;
  terminalOutput.appendChild(el);
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
  return el;
};

const typeText = (el, text, speed = 18) => {
  if (prefersReducedMotion) {
    el.textContent = text;
    return Promise.resolve();
  }
  el.textContent = '';
  el.classList.add('typing');
  return new Promise((resolve) => {
    let i = 0;
    const timer = setInterval(() => {
      el.textContent += text[i];
      i += 1;
      terminalOutput.scrollTop = terminalOutput.scrollHeight;
      if (i >= text.length) {
        clearInterval(timer);
        el.classList.remove('typing');
        resolve();
      }
    }, speed);
  });
};

const renderSuggestions = (commands = []) => {
  terminalSuggestions.innerHTML = '';
  commands.forEach((cmd) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'suggestion-btn';
    button.dataset.command = cmd;
    button.textContent = cmd;
    terminalSuggestions.appendChild(button);
  });
};

const renderHelp = () => {
  createEntry(
    'output',
    `<h3>Available commands</h3><ul>${commandList.map((c) => `<li><strong>${c}</strong></li>`).join('')}</ul>`
  );
  renderSuggestions(['about', 'projects', 'resume', 'contact']);
};

const renderAbout = () => {
  createEntry(
    'output',
    `<h3>${data.aboutHeading || 'About'}</h3>${data.aboutParagraphs.map((p) => `<p>${p}</p>`).join('')}`
  );
  renderSuggestions(['stack', 'projects', 'contact']);
};

const renderStack = () => {
  createEntry('output', `<h3>Stack</h3><p>${data.stackItems.join(' • ')}</p>`);
  renderSuggestions(['projects', 'resume']);
};

const renderProjects = () => {
  const html = projects
    .map((p) => `<li><strong>${p.name}</strong> — ${p.desc}<br><em>${p.tag}</em> · <a href="${p.link}" target="_blank">${p.linkLabel}</a></li>`)
    .join('');
  createEntry('output', `<h3>Projects</h3><ul>${html}</ul>`);
  renderSuggestions(['resume', 'contact']);
};

const renderResume = () => {
  createEntry(
    'output',
    `<h3>Resume</h3><p>${data.resumeSummary}</p><p><a href="${data.resumePdf}" target="_blank">Open PDF Resume</a></p>`
  );
  renderSuggestions(['projects', 'contact']);
};

const renderContact = () => {
  const links = data.contactLinks.map((l) => `<li><a href="${l.href}" target="_blank">${l.label}</a></li>`).join('');
  createEntry('output', `<h3>Contact</h3><p>${data.contactText}</p><ul>${links}<li>${data.email}</li></ul>`);
  renderSuggestions(['about', 'projects']);
};

const renderHistory = () => {
  createEntry('output', `<h3>History</h3><p>${history.length ? history.join(' → ') : 'No commands yet.'}</p>`);
  renderSuggestions(['help']);
};

const enterAdminMode = () => {
  document.body.classList.add('admin-mode');
  createEntry(
    'output',
    '<h3>Admin Access Granted</h3><p>Welcome to stealth terminal mode. Signal elevated. Type <strong>exit</strong> to return.</p>'
  );
  renderSuggestions(['projects', 'history', 'exit']);
};

const exitAdminMode = () => {
  document.body.classList.remove('admin-mode');
  createEntry('output', '<h3>Admin Session Closed</h3><p>Returned to standard portfolio terminal.</p>');
  renderSuggestions(['help', 'about', 'projects']);
};

const renderGoodbyeScreen = () => {
  terminalOutput.innerHTML = '';
  createEntry(
    'output',
    `<div class="goodbye-screen">
      <h1>THANK YOU</h1>
      <p>Appreciate you exploring my terminal portfolio. If something sparked your interest, let’s connect and build something meaningful together.</p>
    </div>`
  );
  renderSuggestions(['home', 'contact', 'projects']);
};

const commandHandlers = {
  help: renderHelp,
  menu: renderHelp,
  about: renderAbout,
  stack: renderStack,
  projects: renderProjects,
  resume: renderResume,
  contact: renderContact,
  history: renderHistory,
  admin: enterAdminMode,
  exit: () => {
    if (document.body.classList.contains('admin-mode')) {
      exitAdminMode();
      return;
    }
    renderGoodbyeScreen();
  },
  home: () => {
    terminalOutput.innerHTML = '';
    createEntry('output', '<h3>Welcome</h3><p>Terminal ready. Type <strong>help</strong> to explore.</p>');
    renderSuggestions(['help', 'about', 'projects', 'resume', 'contact']);
  },
  clear: () => {
    terminalOutput.innerHTML = '';
    renderSuggestions(['help', 'about', 'projects']);
  },
};

const closestCommand = (value) => {
  const v = value.toLowerCase();
  return commandList.find((c) => c.startsWith(v[0] || '')) || 'help';
};

const runCommand = async (raw) => {
  const cmd = raw.trim().toLowerCase();
  if (!cmd) return;
  const commandEntry = createEntry('command', '');
  await typeText(commandEntry, `hari@portfolio:~$ ${cmd}`);
  history.push(cmd);
  historyIndex = history.length;
  if (commandHandlers[cmd]) {
    commandHandlers[cmd]();
    return;
  }
  createEntry('output', `<p>Command not found: <strong>${cmd}</strong>. Try <strong>${closestCommand(cmd)}</strong> or <strong>help</strong>.</p>`);
  renderSuggestions(['help', closestCommand(cmd)]);
};

const enqueueCommand = (raw) => {
  commandQueue = commandQueue.then(() => runCommand(raw));
  return commandQueue;
};

const bootLinesText = [
  '[BOOT] Initializing HariOS Portfolio Terminal v2.6',
  '[OK] Loading profile modules: about, stack, projects, resume, contact',
  '[OK] Mounting command engine and mobile quick actions',
  '[OK] Enabling accessibility and reduced-motion checks',
  '[READY] System online. Press Enter to continue...',
];

const finishBoot = () => {
  if (bootDone) return;
  bootDone = true;
  bootOverlay.classList.add('hidden');
  commandHandlers.home();
  terminalInput.focus();
};

const startBoot = () => {
  if (prefersReducedMotion) {
    bootLines.innerHTML = bootLinesText.map((line) => `<p>${line}</p>`).join('');
    finishBoot();
    return;
  }
  let i = 0;
  const timer = setInterval(() => {
    if (i >= bootLinesText.length) {
      clearInterval(timer);
      setTimeout(finishBoot, 700);
      return;
    }
    const p = document.createElement('p');
    p.textContent = bootLinesText[i];
    bootLines.appendChild(p);
    bootLines.scrollTop = bootLines.scrollHeight;
    i += 1;
  }, 420);
};

terminalForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!bootDone) return;
  enqueueCommand(terminalInput.value);
  terminalInput.value = '';
});

terminalInput.addEventListener('keydown', (e) => {
  if (!bootDone) return;
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (!history.length) return;
    historyIndex = Math.max(0, historyIndex - 1);
    terminalInput.value = history[historyIndex] || '';
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (!history.length) return;
    historyIndex = Math.min(history.length, historyIndex + 1);
    terminalInput.value = history[historyIndex] || '';
  }
});

terminalSuggestions.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-command]');
  if (!btn || !bootDone) return;
  enqueueCommand(btn.dataset.command);
});

quickChips.forEach((chip) => {
  chip.addEventListener('click', () => {
    if (!bootDone) return;
    enqueueCommand(chip.dataset.command || '');
  });
});

bootSkip.addEventListener('click', finishBoot);
document.addEventListener('keydown', (e) => {
  if (!bootDone && e.key === 'Enter') finishBoot();
});

startBoot();