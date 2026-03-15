// ─── App State
const State = {
  subjects: [],
  weeklyPlan: [],
  currentPage: 'planning',
  timer: {
    running: false,
    paused: false,
    subjectId: null,
    startTime: null,
    pausedAt: null,
    elapsed: 0, // seconds
    intervalId: null,
  }
};

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DAYS_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const COLORS = ['#3b82f6','#10b981','#8b5cf6','#f59e0b','#ef4444','#06b6d4','#ec4899','#6366f1','#84cc16','#f97316'];

// ─── Router
const pages = {
  planning: renderPlanning,
  timer: renderTimer,
  subjects: renderSubjects,
  dashboard: renderDashboard,
};

async function navigate(page) {
  State.currentPage = page;
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  const content = document.getElementById('main-content');
  content.innerHTML = '';
  await pages[page]();
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────
async function init() {
  setupTitlebarControls();
  setupNavigation();
  updateTodayBadge();

  State.subjects = await window.api.subjects.getAll();
  State.weeklyPlan = await window.api.plan.getAll();

  await navigate('planning');
}

function setupTitlebarControls() {
  document.getElementById('btn-minimize').onclick = () => window.api.window.minimize();
  document.getElementById('btn-maximize').onclick = () => window.api.window.maximize();
  document.getElementById('btn-close').onclick = () => window.api.window.close();
}

function setupNavigation() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.onclick = () => navigate(btn.dataset.page);
  });
}

function updateTodayBadge() {
  const d = new Date();
  document.getElementById('today-label').textContent =
    `${DAYS_FULL[d.getDay()]}, ${d.getDate()}/${d.getMonth()+1}`;
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function formatMinutes(mins) {
  if (!mins || mins === 0) return '0h 00m';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return h > 0 ? `${h}h ${String(m).padStart(2,'0')}m` : `${m}m`;
}

function formatSeconds(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;

  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function getSubjectById(id) {
  return State.subjects.find(s => s.id == id);
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function toast(msg, type = 'default') {
  const tc = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      ${type === 'success' ? '<polyline points="20 6 9 17 4 12"/>' : type === 'error' ? '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>' : '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'}
    </svg>
    ${msg}`;
  tc.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function openModal(title, bodyHTML, onConfirm) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHTML;
  document.getElementById('modal-overlay').classList.add('open');

  const closeModal = () => document.getElementById('modal-overlay').classList.remove('open');
  document.getElementById('modal-close').onclick = closeModal;
  document.getElementById('modal-overlay').onclick = (e) => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  };

  if (onConfirm) {
    const confirmBtn = document.getElementById('modal-confirm');
    if (confirmBtn) confirmBtn.onclick = () => { onConfirm(); closeModal(); };
  }
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: PLANNING
// ═══════════════════════════════════════════════════════════════════════════════
async function renderPlanning() {
  const content = document.getElementById('main-content');
  const today = new Date().getDay();

  // Build week starting from Monday
  const weekOrder = [1,2,3,4,5,6,0]; // Mon to Sun

  const planByDay = {};
  State.weeklyPlan.forEach(p => {
    if (!planByDay[p.day_of_week]) planByDay[p.day_of_week] = [];
    planByDay[p.day_of_week].push(p);
  });

  content.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Planejamento Semanal</h1>
        <p class="page-subtitle">Organize as matérias para cada dia da semana</p>
      </div>
    </div>
    <div class="week-grid">
      ${weekOrder.map(dayIdx => {
        const daySubjects = planByDay[dayIdx] || [];
        const isToday = dayIdx === today;
        return `
          <div class="day-column ${isToday ? 'today' : ''}" data-day="${dayIdx}">
            <div class="day-header">
              <span class="day-name">${DAYS[dayIdx]}</span>
              ${isToday ? '<span class="badge" style="background:var(--accent-light);color:var(--accent)">Hoje</span>' : ''}
            </div>
            <div class="day-subjects" id="day-subjects-${dayIdx}">
              ${daySubjects.map(p => subjectChipHTML(p, dayIdx)).join('')}
            </div>
            <button class="day-add-btn" onclick="openAddSubjectToPlan(${dayIdx})">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Adicionar
            </button>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function subjectChipHTML(p, dayIdx) {
  const color = p.subject_color || '#6b7280';
  return `
    <div class="subject-chip" style="background:${hexToRgba(color,0.12)};color:${color}" data-day="${dayIdx}" data-subject="${p.subject_id}">
      <span>${p.subject_name}</span>
      <button class="subject-chip-remove" onclick="removePlanEntry(${dayIdx},${p.subject_id},event)" title="Remover">×</button>
    </div>
  `;
}

async function removePlanEntry(dayIdx, subjectId, event) {
  event.stopPropagation();
  await window.api.plan.remove({ day_of_week: dayIdx, subject_id: subjectId });
  State.weeklyPlan = await window.api.plan.getAll();
  // Re-render just that day column
  const daySubjects = State.weeklyPlan.filter(p => p.day_of_week == dayIdx);
  const container = document.getElementById(`day-subjects-${dayIdx}`);
  if (container) container.innerHTML = daySubjects.map(p => subjectChipHTML(p, dayIdx)).join('');
}

function openAddSubjectToPlan(dayIdx) {
  const existing = State.weeklyPlan.filter(p => p.day_of_week == dayIdx).map(p => p.subject_id);
  const available = State.subjects.filter(s => !existing.includes(s.id));

  if (available.length === 0) {
    toast('Todas as matérias já estão neste dia', 'error');
    return;
  }

  const opts = available.map(s =>
    `<option value="${s.id}">${s.name}</option>`
  ).join('');

  openModal(`Adicionar matéria — ${DAYS_FULL[dayIdx]}`, `
    <div class="form-group">
      <label class="form-label">Escolha a matéria</label>
      <select class="form-select" id="plan-subject-select">${opts}</select>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" id="modal-confirm">Adicionar</button>
    </div>
  `, async () => {
    const subjectId = parseInt(document.getElementById('plan-subject-select').value);
    await window.api.plan.set({ day_of_week: dayIdx, subject_id: subjectId });
    State.weeklyPlan = await window.api.plan.getAll();
    // Re-render day
    const daySubjects = State.weeklyPlan.filter(p => p.day_of_week == dayIdx);
    const container = document.getElementById(`day-subjects-${dayIdx}`);
    if (container) container.innerHTML = daySubjects.map(p => subjectChipHTML(p, dayIdx)).join('');
    toast('Matéria adicionada', 'success');
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: TIMER
// ═══════════════════════════════════════════════════════════════════════════════
async function renderTimer() {
  const content = document.getElementById('main-content');
  const today = new Date().getDay();
  const todaySubjects = State.weeklyPlan.filter(p => p.day_of_week === today);
  const recentSessions = await window.api.sessions.getRecentSessions();

  content.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Cronômetro</h1>
        <p class="page-subtitle">Registre seu tempo de estudo</p>
      </div>
    </div>
    <div class="timer-layout">
      <div>
        <div class="card timer-card">
          <div class="timer-subject-selector">
            <select class="form-select" id="timer-subject-select" style="max-width:300px;font-size:15px">
              ${State.subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
            </select>
          </div>
          <div class="timer-display" id="timer-display">00:00:00</div>
          <div class="timer-status" id="timer-status"></div>
          <div class="timer-controls">
            <button class="btn-timer-start" id="btn-timer-start" onclick="timerAction()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              Iniciar
            </button>
            <button class="btn-timer-pause" id="btn-timer-pause" onclick="timerPause()" style="display:none">
              Pausar
            </button>
          </div>
        </div>
      </div>

      <div>
        ${todaySubjects.length > 0 ? `
        <div class="card today-plan-card">
          <div class="card-title">Hoje</div>
          <div class="today-subjects">
            ${todaySubjects.map(p => {
              const totalMins = recentSessions
                .filter(s => s.subject_id == p.subject_id && isToday(s.start_time))
                .reduce((a,s) => a + s.duration_minutes, 0);
              return `
                <div class="today-subject-item" onclick="selectTimerSubject(${p.subject_id})" data-subject-id="${p.subject_id}">
                  <div class="today-subject-color" style="background:${p.subject_color}"></div>
                  <span class="today-subject-name">${p.subject_name}</span>
                  <span class="today-subject-hours">${formatMinutes(totalMins)}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
        ` : ''}

        <div class="card timer-sessions-card">
          <div class="card-title">Sessões Recentes</div>
          ${recentSessions.length === 0 ? `
            <div class="empty-state" style="padding:24px">
              <div class="empty-text">Nenhuma sessão ainda</div>
            </div>
          ` : recentSessions.slice(0,8).map(s => `
            <div class="session-item">
              <div class="session-dot" style="background:${s.subject_color}"></div>
              <div class="session-info">
                <div class="session-subject">${s.subject_name}</div>
                <div class="session-time">${formatDate(s.start_time)}</div>
              </div>
              <div class="session-duration">${formatMinutes(s.duration_minutes)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  // Restore timer state if running
  if (State.timer.running || State.timer.paused) {
    restoreTimerUI();
  }

  // Pre-select if there's a saved subject
  if (State.timer.subjectId) {
    const sel = document.getElementById('timer-subject-select');
    if (sel) sel.value = State.timer.subjectId;
  }
}

function isToday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' }) + ' ' +
         d.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
}

function selectTimerSubject(id) {
  const sel = document.getElementById('timer-subject-select');
  if (sel) sel.value = id;
  document.querySelectorAll('.today-subject-item').forEach(el => {
    el.classList.toggle('selected', el.dataset.subjectId == id);
  });
}

function restoreTimerUI() {
  const display = document.getElementById('timer-display');
  const status = document.getElementById('timer-status');
  const startBtn = document.getElementById('btn-timer-start');
  const pauseBtn = document.getElementById('btn-timer-pause');
  const sel = document.getElementById('timer-subject-select');

  if (!display) return;

  if (State.timer.running) {
    display.className = 'timer-display running';
    status.textContent = 'Em andamento';
    startBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Finalizar`;
    startBtn.classList.add('danger');
    pauseBtn.style.display = 'block';
    if (sel) sel.disabled = true;
    // Resume interval
    State.timer.intervalId = setInterval(tickTimer, 1000);
  } else if (State.timer.paused) {
    const elapsed = State.timer.elapsed;
    display.textContent = formatSeconds(elapsed);
    display.className = 'timer-display paused';
    status.textContent = 'Pausado';
    startBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Finalizar`;
    startBtn.classList.add('danger');
    pauseBtn.textContent = 'Retomar';
    pauseBtn.style.display = 'block';
    if (sel) sel.disabled = true;
  }
}

function tickTimer() {
  if (!State.timer.running || State.timer.paused) return;
  const now = Date.now();
  const elapsed = State.timer.elapsed + Math.floor((now - State.timer.startTime) / 1000);
  const display = document.getElementById('timer-display');
  if (display) display.textContent = formatSeconds(elapsed);
}

async function timerAction() {
  if (!State.timer.running && !State.timer.paused) {
    // Start
    const sel = document.getElementById('timer-subject-select');
    const subjectId = sel ? parseInt(sel.value) : null;
    if (!subjectId) { toast('Selecione uma matéria', 'error'); return; }

    State.timer.running = true;
    State.timer.paused = false;
    State.timer.subjectId = subjectId;
    State.timer.startTime = Date.now();
    State.timer.elapsed = 0;
    State.timer._startTimestamp = new Date().toISOString();

    const display = document.getElementById('timer-display');
    const status = document.getElementById('timer-status');
    const startBtn = document.getElementById('btn-timer-start');
    const pauseBtn = document.getElementById('btn-timer-pause');

    display.className = 'timer-display running';
    status.textContent = 'Em andamento';
    startBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Finalizar`;
    startBtn.classList.add('danger');
    pauseBtn.style.display = 'block';
    if (sel) sel.disabled = true;

    State.timer.intervalId = setInterval(tickTimer, 1000);
    toast('Cronômetro iniciado!', 'success');

  } else {
    // Finish
    clearInterval(State.timer.intervalId);

    const endTimestamp = new Date().toISOString();
    const now = Date.now();
    let totalSecs = State.timer.elapsed;
    if (State.timer.running && !State.timer.paused) {
      totalSecs += Math.floor((now - State.timer.startTime) / 1000);
    }
    const totalMinutes = totalSecs / 60;

    if (totalMinutes >= 0.1) {
      await window.api.sessions.create({
        subject_id: State.timer.subjectId,
        start_time: State.timer._startTimestamp,
        end_time: endTimestamp,
        duration_minutes: parseFloat(totalMinutes.toFixed(2)),
        notes: ''
      });
      toast(`Sessão salva: ${formatMinutes(totalMinutes)}`, 'success');
    }

    // Reset
    State.timer = { running: false, paused: false, subjectId: null, startTime: null, pausedAt: null, elapsed: 0, intervalId: null };

    await renderTimer();
  }
}

function timerPause() {
  const pauseBtn = document.getElementById('btn-timer-pause');
  const display = document.getElementById('timer-display');
  const status = document.getElementById('timer-status');

  if (State.timer.running && !State.timer.paused) {
    // Pause
    clearInterval(State.timer.intervalId);
    const now = Date.now();
    State.timer.elapsed += Math.floor((now - State.timer.startTime) / 1000);
    State.timer.paused = true;
    State.timer.running = false;

    display.className = 'timer-display paused';
    status.textContent = 'Pausado';
    pauseBtn.textContent = 'Retomar';
  } else if (State.timer.paused) {
    // Resume
    State.timer.paused = false;
    State.timer.running = true;
    State.timer.startTime = Date.now();

    display.className = 'timer-display running';
    status.textContent = 'Em andamento';
    pauseBtn.textContent = 'Pausar';

    State.timer.intervalId = setInterval(tickTimer, 1000);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: SUBJECTS
// ═══════════════════════════════════════════════════════════════════════════════
let activeSubjectId = null;
let activeNotesTab = 'description';

async function renderSubjects() {
  const content = document.getElementById('main-content');

  if (!activeSubjectId && State.subjects.length > 0) {
    activeSubjectId = State.subjects[0].id;
  }

  content.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Matérias</h1>
        <p class="page-subtitle">Gerencie suas matérias e anotações</p>
      </div>
      <button class="btn btn-primary" onclick="openCreateSubject()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Nova Matéria
      </button>
    </div>
    <div class="subjects-grid">
      <div class="card" style="padding:16px">
        <div class="card-title">Matérias (${State.subjects.length})</div>
        <div class="subjects-list" id="subjects-list">
          ${State.subjects.map(s => subjectListItemHTML(s)).join('')}
        </div>
      </div>
      <div id="notes-panel-container">
        ${activeSubjectId ? await notesPanel(activeSubjectId) : '<div class="card empty-state"><div class="empty-text">Selecione uma matéria</div></div>'}
      </div>
    </div>
  `;
}

function subjectListItemHTML(s) {
  return `
    <div class="subject-list-item ${s.id == activeSubjectId ? 'active' : ''}"
         onclick="selectSubject(${s.id})" data-subject-id="${s.id}">
      <div class="subject-color-dot" style="background:${s.color}"></div>
      <span class="subject-list-name">${s.name}</span>
      <button class="btn btn-ghost btn-sm btn-icon" onclick="openEditSubject(${s.id},event)" title="Editar">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
    </div>
  `;
}

async function notesPanel(subjectId) {
  const s = await window.api.subjects.getNotes(subjectId);
  if (!s) return '';

  return `
    <div class="card notes-panel">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:12px;height:12px;border-radius:50%;background:${s.color}"></div>
          <h2 style="font-size:17px;font-weight:600;letter-spacing:-0.02em">${s.name}</h2>
        </div>
        <button class="btn btn-danger btn-sm" onclick="confirmDeleteSubject(${s.id})">Excluir</button>
      </div>
      <div class="notes-tabs">
        <button class="notes-tab ${activeNotesTab==='description'?'active':''}" onclick="switchTab('description')">Descrição</button>
        <button class="notes-tab ${activeNotesTab==='topics'?'active':''}" onclick="switchTab('topics')">Tópicos</button>
        <button class="notes-tab ${activeNotesTab==='refs'?'active':''}" onclick="switchTab('refs')">Referências</button>
        <button class="notes-tab ${activeNotesTab==='observations'?'active':''}" onclick="switchTab('observations')">Observações</button>
      </div>
      <div class="tab-content ${activeNotesTab==='description'?'active':''}" id="tab-description">
        <textarea class="form-textarea" id="notes-description" placeholder="Descrição da matéria..." style="min-height:180px" onblur="autoSaveNotes(${s.id})">${s.description||''}</textarea>
      </div>
      <div class="tab-content ${activeNotesTab==='topics'?'active':''}" id="tab-topics">
        <textarea class="form-textarea" id="notes-topics" placeholder="Liste os tópicos a estudar, um por linha..." style="min-height:180px" onblur="autoSaveNotes(${s.id})">${s.topics||''}</textarea>
      </div>
      <div class="tab-content ${activeNotesTab==='refs'?'active':''}" id="tab-refs">
        <textarea class="form-textarea" id="notes-refs" placeholder="Links, livros, artigos..." style="min-height:180px" onblur="autoSaveNotes(${s.id})">${s.refs||''}</textarea>
      </div>
      <div class="tab-content ${activeNotesTab==='observations'?'active':''}" id="tab-observations">
        <textarea class="form-textarea" id="notes-observations" placeholder="Observações livres..." style="min-height:180px" onblur="autoSaveNotes(${s.id})">${s.observations||''}</textarea>
      </div>
      <div style="margin-top:12px;display:flex;justify-content:flex-end">
        <button class="btn btn-secondary btn-sm" onclick="autoSaveNotes(${s.id})">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          Salvar
        </button>
      </div>
    </div>
  `;
}

async function selectSubject(id) {
  activeSubjectId = id;
  document.querySelectorAll('.subject-list-item').forEach(el => {
    el.classList.toggle('active', el.dataset.subjectId == id);
  });
  const panel = document.getElementById('notes-panel-container');
  if (panel) panel.innerHTML = await notesPanel(id);
}

function switchTab(tab) {
  activeNotesTab = tab;
  document.querySelectorAll('.notes-tab').forEach(el => {
    el.classList.toggle('active', el.textContent.toLowerCase().includes(tab) ||
      (tab==='refs' && el.textContent==='Referências') ||
      (tab==='observations' && el.textContent==='Observações') ||
      (tab==='description' && el.textContent==='Descrição') ||
      (tab==='topics' && el.textContent==='Tópicos'));
  });
  // Map tab name to element id
  const tabMap = { description:'description', topics:'topics', refs:'refs', observations:'observations' };
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  const target = document.getElementById(`tab-${tab}`);
  if (target) target.classList.add('active');
}

async function autoSaveNotes(subjectId) {
  const data = {
    id: subjectId,
    description: document.getElementById('notes-description')?.value || '',
    topics: document.getElementById('notes-topics')?.value || '',
    refs: document.getElementById('notes-refs')?.value || '',
    observations: document.getElementById('notes-observations')?.value || '',
  };
  await window.api.subjects.saveNotes(data);
}

function openCreateSubject() {
  openModal('Nova Matéria', `
    <div class="form-group">
      <label class="form-label">Nome</label>
      <input type="text" class="form-input" id="new-subject-name" placeholder="Ex: Cálculo, Algoritmos..." autofocus>
    </div>
    <div class="form-group">
      <label class="form-label">Cor</label>
      <div class="color-grid" id="color-picker">
        ${COLORS.map(c => `<div class="color-swatch ${c===COLORS[0]?'selected':''}" style="background:${c}" data-color="${c}" onclick="selectColor(this)"></div>`).join('')}
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" id="modal-confirm">Criar</button>
    </div>
  `, async () => {
    const name = document.getElementById('new-subject-name').value.trim();
    if (!name) { toast('Informe um nome', 'error'); return; }
    const color = document.querySelector('.color-swatch.selected')?.dataset.color || COLORS[0];
    const s = await window.api.subjects.create({ name, color });
    State.subjects = await window.api.subjects.getAll();
    activeSubjectId = s.id;
    await renderSubjects();
    toast('Matéria criada!', 'success');
  });
}

function openEditSubject(id, event) {
  event.stopPropagation();
  const s = getSubjectById(id);
  if (!s) return;
  openModal('Editar Matéria', `
    <div class="form-group">
      <label class="form-label">Nome</label>
      <input type="text" class="form-input" id="edit-subject-name" value="${s.name}">
    </div>
    <div class="form-group">
      <label class="form-label">Cor</label>
      <div class="color-grid">
        ${COLORS.map(c => `<div class="color-swatch ${c===s.color?'selected':''}" style="background:${c}" data-color="${c}" onclick="selectColor(this)"></div>`).join('')}
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" id="modal-confirm">Salvar</button>
    </div>
  `, async () => {
    const name = document.getElementById('edit-subject-name').value.trim();
    if (!name) return;
    const color = document.querySelector('.color-swatch.selected')?.dataset.color || s.color;
    await window.api.subjects.update({ id, name, color, description: s.description || '' });
    State.subjects = await window.api.subjects.getAll();
    State.weeklyPlan = await window.api.plan.getAll();
    await renderSubjects();
    toast('Matéria atualizada!', 'success');
  });
}

function confirmDeleteSubject(id) {
  const s = getSubjectById(id);
  openModal('Excluir Matéria', `
    <p style="color:var(--text-2);line-height:1.6">Tem certeza que deseja excluir <strong>${s?.name}</strong>? Todas as sessões e planos associados serão removidos.</p>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-danger" id="modal-confirm">Excluir</button>
    </div>
  `, async () => {
    await window.api.subjects.delete(id);
    State.subjects = await window.api.subjects.getAll();
    State.weeklyPlan = await window.api.plan.getAll();
    activeSubjectId = State.subjects[0]?.id || null;
    await renderSubjects();
    toast('Matéria excluída', 'default');
  });
}

function selectColor(el) {
  document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
  el.classList.add('selected');
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
async function renderDashboard() {
  const content = document.getElementById('main-content');
  const [allStats, weeklyStats, monthlyStats] = await Promise.all([
    window.api.sessions.getStats(),
    window.api.sessions.getWeeklyStats(),
    window.api.sessions.getMonthlyStats(),
  ]);

  const totalAll = allStats.reduce((a,s) => a + s.total_minutes, 0);
  const totalWeek = weeklyStats.reduce((a,s) => a + s.total_minutes, 0);
  const totalMonth = monthlyStats.reduce((a,s) => a + s.total_minutes, 0);
  const maxMinutes = Math.max(...allStats.map(s => s.total_minutes), 1);

  content.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Relatórios</h1>
        <p class="page-subtitle">Acompanhe seu progresso e tempo de estudo</p>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Esta Semana</div>
        <div class="stat-value">${formatMinutes(totalWeek)}</div>
        <div class="stat-sub">${weeklyStats.filter(s=>s.total_minutes>0).length} matéria(s) estudadas</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Este Mês</div>
        <div class="stat-value">${formatMinutes(totalMonth)}</div>
        <div class="stat-sub">${monthlyStats.filter(s=>s.total_minutes>0).length} matéria(s) estudadas</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Geral</div>
        <div class="stat-value">${formatMinutes(totalAll)}</div>
        <div class="stat-sub">${allStats.reduce((a,s)=>a+s.session_count,0)} sessões registradas</div>
      </div>
    </div>

    <div class="dashboard-grid">
      <div class="card">
        <div class="card-title">Horas por Matéria (Total)</div>
        ${allStats.filter(s => s.total_minutes > 0).length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">📊</div>
            <div class="empty-text">Nenhum dado ainda</div>
            <div class="empty-sub">Inicie uma sessão de estudo</div>
          </div>
        ` : `
          <div class="chart-bar-list">
            ${allStats.map(s => `
              <div class="chart-bar-item">
                <div class="chart-bar-header">
                  <span class="chart-bar-name">${s.name}</span>
                  <span class="chart-bar-value">${formatMinutes(s.total_minutes)}</span>
                </div>
                <div class="chart-bar-track">
                  <div class="chart-bar-fill" style="width:${(s.total_minutes/maxMinutes*100).toFixed(1)}%;background:${s.color}"></div>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>

      <div class="card">
        <div class="card-title">Ranking — Mais Estudadas</div>
        ${allStats.filter(s => s.total_minutes > 0).length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">🏆</div>
            <div class="empty-text">Ranking vazio</div>
            <div class="empty-sub">Complete sessões para ver o ranking</div>
          </div>
        ` : `
          <div class="ranking-list">
            ${allStats.filter(s => s.total_minutes > 0).slice(0,5).map((s,i) => `
              <div class="ranking-item">
                <div class="ranking-pos">#${i+1}</div>
                <div class="ranking-color" style="background:${s.color}"></div>
                <div class="ranking-name">${s.name}</div>
                <div class="ranking-time">${formatMinutes(s.total_minutes)}</div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    </div>
  `;

  // Animate bars after render
  requestAnimationFrame(() => {
    document.querySelectorAll('.chart-bar-fill').forEach(el => {
      const w = el.style.width;
      el.style.width = '0';
      setTimeout(() => el.style.width = w, 50);
    });
  });
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
