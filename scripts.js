// Global variables
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

const sampleCidSuggestions = [
    { cid: 'I10', description: 'Hipertensão essencial', confidence: 92 },
    { cid: 'E11.9', description: 'Diabetes mellitus tipo 2', confidence: 87 },
    { cid: 'J44.1', description: 'DPOC com exacerbação aguda', confidence: 78 }
];

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupEventListeners();
    populateDashboardData();
    createChart();
    
    // Set PDF.js worker
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
}

function setupEventListeners() {
    // Tab navigation
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // File upload events
    const fileUpload = document.getElementById('file-upload');
    const uploadArea = document.getElementById('upload-area');
    const bulkUpload = document.getElementById('bulk-upload');
    const uploadZone = document.getElementById('upload-zone');

    if (fileUpload) {
        fileUpload.addEventListener('change', handleFileSelect);
        uploadArea.addEventListener('click', () => fileUpload.click());
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('drop', handleFileDrop);
    }

    if (bulkUpload) {
        bulkUpload.addEventListener('change', handleBulkUpload);
        uploadZone.addEventListener('click', () => bulkUpload.click());
        uploadZone.addEventListener('dragover', handleDragOver);
        uploadZone.addEventListener('drop', handleBulkFileDrop);
    }

    // Analysis button
    const analyzeBtn = document.getElementById('analyze-btn');
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', analyzeNote);
    }

    // Modal events
    const closeModal = document.querySelector('.close-modal');
    const modal = document.getElementById('pdf-modal');
    if (closeModal && modal) {
        closeModal.addEventListener('click', () => modal.classList.add('hidden'));
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.add('hidden');
        });
    }

    // PDF navigation
    const prevPage = document.getElementById('prev-page');
    const nextPage = document.getElementById('next-page');
    if (prevPage) prevPage.addEventListener('click', () => changePage(-1));
    if (nextPage) nextPage.addEventListener('click', () => changePage(1));

    // Filter events
    const doctorFilter = document.getElementById('doctor-filter');
    const periodFilter = document.getElementById('period-filter');
    if (doctorFilter) doctorFilter.addEventListener('change', updateDashboard);
    if (periodFilter) periodFilter.addEventListener('change', updateDashboard);

    // Logout button
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            alert('Logout realizado com sucesso!');
        });
    }
}

function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
}

function handleFileDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleBulkFileDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    const files = Array.from(e.dataTransfer.files);
    handleMultipleFiles(files);
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

function handleBulkUpload(e) {
    const files = Array.from(e.target.files);
    handleMultipleFiles(files);
}

function handleFile(file) {
    const fileInfo = document.getElementById('file-info');
    const clinicalNote = document.getElementById('clinical-note');

    if (file.type === 'application/pdf') {
        handlePdfFile(file);
        showFileInfo(file);
    } else if (file.type === 'text/plain') {
        const reader = new FileReader();
        reader.onload = function(e) {
            clinicalNote.value = e.target.result;
            showFileInfo(file);
        };
        reader.readAsText(file);
    } else {
        showError('Tipo de arquivo não suportado. Use apenas .txt ou .pdf');
    }
}

function handleMultipleFiles(files) {
    const uploadedFiles = document.getElementById('uploaded-files');
    uploadedFiles.innerHTML = '';

    files.forEach((file, index) => {
        if (file.type === 'application/pdf' || file.type === 'text/plain') {
            const fileItem = createFileItem(file, index);
            uploadedFiles.appendChild(fileItem);
            
            // Simulate upload progress
            simulateUpload(fileItem, index);
        }
    });
}

function createFileItem(file, index) {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.innerHTML = `
        <div class="file-info">
            <i class="fas ${file.type === 'application/pdf' ? 'fa-file-pdf' : 'fa-file-text'}"></i>
            <div class="file-details">
                <h4>${file.name}</h4>
                <p>${formatFileSize(file.size)} • ${file.type === 'application/pdf' ? 'PDF' : 'Texto'}</p>
            </div>
        </div>
        <div class="upload-progress">
            <div class="progress-bar">
                <div class="progress-fill" style="width: 0%"></div>
            </div>
            <span class="progress-text">0%</span>
        </div>
        <div class="file-actions hidden">
            <button class="action-btn" onclick="viewFile('${file.name}', '${file.type}')">
                <i class="fas fa-eye"></i> Visualizar
            </button>
            <button class="action-btn" onclick="analyzeFile('${file.name}')">
                <i class="fas fa-search"></i> Analisar
            </button>
        </div>
    `;
    return fileItem;
}

function simulateUpload(fileItem, index) {
    const progressFill = fileItem.querySelector('.progress-fill');
    const progressText = fileItem.querySelector('.progress-text');
    const fileActions = fileItem.querySelector('.file-actions');
    
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            fileActions.classList.remove('hidden');
        }
        
        progressFill.style.width = `${progress}%`;
        progressText.textContent = `${Math.round(progress)}%`;
    }, 200);
}

function handlePdfFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const typedarray = new Uint8Array(e.target.result);
        
        pdfjsLib.getDocument(typedarray).promise.then(function(pdf) {
            currentPdfDoc = pdf;
            totalPages = pdf.numPages;
            currentPageNum = 1;
            
            // Extract text from first page
            pdf.getPage(1).then(function(page) {
                page.getTextContent().then(function(textContent) {
                    const text = textContent.items.map(item => item.str).join(' ');
                    document.getElementById('clinical-note').value = text;
                });
            });
        }).catch(function(error) {
            console.error('Erro ao carregar PDF:', error);
            showError('Erro ao processar o arquivo PDF');
        });
    };
    reader.readAsArrayBuffer(file);
}

function showFileInfo(file) {
    const fileInfo = document.getElementById('file-info');
    fileInfo.innerHTML = `
        <i class="fas ${file.type === 'application/pdf' ? 'fa-file-pdf' : 'fa-file-text'}"></i>
        <span>${file.name} (${formatFileSize(file.size)})</span>
        ${file.type === 'application/pdf' ? '<button onclick="showPdfModal()" class="action-btn">Visualizar PDF</button>' : ''}
    `;
    fileInfo.classList.remove('hidden');
}

function showPdfModal() {
    if (currentPdfDoc) {
        const modal = document.getElementById('pdf-modal');
        modal.classList.remove('hidden');
        renderPage(currentPageNum);
    }
}

function renderPage(pageNum) {
    if (!currentPdfDoc) return;
    
    currentPdfDoc.getPage(pageNum).then(function(page) {
        const canvas = document.getElementById('pdf-canvas');
        const ctx = canvas.getContext('2d');
        const viewport = page.getViewport({ scale: pdfScale });
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        const renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };
        
        page.render(renderContext).promise.then(function() {
            document.getElementById('page-info').textContent = `Página ${pageNum} de ${totalPages}`;
            
            // Update navigation buttons
            document.getElementById('prev-page').disabled = pageNum <= 1;
            document.getElementById('next-page').disabled = pageNum >= totalPages;
        });
    });
}

function changePage(delta) {
    const newPageNum = currentPageNum + delta;
    if (newPageNum >= 1 && newPageNum <= totalPages) {
        currentPageNum = newPageNum;
        renderPage(currentPageNum);
    }
}

function analyzeNote() {
    const noteText = document.getElementById('clinical-note').value.trim();
    
    if (!noteText) {
        showError('Por favor, insira uma nota clínica ou faça upload de um arquivo.');
        return;
    }
    
    showLoading();
    
    // Simulate API call
    setTimeout(() => {
        hideLoading();
        showAnalysisResults();
    }, 2000);
}

function showAnalysisResults() {
    const resultsSection = document.getElementById('analysis-results');
    const cidList = document.getElementById('cid-suggestions');
    
    cidList.innerHTML = '';
    
    sampleCidSuggestions.forEach(suggestion => {
        const cidItem = document.createElement('div');
        cidItem.className = 'cid-item';
        cidItem.innerHTML = `
            <div class="cid-info">
                <h4>${suggestion.cid}</h4>
                <p>${suggestion.description}</p>
            </div>
            <div class="confidence-score">${suggestion.confidence}%</div>
        `;
        cidList.appendChild(cidItem);
    });
    
    resultsSection.classList.remove('hidden');
}

function showLoading() {
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('analysis-results').classList.add('hidden');
    document.getElementById('error-message').classList.add('hidden');
}

function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
}

function showError(message) {
    const errorElement = document.getElementById('error-message');
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
    hideLoading();
}

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
                    <div class="progress-bar" style="flex: 1; height: 6px;">
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
}

function createChart() {
    const ctx = document.getElementById('cid-chart');
    if (!ctx) return;
    
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

function updateDashboard() {
    // Simulate dashboard update based on filters
    const doctorFilter = document.getElementById('doctor-filter').value;
    const periodFilter = document.getElementById('period-filter').value;
    
    // Update metrics with simulated data
    const totalAppointments = document.getElementById('total-appointments');
    const uniqueCids = document.getElementById('unique-cids');
    const aiAccuracy = document.getElementById('ai-accuracy');
    
    if (totalAppointments) {
        const baseValue = 327;
        const multiplier = periodFilter === '30' ? 1 : periodFilter === '60' ? 1.8 : periodFilter === '90' ? 2.5 : 10;
        totalAppointments.textContent = Math.round(baseValue * multiplier);
    }
    
    if (uniqueCids) {
        const baseValue = 9;
        const multiplier = periodFilter === '30' ? 1 : periodFilter === '60' ? 1.2 : periodFilter === '90' ? 1.4 : 2;
        uniqueCids.textContent = Math.round(baseValue * multiplier);
    }
    
    if (aiAccuracy) {
        const accuracyValues = ['94.7%', '95.2%', '93.8%', '96.1%'];
        aiAccuracy.textContent = accuracyValues[Math.floor(Math.random() * accuracyValues.length)];
    }
}

// Utility functions
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function viewFile(fileName, fileType) {
    alert(`Visualizando arquivo: ${fileName}`);
}

function analyzeFile(fileName) {
    alert(`Analisando arquivo: ${fileName}`);
}

function viewCidDetails(cid) {
    const cidData = sampleCidData.find(item => item.cid === cid);
    if (cidData) {
        alert(`Detalhes do CID ${cid}:\n\nDescrição: ${cidData.description}\nFrequência: ${cidData.frequency}\nPercentual: ${cidData.percentage}%`);
    }
}

// Add some sample file items on page load for demonstration
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        const uploadedFiles = document.getElementById('uploaded-files');
        if (uploadedFiles) {
            // Add sample uploaded files for demonstration
            const sampleFiles = [
                { name: 'nota_clinica_001.pdf', size: 245760, type: 'application/pdf' },
                { name: 'exame_laboratorio.txt', size: 12800, type: 'text/plain' }
            ];
            
            sampleFiles.forEach((file, index) => {
                const fileItem = createFileItem(file, index);
                // Set as completed upload
                const progressFill = fileItem.querySelector('.progress-fill');
                const progressText = fileItem.querySelector('.progress-text');
                const fileActions = fileItem.querySelector('.file-actions');
                
                progressFill.style.width = '100%';
                progressText.textContent = '100%';
                fileActions.classList.remove('hidden');
                
                uploadedFiles.appendChild(fileItem);
            });
        }
    }, 1000);
});
