/**
 * Knowledge Hub Service
 * Handles PDF upload, processing, and page gallery display
 */

import { DOMUtils } from '../utils/domUtils.js';
import { Utils } from '../utils/helpers.js';
import { getUnifiedNotificationManager } from './unifiedNotificationManager.js';

export class KnowledgeHubService {
    constructor() {
        this.elements = {};
        this.currentDocument = null;
        this.documents = new Map();
        this.notificationManager = getUnifiedNotificationManager();

        // Initialize elements and event listeners
        this.initializeElements();
        this.bindEvents();

        // Load existing documents from localStorage
        this.loadDocuments();

        console.log('[KnowledgeHub] Service initialized');
    }

    /**
     * Initialize DOM elements
     */
    initializeElements() {
        this.elements = {
            // Modal elements
            modal: DOMUtils.getElementById('knowledgeHubModal'),
            closeBtn: DOMUtils.querySelector('#knowledgeHubModal .closeModal'),

            // Upload section
            uploadSection: DOMUtils.getElementById('uploadSection'),
            uploadArea: DOMUtils.getElementById('uploadArea'),
            fileInput: DOMUtils.getElementById('pdfFileInput'),
            browseButton: DOMUtils.getElementById('browseButton'),
            uploadProgress: DOMUtils.getElementById('uploadProgress'),
            progressFill: DOMUtils.getElementById('progressFill'),
            progressText: DOMUtils.getElementById('progressText'),

            // Gallery section
            gallerySection: DOMUtils.getElementById('gallerySection'),
            documentTitle: DOMUtils.getElementById('documentTitle'),
            pageGallery: DOMUtils.getElementById('pageGallery'),
            backToUploadBtn: DOMUtils.getElementById('backToUpload'),
            deleteDocumentBtn: DOMUtils.getElementById('deleteDocument'),

            // Library section
            librarySection: DOMUtils.getElementById('librarySection'),
            documentList: DOMUtils.getElementById('documentList')
        };
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Modal close events
        if (this.elements.closeBtn) {
            this.elements.closeBtn.addEventListener('click', () => this.hideModal());
        }

        // Click outside modal to close
        if (this.elements.modal) {
            this.elements.modal.addEventListener('click', (e) => {
                if (e.target === this.elements.modal) {
                    this.hideModal();
                }
            });
        }

        // File input and upload events
        if (this.elements.fileInput) {
            this.elements.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }

        if (this.elements.browseButton) {
            this.elements.browseButton.addEventListener('click', () => this.elements.fileInput?.click());
        }

        // Drag and drop events
        if (this.elements.uploadArea) {
            this.elements.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
            this.elements.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            this.elements.uploadArea.addEventListener('drop', (e) => this.handleFileDrop(e));
        }

        // Gallery navigation events
        if (this.elements.backToUploadBtn) {
            this.elements.backToUploadBtn.addEventListener('click', () => this.showUploadSection());
        }

        if (this.elements.deleteDocumentBtn) {
            this.elements.deleteDocumentBtn.addEventListener('click', () => this.deleteCurrentDocument());
        }

        // ESC key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isModalVisible()) {
                this.hideModal();
            }
        });
    }

    /**
     * Show the Knowledge Hub modal
     */
    showModal() {
        if (this.elements.modal) {
            this.elements.modal.classList.add('show');
            this.elements.modal.setAttribute('aria-hidden', 'false');

            // Update document library
            this.updateDocumentLibrary();

            // Show upload section by default
            this.showUploadSection();

            console.log('[KnowledgeHub] Modal opened');
        }
    }

    /**
     * Hide the Knowledge Hub modal
     */
    hideModal() {
        if (this.elements.modal) {
            this.elements.modal.classList.remove('show');
            this.elements.modal.setAttribute('aria-hidden', 'true');

            // Reset states
            this.hideUploadProgress();
            this.currentDocument = null;

            console.log('[KnowledgeHub] Modal closed');
        }
    }

    /**
     * Check if modal is visible
     */
    isModalVisible() {
        return this.elements.modal?.classList.contains('show') || false;
    }

    /**
     * Handle file selection from file input
     */
    async handleFileSelect(event) {
        const files = event.target.files;
        if (files && files.length > 0) {
            await this.processFile(files[0]);
        }
    }

    /**
     * Handle drag over event
     */
    handleDragOver(event) {
        event.preventDefault();
        event.stopPropagation();

        if (this.elements.uploadSection) {
            this.elements.uploadSection.classList.add('dragover');
        }
    }

    /**
     * Handle drag leave event
     */
    handleDragLeave(event) {
        event.preventDefault();
        event.stopPropagation();

        if (this.elements.uploadSection) {
            this.elements.uploadSection.classList.remove('dragover');
        }
    }

    /**
     * Handle file drop event
     */
    async handleFileDrop(event) {
        event.preventDefault();
        event.stopPropagation();

        if (this.elements.uploadSection) {
            this.elements.uploadSection.classList.remove('dragover');
        }

        const files = event.dataTransfer.files;
        if (files && files.length > 0) {
            const file = files[0];
            if (file.type === 'application/pdf') {
                await this.processFile(file);
            } else {
                this.notificationManager.show('warning', 'Please upload a PDF file only.');
            }
        }
    }

    /**
     * Process uploaded PDF file
     */
    async processFile(file) {
        if (!file || file.type !== 'application/pdf') {
            this.notificationManager.show('error', 'Please select a valid PDF file.');
            return;
        }

        // Check file size (limit to 100MB to allow larger documents)
        const maxFileSize = 100 * 1024 * 1024; // 100MB
        if (file.size > maxFileSize) {
            this.notificationManager.show('error', 'PDF file is too large. Please use a file smaller than 100MB.');
            return;
        }

        console.log('[KnowledgeHub] Processing PDF file:', file.name, 'Size:', Math.round(file.size / 1024), 'KB');

        try {
            // Show progress
            this.showUploadProgress();
            this.updateProgress(10, 'Reading PDF file...');

            // Check if PDF.js is available
            if (typeof pdfjsLib === 'undefined') {
                await this.loadPDFJS();
            }

            this.updateProgress(20, 'Initializing PDF processor...');

            // Convert file to array buffer
            const arrayBuffer = await file.arrayBuffer();
            this.updateProgress(30, 'Loading PDF document...');

            // Load PDF document
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            // Check page count (limit to 2000 pages for larger documents)
            if (pdf.numPages > 2000) {
                this.notificationManager.show('error', 'PDF has too many pages. Please use a document with 2000 pages or fewer.');
                this.hideUploadProgress();
                return;
            }

            this.updateProgress(50, 'Extracting pages...');

            // Extract pages as images
            const pages = await this.extractPagesAsImages(pdf, file.name);
            this.updateProgress(90, 'Saving document...');

            // Save document
            const documentId = this.saveDocument(file.name, pages);
            this.updateProgress(100, 'Processing complete!');

            // Show gallery after a brief delay
            setTimeout(() => {
                this.showGallery(documentId);
                this.hideUploadProgress();
            }, 1000);

        } catch (error) {
            console.error('[KnowledgeHub] Error processing PDF:', error);
            this.notificationManager.show('error', 'Failed to process PDF file. Please try again.');
            this.hideUploadProgress();
        }
    }

    /**
     * Load PDF.js library dynamically
     */
    async loadPDFJS() {
        return new Promise((resolve, reject) => {
            // Check if already loaded
            if (typeof pdfjsLib !== 'undefined') {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            script.onload = () => {
                // Set worker path
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                resolve();
            };
            script.onerror = () => reject(new Error('Failed to load PDF.js'));
            document.head.appendChild(script);
        });
    }

    /**
     * Extract pages as images from PDF
     */
    async extractPagesAsImages(pdf, fileName) {
        const pages = [];
        const totalPages = pdf.numPages;

        // Adjust quality and scale based on document size
        let scale = 1.0;
        let quality = 0.7;

        if (totalPages > 100) {
            scale = 0.8; // Smaller scale for large documents
            quality = 0.6; // Lower quality for large documents
        } else if (totalPages > 50) {
            scale = 0.9;
            quality = 0.65;
        }

        console.log(`[KnowledgeHub] Processing ${totalPages} pages with scale=${scale}, quality=${quality}`);

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            try {
                this.updateProgress(
                    50 + (pageNum / totalPages) * 35,
                    `Processing page ${pageNum} of ${totalPages}...`
                );

                const page = await pdf.getPage(pageNum);
                const viewport = page.getViewport({ scale });

                // Create canvas
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                // Render page to canvas
                await page.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;

                // Convert to compressed JPEG with adaptive quality
                const imageDataUrl = canvas.toDataURL('image/jpeg', quality);

                pages.push({
                    pageNumber: pageNum,
                    imageData: imageDataUrl,
                    width: viewport.width,
                    height: viewport.height
                });

            } catch (error) {
                console.error(`[KnowledgeHub] Error processing page ${pageNum}:`, error);
            }
        }

        return pages;
    }

    /**
     * Save document to localStorage and memory
     */
    saveDocument(fileName, pages) {
        const documentId = Utils.generateId();
        const document = {
            id: documentId,
            name: fileName,
            uploadDate: new Date().toISOString(),
            pageCount: pages.length,
            pages: pages
        };

        // Save to memory first
        this.documents.set(documentId, document);

        // Try to save to localStorage with error handling
        try {
            const stored = JSON.parse(localStorage.getItem('knowledgeHub_documents') || '{}');
            stored[documentId] = document;

            // Calculate approximate size
            const dataSize = JSON.stringify(stored).length;
            const maxSize = 10 * 1024 * 1024; // 10MB localStorage limit (browser dependent)

            if (dataSize > maxSize) {
                throw new Error('Document too large for storage');
            }

            localStorage.setItem('knowledgeHub_documents', JSON.stringify(stored));

            console.log('[KnowledgeHub] Document saved:', fileName, 'Pages:', pages.length);
        } catch (error) {
            console.error('[KnowledgeHub] Error saving to localStorage:', error);

            // If storage failed, show user a warning but keep in memory
            if (error.name === 'QuotaExceededError' || error.message.includes('too large')) {
                this.notificationManager.show(
                    'warning',
                    `Document "${fileName}" loaded but could not be saved permanently due to storage limits. It will be available until you refresh the page.`
                );
            } else {
                this.notificationManager.show(
                    'warning',
                    `Document "${fileName}" loaded but could not be saved. It will be available until you refresh the page.`
                );
            }
        }

        return documentId;
    }

    /**
     * Load documents from localStorage
     */
    loadDocuments() {
        try {
            const stored = JSON.parse(localStorage.getItem('knowledgeHub_documents') || '{}');

            for (const [id, doc] of Object.entries(stored)) {
                this.documents.set(id, doc);
            }

            console.log('[KnowledgeHub] Loaded', this.documents.size, 'documents from storage');
        } catch (error) {
            console.error('[KnowledgeHub] Error loading documents:', error);
        }
    }

    /**
     * Show upload progress
     */
    showUploadProgress() {
        if (this.elements.uploadProgress) {
            this.elements.uploadProgress.style.display = 'block';
        }
    }

    /**
     * Hide upload progress
     */
    hideUploadProgress() {
        if (this.elements.uploadProgress) {
            this.elements.uploadProgress.style.display = 'none';
        }
        this.updateProgress(0, '');
    }

    /**
     * Update progress bar
     */
    updateProgress(percentage, text) {
        if (this.elements.progressFill) {
            this.elements.progressFill.style.width = `${percentage}%`;
        }
        if (this.elements.progressText) {
            this.elements.progressText.textContent = text;
        }
    }

    /**
     * Show upload section
     */
    showUploadSection() {
        if (this.elements.uploadSection) {
            this.elements.uploadSection.style.display = 'block';
        }
        if (this.elements.gallerySection) {
            this.elements.gallerySection.style.display = 'none';
        }
    }

    /**
     * Show gallery for a document
     */
    showGallery(documentId) {
        const document = this.documents.get(documentId);
        if (!document) {
            console.error('[KnowledgeHub] Document not found:', documentId);
            return;
        }

        this.currentDocument = document;

        // Update title
        if (this.elements.documentTitle) {
            this.elements.documentTitle.textContent = `${document.name} (${document.pages.length} pages)`;
        }

        // Generate gallery
        this.generatePageGallery(document.pages);

        // Show gallery section
        if (this.elements.uploadSection) {
            this.elements.uploadSection.style.display = 'none';
        }
        if (this.elements.gallerySection) {
            this.elements.gallerySection.style.display = 'block';
        }

        console.log('[KnowledgeHub] Showing gallery for:', document.name);
    }

    /**
     * Generate page gallery
     */
    generatePageGallery(pages) {
        if (!this.elements.pageGallery) return;

        // Clear existing pages
        this.elements.pageGallery.innerHTML = '';

        pages.forEach((page, index) => {
            const pageItem = DOMUtils.createElement('div', { className: 'page-item' });

            const img = DOMUtils.createElement('img');
            img.src = page.imageData;
            img.alt = `Page ${page.pageNumber}`;
            img.loading = 'lazy';

            const pageNumber = DOMUtils.createElement('div', { className: 'page-number' });
            pageNumber.textContent = `Page ${page.pageNumber}`;

            pageItem.appendChild(img);
            pageItem.appendChild(pageNumber);

            // Click to enlarge
            pageItem.addEventListener('click', () => {
                this.enlargePage(page);
            });

            this.elements.pageGallery.appendChild(pageItem);
        });
    }

    /**
     * Enlarge page in image modal
     */
    enlargePage(page) {
        const imageModal = DOMUtils.getElementById('imageModal');
        const enlargedImage = DOMUtils.getElementById('enlargedImage');

        if (imageModal && enlargedImage) {
            enlargedImage.src = page.imageData;
            enlargedImage.alt = `Page ${page.pageNumber}`;
            imageModal.classList.add('show');
            imageModal.setAttribute('aria-hidden', 'false');

            console.log('[KnowledgeHub] Enlarged page:', page.pageNumber);
        }
    }

    /**
     * Delete current document
     */
    deleteCurrentDocument() {
        if (!this.currentDocument) return;

        const confirmDelete = confirm(`Are you sure you want to delete "${this.currentDocument.name}"?`);
        if (!confirmDelete) return;

        try {
            // Remove from memory
            this.documents.delete(this.currentDocument.id);

            // Remove from localStorage
            const stored = JSON.parse(localStorage.getItem('knowledgeHub_documents') || '{}');
            delete stored[this.currentDocument.id];
            localStorage.setItem('knowledgeHub_documents', JSON.stringify(stored));

            this.notificationManager.show('success', `Document "${this.currentDocument.name}" deleted successfully.`);

            // Go back to upload section
            this.showUploadSection();
            this.updateDocumentLibrary();

            console.log('[KnowledgeHub] Document deleted:', this.currentDocument.name);
            this.currentDocument = null;

        } catch (error) {
            console.error('[KnowledgeHub] Error deleting document:', error);
            this.notificationManager.show('error', 'Failed to delete document.');
        }
    }

    /**
     * Update document library display
     */
    updateDocumentLibrary() {
        if (!this.elements.documentList) return;

        // Clear existing list
        this.elements.documentList.innerHTML = '';

        // Add storage usage indicator
        this.addStorageUsageIndicator();

        if (this.documents.size === 0) {
            const emptyMessage = DOMUtils.createElement('div');
            emptyMessage.textContent = 'No documents uploaded yet.';
            emptyMessage.style.color = '#64748b';
            emptyMessage.style.fontStyle = 'italic';
            emptyMessage.style.textAlign = 'center';
            emptyMessage.style.padding = '20px';
            this.elements.documentList.appendChild(emptyMessage);
            return;
        }

        // Sort documents by upload date (newest first)
        const sortedDocs = Array.from(this.documents.values())
            .sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));

        sortedDocs.forEach(doc => {
            const docItem = DOMUtils.createElement('div', { className: 'document-item' });

            const docInfo = DOMUtils.createElement('div', { className: 'document-info' });

            const docName = DOMUtils.createElement('div', { className: 'document-name' });
            docName.textContent = doc.name;

            const docMeta = DOMUtils.createElement('div', { className: 'document-meta' });
            const uploadDate = new Date(doc.uploadDate).toLocaleDateString();
            docMeta.textContent = `${doc.pageCount} pages • Uploaded ${uploadDate}`;

            docInfo.appendChild(docName);
            docInfo.appendChild(docMeta);

            const docActions = DOMUtils.createElement('div', { className: 'document-actions' });

            const viewBtn = DOMUtils.createElement('button', { className: 'btn btn-primary' });
            viewBtn.textContent = 'View';
            viewBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showGallery(doc.id);
            });

            const deleteBtn = DOMUtils.createElement('button', { className: 'btn btn-danger' });
            deleteBtn.textContent = 'Delete';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteDocumentById(doc.id);
            });

            docActions.appendChild(viewBtn);
            docActions.appendChild(deleteBtn);

            docItem.appendChild(docInfo);
            docItem.appendChild(docActions);

            // Click on item to view
            docItem.addEventListener('click', () => {
                this.showGallery(doc.id);
            });

            this.elements.documentList.appendChild(docItem);
        });
    }

    /**
     * Delete document by ID
     */
    deleteDocumentById(documentId) {
        const document = this.documents.get(documentId);
        if (!document) return;

        const confirmDelete = confirm(`Are you sure you want to delete "${document.name}"?`);
        if (!confirmDelete) return;

        try {
            // Remove from memory
            this.documents.delete(documentId);

            // Remove from localStorage
            const stored = JSON.parse(localStorage.getItem('knowledgeHub_documents') || '{}');
            delete stored[documentId];
            localStorage.setItem('knowledgeHub_documents', JSON.stringify(stored));

            this.notificationManager.show('success', `Document "${document.name}" deleted successfully.`);

            // Update library display
            this.updateDocumentLibrary();

            // If this was the current document, go back to upload
            if (this.currentDocument && this.currentDocument.id === documentId) {
                this.showUploadSection();
                this.currentDocument = null;
            }

            console.log('[KnowledgeHub] Document deleted:', document.name);

        } catch (error) {
            console.error('[KnowledgeHub] Error deleting document:', error);
            this.notificationManager.show('error', 'Failed to delete document.');
        }
    }

    /**
     * Get all documents
     */
    getDocuments() {
        return Array.from(this.documents.values());
    }

    /**
     * Get document by ID
     */
    getDocument(documentId) {
        return this.documents.get(documentId);
    }

    /**
     * Add storage usage indicator
     */
    addStorageUsageIndicator() {
        try {
            // Calculate storage usage
            const stored = localStorage.getItem('knowledgeHub_documents') || '{}';
            const currentSize = new Blob([stored]).size;
            const maxSize = 10 * 1024 * 1024; // 10MB localStorage estimate
            const usagePercent = Math.round((currentSize / maxSize) * 100);

            const usageIndicator = DOMUtils.createElement('div', {
                className: 'storage-usage-indicator',
                style: 'margin-bottom: 16px; padding: 12px; background: #f0f9ff; border-radius: 6px; border: 1px solid #e0f2fe;'
            });

            const usageText = DOMUtils.createElement('div', {
                style: 'font-size: 12px; color: #0369a1; margin-bottom: 6px; font-weight: 500;'
            });
            usageText.textContent = `Storage Usage: ${Math.round(currentSize / 1024)}KB / ~10MB (${usagePercent}%)`;

            const progressBar = DOMUtils.createElement('div', {
                style: 'width: 100%; height: 4px; background: #e0f2fe; border-radius: 2px; overflow: hidden;'
            });

            const progressFill = DOMUtils.createElement('div', {
                style: `width: ${Math.min(usagePercent, 100)}%; height: 100%; background: ${usagePercent > 80 ? '#dc2626' : usagePercent > 60 ? '#ea580c' : '#0369a1'}; transition: width 0.3s ease;`
            });

            progressBar.appendChild(progressFill);
            usageIndicator.appendChild(usageText);
            usageIndicator.appendChild(progressBar);

            if (usagePercent > 80) {
                const warningText = DOMUtils.createElement('div', {
                    style: 'font-size: 11px; color: #dc2626; margin-top: 4px;'
                });
                warningText.textContent = 'Storage nearly full. Consider deleting old documents.';
                usageIndicator.appendChild(warningText);
            }

            this.elements.documentList.appendChild(usageIndicator);

        } catch (error) {
            console.warn('[KnowledgeHub] Could not calculate storage usage:', error);
        }
    }

    /**
     * Clear all documents
     */
    clearAllDocuments() {
        const confirmClear = confirm('Are you sure you want to delete all documents? This action cannot be undone.');
        if (!confirmClear) return;

        try {
            this.documents.clear();
            localStorage.removeItem('knowledgeHub_documents');

            this.notificationManager.show('success', 'All documents deleted successfully.');
            this.updateDocumentLibrary();
            this.showUploadSection();
            this.currentDocument = null;

            console.log('[KnowledgeHub] All documents cleared');

        } catch (error) {
            console.error('[KnowledgeHub] Error clearing documents:', error);
            this.notificationManager.show('error', 'Failed to clear documents.');
        }
    }
}

// Export singleton instance
let knowledgeHubInstance = null;

export function getKnowledgeHub() {
    if (!knowledgeHubInstance) {
        knowledgeHubInstance = new KnowledgeHubService();
    }
    return knowledgeHubInstance;
}
