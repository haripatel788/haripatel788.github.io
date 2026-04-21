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
let snakeState = null;
let typingState = null;

const secretState = {
  tokenA: false,
  tokenB: false,
  tokenC: false,
  unlocked: false,
  snakeWin: false,
  typingWin: false,
};

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
const secretOnlyCommands = ['scan', 'decrypt', 'trace', 'logs', 'breaches', 'unlock', 'snake', 'typing-hack', 'purge'];

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

const resetSecretProgress = () => {
  secretState.tokenA = false;
  secretState.tokenB = false;
  secretState.tokenC = false;
  secretState.unlocked = false;
  secretState.snakeWin = false;
  secretState.typingWin = false;
};

const stopMiniGames = () => {
  if (snakeState?.timer) clearInterval(snakeState.timer);
  if (typingState?.timer) clearInterval(typingState.timer);
  snakeState = null;
  typingState = null;
};

const tokenMarkup = () => {
  const status = (ok) => (ok ? 'token-ok' : 'token-miss');
  return `<div class="secret-token-row">
    <span class="secret-token ${status(secretState.tokenA)}">A: Scan</span>
    <span class="secret-token ${status(secretState.tokenB)}">B: Decrypt</span>
    <span class="secret-token ${status(secretState.tokenC)}">C: Trace</span>
    <span class="secret-token ${status(secretState.unlocked)}">Unlock</span>
  </div>`;
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

const secretUnknown = (cmd) => {
  createEntry(
    'output',
    `<div class="output-shell secret-shell">
      <h3>Unknown Secret Command</h3>
      <p><strong>${cmd}</strong> is not recognized in hidden mode.</p>
      ${tokenMarkup()}
    </div>`
  );
  renderSuggestions(['scan', 'decrypt', 'trace', 'unlock', 'logs']);
};

const secretScan = () => {
  secretState.tokenA = true;
  createEntry(
    'output',
    `<div class="output-shell secret-shell">
      <h3>Recon Scan Complete</h3>
      <p>Discovered active nodes and captured entry token A.</p>
      ${tokenMarkup()}
    </div>`
  );
  renderSuggestions(['decrypt', 'logs', 'breaches']);
};

const secretDecrypt = () => {
  if (!secretState.tokenA) {
    createEntry('output', '<div class="output-shell secret-shell"><h3>Decrypt Blocked</h3><p>Missing prerequisite token A. Run <strong>scan</strong> first.</p></div>');
    renderSuggestions(['scan', 'logs']);
    return;
  }
  secretState.tokenB = true;
  createEntry(
    'output',
    `<div class="output-shell secret-shell">
      <h3>Cipher Broken</h3>
      <p>Payload decoded. Token B secured.</p>
      ${tokenMarkup()}
    </div>`
  );
  renderSuggestions(['trace', 'breaches', 'typing-hack']);
};

const secretTrace = () => {
  if (!secretState.tokenB) {
    createEntry('output', '<div class="output-shell secret-shell"><h3>Trace Blocked</h3><p>Token B required. Run <strong>decrypt</strong> first.</p></div>');
    renderSuggestions(['decrypt', 'logs']);
    return;
  }
  secretState.tokenC = true;
  createEntry(
    'output',
    `<div class="output-shell secret-shell">
      <h3>Trace Resolved</h3>
      <p>Route mapping complete. Token C acquired.</p>
      ${tokenMarkup()}
    </div>`
  );
  renderSuggestions(['unlock', 'snake', 'logs']);
};

const secretLogs = () => {
  createEntry(
    'output',
    `<div class="output-shell secret-shell">
      <h3>Secure Logs</h3>
      <ul class="secret-log-list">
        <li>[17:42:13] NODE/ALPHA -> warm</li>
        <li>[17:42:16] TOKEN_A status: ${secretState.tokenA ? 'active' : 'missing'}</li>
        <li>[17:42:18] TOKEN_B status: ${secretState.tokenB ? 'active' : 'missing'}</li>
        <li>[17:42:20] TOKEN_C status: ${secretState.tokenC ? 'active' : 'missing'}</li>
      </ul>
      ${tokenMarkup()}
    </div>`
  );
  renderSuggestions(['scan', 'decrypt', 'trace', 'unlock']);
};

const secretBreaches = () => {
  createEntry(
    'output',
    `<div class="output-shell secret-shell">
      <h3>Breach Intel</h3>
      <ul class="secret-log-list">
        <li><span class="sev high">HIGH</span> API relay anomaly (patched)</li>
        <li><span class="sev med">MED</span> Session replay attempt (blocked)</li>
        <li><span class="sev low">LOW</span> Archive index mismatch (resolved)</li>
      </ul>
    </div>`
  );
  renderSuggestions(['trace', 'unlock', 'logs']);
};

const secretUnlock = () => {
  const completedTokens = secretState.tokenA && secretState.tokenB && secretState.tokenC;
  if (!completedTokens) {
    createEntry('output', `<div class="output-shell secret-shell"><h3>Unlock Denied</h3><p>Sequence incomplete. Required: scan -> decrypt -> trace.</p>${tokenMarkup()}</div>`);
    renderSuggestions(['scan', 'decrypt', 'trace']);
    return;
  }
  secretState.unlocked = true;
  const bonusCount = Number(secretState.snakeWin) + Number(secretState.typingWin);
  createEntry(
    'output',
    `<div class="output-shell secret-shell">
      <h3>Classified Profile Unlocked</h3>
      <p>Mission complete. You found the hidden layer of the portfolio terminal.</p>
      <p>${bonusCount ? `Bonus intel awarded from mini-games: ${bonusCount}` : 'No mini-game bonuses detected yet.'}</p>
      ${tokenMarkup()}
    </div>`
  );
  renderSuggestions(['snake', 'typing-hack', 'purge', 'exit']);
};

const secretPurge = () => {
  const sessionId = activeSecretSessionId;
  if (sessionId !== null) {
    terminalOutput.querySelectorAll(`[data-secret-session="${sessionId}"]`).forEach((entry) => entry.remove());
  }
  createEntry('output', '<div class="output-shell secret-shell"><h3>Session Purged</h3><p>Secret output wiped for current session.</p></div>');
  renderSuggestions(['scan', 'decrypt', 'trace', 'unlock']);
};

const startSnakeGame = () => {
  stopMiniGames();
  createEntry(
    'output',
    `<div class="output-shell secret-shell game-shell">
      <h3>Snake Protocol</h3>
      <p>Reach score 5 to earn bonus intel.</p>
      <canvas id="snakeCanvas" width="320" height="320"></canvas>
      <div class="game-controls">
        <button class="suggestion-btn" data-game-dir="up">up</button>
        <button class="suggestion-btn" data-game-dir="left">left</button>
        <button class="suggestion-btn" data-game-dir="down">down</button>
        <button class="suggestion-btn" data-game-dir="right">right</button>
      </div>
      <p id="snakeStatus">Score: 0</p>
    </div>`
  );
  renderSuggestions(['typing-hack', 'unlock', 'purge', 'exit']);

  const canvas = document.getElementById('snakeCanvas');
  const statusEl = document.getElementById('snakeStatus');
  if (!canvas || !statusEl) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const size = 16;
  const cells = canvas.width / size;
  snakeState = {
    snake: [{ x: 5, y: 5 }],
    dir: { x: 1, y: 0 },
    food: { x: 10, y: 10 },
    score: 0,
    timer: null,
  };
  const placeFood = () => {
    snakeState.food = {
      x: Math.floor(Math.random() * cells),
      y: Math.floor(Math.random() * cells),
    };
  };
  snakeState.timer = setInterval(() => {
    const head = { ...snakeState.snake[0] };
    head.x = (head.x + snakeState.dir.x + cells) % cells;
    head.y = (head.y + snakeState.dir.y + cells) % cells;
    if (snakeState.snake.some((seg) => seg.x === head.x && seg.y === head.y)) {
      snakeState.snake = [{ x: 5, y: 5 }];
      snakeState.dir = { x: 1, y: 0 };
      snakeState.score = 0;
      placeFood();
    } else {
      snakeState.snake.unshift(head);
      if (head.x === snakeState.food.x && head.y === snakeState.food.y) {
        snakeState.score += 1;
        placeFood();
      } else {
        snakeState.snake.pop();
      }
    }
    ctx.fillStyle = '#03100a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#2fff82';
    snakeState.snake.forEach((seg) => ctx.fillRect(seg.x * size, seg.y * size, size - 1, size - 1));
    ctx.fillStyle = '#b5ffcf';
    ctx.fillRect(snakeState.food.x * size, snakeState.food.y * size, size - 1, size - 1);
    statusEl.textContent = `Score: ${snakeState.score}`;
    if (snakeState.score >= 5 && !secretState.snakeWin) {
      secretState.snakeWin = true;
      statusEl.textContent = 'Score: 5 — bonus intel unlocked.';
      renderSuggestions(['unlock', 'typing-hack', 'purge', 'exit']);
    }
  }, 130);
};

const startTypingHackGame = () => {
  stopMiniGames();
  const phrases = ['secure channel engaged', 'decrypting payload stream', 'trace route complete'];
  const phrase = phrases[Math.floor(Math.random() * phrases.length)];
  createEntry(
    'output',
    `<div class="output-shell secret-shell game-shell">
      <h3>Typing Hack</h3>
      <p>Type this exactly before timer runs out:</p>
      <p class="typing-target">${phrase}</p>
      <input class="terminal-input typing-input" id="typingHackInput" placeholder="type phrase..." />
      <p id="typingHackStatus">Time left: 15s</p>
    </div>`
  );
  renderSuggestions(['snake', 'unlock', 'purge', 'exit']);
  const input = document.getElementById('typingHackInput');
  const statusEl = document.getElementById('typingHackStatus');
  if (!input || !statusEl) return;
  let timeLeft = 15;
  input.focus();
  typingState = {
    timer: setInterval(() => {
      timeLeft -= 1;
      statusEl.textContent = `Time left: ${timeLeft}s`;
      if (timeLeft <= 0) {
        clearInterval(typingState.timer);
        statusEl.textContent = 'Challenge failed. Try typing-hack again.';
      }
    }, 1000),
  };
  input.addEventListener('input', () => {
    if (input.value === phrase) {
      clearInterval(typingState.timer);
      statusEl.textContent = 'Challenge passed. Bonus intel unlocked.';
      secretState.typingWin = true;
      renderSuggestions(['unlock', 'snake', 'purge', 'exit']);
    }
  });
};

const secretCommandHandlers = {
  scan: secretScan,
  decrypt: secretDecrypt,
  trace: secretTrace,
  logs: secretLogs,
  breaches: secretBreaches,
  unlock: secretUnlock,
  purge: secretPurge,
  snake: startSnakeGame,
  'typing-hack': startTypingHackGame,
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
  resetSecretProgress();
  stopMiniGames();
  document.body.classList.add('admin-mode');
  createEntry(
    'output',
    '<h3>Admin Access Granted</h3><p>Welcome to stealth terminal mode. Signal elevated. Type <strong>exit</strong> to return.</p>'
  );
  renderSuggestions(['scan', 'decrypt', 'trace', 'logs', 'unlock', 'exit']);
};

const exitAdminMode = () => {
  stopMiniGames();
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
  if (secretModeActive && secretCommandHandlers[normalized]) {
    secretCommandHandlers[normalized]();
    return;
  }
  if (secretModeActive && secretOnlyCommands.includes(normalized)) {
    secretUnknown(normalized);
    return;
  }
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
  if (btn && bootDone) {
    enqueueCommand(btn.dataset.command);
    return;
  }
  const dirBtn = e.target.closest('button[data-game-dir]');
  if (!dirBtn || !snakeState) return;
  const dir = dirBtn.dataset.gameDir;
  if (dir === 'up' && snakeState.dir.y !== 1) snakeState.dir = { x: 0, y: -1 };
  if (dir === 'down' && snakeState.dir.y !== -1) snakeState.dir = { x: 0, y: 1 };
  if (dir === 'left' && snakeState.dir.x !== 1) snakeState.dir = { x: -1, y: 0 };
  if (dir === 'right' && snakeState.dir.x !== -1) snakeState.dir = { x: 1, y: 0 };
});

document.addEventListener('keydown', (e) => {
  if (!snakeState) return;
  if (e.key === 'ArrowUp' && snakeState.dir.y !== 1) snakeState.dir = { x: 0, y: -1 };
  if (e.key === 'ArrowDown' && snakeState.dir.y !== -1) snakeState.dir = { x: 0, y: 1 };
  if (e.key === 'ArrowLeft' && snakeState.dir.x !== 1) snakeState.dir = { x: -1, y: 0 };
  if (e.key === 'ArrowRight' && snakeState.dir.x !== -1) snakeState.dir = { x: 1, y: 0 };
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