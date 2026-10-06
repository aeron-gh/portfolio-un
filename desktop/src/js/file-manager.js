// File Manager - Nautilus-style file browser (Ubuntu Files)

const FileManager = {
    currentPath: '/home/abhishek',
    showHidden: false,
    viewMode: 'grid', // 'grid' or 'list'

    init() {
        // File manager is initialized when window opens
    },

    getWindowContent(path) {
        const pathParts = FileSystem.getPathParts(path);
        const breadcrumb = pathParts.map((part, i) => 
            `<span class="breadcrumb-item" data-path="${part.path}">${part.name === '/' ? 'Computer' : part.name}</span>`
        ).join('<span class="breadcrumb-sep">/</span>');

        return `
            <div class="file-manager nautilus">
                <div class="fm-header">
                    <div class="fm-nav-buttons">
                        <button class="fm-nav-btn fm-back" title="Back (Alt+Left)" disabled>
                            <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
                        </button>
                        <button class="fm-nav-btn fm-forward" title="Forward (Alt+Right)" disabled>
                            <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>
                        </button>
                    </div>
                    <div class="fm-breadcrumb">${breadcrumb}</div>
                    <div class="fm-header-actions">
                        <button class="fm-action-btn fm-view-toggle" title="Toggle view">
                            <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z"/></svg>
                        </button>
                        <button class="fm-action-btn fm-search-btn" title="Search">
                            <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                        </button>
                        <button class="fm-action-btn fm-menu-btn" title="Menu">
                            <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                        </button>
                    </div>
                </div>
                <div class="fm-search-bar hidden">
                    <input type="text" class="fm-search-input" placeholder="Search files...">
                </div>
                <div class="fm-body">
                    <div class="fm-sidebar">
                        <div class="fm-sidebar-section">
                            <span class="fm-sidebar-title">Places</span>
                        </div>
                        <div class="fm-sidebar-item" data-path="/home/abhishek">
                            <span class="fm-sidebar-icon">📁</span>
                            <span>Home</span>
                        </div>
                        <div class="fm-sidebar-item" data-path="/home/abhishek/Desktop">
                            <span class="fm-sidebar-icon">🖥️</span>
                            <span>Desktop</span>
                        </div>
                        <div class="fm-sidebar-item" data-path="/home/abhishek/Documents">
                            <span class="fm-sidebar-icon">📁</span>
                            <span>Documents</span>
                        </div>
                        <div class="fm-sidebar-item" data-path="/home/abhishek/Downloads">
                            <span class="fm-sidebar-icon">⬇️</span>
                            <span>Downloads</span>
                        </div>
                        <div class="fm-sidebar-item" data-path="/home/abhishek/Music">
                            <span class="fm-sidebar-icon">🎵</span>
                            <span>Music</span>
                        </div>
                        <div class="fm-sidebar-item" data-path="/home/abhishek/Pictures">
                            <span class="fm-sidebar-icon">🖼️</span>
                            <span>Pictures</span>
                        </div>
                        <div class="fm-sidebar-item" data-path="/home/abhishek/Videos">
                            <span class="fm-sidebar-icon">🎬</span>
                            <span>Videos</span>
                        </div>
                        <div class="fm-sidebar-divider"></div>
                        <div class="fm-sidebar-section">
                            <span class="fm-sidebar-title">Bookmarks</span>
                        </div>
                        <div class="fm-sidebar-item" data-path="/home/abhishek/about_abhishek">
                            <span class="fm-sidebar-icon">⭐</span>
                            <span>about_abhishek</span>
                        </div>
                        <div class="fm-sidebar-item" data-path="/home/abhishek/about_abhishek/projects">
                            <span class="fm-sidebar-icon">💼</span>
                            <span>Projects</span>
                        </div>
                        <div class="fm-sidebar-item fm-sidebar-music" data-app="music-player">
                            <span class="fm-sidebar-icon">🎧</span>
                            <span>Aeron Fav Songs</span>
                        </div>
                        <div class="fm-sidebar-divider"></div>
                        <div class="fm-sidebar-section">
                            <span class="fm-sidebar-title">Devices</span>
                        </div>
                        <div class="fm-sidebar-item" data-path="/">
                            <span class="fm-sidebar-icon">💾</span>
                            <span>Computer</span>
                        </div>
                    </div>
                    <div class="fm-content">
                        <div class="fm-files fm-view-grid">
                            ${this.renderFiles(path)}
                        </div>
                    </div>
                </div>
                <div class="fm-statusbar">
                    <span class="fm-status-text"></span>
                    <span class="fm-status-path">${path}</span>
                </div>
            </div>
        `;
    },

    renderFiles(path) {
        const children = FileSystem.getChildren(path, this.showHidden);
        
        if (children.length === 0) {
            return `
                <div class="fm-empty">
                    <div class="fm-empty-icon">📂</div>
                    <div class="fm-empty-text">Folder is empty</div>
                </div>
            `;
        }

        // Sort: folders first, then files, alphabetically
        const sorted = children.sort((a, b) => {
            if (a.type === 'folder' && b.type !== 'folder') return -1;
            if (a.type !== 'folder' && b.type === 'folder') return 1;
            return a.name.localeCompare(b.name);
        });

        return sorted.map(item => {
            let icon = this.getFileIcon(item);
            const isFolder = item.type === 'folder' || item.type === 'link-folder';
            
            return `
                <div class="fm-file ${isFolder ? 'fm-folder' : ''}" 
                     data-name="${item.name}" 
                     data-type="${item.type}"
                     data-path="${path === '/' ? '' : path}/${item.name}"
                     ${item.url ? `data-url="${item.url}"` : ''}
                     ${item.content ? `data-content="${item.content}"` : ''}
                     ${item.target ? `data-target="${item.target}"` : ''}
                     ${item.description ? `title="${item.description}"` : ''}>
                    <div class="fm-file-icon">${icon}</div>
                    <div class="fm-file-name">${item.name}</div>
                </div>
            `;
        }).join('');
    },

    getFileIcon(item) {
        // Return appropriate icon based on type and extension
        if (item.icon) return item.icon;
        if (item.type === 'folder' || item.type === 'link-folder') return '📁';
        if (item.type === 'link') return '🔗';
        if (item.type === 'audio') return '🎵';
        
        // Check extension
        const ext = item.name.split('.').pop().toLowerCase();
        const iconMap = {
            'txt': '📄', 'md': '📝', 'pdf': '📕',
            'js': '📜', 'ts': '📜', 'py': '🐍', 'cpp': '⚙️', 'c': '⚙️',
            'html': '🌐', 'css': '🎨', 'json': '📋',
            'png': '🖼️', 'jpg': '🖼️', 'jpeg': '🖼️', 'gif': '🖼️', 'svg': '🖼️',
            'mp3': '🎵', 'wav': '🎵', 'ogg': '🎵',
            'mp4': '🎬', 'mkv': '🎬', 'avi': '🎬',
            'zip': '📦', 'tar': '📦', 'gz': '📦',
            'sh': '⚡', 'bash': '⚡'
        };
        return iconMap[ext] || '📄';
    },

    initWindow(windowEl, initialPath) {
        const fm = windowEl.querySelector('.file-manager');
        const filesContainer = fm.querySelector('.fm-files');
        const breadcrumb = fm.querySelector('.fm-breadcrumb');
        const statusText = fm.querySelector('.fm-status-text');
        const statusPath = fm.querySelector('.fm-status-path');
        const sidebar = fm.querySelector('.fm-sidebar');
        const searchBar = fm.querySelector('.fm-search-bar');
        const searchInput = fm.querySelector('.fm-search-input');
        const searchBtn = fm.querySelector('.fm-search-btn');
        const viewToggle = fm.querySelector('.fm-view-toggle');
        const backBtn = fm.querySelector('.fm-back');
        const forwardBtn = fm.querySelector('.fm-forward');

        let currentPath = initialPath;
        let history = [initialPath];
        let historyIndex = 0;
        let selectedFiles = [];

        const updateBreadcrumb = (path) => {
            const pathParts = FileSystem.getPathParts(path);
            breadcrumb.innerHTML = pathParts.map((part, i) => 
                `<span class="breadcrumb-item${i === pathParts.length - 1 ? ' current' : ''}" data-path="${part.path}">${part.name === '/' ? 'Computer' : part.name}</span>`
            ).join('<span class="breadcrumb-sep">›</span>');

            // Reinit breadcrumb click handlers
            breadcrumb.querySelectorAll('.breadcrumb-item').forEach(item => {
                item.addEventListener('click', () => {
                    navigateTo(item.dataset.path);
                });
            });
        };

        const navigateTo = (path, addToHistory = true) => {
            // Update history
            if (addToHistory && path !== history[historyIndex]) {
                history = history.slice(0, historyIndex + 1);
                history.push(path);
                historyIndex = history.length - 1;
            }

            currentPath = path;
            filesContainer.innerHTML = this.renderFiles(path);
            updateBreadcrumb(path);
            statusPath.textContent = path;
            
            // Update sidebar active state
            sidebar.querySelectorAll('.fm-sidebar-item').forEach(item => {
                item.classList.toggle('active', item.dataset.path === path);
            });

            // Update status
            const children = FileSystem.getChildren(path, this.showHidden);
            const folderCount = children.filter(c => c.type === 'folder' || c.type === 'link-folder').length;
            const fileCount = children.length - folderCount;
            
            let statusParts = [];
            if (folderCount > 0) statusParts.push(`${folderCount} folder${folderCount !== 1 ? 's' : ''}`);
            if (fileCount > 0) statusParts.push(`${fileCount} item${fileCount !== 1 ? 's' : ''}`);
            statusText.textContent = statusParts.join(', ') || 'Empty folder';

            // Update nav buttons
            backBtn.disabled = historyIndex <= 0;
            forwardBtn.disabled = historyIndex >= history.length - 1;

            // Reinit file handlers
            initFileHandlers();
            selectedFiles = [];
        };

        const initFileHandlers = () => {
            filesContainer.querySelectorAll('.fm-file').forEach(file => {
                // Single click to select
                file.addEventListener('click', (e) => {
                    if (!e.ctrlKey && !e.metaKey) {
                        filesContainer.querySelectorAll('.fm-file').forEach(f => f.classList.remove('selected'));
                        selectedFiles = [];
                    }
                    file.classList.toggle('selected');
                    if (file.classList.contains('selected')) {
                        selectedFiles.push(file);
                    } else {
                        selectedFiles = selectedFiles.filter(f => f !== file);
                    }
                    updateSelectionStatus();
                });

                // Double click to open
                file.addEventListener('dblclick', () => {
                    this.openFile(file, navigateTo);
                });
            });
        };

        const updateSelectionStatus = () => {
            if (selectedFiles.length > 0) {
                statusText.textContent = `${selectedFiles.length} item${selectedFiles.length !== 1 ? 's' : ''} selected`;
            } else {
                const children = FileSystem.getChildren(currentPath, this.showHidden);
                statusText.textContent = `${children.length} item${children.length !== 1 ? 's' : ''}`;
            }
        };

        // Navigation buttons
        backBtn.addEventListener('click', () => {
            if (historyIndex > 0) {
                historyIndex--;
                navigateTo(history[historyIndex], false);
            }
        });

        forwardBtn.addEventListener('click', () => {
            if (historyIndex < history.length - 1) {
                historyIndex++;
                navigateTo(history[historyIndex], false);
            }
        });

        // Sidebar handlers
        sidebar.querySelectorAll('.fm-sidebar-item').forEach(item => {
            item.addEventListener('click', () => {
                navigateTo(item.dataset.path);
            });
        });

        // Search toggle
        searchBtn.addEventListener('click', () => {
            searchBar.classList.toggle('hidden');
            if (!searchBar.classList.contains('hidden')) {
                searchInput.focus();
            }
        });

        // Search functionality
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            filesContainer.querySelectorAll('.fm-file').forEach(file => {
                const name = file.dataset.name.toLowerCase();
                file.style.display = name.includes(query) ? '' : 'none';
            });
        });

        // View toggle
        viewToggle.addEventListener('click', () => {
            const isGrid = filesContainer.classList.contains('fm-view-grid');
            filesContainer.classList.toggle('fm-view-grid', !isGrid);
            filesContainer.classList.toggle('fm-view-list', isGrid);
        });

        // Keyboard shortcuts
        windowEl.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' || (e.altKey && e.key === 'ArrowUp')) {
                e.preventDefault();
                const parentPath = FileSystem.getParentPath(currentPath);
                if (parentPath !== currentPath) {
                    navigateTo(parentPath);
                }
            }
            if (e.altKey && e.key === 'ArrowLeft') {
                e.preventDefault();
                backBtn.click();
            }
            if (e.altKey && e.key === 'ArrowRight') {
                e.preventDefault();
                forwardBtn.click();
            }
            if (e.key === 'Enter' && selectedFiles.length === 1) {
                this.openFile(selectedFiles[0], navigateTo);
            }
            if (e.ctrlKey && e.key === 'h') {
                e.preventDefault();
                this.showHidden = !this.showHidden;
                navigateTo(currentPath, false);
            }
            if (e.ctrlKey && e.key === 'f') {
                e.preventDefault();
                searchBtn.click();
            }
        });

        // Context menu for files
        filesContainer.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            // Could add right-click menu here
        });

        // Click empty area to deselect
        filesContainer.addEventListener('click', (e) => {
            if (e.target === filesContainer) {
                filesContainer.querySelectorAll('.fm-file').forEach(f => f.classList.remove('selected'));
                selectedFiles = [];
                updateSelectionStatus();
            }
        });

        // Initial setup
        initFileHandlers();
        updateBreadcrumb(currentPath);
        sidebar.querySelectorAll('.fm-sidebar-item').forEach(item => {
            item.classList.toggle('active', item.dataset.path === currentPath);
        });
        const children = FileSystem.getChildren(currentPath, this.showHidden);
        statusText.textContent = `${children.length} item${children.length !== 1 ? 's' : ''}`;
    },

    openFile(fileEl, navigateTo) {
        const type = fileEl.dataset.type;
        const path = fileEl.dataset.path;
        const name = fileEl.dataset.name;

        switch (type) {
            case 'folder':
            case 'link-folder':
                const targetPath = fileEl.dataset.target || path;
                // Check if it's the music folder
                if (path.includes('aeron fav songs') || targetPath.includes('aeron fav songs')) {
                    WindowManager.openApp('music-player');
                } else if (navigateTo) {
                    navigateTo(targetPath);
                }
                break;

            case 'audio':
                // Open music player for audio files
                WindowManager.openApp('music-player');
                break;

            case 'file':
                const content = fileEl.dataset.content;
                if (content && FileContents[content]) {
                    WindowManager.openApp('text-editor', {
                        title: name,
                        filename: name,
                        content: FileContents[content],
                        allowMultiple: true
                    });
                }
                break;

            case 'link':
                const url = fileEl.dataset.url;
                if (url) {
                    window.open(url, '_blank');
                }
                break;
        }
    }
};
