// PDF Handler Module
class PDFHandler {
    constructor() {
        this.currentDoc = null;
        this.currentPage = 1;
        this.totalPages = 0;
        this.scale = 1.5;
        this.extractedText = '';
    }

    async loadPDF(file) {
        try {
            const arrayBuffer = await this.fileToArrayBuffer(file);
            const typedArray = new Uint8Array(arrayBuffer);
            
            this.currentDoc = await pdfjsLib.getDocument(typedArray).promise;
            this.totalPages = this.currentDoc.numPages;
            this.currentPage = 1;
            
            // Extract text from all pages
            await this.extractAllText();
            
            return {
                success: true,
                pages: this.totalPages,
                text: this.extractedText
            };
        } catch (error) {
            console.error('Erro ao carregar PDF:', error);
            return {
                success: false,
                error: 'Erro ao processar o arquivo PDF'
            };
        }
    }

    async extractAllText() {
        let fullText = '';
        
        for (let pageNum = 1; pageNum <= this.totalPages; pageNum++) {
            try {
                const page = await this.currentDoc.getPage(pageNum);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + '\n\n';
            } catch (error) {
                console.error(`Erro ao extrair texto da página ${pageNum}:`, error);
            }
        }
        
        this.extractedText = fullText.trim();
        return this.extractedText;
    }

    async renderPage(pageNum, canvas) {
        if (!this.currentDoc || pageNum < 1 || pageNum > this.totalPages) {
            return false;
        }

        try {
            const page = await this.currentDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: this.scale });
            
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };
            
            await page.render(renderContext).promise;
            this.currentPage = pageNum;
            
            return true;
        } catch (error) {
            console.error('Erro ao renderizar página:', error);
            return false;
        }
    }

    fileToArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsArrayBuffer(file);
        });
    }

    // Extract metadata from PDF
    async getMetadata() {
        if (!this.currentDoc) return null;
        
        try {
            const metadata = await this.currentDoc.getMetadata();
            return {
                title: metadata.info.Title || 'Sem título',
                author: metadata.info.Author || 'Autor desconhecido',
                subject: metadata.info.Subject || '',
                creator: metadata.info.Creator || '',
                producer: metadata.info.Producer || '',
                creationDate: metadata.info.CreationDate || null,
                modDate: metadata.info.ModDate || null,
                pages: this.totalPages
            };
        } catch (error) {
            console.error('Erro ao obter metadados:', error);
            return null;
        }
    }

    // Search for text in PDF
    async searchText(searchTerm) {
        if (!this.extractedText || !searchTerm) return [];
        
        const results = [];
        const text = this.extractedText.toLowerCase();
        const term = searchTerm.toLowerCase();
        
        let index = text.indexOf(term);
        while (index !== -1) {
            const start = Math.max(0, index - 50);
            const end = Math.min(text.length, index + term.length + 50);
            const context = this.extractedText.substring(start, end);
            
            results.push({
                index: index,
                context: context,
                highlight: searchTerm
            });
            
            index = text.indexOf(term, index + 1);
        }
        
        return results;
    }

    // Validate PDF file
    static validatePDFFile(file) {
        const errors = [];
        
        if (!file) {
            errors.push('Nenhum arquivo selecionado');
            return { valid: false, errors };
        }
        
        if (file.type !== 'application/pdf') {
            errors.push('Arquivo deve ser do tipo PDF');
        }
        
        // Check file size (max 10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            errors.push('Arquivo muito grande. Tamanho máximo: 10MB');
        }
        
        if (file.size === 0) {
            errors.push('Arquivo está vazio');
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    // Convert PDF pages to images
    async convertToImages(quality = 1.5) {
        if (!this.currentDoc) return [];
        
        const images = [];
        
        for (let pageNum = 1; pageNum <= this.totalPages; pageNum++) {
            try {
                const page = await this.currentDoc.getPage(pageNum);
                const viewport = page.getViewport({ scale: quality });
                
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                
                await page.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;
                
                const imageData = canvas.toDataURL('image/png');
                images.push({
                    page: pageNum,
                    dataUrl: imageData,
                    width: canvas.width,
                    height: canvas.height
                });
            } catch (error) {
                console.error(`Erro ao converter página ${pageNum}:`, error);
            }
        }
        
        return images;
    }
}

// Enhanced file upload handler
class FileUploadHandler {
    constructor() {
        this.pdfHandler = new PDFHandler();
        this.uploadedFiles = new Map();
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        this.allowedTypes = ['application/pdf', 'text/plain'];
    }

    async processFile(file) {
        const validation = this.validateFile(file);
        if (!validation.valid) {
            throw new Error(validation.errors.join(', '));
        }

        const fileId = this.generateFileId();
        const fileInfo = {
            id: fileId,
            name: file.name,
            size: file.size,
            type: file.type,
            uploadDate: new Date(),
            processed: false,
            text: '',
            metadata: null
        };

        try {
            if (file.type === 'application/pdf') {
                const result = await this.pdfHandler.loadPDF(file);
                if (result.success) {
                    fileInfo.text = result.text;
                    fileInfo.metadata = await this.pdfHandler.getMetadata();
                    fileInfo.processed = true;
                } else {
                    throw new Error(result.error);
                }
            } else if (file.type === 'text/plain') {
                fileInfo.text = await this.readTextFile(file);
                fileInfo.processed = true;
            }

            this.uploadedFiles.set(fileId, fileInfo);
            return fileInfo;
        } catch (error) {
            throw new Error(`Erro ao processar arquivo: ${error.message}`);
        }
    }

    validateFile(file) {
        const errors = [];

        if (!file) {
            errors.push('Nenhum arquivo selecionado');
            return { valid: false, errors };
        }

        if (!this.allowedTypes.includes(file.type)) {
            errors.push('Tipo de arquivo não suportado. Use apenas PDF ou TXT');
        }

        if (file.size > this.maxFileSize) {
            errors.push(`Arquivo muito grande. Tamanho máximo: ${this.formatFileSize(this.maxFileSize)}`);
        }

        if (file.size === 0) {
            errors.push('Arquivo está vazio');
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    readTextFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Erro ao ler arquivo de texto'));
            reader.readAsText(file, 'UTF-8');
        });
    }

    generateFileId() {
        return 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getFile(fileId) {
        return this.uploadedFiles.get(fileId);
    }

    getAllFiles() {
        return Array.from(this.uploadedFiles.values());
    }

    removeFile(fileId) {
        return this.uploadedFiles.delete(fileId);
    }

    searchInFiles(searchTerm) {
        const results = [];
        
        for (const file of this.uploadedFiles.values()) {
            if (file.processed && file.text) {
                const text = file.text.toLowerCase();
                const term = searchTerm.toLowerCase();
                
                if (text.includes(term)) {
                    const matches = [];
                    let index = text.indexOf(term);
                    
                    while (index !== -1) {
                        const start = Math.max(0, index - 100);
                        const end = Math.min(text.length, index + term.length + 100);
                        const context = file.text.substring(start, end);
                        
                        matches.push({
                            context: context,
                            position: index
                        });
                        
                        index = text.indexOf(term, index + 1);
                    }
                    
                    results.push({
                        file: file,
                        matches: matches
                    });
                }
            }
        }
        
        return results;
    }
}

// Export for use in main script
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PDFHandler, FileUploadHandler };
} else {
    window.PDFHandler = PDFHandler;
    window.FileUploadHandler = FileUploadHandler;
}
