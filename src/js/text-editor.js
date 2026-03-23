// Text Editor - GNOME Text Editor (gedit) style
const TextEditor = {
    editors: new Map(), // Track multiple editor instances
    
    // Default content for new files
    defaultContent: '',
    
    // Generate editor HTML
    getEditorHTML(options = {}) {
        const filename = options.filename || 'Untitled';
        const content = options.content || this.defaultContent;
        const editorId = 'editor-' + Date.now();
        
        return `
            <div class="text-editor-app" data-editor-id="${editorId}" data-filename="${filename}" data-saved="true">
                <!-- Menu Bar -->
                <div class="te-menubar">
                    <div class="te-menu-item" data-menu="file">
                        <span>File</span>
                        <div class="te-dropdown">
                            <div class="te-dropdown-item" data-action="new"><span class="te-shortcut">Ctrl+N</span>New</div>
                            <div class="te-dropdown-item" data-action="open"><span class="te-shortcut">Ctrl+O</span>Open...</div>
                            <div class="te-dropdown-divider"></div>
                            <div class="te-dropdown-item" data-action="save"><span class="te-shortcut">Ctrl+S</span>Save</div>
                            <div class="te-dropdown-item" data-action="save-as"><span class="te-shortcut">Ctrl+Shift+S</span>Save As...</div>
                            <div class="te-dropdown-divider"></div>
                            <div class="te-dropdown-item" data-action="print"><span class="te-shortcut">Ctrl+P</span>Print...</div>
                            <div class="te-dropdown-divider"></div>
                            <div class="te-dropdown-item" data-action="close"><span class="te-shortcut">Ctrl+W</span>Close</div>
                        </div>
                    </div>
                    <div class="te-menu-item" data-menu="edit">
                        <span>Edit</span>
                        <div class="te-dropdown">
                            <div class="te-dropdown-item" data-action="undo"><span class="te-shortcut">Ctrl+Z</span>Undo</div>
                            <div class="te-dropdown-item" data-action="redo"><span class="te-shortcut">Ctrl+Y</span>Redo</div>
                            <div class="te-dropdown-divider"></div>
                            <div class="te-dropdown-item" data-action="cut"><span class="te-shortcut">Ctrl+X</span>Cut</div>
                            <div class="te-dropdown-item" data-action="copy"><span class="te-shortcut">Ctrl+C</span>Copy</div>
                            <div class="te-dropdown-item" data-action="paste"><span class="te-shortcut">Ctrl+V</span>Paste</div>
                            <div class="te-dropdown-item" data-action="delete">Delete</div>
                            <div class="te-dropdown-divider"></div>
                            <div class="te-dropdown-item" data-action="select-all"><span class="te-shortcut">Ctrl+A</span>Select All</div>
                        </div>
                    </div>
                    <div class="te-menu-item" data-menu="search">
                        <span>Search</span>
                        <div class="te-dropdown">
                            <div class="te-dropdown-item" data-action="find"><span class="te-shortcut">Ctrl+F</span>Find...</div>
                            <div class="te-dropdown-item" data-action="find-replace"><span class="te-shortcut">Ctrl+H</span>Find and Replace...</div>
                            <div class="te-dropdown-divider"></div>
                            <div class="te-dropdown-item" data-action="goto-line"><span class="te-shortcut">Ctrl+G</span>Go to Line...</div>
                        </div>
                    </div>
                    <div class="te-menu-item" data-menu="view">
                        <span>View</span>
                        <div class="te-dropdown">
                            <div class="te-dropdown-item te-toggle" data-action="toggle-line-numbers" data-checked="true">
                                <span class="te-check">✓</span>Line Numbers
                            </div>
                            <div class="te-dropdown-item te-toggle" data-action="toggle-word-wrap" data-checked="true">
                                <span class="te-check">✓</span>Word Wrap
                            </div>
                            <div class="te-dropdown-item te-toggle" data-action="toggle-minimap" data-checked="false">
                                <span class="te-check"></span>Minimap
                            </div>
                            <div class="te-dropdown-divider"></div>
                            <div class="te-dropdown-item" data-action="zoom-in"><span class="te-shortcut">Ctrl++</span>Zoom In</div>
                            <div class="te-dropdown-item" data-action="zoom-out"><span class="te-shortcut">Ctrl+-</span>Zoom Out</div>
                            <div class="te-dropdown-item" data-action="zoom-reset"><span class="te-shortcut">Ctrl+0</span>Reset Zoom</div>
                        </div>
                    </div>
                    <div class="te-menu-item" data-menu="help">
                        <span>Help</span>
                        <div class="te-dropdown">
                            <div class="te-dropdown-item" data-action="keyboard-shortcuts">Keyboard Shortcuts</div>
                            <div class="te-dropdown-item" data-action="about">About Text Editor</div>
                        </div>
                    </div>
                </div>
                
                <!-- Toolbar -->
                <div class="te-toolbar">
                    <button class="te-tool-btn" data-action="new" title="New (Ctrl+N)">
                        <svg viewBox="0 0 24 24" width="18" height="18"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M14 2v6h6M12 18v-6M9 15h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                    </button>
                    <button class="te-tool-btn" data-action="open" title="Open (Ctrl+O)">
                        <svg viewBox="0 0 24 24" width="18" height="18"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" fill="none" stroke="currentColor" stroke-width="2"/></svg>
                    </button>
                    <button class="te-tool-btn" data-action="save" title="Save (Ctrl+S)">
                        <svg viewBox="0 0 24 24" width="18" height="18"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M17 21v-8H7v8M7 3v5h8" stroke="currentColor" stroke-width="2"/></svg>
                    </button>
                    <div class="te-toolbar-sep"></div>
                    <button class="te-tool-btn" data-action="undo" title="Undo (Ctrl+Z)">
                        <svg viewBox="0 0 24 24" width="18" height="18"><path d="M3 10h10a5 5 0 0 1 5 5v2M3 10l4-4M3 10l4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                    <button class="te-tool-btn" data-action="redo" title="Redo (Ctrl+Y)">
                        <svg viewBox="0 0 24 24" width="18" height="18"><path d="M21 10H11a5 5 0 0 0-5 5v2M21 10l-4-4M21 10l-4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                    <div class="te-toolbar-sep"></div>
                    <button class="te-tool-btn" data-action="cut" title="Cut (Ctrl+X)">
                        <svg viewBox="0 0 24 24" width="18" height="18"><circle cx="6" cy="6" r="3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="6" cy="18" r="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                    </button>
                    <button class="te-tool-btn" data-action="copy" title="Copy (Ctrl+C)">
                        <svg viewBox="0 0 24 24" width="18" height="18"><rect x="9" y="9" width="13" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" fill="none" stroke="currentColor" stroke-width="2"/></svg>
                    </button>
                    <button class="te-tool-btn" data-action="paste" title="Paste (Ctrl+V)">
                        <svg viewBox="0 0 24 24" width="18" height="18"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" fill="none" stroke="currentColor" stroke-width="2"/><rect x="8" y="2" width="8" height="4" rx="1" fill="none" stroke="currentColor" stroke-width="2"/></svg>
                    </button>
                    <div class="te-toolbar-sep"></div>
                    <button class="te-tool-btn" data-action="find" title="Find (Ctrl+F)">
                        <svg viewBox="0 0 24 24" width="18" height="18"><circle cx="11" cy="11" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                    </button>
                    <button class="te-tool-btn" data-action="find-replace" title="Find and Replace (Ctrl+H)">
                        <svg viewBox="0 0 24 24" width="18" height="18"><circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M13.5 13.5L18 18M18 9h4M18 13h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                    </button>
                    <div class="te-toolbar-spacer"></div>
                    <button class="te-tool-btn" data-action="zoom-out" title="Zoom Out">
                        <svg viewBox="0 0 24 24" width="18" height="18"><circle cx="11" cy="11" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M21 21l-4.35-4.35M8 11h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                    </button>
                    <span class="te-zoom-level">100%</span>
                    <button class="te-tool-btn" data-action="zoom-in" title="Zoom In">
                        <svg viewBox="0 0 24 24" width="18" height="18"><circle cx="11" cy="11" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M21 21l-4.35-4.35M11 8v6M8 11h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                    </button>
                </div>
                
                <!-- Find Bar (hidden by default) -->
                <div class="te-findbar hidden">
                    <div class="te-find-row">
                        <input type="text" class="te-find-input" placeholder="Find">
                        <span class="te-find-count">0 results</span>
                        <button class="te-find-btn" data-action="find-prev" title="Previous">▲</button>
                        <button class="te-find-btn" data-action="find-next" title="Next">▼</button>
                        <button class="te-find-btn te-find-close" data-action="close-find">✕</button>
                    </div>
                    <div class="te-replace-row hidden">
                        <input type="text" class="te-replace-input" placeholder="Replace with">
                        <button class="te-replace-btn" data-action="replace">Replace</button>
                        <button class="te-replace-btn" data-action="replace-all">Replace All</button>
                    </div>
                </div>
                
                <!-- Editor Area -->
                <div class="te-editor-container">
                    <div class="te-line-numbers"></div>
                    <textarea class="te-textarea" spellcheck="false" placeholder="Start typing...">${this.escapeHtml(content)}</textarea>
                    <div class="te-minimap hidden">
                        <div class="te-minimap-content"></div>
                        <div class="te-minimap-viewport"></div>
                    </div>
                </div>
                
                <!-- Status Bar -->
                <div class="te-statusbar">
                    <span class="te-status-position">Ln 1, Col 1</span>
                    <span class="te-status-selection"></span>
                    <span class="te-status-spacer"></span>
                    <span class="te-status-encoding">UTF-8</span>
                    <span class="te-status-line-ending">LF</span>
                    <span class="te-status-filetype">Plain Text</span>
                </div>
                
                <!-- Dialogs -->
                <div class="te-dialog te-goto-dialog hidden">
                    <div class="te-dialog-content">
                        <h3>Go to Line</h3>
                        <input type="number" class="te-goto-input" min="1" placeholder="Line number">
                        <div class="te-dialog-buttons">
                            <button class="te-dialog-btn cancel">Cancel</button>
                            <button class="te-dialog-btn primary">Go</button>
                        </div>
                    </div>
                </div>
                
                <div class="te-dialog te-save-dialog hidden">
                    <div class="te-dialog-content">
                        <h3>Save File</h3>
                        <input type="text" class="te-save-filename" placeholder="filename.txt" value="${filename}">
                        <div class="te-dialog-buttons">
                            <button class="te-dialog-btn cancel">Cancel</button>
                            <button class="te-dialog-btn primary">Save</button>
                        </div>
                    </div>
                </div>
                
                <div class="te-dialog te-about-dialog hidden">
                    <div class="te-dialog-content te-about-content">
                        <div class="te-about-icon">📝</div>
                        <h2>Text Editor</h2>
                        <p class="te-about-version">Version 1.0</p>
                        <p class="te-about-desc">A simple and elegant text editor for Ubuntu Desktop.</p>
                        <p class="te-about-copy">Part of the Ubuntu Portfolio Project</p>
                        <div class="te-dialog-buttons">
                            <button class="te-dialog-btn primary">Close</button>
                        </div>
                    </div>
                </div>
                
                <div class="te-dialog te-shortcuts-dialog hidden">
                    <div class="te-dialog-content te-shortcuts-content">
                        <h3>Keyboard Shortcuts</h3>
                        <div class="te-shortcuts-grid">
                            <div class="te-shortcut-item"><kbd>Ctrl+N</kbd><span>New File</span></div>
                            <div class="te-shortcut-item"><kbd>Ctrl+O</kbd><span>Open File</span></div>
                            <div class="te-shortcut-item"><kbd>Ctrl+S</kbd><span>Save</span></div>
                            <div class="te-shortcut-item"><kbd>Ctrl+Z</kbd><span>Undo</span></div>
                            <div class="te-shortcut-item"><kbd>Ctrl+Y</kbd><span>Redo</span></div>
                            <div class="te-shortcut-item"><kbd>Ctrl+X</kbd><span>Cut</span></div>
                            <div class="te-shortcut-item"><kbd>Ctrl+C</kbd><span>Copy</span></div>
                            <div class="te-shortcut-item"><kbd>Ctrl+V</kbd><span>Paste</span></div>
                            <div class="te-shortcut-item"><kbd>Ctrl+A</kbd><span>Select All</span></div>
                            <div class="te-shortcut-item"><kbd>Ctrl+F</kbd><span>Find</span></div>
                            <div class="te-shortcut-item"><kbd>Ctrl+H</kbd><span>Replace</span></div>
                            <div class="te-shortcut-item"><kbd>Ctrl+G</kbd><span>Go to Line</span></div>
                            <div class="te-shortcut-item"><kbd>Ctrl++</kbd><span>Zoom In</span></div>
                            <div class="te-shortcut-item"><kbd>Ctrl+-</kbd><span>Zoom Out</span></div>
                        </div>
                        <div class="te-dialog-buttons">
                            <button class="te-dialog-btn primary">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },
    
    // Initialize editor instance
    initEditor(windowEl, options = {}) {
        const editor = windowEl.querySelector('.text-editor-app');
        if (!editor) return;
        
        const editorId = editor.dataset.editorId;
        const textarea = editor.querySelector('.te-textarea');
        const lineNumbers = editor.querySelector('.te-line-numbers');
        const statusPosition = editor.querySelector('.te-status-position');
        const statusSelection = editor.querySelector('.te-status-selection');
        const zoomLevel = editor.querySelector('.te-zoom-level');
        const findbar = editor.querySelector('.te-findbar');
        const findInput = editor.querySelector('.te-find-input');
        const replaceRow = editor.querySelector('.te-replace-row');
        
        let currentZoom = 100;
        let history = [textarea.value];
        let historyIndex = 0;
        let lastSavedContent = textarea.value;
        
        // Store editor state
        this.editors.set(editorId, {
            element: editor,
            textarea,
            zoom: currentZoom,
            history,
            historyIndex,
            options
        });
        
        // Update line numbers
        const updateLineNumbers = () => {
            const lines = textarea.value.split('\n').length;
            let html = '';
            for (let i = 1; i <= lines; i++) {
                html += `<div class="te-line-num">${i}</div>`;
            }
            lineNumbers.innerHTML = html;
        };
        
        // Update cursor position
        const updatePosition = () => {
            const text = textarea.value.substring(0, textarea.selectionStart);
            const lines = text.split('\n');
            const line = lines.length;
            const col = lines[lines.length - 1].length + 1;
            statusPosition.textContent = `Ln ${line}, Col ${col}`;
            
            // Update selection info
            const selStart = textarea.selectionStart;
            const selEnd = textarea.selectionEnd;
            if (selStart !== selEnd) {
                const selectedText = textarea.value.substring(selStart, selEnd);
                const selectedLines = selectedText.split('\n').length;
                statusSelection.textContent = `(${selectedText.length} chars, ${selectedLines} lines selected)`;
            } else {
                statusSelection.textContent = '';
            }
        };
        
        // Mark as unsaved
        const markUnsaved = () => {
            if (textarea.value !== lastSavedContent) {
                editor.dataset.saved = 'false';
                const titleEl = windowEl.querySelector('.window-title');
                if (titleEl && !titleEl.textContent.startsWith('● ')) {
                    titleEl.textContent = '● ' + titleEl.textContent;
                }
            }
        };
        
        // Mark as saved
        const markSaved = () => {
            lastSavedContent = textarea.value;
            editor.dataset.saved = 'true';
            const titleEl = windowEl.querySelector('.window-title');
            if (titleEl) {
                titleEl.textContent = titleEl.textContent.replace(/^● /, '');
            }
        };
        
        // Add to history
        const addToHistory = () => {
            if (textarea.value !== history[historyIndex]) {
                history = history.slice(0, historyIndex + 1);
                history.push(textarea.value);
                historyIndex = history.length - 1;
            }
        };
        
        // Undo
        const undo = () => {
            if (historyIndex > 0) {
                historyIndex--;
                textarea.value = history[historyIndex];
                updateLineNumbers();
                updatePosition();
            }
        };
        
        // Redo
        const redo = () => {
            if (historyIndex < history.length - 1) {
                historyIndex++;
                textarea.value = history[historyIndex];
                updateLineNumbers();
                updatePosition();
            }
        };
        
        // Find text
        const findText = (direction = 1) => {
            const query = findInput.value;
            if (!query) return;
            
            const text = textarea.value;
            const curPos = textarea.selectionEnd;
            let index;
            
            if (direction === 1) {
                index = text.indexOf(query, curPos);
                if (index === -1) index = text.indexOf(query); // Wrap
            } else {
                index = text.lastIndexOf(query, textarea.selectionStart - 1);
                if (index === -1) index = text.lastIndexOf(query); // Wrap
            }
            
            if (index !== -1) {
                textarea.focus();
                textarea.setSelectionRange(index, index + query.length);
                
                // Count total matches
                const matches = (text.match(new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length;
                editor.querySelector('.te-find-count').textContent = `${matches} results`;
            } else {
                editor.querySelector('.te-find-count').textContent = '0 results';
            }
        };
        
        // Replace text
        const replaceText = (all = false) => {
            const query = findInput.value;
            const replacement = editor.querySelector('.te-replace-input').value;
            if (!query) return;
            
            if (all) {
                textarea.value = textarea.value.split(query).join(replacement);
                addToHistory();
                updateLineNumbers();
                markUnsaved();
            } else {
                const selText = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
                if (selText === query) {
                    const start = textarea.selectionStart;
                    textarea.value = textarea.value.substring(0, start) + replacement + textarea.value.substring(start + query.length);
                    textarea.setSelectionRange(start + replacement.length, start + replacement.length);
                    addToHistory();
                    updateLineNumbers();
                    markUnsaved();
                }
                findText(1);
            }
        };
        
        // Save file
        const saveFile = (filename) => {
            const content = textarea.value;
            // Save to localStorage
            const savedFiles = JSON.parse(localStorage.getItem('textEditorFiles') || '{}');
            savedFiles[filename] = {
                content,
                modified: new Date().toISOString()
            };
            localStorage.setItem('textEditorFiles', JSON.stringify(savedFiles));
            editor.dataset.filename = filename;
            markSaved();
            
            // Update window title
            const titleEl = windowEl.querySelector('.window-title');
            if (titleEl) {
                titleEl.innerHTML = `<span style="margin-right: 8px;">📝</span> ${filename}`;
            }
            
            App.showNotification('📝', 'File Saved', `${filename} saved successfully`);
        };
        
        // Zoom
        const setZoom = (level) => {
            currentZoom = Math.max(50, Math.min(200, level));
            textarea.style.fontSize = (14 * currentZoom / 100) + 'px';
            lineNumbers.style.fontSize = (12 * currentZoom / 100) + 'px';
            zoomLevel.textContent = currentZoom + '%';
        };
        
        // Close menu on click outside
        const closeMenus = () => {
            editor.querySelectorAll('.te-menu-item.open').forEach(m => m.classList.remove('open'));
        };
        
        // Handle actions
        const handleAction = (action) => {
            switch(action) {
                case 'new':
                    if (editor.dataset.saved === 'false') {
                        if (!confirm('You have unsaved changes. Create new file anyway?')) return;
                    }
                    textarea.value = '';
                    editor.dataset.filename = 'Untitled';
                    lastSavedContent = '';
                    history = [''];
                    historyIndex = 0;
                    updateLineNumbers();
                    updatePosition();
                    markSaved();
                    break;
                    
                case 'open':
                    // Show saved files
                    const savedFiles = JSON.parse(localStorage.getItem('textEditorFiles') || '{}');
                    const fileList = Object.keys(savedFiles);
                    if (fileList.length === 0) {
                        App.showNotification('📂', 'No Files', 'No saved files found');
                    } else {
                        const filename = prompt('Enter filename to open:\n\nAvailable files:\n' + fileList.join('\n'));
                        if (filename && savedFiles[filename]) {
                            textarea.value = savedFiles[filename].content;
                            editor.dataset.filename = filename;
                            lastSavedContent = textarea.value;
                            history = [textarea.value];
                            historyIndex = 0;
                            updateLineNumbers();
                            updatePosition();
                            markSaved();
                        }
                    }
                    break;
                    
                case 'save':
                    const currentFilename = editor.dataset.filename;
                    if (currentFilename === 'Untitled') {
                        handleAction('save-as');
                    } else {
                        saveFile(currentFilename);
                    }
                    break;
                    
                case 'save-as':
                    const dialog = editor.querySelector('.te-save-dialog');
                    const input = dialog.querySelector('.te-save-filename');
                    input.value = editor.dataset.filename;
                    dialog.classList.remove('hidden');
                    input.focus();
                    input.select();
                    break;
                    
                case 'print':
                    const printContent = textarea.value;
                    const printWindow = window.open('', '_blank');
                    printWindow.document.write(`<pre style="font-family: monospace; white-space: pre-wrap;">${this.escapeHtml(printContent)}</pre>`);
                    printWindow.print();
                    printWindow.close();
                    break;
                    
                case 'close':
                    if (editor.dataset.saved === 'false') {
                        if (!confirm('You have unsaved changes. Close anyway?')) return;
                    }
                    windowEl.querySelector('.window-btn.close').click();
                    break;
                    
                case 'undo': undo(); break;
                case 'redo': redo(); break;
                    
                case 'cut':
                    document.execCommand('cut');
                    addToHistory();
                    updateLineNumbers();
                    markUnsaved();
                    break;
                    
                case 'copy':
                    document.execCommand('copy');
                    break;
                    
                case 'paste':
                    navigator.clipboard.readText().then(text => {
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        textarea.value = textarea.value.substring(0, start) + text + textarea.value.substring(end);
                        textarea.setSelectionRange(start + text.length, start + text.length);
                        addToHistory();
                        updateLineNumbers();
                        updatePosition();
                        markUnsaved();
                    }).catch(() => {
                        document.execCommand('paste');
                    });
                    break;
                    
                case 'delete':
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    if (start !== end) {
                        textarea.value = textarea.value.substring(0, start) + textarea.value.substring(end);
                        textarea.setSelectionRange(start, start);
                        addToHistory();
                        updateLineNumbers();
                        markUnsaved();
                    }
                    break;
                    
                case 'select-all':
                    textarea.select();
                    updatePosition();
                    break;
                    
                case 'find':
                    findbar.classList.remove('hidden');
                    replaceRow.classList.add('hidden');
                    findInput.focus();
                    break;
                    
                case 'find-replace':
                    findbar.classList.remove('hidden');
                    replaceRow.classList.remove('hidden');
                    findInput.focus();
                    break;
                    
                case 'close-find':
                    findbar.classList.add('hidden');
                    textarea.focus();
                    break;
                    
                case 'find-next': findText(1); break;
                case 'find-prev': findText(-1); break;
                case 'replace': replaceText(false); break;
                case 'replace-all': replaceText(true); break;
                    
                case 'goto-line':
                    const gotoDialog = editor.querySelector('.te-goto-dialog');
                    const gotoInput = gotoDialog.querySelector('.te-goto-input');
                    gotoInput.value = '';
                    gotoInput.max = textarea.value.split('\n').length;
                    gotoDialog.classList.remove('hidden');
                    gotoInput.focus();
                    break;
                    
                case 'toggle-line-numbers':
                    lineNumbers.classList.toggle('hidden');
                    const lnToggle = editor.querySelector('[data-action="toggle-line-numbers"]');
                    const isShown = !lineNumbers.classList.contains('hidden');
                    lnToggle.dataset.checked = isShown;
                    lnToggle.querySelector('.te-check').textContent = isShown ? '✓' : '';
                    break;
                    
                case 'toggle-word-wrap':
                    const isWrapped = textarea.style.whiteSpace !== 'pre';
                    textarea.style.whiteSpace = isWrapped ? 'pre' : 'pre-wrap';
                    textarea.style.overflowX = isWrapped ? 'auto' : 'hidden';
                    const wwToggle = editor.querySelector('[data-action="toggle-word-wrap"]');
                    wwToggle.dataset.checked = !isWrapped;
                    wwToggle.querySelector('.te-check').textContent = !isWrapped ? '✓' : '';
                    break;
                    
                case 'toggle-minimap':
                    const minimap = editor.querySelector('.te-minimap');
                    minimap.classList.toggle('hidden');
                    const mmToggle = editor.querySelector('[data-action="toggle-minimap"]');
                    const mmShown = !minimap.classList.contains('hidden');
                    mmToggle.dataset.checked = mmShown;
                    mmToggle.querySelector('.te-check').textContent = mmShown ? '✓' : '';
                    break;
                    
                case 'zoom-in': setZoom(currentZoom + 10); break;
                case 'zoom-out': setZoom(currentZoom - 10); break;
                case 'zoom-reset': setZoom(100); break;
                    
                case 'keyboard-shortcuts':
                    editor.querySelector('.te-shortcuts-dialog').classList.remove('hidden');
                    break;
                    
                case 'about':
                    editor.querySelector('.te-about-dialog').classList.remove('hidden');
                    break;
            }
            
            closeMenus();
        };
        
        // Event Listeners
        textarea.addEventListener('input', () => {
            updateLineNumbers();
            markUnsaved();
        });
        
        textarea.addEventListener('keyup', () => {
            updatePosition();
            addToHistory();
        });
        
        textarea.addEventListener('click', updatePosition);
        
        textarea.addEventListener('scroll', () => {
            lineNumbers.scrollTop = textarea.scrollTop;
        });
        
        // Menu handling
        editor.querySelectorAll('.te-menu-item').forEach(menu => {
            menu.addEventListener('click', (e) => {
                e.stopPropagation();
                const wasOpen = menu.classList.contains('open');
                closeMenus();
                if (!wasOpen) menu.classList.add('open');
            });
        });
        
        // Dropdown items
        editor.querySelectorAll('.te-dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = item.dataset.action;
                if (action) handleAction(action);
            });
        });
        
        // Toolbar buttons
        editor.querySelectorAll('.te-tool-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                handleAction(btn.dataset.action);
            });
        });
        
        // Find bar
        findInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                findText(e.shiftKey ? -1 : 1);
            } else if (e.key === 'Escape') {
                handleAction('close-find');
            }
        });
        
        editor.querySelectorAll('.te-find-btn, .te-replace-btn').forEach(btn => {
            btn.addEventListener('click', () => handleAction(btn.dataset.action));
        });
        
        // Dialog handling
        editor.querySelectorAll('.te-dialog').forEach(dialog => {
            dialog.addEventListener('click', (e) => {
                if (e.target === dialog) dialog.classList.add('hidden');
            });
            
            dialog.querySelectorAll('.te-dialog-btn.cancel, .te-dialog-btn.primary').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (btn.classList.contains('primary')) {
                        if (dialog.classList.contains('te-goto-dialog')) {
                            const line = parseInt(dialog.querySelector('.te-goto-input').value);
                            if (line > 0) {
                                const lines = textarea.value.split('\n');
                                let pos = 0;
                                for (let i = 0; i < Math.min(line - 1, lines.length); i++) {
                                    pos += lines[i].length + 1;
                                }
                                textarea.focus();
                                textarea.setSelectionRange(pos, pos);
                                updatePosition();
                            }
                        } else if (dialog.classList.contains('te-save-dialog')) {
                            const filename = dialog.querySelector('.te-save-filename').value.trim();
                            if (filename) saveFile(filename);
                        }
                    }
                    dialog.classList.add('hidden');
                });
            });
        });
        
        // Keyboard shortcuts
        textarea.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key.toLowerCase()) {
                    case 's':
                        e.preventDefault();
                        handleAction(e.shiftKey ? 'save-as' : 'save');
                        break;
                    case 'n':
                        e.preventDefault();
                        handleAction('new');
                        break;
                    case 'o':
                        e.preventDefault();
                        handleAction('open');
                        break;
                    case 'f':
                        e.preventDefault();
                        handleAction('find');
                        break;
                    case 'h':
                        e.preventDefault();
                        handleAction('find-replace');
                        break;
                    case 'g':
                        e.preventDefault();
                        handleAction('goto-line');
                        break;
                    case 'z':
                        e.preventDefault();
                        handleAction('undo');
                        break;
                    case 'y':
                        e.preventDefault();
                        handleAction('redo');
                        break;
                    case '=':
                    case '+':
                        e.preventDefault();
                        handleAction('zoom-in');
                        break;
                    case '-':
                        e.preventDefault();
                        handleAction('zoom-out');
                        break;
                    case '0':
                        e.preventDefault();
                        handleAction('zoom-reset');
                        break;
                }
            }
            
            // Tab handling
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                textarea.value = textarea.value.substring(0, start) + '    ' + textarea.value.substring(end);
                textarea.selectionStart = textarea.selectionEnd = start + 4;
                addToHistory();
                updateLineNumbers();
                markUnsaved();
            }
        });
        
        // Click outside to close menus
        editor.addEventListener('click', closeMenus);
        
        // Initial setup
        updateLineNumbers();
        updatePosition();
        textarea.focus();
    },
    
    // Helper: Escape HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
