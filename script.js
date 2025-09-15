// -------------------- ELEMENTOS --------------------
const loginScreen = document.getElementById('login-screen');
const mainApp = document.getElementById('main-app');
const loginButton = document.getElementById('loginButton');
const logoutButton = document.getElementById('logoutButton');
const usernameInput = document.getElementById('username');
const loggedInUser = document.getElementById('loggedInUser');

const tabs = {
  text: document.getElementById('tab-text'),
  upload: document.getElementById('tab-upload'),
  admin: document.getElementById('tab-admin')
};

const analysisArea = document.getElementById('analysis-area');
const textInputArea = document.getElementById('text-input-area');
const editor = document.getElementById('editor');

const analyzeButton = document.getElementById('analyzeButton');
const resultsSection = document.getElementById('results');
const loadingSpinner = document.getElementById('loading');
const resultContent = document.getElementById('result-content');
const cidList = document.getElementById('cid-list');
const errorMessage = document.getElementById('error-message');
const fileUploadInput = document.getElementById('file-upload');
const fileNameDisplay = document.getElementById('fileName');
const uploadArea = document.getElementById('upload-area');
const adminDashboardArea = document.getElementById('admin-dashboard-area');

// -------------------- DASHBOARD REFS --------------------
const adminWelcomeName = document.getElementById('adminWelcomeName');
const filterMedico = document.getElementById('filterMedico');
const filterPeriodo = document.getElementById('filterPeriodo');
const kpiTotal = document.getElementById('kpi-total');
const kpiUnicos = document.getElementById('kpi-unicos');
const kpiAcc = document.getElementById('kpi-acc');
const cidFreqBody = document.getElementById('cidFreqBody');
const btnExportDashboard = document.getElementById('btn-export-dashboard');

// -------------------- ESTADO --------------------
let cidDescriptions = {};

// ====== DADOS FICTÍCIOS P/ DASHBOARD (preenche de verdade!) ======
const DASH_MEDICOS = ['Todos os Médicos', 'Dra. Ana', 'Dr. Bruno', 'Dra. Carla'];

const DASH_DATASETS = {
  'Últimos 7 dias': [
    { cid: 'S06.0', desc: 'Concussão', freq: 60 },
    { cid: 'I10', desc: 'Hipertensão essencial', freq: 50 },
    { cid: 'Lupus', desc: 'Lúpus Eritematoso Sistêmico', freq: 45 },
    { cid: 'I21.9', desc: 'Infarto agudo do miocárdio', freq: 40 },
    { cid: 'J18.9', desc: 'Pneumonia', freq: 35 },
    { cid: 'M81.0', desc: 'Osteoporose pós-menopausa', freq: 30 },
    { cid: 'E11', desc: 'Diabetes mellitus tipo 2', freq: 25 },
    { cid: 'R51', desc: 'Cefaleia', freq: 22 },
    { cid: 'G40.9', desc: 'Epilepsia', freq: 20 }
  ],
  'Últimos 30 dias': [
    { cid: 'S06.0', desc: 'Concussão', freq: 180 },
    { cid: 'I10', desc: 'Hipertensão essencial', freq: 150 },
    { cid: 'Lupus', desc: 'Lúpus Eritematoso Sistêmico', freq: 135 },
    { cid: 'I21.9', desc: 'Infarto agudo do miocárdio', freq: 120 },
    { cid: 'J18.9', desc: 'Pneumonia', freq: 110 },
    { cid: 'M81.0', desc: 'Osteoporose pós-menopausa', freq: 96 },
    { cid: 'E11', desc: 'Diabetes mellitus tipo 2', freq: 80 },
    { cid: 'R51', desc: 'Cefaleia', freq: 70 },
    { cid: 'G40.9', desc: 'Epilepsia', freq: 61 }
  ],
  'Últimos 90 dias': [
    { cid: 'S06.0', desc: 'Concussão', freq: 520 },
    { cid: 'I10', desc: 'Hipertensão essencial', freq: 480 },
    { cid: 'Lupus', desc: 'Lúpus Eritematoso Sistêmico', freq: 440 },
    { cid: 'I21.9', desc: 'Infarto agudo do miocárdio', freq: 420 },
    { cid: 'J18.9', desc: 'Pneumonia', freq: 395 },
    { cid: 'M81.0', desc: 'Osteoporose pós-menopausa', freq: 360 },
    { cid: 'E11', desc: 'Diabetes mellitus tipo 2', freq: 330 },
    { cid: 'R51', desc: 'Cefaleia', freq: 300 },
    { cid: 'G40.9', desc: 'Epilepsia', freq: 280 }
  ]
};

// -------------------- BOOT --------------------
document.addEventListener('DOMContentLoaded', () => {
  loadCidDescriptions();
  initializeApp();
});

async function loadCidDescriptions() {
  try {
    const resp = await fetch('./cids.json');
    if (!resp.ok) throw new Error('Não foi possível carregar cids.json');
    cidDescriptions = await resp.json();
  } catch (err) {
    console.error(err);
    showError('Erro ao carregar dados essenciais (cids.json).');
  }
}

function initializeApp() {
  setupDefaultText();
  setupEventListeners();
  seedMedicos();
  if (adminWelcomeName && loggedInUser) {
    adminWelcomeName.textContent = loggedInUser.textContent || 'Admin';
  }
}

// -------------------- EVENTOS --------------------
function setupEventListeners() {
  loginButton?.addEventListener('click', handleLogin);
  logoutButton?.addEventListener('click', handleLogout);

  Object.entries(tabs).forEach(([name, btn]) => {
    btn?.addEventListener('click', () => switchTab(name));
  });

  analyzeButton?.addEventListener('click', analyzeNote);
  fileUploadInput?.addEventListener('change', handleFileUpload);
  cidList?.addEventListener('click', handleValidation);

  filterMedico?.addEventListener('change', renderDashboard);
  filterPeriodo?.addEventListener('change', renderDashboard);
  btnExportDashboard?.addEventListener('click', exportDashboardCsv);
}

// -------------------- LOGIN / NAVEGAÇÃO --------------------
function handleLogin() {
  const username = usernameInput?.value.trim();
  if (!username) return;
  if (loggedInUser) loggedInUser.textContent = username;
  loginScreen?.classList.add('hidden');
  mainApp?.classList.remove('hidden');
  switchTab('text');
}
function handleLogout(e) {
  e.preventDefault();
  mainApp?.classList.add('hidden');
  loginScreen?.classList.remove('hidden');
}
function switchTab(tabName) {
  Object.values(tabs).forEach(b => b?.classList.remove('active'));
  tabs[tabName]?.classList.add('active');

  analysisArea?.classList.toggle('hidden', tabName === 'admin');
  adminDashboardArea?.classList.toggle('hidden', tabName !== 'admin');
  textInputArea?.classList.toggle('hidden', tabName !== 'text');
  uploadArea?.classList.toggle('hidden', tabName !== 'upload');

  resetUI();

  // Re-render do texto (sem highlight) no alvo correto
  renderHighlightedText(getNoteTextRaw(), []);

  if (tabName === 'admin') renderDashboard();
}

// -------------------- TEXTO DEMO --------------------
function setupDefaultText() {
  const demo =
    'Lactente com 9 meses, previamente hígido, iniciou quadro de coriza e tosse seca há 4 dias. ' +
    'Evoluiu com piora do padrão respiratório, taquipneia, gemência e tiragem subcostal. ' +
    'Mãe relata febre de 38.5°C e baixa aceitação alimentar. Ao exame: FR 62 irpm, sibilos ' +
    'expiratórios difusos e SpO₂ 89% em ar ambiente. Hipótese: bronquiolite viral aguda (provável VSR).';
  setNoteTextRaw(demo);
}

// -------------------- GET/SET DE TEXTO --------------------
function getNoteTextRaw() {
  if (editor) return editor.innerText || '';
  return '';
}

function setNoteTextRaw(text) {
  if (editor) editor.innerText = text ?? '';
}

// -------------------- UPLOAD --------------------
function handleFileUpload(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  fileNameDisplay && (fileNameDisplay.textContent = `Arquivo: ${file.name}`);
  const reader = new FileReader();
  reader.onload = ev => {
    const txt = ev.target.result || '';
    setNoteTextRaw(txt);
  };
  reader.readAsText(file);
}

// -------------------- PREDIÇÃO --------------------
async function analyzeNote() {
  resetUI();
  const noteText = (getNoteTextRaw() || '').trim();
  if (!noteText) return showError('Por favor, insira uma nota clínica.');

  resultsSection?.classList.remove('hidden');
  loadingSpinner?.classList.remove('hidden');

  try {
    const response = await fetch('/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clinicalNote: noteText })
    });

    if (!response.ok) {
      let msg = `Erro HTTP ${response.status}`;
      try {
        const err = await response.json();
        msg = err.details || err.error || msg;
      } catch {}
      throw new Error(msg);
    }

    const data = await response.json();
    const predictions = (data.cids || []).map(item => ({
      cid: item.cid,
      label: cidDescriptions[(item.cid || '').toUpperCase()] || 'Descrição não encontrada',
      evidence: findEvidence(noteText, item.evidencia || [])
    }));

    displayResults(predictions);
  } catch (err) {
    console.error(err);
    showError(`Erro: ${err.message}`);
  } finally {
    loadingSpinner?.classList.add('hidden');
    resultContent?.classList.remove('hidden');
  }
}

// -------------------- EVIDÊNCIA / HIGHLIGHT --------------------
function findEvidence(originalText, terms) {
  const lowerText = (originalText || '').toLowerCase();
  const ev = new Set();
  (terms || []).forEach(term => {
    const t = String(term || '').toLowerCase();
    if (!t.trim()) return;
    let i = -1;
    while ((i = lowerText.indexOf(t, i + 1)) !== -1) {
      ev.add(JSON.stringify({
        start: i,
        end: i + t.length,
        text: originalText.slice(i, i + t.length)
      }));
    }
  });
  return Array.from(ev).map(x => JSON.parse(x)).sort((a, b) => a.start - b.start);
}

function renderHighlightedText(text, evidences = []) {
  if (editor) {
    if (!evidences || evidences.length === 0) {
      editor.innerHTML = escapeHtml(text || '');
      return;
    }
    let html = '';
    let last = 0;
    for (const e of evidences) {
      html += escapeHtml(String(text).slice(last, e.start));
      html += `<span class="highlight">${escapeHtml(String(text).slice(e.start, e.end))}</span>`;
      last = e.end;
    }
    html += escapeHtml(String(text).slice(last));
    editor.innerHTML = html;
  }
}

// -------------------- RESULTADOS / VALIDAÇÃO --------------------
function displayResults(predictions) {
  if (!cidList) return;
  cidList.innerHTML = '';

  (predictions || []).forEach(pred => {
    const li = document.createElement('li');
    li.className = 'cid-item border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors';
    li.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex-grow">
          <p class="font-semibold text-gray-900">${escapeHtml(pred.cid)} — ${escapeHtml(pred.label)}</p>
          <div class="text-xs text-gray-500 mt-2">
            <span class="font-medium">Evidências:</span>
            ${(pred.evidence || []).map(e => `<span class="italic">"${escapeHtml(e.text)}"</span>`).join(' • ')}
          </div>
        </div>
        <div class="flex-shrink-0 ml-4 flex items-center space-x-2">
          <button class="validation-btn" data-cid="${escapeHtml(pred.cid)}" data-validation="correct">Correto</button>
          <button class="validation-btn" data-cid="${escapeHtml(pred.cid)}" data-validation="incorrect">Incorreto</button>
        </div>
      </div>
    `;

    li.addEventListener('mouseenter', () => {
      renderHighlightedText(getNoteTextRaw(), pred.evidence || []);
    });
    li.addEventListener('mouseleave', () => {
      renderHighlightedText(getNoteTextRaw(), []);
    });

    cidList.appendChild(li);
  });

  resultContent?.classList.remove('hidden');
}

function handleValidation(e) {
  const btn = e.target.closest('.validation-btn');
  if (!btn) return;
  const validation = btn.dataset.validation;
  btn.parentElement?.querySelectorAll('.validation-btn').forEach(b => (b.disabled = true));
  btn.classList.add(validation === 'correct' ? 'correct' : 'incorrect');
}

// -------------------- DASHBOARD --------------------
function seedMedicos() {
  if (!filterMedico || filterMedico.options.length > 1) return;
  DASH_MEDICOS.slice(1).forEach(m => {
    const opt = document.createElement('option');
    opt.textContent = m;
    filterMedico.appendChild(opt);
  });
}

function renderDashboard() {
  if (!filterPeriodo || !filterMedico || !cidFreqBody) return;

  const periodo = filterPeriodo.value || 'Últimos 30 dias';
  const medico = filterMedico.value || 'Todos os Médicos';
  const data = (DASH_DATASETS[periodo] || []).map(d => ({ ...d }));

  const factor = medico === 'Todos os Médicos' ? 1.0 : 0.9 + Math.random() * 0.2;
  data.forEach(d => (d.adj = Math.max(1, Math.round(d.freq * factor))));

  const total = data.reduce((s, d) => s + d.adj, 0);
  const unicos = data.length;
  const acc = (92 + Math.random() * 6).toFixed(1) + '%';

  if (kpiTotal) kpiTotal.textContent = total;
  if (kpiUnicos) kpiUnicos.textContent = unicos;
  if (kpiAcc) kpiAcc.textContent = acc;

  data.sort((a, b) => b.adj - a.adj);

  cidFreqBody.innerHTML = data
    .map(d => {
      const pct = total ? (d.adj / total) * 100 : 0;
      return `
        <tr class="border-b border-slate-100">
          <td class="py-3 pr-3 font-medium text-slate-800">${d.cid}</td>
          <td class="py-3 pr-3 text-slate-700">${escapeHtml(d.desc)}</td>
          <td class="py-3 pr-3 w-48">
            <div class="text-slate-600 mb-1">${d.adj}</div>
            <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div class="h-2 bg-blue-600" style="width:${pct.toFixed(1)}%"></div>
            </div>
          </td>
          <td class="py-3 pl-3 text-right font-semibold text-slate-800">${pct.toFixed(1)}%</td>
        </tr>`;
    })
    .join('');
}

function exportDashboardCsv() {
  if (!cidFreqBody || !filterPeriodo || !filterMedico) return;
  const periodo = filterPeriodo.value;
  const medico = filterMedico.value;

  const rows = [
    ['Período', periodo],
    ['Médico', medico],
    [],
    ['CID', 'Descrição', 'Frequência', '% do total']
  ];

  Array.from(cidFreqBody.querySelectorAll('tr')).forEach(tr => {
    const tds = tr.querySelectorAll('td');
    const cid = tds[0].textContent.trim();
    const desc = tds[1].textContent.trim();
    const freq = tds[2].querySelector('div').textContent.trim();
    const pct = tds[3].textContent.trim();
    rows.push([cid, desc, freq, pct]);
  });

  const csv = rows
    .map(r => r.map(c => (/[",;\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(';'))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'dashboard_codificacao.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// -------------------- UTILS --------------------
function resetUI() {
  resultsSection?.classList.add('hidden');
  loadingSpinner?.classList.add('hidden');
  errorMessage?.classList.add('hidden');
  resultContent?.classList.add('hidden');
  if (cidList) cidList.innerHTML = '';
}
function showError(msg) {
  if (!errorMessage) return;
  errorMessage.textContent = msg;
  errorMessage.classList.remove('hidden');
}
function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',''':'&#39;'
  })[m]);
}
