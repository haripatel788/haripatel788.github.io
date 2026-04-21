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
let lastExecutedBase = 'home';
const commandFrequency = {};
const commandTransitions = {};
let secretModeActive = false;
let secretSessionCounter = 0;
let activeSecretSessionId = null;

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

const stackCategories = source
  ? [...source.querySelectorAll('#experience .tech-category')].map((section) => ({
      label: section.querySelector('.tech-category-label')?.textContent.trim() || 'Category',
      items: [...section.querySelectorAll('.tech-pill')].map((item) => item.textContent.trim()),
    }))
  : [];

const visibleCommandList = ['help', 'about', 'stack', 'projects', 'resume', 'resume live', 'contact', 'clear', 'history', 'home', 'exit'];
const secretCommand = 'harisupersecretcommand';

const createEntry = (type, html) => {
  const el = document.createElement('article');
  el.className = `entry ${type}`;
  if (secretModeActive && activeSecretSessionId !== null) {
    el.dataset.secretSession = String(activeSecretSessionId);
  }
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

const staticSuggestionFallback = ['help', 'about', 'projects', 'resume', 'contact', 'stack', 'history'];

const recommendCommands = (contextCommands = []) => {
  const scores = {};
  const candidates = new Set([...visibleCommandList, ...contextCommands]);

  candidates.forEach((cmd) => {
    scores[cmd] = 0;
  });

  // Context is still primary.
  contextCommands.forEach((cmd, idx) => {
    scores[cmd] = (scores[cmd] || 0) + (18 - idx * 2);
  });

  // Favor frequently used commands.
  Object.entries(commandFrequency).forEach(([cmd, count]) => {
    if (cmd in scores) scores[cmd] += Math.min(12, count * 1.6);
  });

  // Learn command-to-command transitions.
  const fromLast = commandTransitions[lastExecutedBase] || {};
  Object.entries(fromLast).forEach(([cmd, count]) => {
    if (cmd in scores) scores[cmd] += Math.min(14, count * 2.2);
  });

  // Recency boost for recent commands (excluding exact last command).
  const recent = [...new Set(history.slice(-6).map((h) => h.split(' ')[0]).reverse())];
  recent.forEach((cmd, idx) => {
    if (cmd in scores && cmd !== lastExecutedBase) {
      scores[cmd] += Math.max(0, 8 - idx * 1.4);
    }
  });

  // Keep utility commands available but not dominant.
  ['help', 'home', 'clear'].forEach((cmd) => {
    if (cmd in scores) scores[cmd] += 1;
  });

  return Object.entries(scores)
    .filter(([cmd]) => cmd !== secretCommand)
    .sort((a, b) => b[1] - a[1])
    .map(([cmd]) => cmd)
    .slice(0, 5);
};

const renderSuggestions = (commands = []) => {
  const personalized = recommendCommands(commands.length ? commands : staticSuggestionFallback);
  terminalSuggestions.innerHTML = '';
  personalized.forEach((cmd) => {
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
    `<div class="output-shell">
      <h3>Command Directory</h3>
      <p class="output-sub">Use these commands to navigate the portfolio terminal.</p>
      <div class="command-grid">${visibleCommandList.map((c) => `<button type="button" class="chip inline-command" data-command="${c}">${c}</button>`).join('')}</div>
    </div>`
  );
  renderSuggestions(['about', 'projects', 'resume', 'contact']);
};

const renderAbout = () => {
  createEntry(
    'output',
    `<div class="output-shell">
      <h3>${data.aboutHeading || 'About'}</h3>
      <p class="output-sub">Identity + focus areas</p>
      <div class="output-stack">${data.aboutParagraphs.map((p) => `<p>${p}</p>`).join('')}</div>
    </div>`
  );
  renderSuggestions(['stack', 'projects', 'contact']);
};

const renderStack = () => {
  const categoriesHtml = stackCategories
    .map(
      (group) => `<div class="stack-group">
        <h4>${group.label}</h4>
        <div class="command-grid">${group.items.map((item) => `<span class="chip">${item}</span>`).join('')}</div>
      </div>`
    )
    .join('');
  createEntry(
    'output',
    `<div class="output-shell">
      <h3>Stack</h3>
      <p class="output-sub">Categorized as in resume flow</p>
      <div class="stack-layout">${categoriesHtml}</div>
    </div>`
  );
  renderSuggestions(['projects', 'resume']);
};

const renderProjects = () => {
  const html = projects
    .map(
      (p) => `<li class="project-row">
        <div>
          <strong>${p.name}</strong>
          <p>${p.desc}</p>
          <span class="tag">${p.tag}</span>
        </div>
        <a href="${p.link}" target="_blank">${p.linkLabel}</a>
      </li>`
    )
    .join('');
  createEntry(
    'output',
    `<div class="output-shell">
      <h3>Projects</h3>
      <p class="output-sub">Selected builds and shipped work</p>
      <ul class="project-list">${html}</ul>
    </div>`
  );
  renderSuggestions(['resume', 'contact']);
};

const renderResume = () => {
  const resumeHighlights = [
    'Built and deployed full-stack applications with active users and measurable outcomes.',
    'Combines backend architecture, data systems, and ML workflow implementation.',
    'Owns projects end-to-end: problem framing, development, deployment, and iteration.',
    'Brings leadership experience from technical teams and volunteer operations.',
  ];
  const statItems = data.resumeStats.map((item) => `<span class="chip">${item.replace(/\s+/g, ' ')}</span>`).join('');
  const expItems = getList('#resume .resume-block:nth-of-type(2) .resume-exp-item').map((item) => `<li>${item}</li>`).join('');
  const eduItems = getList('#resume .resume-block:nth-of-type(3) .resume-exp-item').map((item) => `<li>${item}</li>`).join('');
  createEntry(
    'output',
    `<div class="output-shell">
      <h3>Resume Snapshot</h3>
      <p class="output-sub">Summary, metrics, experience, and document access</p>
      <div class="output-stack">
        <div class="command-grid">${statItems}</div>
        <p>${data.resumeSummary}</p>
        <ul>${resumeHighlights.map((point) => `<li>${point}</li>`).join('')}</ul>
        <h4>Experience</h4>
        <ul>${expItems || '<li>Experience details available in full PDF.</li>'}</ul>
        <h4>Education</h4>
        <ul>${eduItems || '<li>Education details available in full PDF.</li>'}</ul>
        <p><a href="${data.resumePdf}" target="_blank">Open Full PDF Resume</a></p>
      </div>
    </div>`
  );
  renderSuggestions(['projects', 'contact']);
};

const renderResumeLive = () => {
  createEntry(
    'output',
    `<div class="output-shell">
      <h3>Resume Live View</h3>
      <p class="output-sub">Embedded PDF preview</p>
      <div class="resume-live-frame">
        <iframe src="${data.resumePdf}#toolbar=0&navpanes=0" title="Hari Patel Resume live view"></iframe>
      </div>
      <p><a href="${data.resumePdf}" target="_blank">Open Full PDF Resume</a></p>
    </div>`
  );
  renderSuggestions(['resume', 'projects', 'contact']);
};

const renderContact = () => {
  const links = data.contactLinks
    .map(
      (l) => `<a class="contact-card" href="${l.href}" target="_blank">
        <strong>${l.label}</strong>
        <span>Open profile</span>
      </a>`
    )
    .join('');
  createEntry(
    'output',
    `<div class="output-shell">
      <h3>Contact</h3>
      <p class="output-sub">Open to projects, internships, and collaborations</p>
      <p>${data.contactText}</p>
      <div class="contact-grid">${links}</div>
      <div class="contact-email"><strong>Email:</strong> ${data.email}</div>
    </div>`
  );
  renderSuggestions(['about', 'projects']);
};

const renderHistory = () => {
  createEntry(
    'output',
    `<div class="output-shell">
      <h3>Command History</h3>
      <p>${history.length ? history.join(' → ') : 'No commands yet.'}</p>
    </div>`
  );
  renderSuggestions(['help']);
};

const enterAdminMode = () => {
  if (secretModeActive && document.body.classList.contains('admin-mode')) {
    createEntry('output', '<h3>Secret Mode Active</h3><p>You are already in the hidden terminal mode. Type <strong>exit</strong> to leave.</p>');
    renderSuggestions(['projects', 'history', 'exit']);
    return;
  }
  secretSessionCounter += 1;
  activeSecretSessionId = secretSessionCounter;
  secretModeActive = true;
  document.body.classList.add('admin-mode');
  createEntry(
    'output',
    '<h3>Admin Access Granted</h3><p>Welcome to stealth terminal mode. Signal elevated. Type <strong>exit</strong> to return.</p>'
  );
  renderSuggestions(['projects', 'history', 'exit']);
};

const exitAdminMode = () => {
  const sessionId = activeSecretSessionId;
  if (sessionId !== null) {
    terminalOutput.querySelectorAll(`[data-secret-session="${sessionId}"]`).forEach((entry) => entry.remove());
  }
  secretModeActive = false;
  activeSecretSessionId = null;
  document.body.classList.remove('admin-mode');
  renderSuggestions(['help', 'about', 'projects']);
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
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
  about: renderAbout,
  stack: renderStack,
  projects: renderProjects,
  resume: (args = '') => {
    if (args.trim() === 'live') {
      renderResumeLive();
      return;
    }
    renderResume();
  },
  contact: renderContact,
  history: renderHistory,
  [secretCommand]: enterAdminMode,
  exit: () => {
    if (document.body.classList.contains('admin-mode')) {
      exitAdminMode();
      return;
    }
    renderGoodbyeScreen();
  },
  home: () => {
    terminalOutput.innerHTML = '';
    createEntry(
      'output',
      '<div class="output-shell"><h3>Welcome</h3><p class="output-sub">HariOS terminal ready</p><p>Type <strong>help</strong> to explore or use the quick command chips.</p></div>'
    );
    renderSuggestions(['help', 'about', 'projects', 'resume', 'contact']);
  },
  clear: () => {
    terminalOutput.innerHTML = '';
    commandHandlers.home();
  },
};

const closestCommand = (value) => {
  const v = value.toLowerCase();
  return visibleCommandList.find((c) => c.startsWith(v[0] || '')) || 'help';
};

const runCommand = async (raw) => {
  const normalized = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!normalized) return;
  const [base, ...rest] = normalized.split(' ');
  const args = rest.join(' ');
  const commandEntry = createEntry('command', '');
  await typeText(commandEntry, `hari@portfolio:~$ ${normalized}`);
  history.push(normalized);
  historyIndex = history.length;
  if (commandHandlers[base]) {
    commandFrequency[base] = (commandFrequency[base] || 0) + 1;
    if (!commandTransitions[lastExecutedBase]) commandTransitions[lastExecutedBase] = {};
    commandTransitions[lastExecutedBase][base] = (commandTransitions[lastExecutedBase][base] || 0) + 1;
    lastExecutedBase = base;
    commandHandlers[base](args);
    return;
  }
  createEntry('output', `<p>Command not found: <strong>${normalized}</strong>. Try <strong>${closestCommand(normalized)}</strong> or <strong>help</strong>.</p>`);
  renderSuggestions(['help', closestCommand(normalized)]);
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

terminalOutput.addEventListener('click', (e) => {
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