/ -------------------- ELEMENTOS --------------------
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
const clinicalNoteInput = document.getElementById('clinicalNote');
const highlightedTextDiv = document.getElementById('highlighted-text');
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

// Global variables for dashboard
let cidDescriptions = {};
let currentPdfDoc = null;
let currentPageNum = 1;
let totalPages = 0;
let pdfScale = 1.5;

// Sample data for dashboard
const sampleCidData = [
    { cid: 'S06.0', description: 'Concussão', frequency: 60, percentage: 18.3 },
    { cid: 'I10', description: 'Hipertensão essencial', frequency: 50, percentage: 15.3 },
    { cid: 'Lupus', description: 'Lúpus Eritematoso Sistêmico', frequency: 45, percentage: 13.8 },
    { cid: 'I21.9', description: 'Infarto agudo do miocárdio', frequency: 40, percentage: 12.2 },
    { cid: 'J18.9', description: 'Pneumonia', frequency: 35, percentage: 10.7 },
    { cid: 'M81.0', description: 'Osteoporose pós-menopaúsica', frequency: 30, percentage: 9.2 },
    { cid: 'E11.9', description: 'Diabetes mellitus tipo 2', frequency: 25, percentage: 7.6 },
    { cid: 'R51', description: 'Cefaleia', frequency: 22, percentage: 6.7 },
    { cid: 'G40.9', description: 'Epilepsia', frequency: 20, percentage: 6.1 }
];

// -------------------- CARREGAR DESCRIÇÕES CID --------------------
async function loadCidDescriptions() {
    try {
        const response = await fetch('./cids.json');
        if (!response.ok) throw new Error('Não foi possível carregar cids.json');
        cidDescriptions = await response.json();
        console.log('Descrições de CID carregadas!');
    } catch (error) {
        console.error(error);
        if (errorMessage) {
            errorMessage.textContent = "Erro ao carregar dados essenciais (cids.json).";
            errorMessage.classList.remove('hidden');
        }
    }
}

// -------------------- INICIALIZAÇÃO --------------------
document.addEventListener('DOMContentLoaded', function() {
    loadCidDescriptions();
    initializeApp();
});

function initializeApp() {
    setupEventListeners();
    setupDefaultText();
    populateDashboardData();
    createChart();
    
    // Set PDF.js worker if available
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
}

function setupEventListeners() {
    // Login/Logout
    if (loginButton) {
        loginButton.addEventListener('click', handleLogin);
    }
    
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }

    // Tab navigation
    Object.entries(tabs).forEach(([tabName, tabBtn]) => {
        if (tabBtn) {
            tabBtn.addEventListener('click', () => switchTab(tabName));
        }
    });

    // Analysis button
    if (analyzeButton) {
        analyzeButton.addEventListener('click', analyzeNote);
    }

    // File upload
    if (fileUploadInput) {
        fileUploadInput.addEventListener('change', handleFileUpload);
    }

    // Text input synchronization
    if (clinicalNoteInput) {
        clinicalNoteInput.addEventListener('input', () => renderHighlightedText(clinicalNoteInput.value, []));
        clinicalNoteInput.addEventListener('scroll', () => {
            if (highlightedTextDiv) {
                highlightedTextDiv.scrollTop = clinicalNoteInput.scrollTop;
            }
        });
    }

    // CID list validation events
    if (cidList) {
        cidList.addEventListener('click', handleValidation);
    }
}

function setupDefaultText() {
    const defaultClinicalNote = "Lactente com 9 meses, previamente hígido, iniciou quadro de coriza e tosse seca há 4 dias. Evoluiu com piora do padrão respiratório, taquipneia, gemência e tiragem subcostal. Mãe relata febre de 38.5°C e baixa aceitação alimentar. Ao exame: FR de 62 irpm, sibilos expiratórios difusos e saturação de O2 de 89% em ar ambiente. Hipótese de bronquiolite viral aguda, provável VSR. Internado para oxigenoterapia e hidratação venosa.";
    
    if (clinicalNoteInput) {
        clinicalNoteInput.value = defaultClinicalNote;
    }
    
    if (highlightedTextDiv) {
        highlightedTextDiv.textContent = defaultClinicalNote;
    }
}

// -------------------- AUTENTICAÇÃO E NAVEGAÇÃO --------------------
function handleLogin() {
    const username = usernameInput ? usernameInput.value.trim() : '';
    if (username) {
        if (loggedInUser) {
            loggedInUser.textContent = username;
        }
        if (loginScreen) {
            loginScreen.classList.add('hidden');
        }
        if (mainApp) {
            mainApp.classList.remove('hidden');
        }
        switchTab('text');
    }
}

function handleLogout(e) {
    e.preventDefault();
    if (mainApp) {
        mainApp.classList.add('hidden');
    }
    if (loginScreen) {
        loginScreen.classList.remove('hidden');
    }
}

function switchTab(tabName) {
    // Update tab buttons
    Object.values(tabs).forEach(btn => {
        if (btn) btn.classList.remove('active');
    });
    if (tabs[tabName]) {
        tabs[tabName].classList.add('active');
    }

    // Update content areas
    if (analysisArea) {
        analysisArea.classList.toggle('hidden', tabName === 'admin');
    }
    if (adminDashboardArea) {
        adminDashboardArea.classList.toggle('hidden', tabName !== 'admin');
    }
    if (textInputArea) {
        textInputArea.classList.toggle('hidden', tabName !== 'text');
    }
    if (uploadArea) {
        uploadArea.classList.toggle('hidden', tabName !== 'upload');
    }

    resetUI();
    if (clinicalNoteInput) {
        renderHighlightedText(clinicalNoteInput.value, []);
    }
}

// -------------------- UPLOAD DE ARQUIVO --------------------
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
        if (fileNameDisplay) {
            fileNameDisplay.textContent = `Arquivo: ${file.name}`;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            if (clinicalNoteInput) {
                clinicalNoteInput.value = e.target.result;
            }
            if (highlightedTextDiv) {
                highlightedTextDiv.textContent = e.target.result;
            }
        };
        reader.readAsText(file);
    }
}

// -------------------- ANÁLISE DE NOTA CLÍNICA --------------------
async function analyzeNote() {
    resetUI();
    
    const noteText = clinicalNoteInput ? clinicalNoteInput.value.trim() : '';
    if (!noteText) {
        showError("Por favor, insira uma nota clínica.");
        return;
    }

    if (resultsSection) {
        resultsSection.classList.remove('hidden');
    }
    if (loadingSpinner) {
        loadingSpinner.classList.remove('hidden');
    }

    try {
        const response = await fetch('/api/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clinicalNote: noteText }),
        });
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.details || err.error || `Erro HTTP ${response.status}`);
        }
        
        const data = await response.json();
        const predictions = data.cids.map(item => ({
            cid: item.cid,
            label: cidDescriptions[item.cid.toUpperCase()] || `Descrição não encontrada`,
            evidence: findEvidence(noteText, item.evidencia || []),
        }));
        
        displayResults(predictions);
    } catch (error) {
        console.error('Erro ao analisar:', error);
        showError(`Erro: ${error.message}`);
    } finally {
        if (loadingSpinner) {
            loadingSpinner.classList.add('hidden');
        }
        if (resultContent) {
            resultContent.classList.remove('hidden');
        }
    }
}

// -------------------- LÓGICA DE EVIDÊNCIA E DESTAQUE --------------------
function findEvidence(originalText, terms) {
    const lowerText = originalText.toLowerCase();
    const ev = new Set();
    
    terms.forEach(term => {
        const lowerTerm = term.toLowerCase();
        if (lowerTerm.trim() === '') return;
        
        let i = -1;
        while ((i = lowerText.indexOf(lowerTerm, i + 1)) !== -1) {
            ev.add(JSON.stringify({
                start: i, 
                end: i + lowerTerm.length,
                text: originalText.slice(i, i + lowerTerm.length)
            }));
        }
    });
    
    return Array.from(ev).map(e => JSON.parse(e)).sort((a, b) => a.start - b.start);
}

function renderHighlightedText(text, evidences) {
    if (!highlightedTextDiv) return;
    
    highlightedTextDiv.innerHTML = '';
    let lastIndex = 0;

    evidences.forEach(evidence => {
        if (evidence.start > lastIndex) {
            highlightedTextDiv.appendChild(document.createTextNode(text.substring(lastIndex, evidence.start)));
        }
        
        const span = document.createElement('span');
        span.className = 'highlight';
        span.textContent = text.substring(evidence.start, evidence.end);
        highlightedTextDiv.appendChild(span);
        lastIndex = evidence.end;
    });

    if (lastIndex < text.length) {
        highlightedTextDiv.appendChild(document.createTextNode(text.substring(lastIndex)));
    }

    // Sincronizar scroll
    if (clinicalNoteInput) {
        highlightedTextDiv.scrollTop = clinicalNoteInput.scrollTop;
    }
}

// -------------------- EXIBIR RESULTADOS --------------------
function displayResults(predictions) {
    if (!cidList) return;
    
    cidList.innerHTML = '';
    
    predictions.forEach(prediction => {
        const listItem = document.createElement('li');
        listItem.className = 'flex items-center justify-between p-3 bg-slate-50 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200';
        listItem.innerHTML = `
            <div>
                <p class="text-text-primary font-semibold">${prediction.cid} - ${prediction.label}</p>
            </div>
            <div class="flex items-center space-x-2">
                <button class="validation-btn" data-cid="${prediction.cid}" data-validation="correct">Correto</button>
                <button class="validation-btn" data-cid="${prediction.cid}" data-validation="incorrect">Incorreto</button>
            </div>
        `;
        
        // Add hover events for evidence highlighting
        listItem.addEventListener('mouseenter', () => {
            if (clinicalNoteInput) {
                renderHighlightedText(clinicalNoteInput.value, prediction.evidence);
            }
        });
        
        listItem.addEventListener('mouseleave', () => {
            if (clinicalNoteInput) {
                renderHighlightedText(clinicalNoteInput.value, []);
            }
        });
        
        cidList.appendChild(listItem);
    });
    
    if (resultContent) {
        resultContent.classList.remove('hidden');
    }
}

// -------------------- VALIDAÇÃO --------------------
function handleValidation(event) {
    if (event.target.classList.contains('validation-btn')) {
        const cid = event.target.dataset.cid;
        const validation = event.target.dataset.validation;
        
        console.log(`CID ${cid} marcado como ${validation}`);
        
        // Aqui você pode enviar essa validação para o seu backend
        // Ex: fetch('/api/validate', { method: 'POST', body: JSON.stringify({ cid, validation }) });
        
        // Desabilitar botões após a validação
        const parentDiv = event.target.closest('div');
        if (parentDiv) {
            Array.from(parentDiv.children).forEach(btn => {
                if (btn.classList.contains('validation-btn')) {
                    btn.disabled = true;
                }
            });
        }
        
        // Add visual feedback
        event.target.classList.add(validation);
    }
}

// -------------------- DASHBOARD FICTÍCIO --------------------
function populateDashboardData() {
    const tableBody = document.getElementById('cid-table-body');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    sampleCidData.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${item.cid}</strong></td>
            <td>${item.description}</td>
            <td>${item.frequency}</td>
            <td>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <div class="progress-bar" style="flex: 1; height: 8px;">
                        <div class="progress-fill" style="width: ${item.percentage}%"></div>
                    </div>
                    <span>${item.percentage}%</span>
                </div>
            </td>
            <td>
                <button class="action-btn" onclick="viewCidDetails('${item.cid}')">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
    
    // Update metrics
    updateMetrics();
}

function updateMetrics() {
    const totalAppointments = document.getElementById('total-appointments');
    const uniqueCids = document.getElementById('unique-cids');
    const aiAccuracy = document.getElementById('ai-accuracy');
    
    if (totalAppointments) totalAppointments.textContent = '327';
    if (uniqueCids) uniqueCids.textContent = '9';
    if (aiAccuracy) aiAccuracy.textContent = '94.7%';
}

function createChart() {
    const ctx = document.getElementById('cid-chart');
    if (!ctx || typeof Chart === 'undefined') return;
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sampleCidData.slice(0, 6).map(item => item.cid),
            datasets: [{
                label: 'Frequência',
                data: sampleCidData.slice(0, 6).map(item => item.frequency),
                backgroundColor: [
                    'rgba(102, 126, 234, 0.8)',
                    'rgba(240, 147, 251, 0.8)',
                    'rgba(79, 172, 254, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(245, 87, 108, 0.8)',
                    'rgba(251, 191, 36, 0.8)'
                ],
                borderColor: [
                    'rgba(102, 126, 234, 1)',
                    'rgba(240, 147, 251, 1)',
                    'rgba(79, 172, 254, 1)',
                    'rgba(16, 185, 129, 1)',
                    'rgba(245, 87, 108, 1)',
                    'rgba(251, 191, 36, 1)'
                ],
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// -------------------- UTILITÁRIOS --------------------
function resetUI() {
    if (resultsSection) resultsSection.classList.add('hidden');
    if (loadingSpinner) loadingSpinner.classList.add('hidden');
    if (errorMessage) errorMessage.classList.add('hidden');
    if (resultContent) resultContent.classList.add('hidden');
    if (cidList) cidList.innerHTML = '';
    
    if (clinicalNoteInput) {
        renderHighlightedText(clinicalNoteInput.value, []);
    }
}

function showError(message) {
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
    }
    if (loadingSpinner) {
        loadingSpinner.classList.add('hidden');
    }
}

// -------------------- FUNÇÕES GLOBAIS PARA DASHBOARD --------------------
function viewCidDetails(cid) {
    alert(`Visualizar detalhes do CID: ${cid}`);
    // Implementar lógica de visualização de detalhes
}

function updateDashboard() {
    // Simular atualização do dashboard baseada em filtros
    const doctorFilter = document.getElementById('doctor-filter');
    const periodFilter = document.getElementById('period-filter');
    
    if (doctorFilter && periodFilter) {
        console.log(`Filtros aplicados: Médico=${doctorFilter.value}, Período=${periodFilter.value}`);
        // Implementar lógica de filtros
        populateDashboardData();
    }
}

// -------------------- EVENTOS DE FILTROS --------------------
document.addEventListener('DOMContentLoaded', function() {
    const doctorFilter = document.getElementById('doctor-filter');
    const periodFilter = document.getElementById('period-filter');
    
    if (doctorFilter) {
        doctorFilter.addEventListener('change', updateDashboard);
    }
    
    if (periodFilter) {
        periodFilter.addEventListener('change', updateDashboard);
    }
});
