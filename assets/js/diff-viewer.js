/**
 * Diff Viewer Module - Handles rendering and UI interactions for diff view
 */
window.DiffViewer = {
    currentDiff: null,
    currentViewMode: 'unified',
    sidebarVisible: false,
    expandAllFiles: true, // Default to expanded
    comments: {}, // Store comments by file path and line key

    /**
     * Initialize the diff viewer
     */
    async init() {
        this.setupEventListeners();
        this.loadSampleIfRequested();
        await this.loadSharedDiffIfPresent();
        this.loadSettings();
    },

    /**
     * Set up event listeners for the diff viewer
     */
    setupEventListeners() {
        // Show diff button
        const showDiffBtn = document.getElementById('show-diff');
        if (showDiffBtn) {
            showDiffBtn.addEventListener('click', () => this.processDiff());
        }

        // Clear diff button
        const clearDiffBtn = document.getElementById('clear-diff');
        if (clearDiffBtn) {
            clearDiffBtn.addEventListener('click', () => this.clearDiff());
        }

        // Load sample button
        const loadSampleBtn = document.getElementById('load-sample');
        if (loadSampleBtn) {
            loadSampleBtn.addEventListener('click', () => this.loadSampleDiff());
        }

        // View mode selector
        const viewModeSelect = document.getElementById('view-mode');
        if (viewModeSelect) {
            viewModeSelect.addEventListener('change', (e) => {
                this.currentViewMode = e.target.value;
                if (this.currentDiff) {
                    this.renderDiff(this.currentDiff);
                }
            });
        }

        // File upload handling
        const fileInput = document.getElementById('diff-file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        }

        // Drag and drop handling
        const uploadArea = document.querySelector('.file-upload-area');
        if (uploadArea) {
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            });

            uploadArea.addEventListener('dragleave', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
            });

            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.processFile(files[0]);
                }
            });
        }

        // Copy diff button
        const copyDiffBtn = document.getElementById('copy-diff');
        if (copyDiffBtn) {
            copyDiffBtn.addEventListener('click', () => this.copyDiffToClipboard());
        }

        // Download diff button
        const downloadDiffBtn = document.getElementById('download-diff');
        if (downloadDiffBtn) {
            downloadDiffBtn.addEventListener('click', () => this.downloadDiff());
        }

        // Share diff button
        const shareDiffBtn = document.getElementById('share-diff');
        if (shareDiffBtn) {
            shareDiffBtn.addEventListener('click', () => this.showShareModal());
        }

        // Share modal event listeners
        const closeModalBtn = document.getElementById('close-modal');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => this.hideShareModal());
        }

        const copyShareUrlBtn = document.getElementById('copy-share-url');
        if (copyShareUrlBtn) {
            copyShareUrlBtn.addEventListener('click', () => this.copyShareUrl());
        }

        // Close modal when clicking outside
        const shareModal = document.getElementById('share-modal');
        if (shareModal) {
            shareModal.addEventListener('click', (e) => {
                if (e.target === shareModal) {
                    this.hideShareModal();
                }
            });
        }

        // Toggle sidebar button
        const toggleSidebarBtn = document.getElementById('toggle-sidebar');
        if (toggleSidebarBtn) {
            toggleSidebarBtn.addEventListener('click', () => this.toggleSidebar());
        }

        // Settings button and dropdown
        const settingsBtn = document.getElementById('settings-btn');
        const settingsDropdown = document.getElementById('settings-dropdown');
        
        if (settingsBtn && settingsDropdown) {
            settingsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                settingsDropdown.classList.toggle('hidden');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!settingsDropdown.contains(e.target) && !settingsBtn.contains(e.target)) {
                    settingsDropdown.classList.add('hidden');
                }
            });
        }

        // Expand all files checkbox
        const expandAllCheckbox = document.getElementById('expand-all-files');
        if (expandAllCheckbox) {
            expandAllCheckbox.addEventListener('change', (e) => {
                this.expandAllFiles = e.target.checked;
                this.saveSettings();
                if (this.currentDiff) {
                    this.renderDiff(this.currentDiff);
                }
            });
        }
    },

    /**
     * Process diff content from textarea or file
     */
    processDiff() {
        const diffInput = document.getElementById('diff-input');
        const diffContent = diffInput ? diffInput.value.trim() : '';

        if (!diffContent) {
            this.showMessage('Please paste some diff content or upload a file.', 'warning');
            return;
        }

        try {
            this.showLoadingState();
            
            // Parse the diff content
            const parsedFiles = window.DiffParser.parse(diffContent);
            const filesWithLineNumbers = window.DiffParser.calculateLineNumbers(parsedFiles);
            
            this.currentDiff = {
                files: filesWithLineNumbers,
                stats: window.DiffParser.getStats(filesWithLineNumbers),
                rawContent: diffContent
            };

            // Render the diff
            this.renderDiff(this.currentDiff);
            
        } catch (error) {
            this.showMessage('Error processing diff: ' + error.message, 'error');
        }
    },

    /**
     * Handle file upload
     */
    handleFileUpload(event) {
        const file = event.target.files[0];
        if (file) {
            this.processFile(file);
        }
    },

    /**
     * Process uploaded file
     */
    processFile(file) {
        if (!file.type.includes('text') && !file.name.match(/\.(txt|diff|patch)$/i)) {
            this.showMessage('Please upload a text file (.txt, .diff, .patch)', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            const diffInput = document.getElementById('diff-input');
            if (diffInput) {
                diffInput.value = content;
                this.processDiff();
            }
        };
        reader.readAsText(file);
    },

    /**
     * Clear all diff content
     */
    clearDiff() {
        const diffInput = document.getElementById('diff-input');
        if (diffInput) {
            diffInput.value = '';
        }

        const fileInput = document.getElementById('diff-file-input');
        if (fileInput) {
            fileInput.value = '';
        }

        this.currentDiff = null;
        this.comments = {}; // Clear all comments
        this.hideDiffOutput();
        this.showNoDiffMessage();
    },

    /**
     * Comment Management Functions
     */

    /**
     * Generate a unique key for a line comment
     */
    generateLineKey(filePath, lineType, lineNumber) {
        // Create a unique key that works for both unified and side-by-side views
        return `${filePath}:${lineType}:${lineNumber}`;
    },

    /**
     * Add or update a comment for a specific line
     */
    addComment(filePath, lineType, lineNumber, commentText, author = 'Anonymous') {
        const lineKey = this.generateLineKey(filePath, lineType, lineNumber);
        
        if (!this.comments[filePath]) {
            this.comments[filePath] = {};
        }
        
        if (!this.comments[filePath][lineKey]) {
            this.comments[filePath][lineKey] = [];
        }
        
        const comment = {
            id: Date.now() + Math.random(),
            text: commentText,
            author: author,
            timestamp: new Date().toISOString(),
            lineType: lineType,
            lineNumber: lineNumber
        };
        
        this.comments[filePath][lineKey].push(comment);
        return comment;
    },

    /**
     * Get comments for a specific line
     */
    getCommentsForLine(filePath, lineType, lineNumber) {
        const lineKey = this.generateLineKey(filePath, lineType, lineNumber);
        return this.comments[filePath]?.[lineKey] || [];
    },

    /**
     * Remove a comment by ID
     */
    removeComment(filePath, lineType, lineNumber, commentId) {
        const lineKey = this.generateLineKey(filePath, lineType, lineNumber);
        if (this.comments[filePath]?.[lineKey]) {
            this.comments[filePath][lineKey] = this.comments[filePath][lineKey].filter(
                comment => comment.id !== commentId
            );
            
            // Clean up empty arrays
            if (this.comments[filePath][lineKey].length === 0) {
                delete this.comments[filePath][lineKey];
            }
            
            // Clean up empty file objects
            if (Object.keys(this.comments[filePath]).length === 0) {
                delete this.comments[filePath];
            }
        }
    },

    /**
     * Get all comments for the current diff
     */
    getAllComments() {
        return this.comments;
    },

    /**
     * Set all comments (used when loading from URL)
     */
    setAllComments(comments) {
        this.comments = comments || {};
    },

    /**
     * Get line number for comment identification
     */
    getLineNumberForComment(line) {
        // Return the appropriate line number based on line type
        switch (line.type) {
            case 'added':
                return line.newLineNumber;
            case 'removed':
                return line.oldLineNumber;
            case 'unchanged':
                return line.oldLineNumber || line.newLineNumber;
            default:
                return null;
        }
    },

    /**
     * Render comments for a specific line
     */
    renderCommentsForLine(filePath, lineType, lineNumber) {
        const comments = this.getCommentsForLine(filePath, lineType, lineNumber);
        if (comments.length === 0) return '';
        
        let html = '<div class="comments-section">';
        
        comments.forEach(comment => {
            html += '<div class="comment-item">';
            html += `<div class="comment-header">`;
            html += `<span class="comment-author">${this.escapeHtml(comment.author)}</span>`;
            html += `<span class="comment-timestamp">${this.formatTimestamp(comment.timestamp)}</span>`;
            html += `<button class="comment-delete-btn" onclick="window.DiffViewer.deleteComment('${this.escapeHtml(filePath)}', '${lineType}', '${lineNumber}', '${comment.id}')" title="Delete comment">×</button>`;
            html += `</div>`;
            html += `<div class="comment-text">${this.escapeHtml(comment.text)}</div>`;
            html += '</div>';
        });
        
        html += '</div>';
        return html;
    },

    /**
     * Format timestamp for display
     */
    formatTimestamp(isoString) {
        const date = new Date(isoString);
        return date.toLocaleString();
    },

    /**
     * Toggle comment input visibility
     */
    toggleCommentInput(filePath, lineType, lineNumber) {
        const inputContainer = document.getElementById(`comment-input-${filePath}-${lineType}-${lineNumber}`);
        if (inputContainer) {
            const isVisible = inputContainer.style.display !== 'none';
            inputContainer.style.display = isVisible ? 'none' : 'block';
            
            if (!isVisible) {
                // Focus on textarea when showing
                const textarea = inputContainer.querySelector('.comment-textarea');
                if (textarea) {
                    textarea.focus();
                }
            }
        }
    },

    /**
     * Save a new comment
     */
    saveComment(filePath, lineType, lineNumber) {
        const inputContainer = document.getElementById(`comment-input-${filePath}-${lineType}-${lineNumber}`);
        if (inputContainer) {
            const textarea = inputContainer.querySelector('.comment-textarea');
            const commentText = textarea.value.trim();
            
            if (commentText) {
                this.addComment(filePath, lineType, lineNumber, commentText);
                textarea.value = '';
                inputContainer.style.display = 'none';
                
                // Re-render the diff to show the new comment
                this.renderCurrentDiff();
            }
        }
    },

    /**
     * Cancel comment input
     */
    cancelComment(filePath, lineType, lineNumber) {
        const inputContainer = document.getElementById(`comment-input-${filePath}-${lineType}-${lineNumber}`);
        if (inputContainer) {
            const textarea = inputContainer.querySelector('.comment-textarea');
            textarea.value = '';
            inputContainer.style.display = 'none';
        }
    },

    /**
     * Delete a comment
     */
    deleteComment(filePath, lineType, lineNumber, commentId) {
        this.removeComment(filePath, lineType, lineNumber, commentId);
        // Re-render the diff to hide the deleted comment
        this.renderCurrentDiff();
    },

    /**
     * Re-render the current diff (used after comment changes)
     */
    renderCurrentDiff() {
        if (this.currentDiff) {
            this.renderDiff(this.currentDiff);
        }
    },

    /**
     * Load sample diff for demonstration
     */
    loadSampleDiff() {
        const sampleDiff = window.DiffParser.generateSampleDiff();
        const diffInput = document.getElementById('diff-input');
        if (diffInput) {
            diffInput.value = sampleDiff;
            this.processDiff();
        }
    },

    /**
     * Load sample from URL parameter if requested
     */
    loadSampleIfRequested() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('sample') === 'true') {
            this.loadSampleDiff();
        }
    },

    /**
     * Render the parsed diff
     */
    renderDiff(diffData) {
        if (!diffData || !diffData.files || diffData.files.length === 0) {
            this.showNoDiffMessage();
            return;
        }

        this.hideNoDiffMessage();
        this.showDiffOutput();

        const diffContent = document.getElementById('diff-content');
        if (!diffContent) return;

        if (this.currentViewMode === 'side-by-side') {
            diffContent.innerHTML = this.renderSideBySideView(diffData);
        } else {
            diffContent.innerHTML = this.renderUnifiedView(diffData);
        }

        // Update stats display
        this.updateStatsDisplay(diffData.stats);

        // Populate sidebar
        this.populateSidebar(diffData.files);

        // Auto-show sidebar if there are multiple files
        if (diffData.files.length > 1 && !this.sidebarVisible) {
            this.toggleSidebar();
        }
    },

    /**
     * Render unified diff view
     */
    renderUnifiedView(diffData) {
        let html = '';

        diffData.files.forEach((file, index) => {
            const stats = this.getFileStats(file);
            const fileName = file.newPath || file.oldPath || 'Unknown file';
            const isCollapsed = !this.expandAllFiles;
            
            // Add anchor for navigation
            html += `<div class="unified-file-container diff-file-anchor" id="file-${index}">`;
            
            // Collapsible header
            html += `<div class="file-collapse-header" onclick="window.DiffViewer.toggleFileCollapse(${index})">`;
            html += `<div class="file-collapse-toggle">`;
            html += `<svg class="file-collapse-icon ${isCollapsed ? 'collapsed' : ''}" id="collapse-icon-${index}" fill="none" stroke="currentColor" viewBox="0 0 24 24">`;
            html += `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>`;
            html += `</svg>`;
            html += `<span class="mr-2">${this.getFileTypeIcon(window.DiffParser.getFileType(fileName))}</span>`;
            html += `<span>${this.escapeHtml(fileName)}</span>`;
            html += `</div>`;
            html += `<div class="file-stats-badge">`;
            if (stats.additions > 0) {
                html += `<span class="file-stats-additions">+${stats.additions}</span>`;
            }
            if (stats.deletions > 0) {
                html += `<span class="file-stats-deletions">-${stats.deletions}</span>`;
            }
            html += `</div>`;
            html += `</div>`;
            
            // Collapsible content
            html += `<div class="file-collapse-content ${isCollapsed ? 'collapsed' : ''}" id="file-content-${index}">`;
            
            file.hunks.forEach(hunk => {
                html += this.renderHunkHeader(hunk);
                html += this.renderHunkLinesUnified(hunk, fileName);
            });
            
            html += '</div>'; // Close file-collapse-content
            html += '</div>'; // Close unified-file-container
        });

        return html;
    },

    /**
     * Render side-by-side diff view
     */
    renderSideBySideView(diffData) {
        let html = '<div class="side-by-side-container">';
        
        // Headers
        html += '<div class="side-by-side-header bg-red-50 text-red-800">';
        html += '<span class="font-mono text-sm">- Original</span>';
        html += '</div>';
        html += '<div class="side-by-side-header bg-green-50 text-green-800">';
        html += '<span class="font-mono text-sm">+ Modified</span>';
        html += '</div>';
        
        // Content panels
        html += '<div class="side-by-side-panel" id="left-panel">';
        html += '<div class="side-by-side-content">';
        
        html += '</div></div>';
        html += '<div class="side-by-side-panel" id="right-panel">';
        html += '<div class="side-by-side-content">';

        // Build synchronized content
        let leftContent = '';
        let rightContent = '';

        diffData.files.forEach((file, index) => {
            const sideBySideData = this.prepareSideBySideData(file);
            const stats = this.getFileStats(file);
            const fileName = file.newPath || file.oldPath || 'Unknown file';
            const isCollapsed = !this.expandAllFiles;
            
            // Add file headers with anchors (collapsible)
            leftContent += `<div class="diff-file-anchor" id="file-${index}"></div>`;
            
            // Left header
            leftContent += `<div class="file-collapse-header" onclick="window.DiffViewer.toggleFileCollapse(${index})">`;
            leftContent += `<div class="file-collapse-toggle">`;
            leftContent += `<svg class="file-collapse-icon ${isCollapsed ? 'collapsed' : ''}" id="collapse-icon-left-${index}" fill="none" stroke="currentColor" viewBox="0 0 24 24">`;
            leftContent += `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>`;
            leftContent += `</svg>`;
            leftContent += `<span class="mr-2">${this.getFileTypeIcon(window.DiffParser.getFileType(fileName))}</span>`;
            leftContent += `<span>${this.escapeHtml(fileName)}</span>`;
            leftContent += `</div>`;
            leftContent += `<div class="file-stats-badge">`;
            if (stats.additions > 0) {
                leftContent += `<span class="file-stats-additions">+${stats.additions}</span>`;
            }
            if (stats.deletions > 0) {
                leftContent += `<span class="file-stats-deletions">-${stats.deletions}</span>`;
            }
            leftContent += `</div>`;
            leftContent += `</div>`;
            
            // Right header (same collapsible structure as left)
            rightContent += `<div class="file-collapse-header" onclick="window.DiffViewer.toggleFileCollapse(${index})">`;
            rightContent += `<div class="file-collapse-toggle">`;
            rightContent += `<svg class="file-collapse-icon ${isCollapsed ? 'collapsed' : ''}" id="collapse-icon-right-${index}" fill="none" stroke="currentColor" viewBox="0 0 24 24">`;
            rightContent += `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>`;
            rightContent += `</svg>`;
            rightContent += `<span class="mr-2">${this.getFileTypeIcon(window.DiffParser.getFileType(fileName))}</span>`;
            rightContent += `<span>${this.escapeHtml(fileName)}</span>`;
            rightContent += `</div>`;
            rightContent += `<div class="file-stats-badge">`;
            if (stats.additions > 0) {
                rightContent += `<span class="file-stats-additions">+${stats.additions}</span>`;
            }
            if (stats.deletions > 0) {
                rightContent += `<span class="file-stats-deletions">-${stats.deletions}</span>`;
            }
            rightContent += `</div>`;
            rightContent += `</div>`;
            
            // Start collapsible content
            leftContent += `<div class="file-collapse-content ${isCollapsed ? 'collapsed' : ''}" id="file-content-left-${index}">`;
            rightContent += `<div class="file-collapse-content ${isCollapsed ? 'collapsed' : ''}" id="file-content-right-${index}">`;
            
            // Add content ensuring same number of lines
            const maxLines = Math.max(sideBySideData.original.length, sideBySideData.modified.length);
            
            for (let i = 0; i < maxLines; i++) {
                const leftLine = sideBySideData.original[i] || { type: 'empty', content: '', side: 'original' };
                const rightLine = sideBySideData.modified[i] || { type: 'empty', content: '', side: 'modified' };
                
                leftContent += this.renderSingleLine(leftLine, 'original', fileName);
                rightContent += this.renderSingleLine(rightLine, 'modified', fileName);
            }
            
            // Close collapsible content
            leftContent += '</div>';
            rightContent += '</div>';
        });

        // Insert content and close
        html = html.replace('<div class="side-by-side-content">', '<div class="side-by-side-content">' + leftContent);
        html += rightContent + '</div></div>';
        html += '</div>';
        
        // Add scroll synchronization after rendering
        setTimeout(() => {
            this.setupScrollSync();
            this.synchronizeHeights();
            this.setupSideBySideCollapse();
        }, 100);
        
        return html;
    },

    /**
     * Prepare data for side-by-side view
     */
    prepareSideBySideData(file) {
        const original = [];
        const modified = [];

        file.hunks.forEach(hunk => {
            hunk.lines.forEach(line => {
                switch (line.type) {
                    case 'unchanged':
                        original.push({ ...line, side: 'both' });
                        modified.push({ ...line, side: 'both' });
                        break;
                    case 'removed':
                        original.push({ ...line, side: 'original' });
                        modified.push({ type: 'empty', content: '', side: 'modified' });
                        break;
                    case 'added':
                        original.push({ type: 'empty', content: '', side: 'original' });
                        modified.push({ ...line, side: 'modified' });
                        break;
                }
            });
        });

        // Ensure both arrays have the same length
        const maxLength = Math.max(original.length, modified.length);
        while (original.length < maxLength) {
            original.push({ type: 'empty', content: '', side: 'original' });
        }
        while (modified.length < maxLength) {
            modified.push({ type: 'empty', content: '', side: 'modified' });
        }

        return { original, modified };
    },

    /**
     * Render side-by-side panel
     */
    renderSideBySidePanel(lines, side, fileName) {
        let html = '';
        
        lines.forEach(line => {
            html += this.renderSingleLine(line, side, fileName);
        });

        return html;
    },

    /**
     * Render a single line for side-by-side view
     */
    renderSingleLine(line, side, fileName) {
        if (line.type === 'empty') {
            return '<div class="diff-line diff-line-empty">' +
                   '<div class="diff-line-number"></div>' +
                   '<div class="diff-line-content">&nbsp;</div>' +
                   '</div>';
        } else {
            const lineClass = this.getDiffLineClass(line.type);
            const lineNumber = this.getLineNumberForComment(line);
            const comments = fileName ? this.getCommentsForLine(fileName, line.type, lineNumber) : [];
            const hasComments = comments.length > 0;
            
            let html = '<div class="diff-line-container">';
            
            // Main line
            html += `<div class="diff-line ${lineClass}" data-file="${fileName ? this.escapeHtml(fileName) : ''}" data-line-type="${line.type}" data-line-number="${lineNumber}">`;
            html += `<div class="diff-line-number">${this.getLineNumber(line, side)}</div>`;
            html += `<div class="diff-line-content">${this.escapeHtml(line.content)}</div>`;
            
            // Comment button (only for actual code lines and when fileName is provided)
            if (fileName && line.type !== 'context' && lineNumber) {
                html += `<div class="diff-line-actions">`;
                html += `<button class="comment-btn ${hasComments ? 'has-comments' : ''}" 
                           onclick="window.DiffViewer.toggleCommentInput('${this.escapeHtml(fileName)}', '${line.type}', '${lineNumber}')"
                           title="Add comment">`;
                html += `<svg class="comment-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">`;
                html += `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.96 8.96 0 01-4.906-1.451L3 21l2.549-5.094A8.96 8.96 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z"></path>`;
                html += `</svg>`;
                if (hasComments) {
                    html += `<span class="comment-count">${comments.length}</span>`;
                }
                html += `</button>`;
                html += `</div>`;
            }
            
            html += '</div>';
            
            // Comments section (only when fileName is provided)
            if (fileName && hasComments) {
                html += this.renderCommentsForLine(fileName, line.type, lineNumber);
            }
            
            // Comment input (initially hidden, only when fileName is provided)
            if (fileName && line.type !== 'context' && lineNumber) {
                html += `<div class="comment-input-container" id="comment-input-${this.escapeHtml(fileName)}-${line.type}-${lineNumber}" style="display: none;">`;
                html += `<div class="comment-input-box">`;
                html += `<textarea class="comment-textarea" placeholder="Write a comment..." rows="3"></textarea>`;
                html += `<div class="comment-input-actions">`;
                html += `<button class="comment-save-btn" onclick="window.DiffViewer.saveComment('${this.escapeHtml(fileName)}', '${line.type}', '${lineNumber}')">Add Comment</button>`;
                html += `<button class="comment-cancel-btn" onclick="window.DiffViewer.cancelComment('${this.escapeHtml(fileName)}', '${line.type}', '${lineNumber}')">Cancel</button>`;
                html += `</div>`;
                html += `</div>`;
                html += `</div>`;
            }
            
            html += '</div>'; // Close diff-line-container
            
            return html;
        }
    },

    /**
     * Get line number for display
     */
    getLineNumber(line, side) {
        if (side === 'original') {
            return line.oldLineNumber || '';
        } else if (side === 'modified') {
            return line.newLineNumber || '';
        }
        return line.oldLineNumber || line.newLineNumber || '';
    },

    /**
     * Render file header
     */
    renderFileHeader(file, side = null) {
        const fileName = file.newPath || file.oldPath || 'Unknown file';
        const fileType = window.DiffParser.getFileType(fileName);
        
        let headerText = fileName;
        if (file.type === 'new') {
            headerText = `${fileName} (new file)`;
        } else if (file.type === 'deleted') {
            headerText = `${fileName} (deleted)`;
        }

        return `
            <div class="diff-file-header">
                <span class="mr-2">${this.getFileTypeIcon(fileType)}</span>
                ${this.escapeHtml(headerText)}
            </div>
        `;
    },

    /**
     * Render hunk header
     */
    renderHunkHeader(hunk) {
        return `
            <div class="diff-hunk-header">
                ${this.escapeHtml(hunk.header)}
                ${hunk.context ? ` ${this.escapeHtml(hunk.context)}` : ''}
            </div>
        `;
    },

    /**
     * Render hunk lines for unified view
     */
    renderHunkLinesUnified(hunk, fileName) {
        let html = '';
        
        hunk.lines.forEach((line, lineIndex) => {
            const lineClass = this.getDiffLineClass(line.type);
            const lineNumber = this.getLineNumberForComment(line);
            const lineKey = this.generateLineKey(fileName, line.type, lineNumber);
            const comments = this.getCommentsForLine(fileName, line.type, lineNumber);
            const hasComments = comments.length > 0;
            
            // Main line container
            html += `<div class="diff-line-container">`;
            
            // Actual diff line
            html += `<div class="diff-line ${lineClass}" data-file="${this.escapeHtml(fileName)}" data-line-type="${line.type}" data-line-number="${lineNumber}">`;
            html += `<div class="diff-line-number">${this.getLineNumberUnified(line)}</div>`;
            html += `<div class="diff-line-content">${this.escapeHtml(line.content)}</div>`;
            
            // Comment button (only for actual code lines, not context headers)
            if (line.type !== 'context' && lineNumber) {
                html += `<div class="diff-line-actions">`;
                html += `<button class="comment-btn ${hasComments ? 'has-comments' : ''}" 
                           onclick="window.DiffViewer.toggleCommentInput('${this.escapeHtml(fileName)}', '${line.type}', '${lineNumber}')"
                           title="Add comment">`;
                html += `<svg class="comment-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">`;
                html += `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.96 8.96 0 01-4.906-1.451L3 21l2.549-5.094A8.96 8.96 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z"></path>`;
                html += `</svg>`;
                if (hasComments) {
                    html += `<span class="comment-count">${comments.length}</span>`;
                }
                html += `</button>`;
                html += `</div>`;
            }
            
            html += '</div>';
            
            // Comments section
            if (hasComments) {
                html += this.renderCommentsForLine(fileName, line.type, lineNumber);
            }
            
            // Comment input (initially hidden)
            html += `<div class="comment-input-container" id="comment-input-${this.escapeHtml(fileName)}-${line.type}-${lineNumber}" style="display: none;">`;
            html += `<div class="comment-input-box">`;
            html += `<textarea class="comment-textarea" placeholder="Write a comment..." rows="3"></textarea>`;
            html += `<div class="comment-input-actions">`;
            html += `<button class="comment-save-btn" onclick="window.DiffViewer.saveComment('${this.escapeHtml(fileName)}', '${line.type}', '${lineNumber}')">Add Comment</button>`;
            html += `<button class="comment-cancel-btn" onclick="window.DiffViewer.cancelComment('${this.escapeHtml(fileName)}', '${line.type}', '${lineNumber}')">Cancel</button>`;
            html += `</div>`;
            html += `</div>`;
            html += `</div>`;
            
            html += '</div>'; // Close diff-line-container
        });

        return html;
    },

    /**
     * Get line number for unified view
     */
    getLineNumberUnified(line) {
        switch (line.type) {
            case 'added':
                return `+${line.newLineNumber || ''}`;
            case 'removed':
                return `-${line.oldLineNumber || ''}`;
            case 'unchanged':
                return line.oldLineNumber || line.newLineNumber || '';
            default:
                return '';
        }
    },

    /**
     * Get CSS class for diff line type
     */
    getDiffLineClass(type) {
        switch (type) {
            case 'added':
                return 'diff-line-added';
            case 'removed':
                return 'diff-line-removed';
            case 'unchanged':
                return 'diff-line-unchanged';
            case 'context':
                return 'diff-line-context';
            default:
                return 'diff-line-unchanged';
        }
    },

    /**
     * Get file type icon
     */
    getFileTypeIcon(fileType) {
        const icons = {
            'javascript': '📄',
            'typescript': '📘',
            'java': '☕',
            'python': '🐍',
            'html': '🌐',
            'css': '🎨',
            'json': '📋',
            'markdown': '📝',
            'text': '📄'
        };
        return icons[fileType] || '📄';
    },

    /**
     * Update statistics display
     */
    updateStatsDisplay(stats) {
        // This could be enhanced to show stats in the header
    },

    /**
     * Copy diff to clipboard
     */
    async copyDiffToClipboard() {
        if (!this.currentDiff) {
            this.showMessage('No diff to copy', 'warning');
            return;
        }

        try {
            await navigator.clipboard.writeText(this.currentDiff.rawContent);
            this.showMessage('Diff copied to clipboard!', 'success');
        } catch (error) {
            this.showMessage('Failed to copy to clipboard', 'error');
        }
    },

    /**
     * Download diff as file
     */
    downloadDiff() {
        if (!this.currentDiff) {
            this.showMessage('No diff to download', 'warning');
            return;
        }

        const blob = new Blob([this.currentDiff.rawContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `diff-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showMessage('Diff downloaded!', 'success');
    },

    /**
     * Show loading state
     */
    showLoadingState() {
        const diffOutput = document.getElementById('diff-output');
        const diffContent = document.getElementById('diff-content');
        
        if (diffOutput && diffContent) {
            diffOutput.classList.remove('hidden');
            diffContent.innerHTML = `
                <div class="flex justify-center items-center py-12">
                    <div class="loading-spinner mr-3"></div>
                    <span class="text-gray-600">Processing diff...</span>
                </div>
            `;
        }
        
        this.hideNoDiffMessage();
    },

    /**
     * Show diff output section
     */
    showDiffOutput() {
        const diffOutput = document.getElementById('diff-output');
        if (diffOutput) {
            diffOutput.classList.remove('hidden');
        }
    },

    /**
     * Hide diff output section
     */
    hideDiffOutput() {
        const diffOutput = document.getElementById('diff-output');
        if (diffOutput) {
            diffOutput.classList.add('hidden');
        }
    },

    /**
     * Show no diff message
     */
    showNoDiffMessage() {
        const noDiffMessage = document.getElementById('no-diff-message');
        if (noDiffMessage) {
            noDiffMessage.classList.remove('hidden');
        }
    },

    /**
     * Hide no diff message
     */
    hideNoDiffMessage() {
        const noDiffMessage = document.getElementById('no-diff-message');
        if (noDiffMessage) {
            noDiffMessage.classList.add('hidden');
        }
    },

    /**
     * Show message to user
     */
    showMessage(message, type = 'info') {
        // Simple alert for now - could be enhanced with toast notifications
        const typeEmoji = {
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'info': 'ℹ️'
        };
        
        alert(`${typeEmoji[type] || ''} ${message}`);
    },

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Setup synchronized scrolling for side-by-side panels
     */
    setupScrollSync() {
        const leftPanel = document.getElementById('left-panel');
        const rightPanel = document.getElementById('right-panel');
        
        if (!leftPanel || !rightPanel) {
            return;
        }

        let isScrolling = false;

        // Sync right panel when left panel scrolls
        leftPanel.addEventListener('scroll', () => {
            if (isScrolling) return;
            isScrolling = true;
            rightPanel.scrollLeft = leftPanel.scrollLeft;
            requestAnimationFrame(() => {
                isScrolling = false;
            });
        });

        // Sync left panel when right panel scrolls
        rightPanel.addEventListener('scroll', () => {
            if (isScrolling) return;
            isScrolling = true;
            leftPanel.scrollLeft = rightPanel.scrollLeft;
            requestAnimationFrame(() => {
                isScrolling = false;
            });
        });
    },

    /**
     * Synchronize heights of side-by-side panels
     */
    synchronizeHeights() {
        const leftPanel = document.getElementById('left-panel');
        const rightPanel = document.getElementById('right-panel');
        
        if (!leftPanel || !rightPanel) {
            return;
        }

        // Check if any files are individually collapsed/expanded
        const collapsedFiles = document.querySelectorAll('.file-collapse-content.collapsed');
        const expandedFiles = document.querySelectorAll('.file-collapse-content:not(.collapsed)');
        
        // If we have mixed states (some collapsed, some expanded), allow natural heights
        if (collapsedFiles.length > 0 && expandedFiles.length > 0) {
            leftPanel.style.height = 'auto';
            rightPanel.style.height = 'auto';
            return;
        }

        // Only synchronize when all files are in the same state
        // Reset any forced heights
        leftPanel.style.height = 'auto';
        rightPanel.style.height = 'auto';

        // Force a reflow to get natural heights
        const leftHeight = leftPanel.offsetHeight;
        const rightHeight = rightPanel.offsetHeight;

        // Set both panels to the maximum height
        const maxHeight = Math.max(leftHeight, rightHeight);
        leftPanel.style.height = maxHeight + 'px';
        rightPanel.style.height = maxHeight + 'px';
    },

    /**
     * Load shared diff content from URL parameter if present
     */
    async loadSharedDiffIfPresent() {
        const urlParams = new URLSearchParams(window.location.search);
        const sharedData = urlParams.get('data'); // New format with comments
        const sharedDiff = urlParams.get('diff'); // Legacy format without comments
        
        // Try new format first (with comments)
        if (sharedData) {
            try {
                // Validate base64 input before decoding
                if (!this.isValidBase64(sharedData)) {
                    this.showMessage('Invalid share URL format - corrupted or malformed link', 'error');
                    return;
                }
                
                let decodedPayload;
                
                try {
                    // Try to decompress (new format with compression)
                    const compressedData = this.base64ToUint8Array(sharedData);
                    
                    // Check if this looks like compressed data (has compression type indicator)
                    if (compressedData.length > 0 && (compressedData[0] === 0 || compressedData[0] === 1 || compressedData[0] === 2)) {
                        decodedPayload = await this.decompressBrotli(compressedData);
                    } else {
                        // Fallback to direct base64 decoding
                        let regularBase64 = sharedData
                            .replace(/-/g, '+')
                            .replace(/_/g, '/');
                        while (regularBase64.length % 4) {
                            regularBase64 += '=';
                        }
                        decodedPayload = atob(regularBase64);
                    }
                } catch (compressionError) {
                    // If compression fails, try direct base64 decoding
                    try {
                        let regularBase64 = sharedData
                            .replace(/-/g, '+')
                            .replace(/_/g, '/');
                        while (regularBase64.length % 4) {
                            regularBase64 += '=';
                        }
                        decodedPayload = atob(regularBase64);
                    } catch (legacyError) {
                        throw new Error('Unable to decode payload in either compressed or uncompressed format');
                    }
                }
                
                // Parse JSON payload
                let payload;
                try {
                    payload = JSON.parse(decodedPayload);
                } catch (jsonError) {
                    throw new Error('Invalid payload format - not valid JSON');
                }
                
                // Validate payload structure
                if (!payload.diff) {
                    throw new Error('Invalid payload - missing diff content');
                }
                
                // Validate that decoded content is not empty
                if (!payload.diff.trim()) {
                    this.showMessage('Shared diff is empty or invalid', 'error');
                    return;
                }
                
                // Load comments if present
                if (payload.comments) {
                    this.setAllComments(payload.comments);
                }
                
                // Set the decoded content in the textarea
                const diffInput = document.getElementById('diff-input');
                if (diffInput) {
                    diffInput.value = payload.diff;
                    // Automatically process the diff
                    this.processDiff();
                }
                
                // Show message about loaded comments if any
                const commentCount = Object.keys(payload.comments || {}).reduce((total, filePath) => {
                    return total + Object.keys(payload.comments[filePath] || {}).reduce((fileTotal, lineKey) => {
                        return fileTotal + (payload.comments[filePath][lineKey] || []).length;
                    }, 0);
                }, 0);
                
                if (commentCount > 0) {
                    this.showMessage(`Loaded diff with ${commentCount} comment${commentCount === 1 ? '' : 's'}`, 'success');
                }
                
            } catch (error) {
                this.showMessage('Error loading shared diff with comments: ' + error.message, 'error');
            }
            return;
        }
        
        // Fallback to legacy format (diff only)
        if (sharedDiff) {
            try {
                // Validate base64 input before decoding
                if (!this.isValidBase64(sharedDiff)) {
                    this.showMessage('Invalid share URL format - corrupted or malformed link', 'error');
                    return;
                }
                
                let decodedDiff;
                
                try {
                    // Try to decompress first (new format with compression)
                    const compressedData = this.base64ToUint8Array(sharedDiff);
                    
                    // Check if this looks like compressed data (has compression type indicator)
                    if (compressedData.length > 0 && (compressedData[0] === 0 || compressedData[0] === 1 || compressedData[0] === 2)) {
                        decodedDiff = await this.decompressBrotli(compressedData);
                    } else {
                        // Fallback to old format (direct base64 decoding)
                        // Need to convert back to regular base64 for atob
                        let regularBase64 = sharedDiff
                            .replace(/-/g, '+')
                            .replace(/_/g, '/');
                        while (regularBase64.length % 4) {
                            regularBase64 += '=';
                        }
                        decodedDiff = atob(regularBase64);
                    }
                } catch (compressionError) {
                    // If compression fails, try old format
                    try {
                        // Convert URL-safe base64 to regular base64
                        let regularBase64 = sharedDiff
                            .replace(/-/g, '+')
                            .replace(/_/g, '/');
                        while (regularBase64.length % 4) {
                            regularBase64 += '=';
                        }
                        decodedDiff = atob(regularBase64);
                    } catch (legacyError) {
                        throw new Error('Unable to decode diff content in either new or legacy format');
                    }
                }
                
                // Validate that decoded content is not empty
                if (!decodedDiff.trim()) {
                    this.showMessage('Shared diff is empty or invalid', 'error');
                    return;
                }
                
                // Set the decoded content in the textarea
                const diffInput = document.getElementById('diff-input');
                if (diffInput) {
                    diffInput.value = decodedDiff;
                    // Automatically process the diff
                    this.processDiff();
                }
            } catch (error) {
                this.showMessage('Error loading shared diff: ' + error.message, 'error');
                if (error.name === 'InvalidCharacterError') {
                    this.showMessage('Invalid share URL - contains invalid characters', 'error');
                } else if (error.message.includes('decompress')) {
                    this.showMessage('Failed to decompress shared diff - URL may be corrupted or from an older version', 'error');
                } else {
                    this.showMessage('Failed to load shared diff - URL may be corrupted', 'error');
                }
            }
        }
    },

    /**
     * Compress string using Brotli compression (with gzip fallback)
     */
    async compressBrotli(str) {
        try {
            // Check if CompressionStream is available
            if (typeof CompressionStream === 'undefined') {
                // Fallback to simple base64 encoding for older browsers
                const encoder = new TextEncoder();
                const data = encoder.encode(str);
                const result = new Uint8Array(data.length + 1);
                result[0] = 2; // Special marker for uncompressed legacy format
                result.set(data, 1);
                return result;
            }

            const encoder = new TextEncoder();
            const data = encoder.encode(str);
            
            // Try Brotli first, fall back to gzip if not supported
            let compressionType = 'br';
            let compressionStream;
            
            try {
                compressionStream = new CompressionStream('br');
            } catch (error) {
                compressionType = 'gzip';
                compressionStream = new CompressionStream('gzip');
            }
            
            const writer = compressionStream.writable.getWriter();
            const reader = compressionStream.readable.getReader();
            
            // Write data to compression stream
            writer.write(data);
            writer.close();
            
            // Read compressed data
            const chunks = [];
            let done = false;
            
            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                if (value) {
                    chunks.push(value);
                }
            }
            
            // Combine chunks into single Uint8Array
            const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
            const result = new Uint8Array(totalLength + 1); // +1 for compression type indicator
            
            // First byte indicates compression type: 0 = gzip, 1 = brotli, 2 = uncompressed
            result[0] = compressionType === 'br' ? 1 : 0;
            
            let offset = 1;
            for (const chunk of chunks) {
                result.set(chunk, offset);
                offset += chunk.length;
            }
            
            return result;
        } catch (error) {
            throw new Error('Failed to compress data');
        }
    },

    /**
     * Decompress Brotli compressed data (with gzip fallback detection)
     */
    async decompressBrotli(compressedData) {
        try {
            // First byte indicates compression type: 0 = gzip, 1 = brotli, 2 = uncompressed
            const compressionType = compressedData[0];
            const actualData = compressedData.slice(1);
            
            // Handle uncompressed legacy format
            if (compressionType === 2) {
                const decoder = new TextDecoder();
                return decoder.decode(actualData);
            }

            // Check if DecompressionStream is available
            if (typeof DecompressionStream === 'undefined') {
                throw new Error('DecompressionStream not available - cannot decompress data');
            }
            
            const compressionFormat = compressionType === 1 ? 'br' : 'gzip';
            let decompressionStream;
            
            try {
                decompressionStream = new DecompressionStream(compressionFormat);
            } catch (error) {
                // If the preferred format is not supported, try the other
                const fallbackFormat = compressionFormat === 'br' ? 'gzip' : 'br';
                decompressionStream = new DecompressionStream(fallbackFormat);
            }
            
            const writer = decompressionStream.writable.getWriter();
            const reader = decompressionStream.readable.getReader();
            
            // Write compressed data to decompression stream
            writer.write(actualData);
            writer.close();
            
            // Read decompressed data
            const chunks = [];
            let done = false;
            
            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                if (value) {
                    chunks.push(value);
                }
            }
            
            // Combine chunks and decode to string
            const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
            const result = new Uint8Array(totalLength);
            let offset = 0;
            
            for (const chunk of chunks) {
                result.set(chunk, offset);
                offset += chunk.length;
            }
            
            const decoder = new TextDecoder();
            return decoder.decode(result);
        } catch (error) {
            throw new Error('Failed to decompress data');
        }
    },

    /**
     * Convert Uint8Array to URL-safe base64 string
     */
    uint8ArrayToBase64(uint8Array) {
        let binary = '';
        const len = uint8Array.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(uint8Array[i]);
        }
        // Convert to base64 and make it URL-safe
        return btoa(binary)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    },

    /**
     * Convert URL-safe base64 string to Uint8Array
     */
    base64ToUint8Array(base64) {
        // Convert from URL-safe base64 back to regular base64
        let regularBase64 = base64
            .replace(/-/g, '+')
            .replace(/_/g, '/');
        
        // Add padding if necessary
        while (regularBase64.length % 4) {
            regularBase64 += '=';
        }
        
        const binary = atob(regularBase64);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    },

    /**
     * Generate shareable URL with Brotli compressed and base64 encoded diff content
     */
    async generateShareableUrl(diffContent) {
        try {
            // Create payload with diff content and comments
            const payload = {
                diff: diffContent,
                comments: this.getAllComments()
            };
            
            // Convert payload to JSON
            const payloadJson = JSON.stringify(payload);
            
            // Compress payload using Brotli (gzip fallback)
            const compressedData = await this.compressBrotli(payloadJson);
            
            // Convert compressed data to base64
            const encodedPayload = this.uint8ArrayToBase64(compressedData);
            
            // Create URL with encoded payload parameter
            const baseUrl = window.location.origin + window.location.pathname;
            const shareUrl = `${baseUrl}?data=${encodedPayload}`;
            
            // Validate URL length - URLs longer than 8000 characters may not work properly
            if (shareUrl.length > 8000) {
                throw new Error('The diff is too large to share via URL (exceeds 8000 character limit). Consider downloading the diff instead or sharing smaller portions.');
            }
            
            return shareUrl;
        } catch (error) {
            // Re-throw our specific validation errors, or provide generic message for other errors
            if (error.message.includes('too large to share')) {
                throw error;
            }
            throw new Error('Failed to generate shareable URL: ' + error.message);
        }
    },

    /**
     * Show share modal with generated URL
     */
    async showShareModal() {
        if (!this.currentDiff || !this.currentDiff.rawContent) {
            this.showMessage('No diff content to share', 'warning');
            return;
        }

        try {
            // Show modal first with loading state
            const modal = document.getElementById('share-modal');
            const shareUrlInput = document.getElementById('share-url');
            const validationError = document.getElementById('share-validation-error');
            const urlContainer = document.querySelector('.share-url-container');
            const copySuccess = document.getElementById('copy-success');
            const shareDescription = document.querySelector('.share-description-container');
            
            if (modal && shareUrlInput) {
                shareUrlInput.value = 'Generating compressed link...';
                modal.classList.remove('hidden');
                
                // Show URL container, description and hide any previous validation errors and copy success
                if (urlContainer) {
                    urlContainer.classList.remove('hidden');
                }
                if (shareDescription) {
                    shareDescription.classList.remove('hidden');
                }
                if (validationError) {
                    validationError.classList.add('hidden');
                }
                if (copySuccess) {
                    copySuccess.classList.add('hidden');
                }
            }

            // Generate shareable URL (now with compression)
            const shareUrl = await this.generateShareableUrl(this.currentDiff.rawContent);
            
            // Update the input with the actual URL
            if (shareUrlInput) {
                shareUrlInput.value = shareUrl;
            }
        } catch (error) {
            // Check if this is a URL length validation error
            if (error.message.includes('too large to share')) {
                // Show validation error and hide URL input/copy button, copy success, and description
                const validationError = document.getElementById('share-validation-error');
                const urlContainer = document.querySelector('.share-url-container');
                const copySuccess = document.getElementById('copy-success');
                const shareDescription = document.querySelector('.share-description-container');
                
                if (validationError) {
                    validationError.textContent = error.message;
                    validationError.classList.remove('hidden');
                }
                
                if (urlContainer) {
                    urlContainer.classList.add('hidden');
                }
                
                if (copySuccess) {
                    copySuccess.classList.add('hidden');
                }
                
                if (shareDescription) {
                    shareDescription.classList.add('hidden');
                }
            } else {
                this.showMessage('Error generating share URL: ' + error.message, 'error');
                this.hideShareModal();
            }
        }
    },

    /**
     * Copy share URL to clipboard
     */
    async copyShareUrl() {
        const shareUrlInput = document.getElementById('share-url');
        const copySuccess = document.getElementById('copy-success');
        const urlContainer = document.querySelector('.share-url-container');
        
        if (!shareUrlInput) return;

        // Check if URL container is hidden - don't copy when validation failed
        if (urlContainer && urlContainer.classList.contains('hidden')) {
            this.showMessage('Cannot copy - the diff is too large to share via URL', 'warning');
            return;
        }

        // Check if the input contains an error message instead of a valid URL
        if (shareUrlInput.value.includes('Cannot generate link') || shareUrlInput.value.includes('Generating')) {
            this.showMessage('No valid URL to copy', 'warning');
            return;
        }

        try {
            await navigator.clipboard.writeText(shareUrlInput.value);
            
            // Show success message
            if (copySuccess) {
                copySuccess.classList.remove('hidden');
                setTimeout(() => {
                    copySuccess.classList.add('hidden');
                }, 3000);
            }
        } catch (error) {
            // Fallback for older browsers
            shareUrlInput.select();
            document.execCommand('copy');
            
            if (copySuccess) {
                copySuccess.classList.remove('hidden');
                setTimeout(() => {
                    copySuccess.classList.add('hidden');
                }, 3000);
            }
        }
    },

    /**
     * Hide share modal
     */
    hideShareModal() {
        const modal = document.getElementById('share-modal');
        const copySuccess = document.getElementById('copy-success');
        const validationError = document.getElementById('share-validation-error');
        const urlContainer = document.querySelector('.share-url-container');
        const shareDescription = document.querySelector('.share-description-container');
        
        if (modal) {
            modal.classList.add('hidden');
        }
        
        if (copySuccess) {
            copySuccess.classList.add('hidden');
        }
        
        if (validationError) {
            validationError.classList.add('hidden');
        }
        
        if (urlContainer) {
            urlContainer.classList.remove('hidden');
        }
        
        if (shareDescription) {
            shareDescription.classList.remove('hidden');
        }
    },

    /**
     * Validate base64 string format (supports both regular and URL-safe base64)
     */
    isValidBase64(str) {
        // Check if string is empty
        if (!str || typeof str !== 'string') {
            return false;
        }
        
        // Remove any whitespace
        str = str.trim();
        
        // Check if string contains only valid base64 characters (including URL-safe variants)
        const base64Regex = /^[A-Za-z0-9+/\-_]*={0,2}$/;
        if (!base64Regex.test(str)) {
            return false;
        }
        
        // Try to decode the string to verify it's valid base64
        try {
            // Convert URL-safe base64 to regular base64 for testing
            let testStr = str
                .replace(/-/g, '+')
                .replace(/_/g, '/');
            
            // Add padding if necessary
            while (testStr.length % 4) {
                testStr += '=';
            }
            
            atob(testStr);
            return true;
        } catch (e) {
            return false;
        }
    },

    /**
     * Toggle sidebar visibility
     */
    toggleSidebar() {
        const sidebar = document.getElementById('diff-sidebar');
        const toggleText = document.getElementById('sidebar-toggle-text');
        
        if (!sidebar) return;

        this.sidebarVisible = !this.sidebarVisible;
        
        if (this.sidebarVisible) {
            sidebar.classList.remove('hidden');
            if (toggleText) {
                toggleText.textContent = 'Hide Files';
            }
        } else {
            sidebar.classList.add('hidden');
            if (toggleText) {
                toggleText.textContent = 'Show Files';
            }
        }
    },

    /**
     * Populate sidebar with file list
     */
    populateSidebar(files) {
        const sidebarFileList = document.getElementById('sidebar-file-list');
        const fileCount = document.getElementById('file-count');
        
        if (!sidebarFileList) return;

        // Update file count
        if (fileCount) {
            fileCount.textContent = `${files.length} file${files.length !== 1 ? 's' : ''}`;
        }

        // Clear existing content
        sidebarFileList.innerHTML = '';

        // Populate file list
        files.forEach((file, index) => {
            const fileItem = this.createSidebarFileItem(file, index);
            sidebarFileList.appendChild(fileItem);
        });
    },

    /**
     * Create a sidebar file item element
     */
    createSidebarFileItem(file, index) {
        const fileItem = document.createElement('div');
        fileItem.className = 'diff-sidebar-file';
        fileItem.dataset.fileIndex = index;

        // Get file name and stats
        const fileName = file.newPath || file.oldPath || 'Unknown file';
        const fileType = window.DiffParser.getFileType(fileName);
        const stats = this.getFileStats(file);

        // Create icon
        const icon = document.createElement('span');
        icon.className = 'diff-sidebar-file-icon';
        icon.textContent = this.getFileTypeIcon(fileType);

        // Create file name container
        const nameContainer = document.createElement('div');
        nameContainer.className = 'flex-1 min-w-0';

        const name = document.createElement('div');
        name.className = 'diff-sidebar-file-name';
        name.textContent = fileName;

        // Create stats display
        const statsContainer = document.createElement('div');
        statsContainer.className = 'diff-sidebar-file-stats';

        if (stats.additions > 0) {
            const additions = document.createElement('span');
            additions.className = 'diff-sidebar-file-additions';
            additions.textContent = `+${stats.additions}`;
            statsContainer.appendChild(additions);
        }

        if (stats.deletions > 0) {
            const deletions = document.createElement('span');
            deletions.className = 'diff-sidebar-file-deletions';
            deletions.textContent = `-${stats.deletions}`;
            statsContainer.appendChild(deletions);
        }

        nameContainer.appendChild(name);

        // Add file type badge for new/deleted files
        if (file.type === 'new' || file.mode?.includes('new file')) {
            const badge = document.createElement('span');
            badge.className = 'diff-sidebar-file-badge new';
            badge.textContent = 'new';
            nameContainer.appendChild(badge);
        } else if (file.type === 'deleted' || file.mode?.includes('deleted file')) {
            const badge = document.createElement('span');
            badge.className = 'diff-sidebar-file-badge deleted';
            badge.textContent = 'deleted';
            nameContainer.appendChild(badge);
        }

        // Assemble the item
        fileItem.appendChild(icon);
        fileItem.appendChild(nameContainer);
        fileItem.appendChild(statsContainer);

        // Add click handler
        fileItem.addEventListener('click', () => this.scrollToFile(index));

        return fileItem;
    },

    /**
     * Get statistics for a single file
     */
    getFileStats(file) {
        let additions = 0;
        let deletions = 0;

        file.hunks.forEach(hunk => {
            hunk.lines.forEach(line => {
                if (line.type === 'added') {
                    additions++;
                } else if (line.type === 'removed') {
                    deletions++;
                }
            });
        });

        return { additions, deletions };
    },

    /**
     * Scroll to a specific file in the diff view
     */
    scrollToFile(fileIndex) {
        const fileElement = document.getElementById(`file-${fileIndex}`);
        
        if (fileElement) {
            // Remove active class from all sidebar items
            const allItems = document.querySelectorAll('.diff-sidebar-file');
            allItems.forEach(item => item.classList.remove('active'));

            // Add active class to clicked item
            const clickedItem = document.querySelector(`.diff-sidebar-file[data-file-index="${fileIndex}"]`);
            if (clickedItem) {
                clickedItem.classList.add('active');
            }

            // Expand the file if it's collapsed
            const fileContent = document.getElementById(`file-content-${fileIndex}`);
            const fileContentLeft = document.getElementById(`file-content-left-${fileIndex}`);
            const fileContentRight = document.getElementById(`file-content-right-${fileIndex}`);
            
            // Check unified view
            if (fileContent && fileContent.classList.contains('collapsed')) {
                this.toggleFileCollapse(fileIndex);
            }
            // Check side-by-side view
            else if (fileContentLeft && fileContentLeft.classList.contains('collapsed')) {
                this.toggleFileCollapse(fileIndex);
            }

            // Scroll to the file
            fileElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start'
            });
        }
    },

    /**
     * Toggle collapse state of a file
     */
    toggleFileCollapse(fileIndex) {
        const fileContent = document.getElementById(`file-content-${fileIndex}`);
        const collapseIcon = document.getElementById(`collapse-icon-${fileIndex}`);
        
        // For unified view
        if (fileContent && collapseIcon) {
            fileContent.classList.toggle('collapsed');
            collapseIcon.classList.toggle('collapsed');
        }
        
        // For side-by-side view
        const fileContentLeft = document.getElementById(`file-content-left-${fileIndex}`);
        const fileContentRight = document.getElementById(`file-content-right-${fileIndex}`);
        const collapseIconLeft = document.getElementById(`collapse-icon-left-${fileIndex}`);
        const collapseIconRight = document.getElementById(`collapse-icon-right-${fileIndex}`);
        
        if (fileContentLeft && fileContentRight) {
            fileContentLeft.classList.toggle('collapsed');
            fileContentRight.classList.toggle('collapsed');
            
            // Toggle both collapse icons in side-by-side view
            if (collapseIconLeft) {
                collapseIconLeft.classList.toggle('collapsed');
            }
            if (collapseIconRight) {
                collapseIconRight.classList.toggle('collapsed');
            }
            
            // Re-synchronize heights after collapse/expand
            setTimeout(() => {
                this.synchronizeHeights();
            }, 100);
        }
    },

    /**
     * Setup synchronized collapse for side-by-side view
     */
    setupSideBySideCollapse() {
        // Ensure both sides collapse/expand together
        const leftPanel = document.getElementById('left-panel');
        const rightPanel = document.getElementById('right-panel');
        
        if (leftPanel && rightPanel) {
            // Already handled by toggleFileCollapse
        }
    },

    /**
     * Save settings to localStorage
     */
    saveSettings() {
        localStorage.setItem('difflense-expand-all-files', this.expandAllFiles.toString());
    },

    /**
     * Load settings from localStorage
     */
    loadSettings() {
        const expandAllSetting = localStorage.getItem('difflense-expand-all-files');
        if (expandAllSetting !== null) {
            this.expandAllFiles = expandAllSetting === 'true';
        }
        
        // Update checkbox state
        const expandAllCheckbox = document.getElementById('expand-all-files');
        if (expandAllCheckbox) {
            expandAllCheckbox.checked = this.expandAllFiles;
        }
    }
};

