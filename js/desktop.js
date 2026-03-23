// Desktop - Handles desktop icons and interactions

const Desktop = {
    backgrounds: [
        'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1920&q=80',
        'https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=1920&q=80',
        'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=80',
        'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1920&q=80',
        'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=1920&q=80',
        'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&q=80',
        'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=1920&q=80'
    ],
    currentBgIndex: 0,
    selectedIcon: null,
    gridSize: 100, // Grid snap size for icons
    iconPositions: {}, // Store icon positions

    init() {
        this.initDesktopIcons();
        this.initDraggableIcons();
        this.initKeyboardShortcuts();
        this.initActivitiesButton();
        this.initShowAppsButton();
        this.positionIcons();
    },

    positionIcons() {
        // Position icons in a grid on the right side of desktop
        const icons = document.querySelectorAll('.desktop-icon');
        let col = 0;
        let row = 0;
        const startX = 20;
        const startY = 20;
        const maxRows = Math.floor((window.innerHeight - 100) / this.gridSize);
        
        icons.forEach((icon, index) => {
            const x = startX + col * this.gridSize;
            const y = startY + row * this.gridSize;
            icon.style.left = x + 'px';
            icon.style.top = y + 'px';
            icon.dataset.gridX = col;
            icon.dataset.gridY = row;
            
            row++;
            if (row >= maxRows) {
                row = 0;
                col++;
            }
        });
    },

    initDraggableIcons() {
        const icons = document.querySelectorAll('.desktop-icon');
        
        icons.forEach(icon => {
            let isDragging = false;
            let startX, startY;
            let initialX, initialY;

            icon.addEventListener('mousedown', (e) => {
                if (e.button !== 0) return; // Left click only
                
                isDragging = true;
                icon.classList.add('dragging');
                
                startX = e.clientX;
                startY = e.clientY;
                initialX = icon.offsetLeft;
                initialY = icon.offsetTop;
                
                e.preventDefault();
            });

            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                
                icon.style.left = (initialX + dx) + 'px';
                icon.style.top = (initialY + dy) + 'px';
            });

            document.addEventListener('mouseup', (e) => {
                if (!isDragging) return;
                isDragging = false;
                icon.classList.remove('dragging');
                
                // Snap to grid
                const desktopArea = document.getElementById('desktop-area');
                const rect = desktopArea.getBoundingClientRect();
                
                let x = icon.offsetLeft;
                let y = icon.offsetTop;
                
                // Constrain to desktop area
                x = Math.max(0, Math.min(x, rect.width - 90));
                y = Math.max(0, Math.min(y, rect.height - 100));
                
                // Snap to grid
                x = Math.round(x / this.gridSize) * this.gridSize;
                y = Math.round(y / this.gridSize) * this.gridSize;
                
                icon.style.left = x + 'px';
                icon.style.top = y + 'px';
            });
        });
    },

    initDesktopIcons() {
        const icons = document.querySelectorAll('.desktop-icon');
        
        icons.forEach(icon => {
            // Single click to select
            icon.addEventListener('click', (e) => {
                e.stopPropagation();
                App.playSound('sound-click');
                this.selectIcon(icon);
            });

            // Double click to open
            icon.addEventListener('dblclick', () => {
                App.playSound('sound-open');
                this.openIcon(icon);
            });
        });

        // Click on desktop to deselect
        document.getElementById('desktop-area').addEventListener('click', () => {
            this.deselectAll();
        });
    },

    initActivitiesButton() {
        const activitiesBtn = document.getElementById('activities-btn');
        
        activitiesBtn.addEventListener('click', () => {
            App.playSound('sound-click');
            this.toggleActivitiesOverview();
        });

        // Hot corner - top left
        document.addEventListener('mousemove', (e) => {
            if (e.clientX === 0 && e.clientY === 0) {
                this.toggleActivitiesOverview(true);
            }
        });
    },

    initShowAppsButton() {
        const showAppsBtn = document.getElementById('show-apps-btn');
        if (showAppsBtn) {
            showAppsBtn.addEventListener('click', () => {
                App.playSound('sound-click');
                this.showAppGrid();
            });
        }
    },

    showAppGrid() {
        let overlay = document.getElementById('app-grid-overlay');
        if (overlay) {
            overlay.remove();
            return;
        }

        overlay = document.createElement('div');
        overlay.id = 'app-grid-overlay';
        overlay.className = 'activities-overview';
        overlay.innerHTML = `
            <div class="activities-search">
                <input type="text" placeholder="Type to search..." id="app-search" autofocus>
            </div>
            <div class="app-grid" id="app-grid">
                <div class="app-grid-item" data-app="files">
                    <div class="app-icon">📁</div>
                    <div class="app-name">Files</div>
                </div>
                <div class="app-grid-item" data-app="terminal">
                    <div class="app-icon">⬛</div>
                    <div class="app-name">Terminal</div>
                </div>
                <div class="app-grid-item" data-app="browser">
                    <div class="app-icon">🦊</div>
                    <div class="app-name">Firefox</div>
                </div>
                <div class="app-grid-item" data-app="text-editor">
                    <div class="app-icon">📝</div>
                    <div class="app-name">Text Editor</div>
                </div>
                <div class="app-grid-item" data-app="about">
                    <div class="app-icon">👤</div>
                    <div class="app-name">About Me</div>
                </div>
                <div class="app-grid-item" data-app="settings">
                    <div class="app-icon">⚙️</div>
                    <div class="app-name">Settings</div>
                </div>
                <div class="app-grid-item" data-app="github">
                    <div class="app-icon">🐙</div>
                    <div class="app-name">GitHub</div>
                </div>
            </div>
        `;

        document.getElementById('desktop').appendChild(overlay);

        // App clicks
        overlay.querySelectorAll('.app-grid-item').forEach(item => {
            item.addEventListener('click', () => {
                const app = item.dataset.app;
                App.playSound('sound-open');
                WindowManager.openApp(app);
                overlay.remove();
            });
        });

        // Search functionality
        const searchInput = overlay.querySelector('#app-search');
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            overlay.querySelectorAll('.app-grid-item').forEach(item => {
                const name = item.querySelector('.app-name').textContent.toLowerCase();
                item.style.display = name.includes(query) ? '' : 'none';
            });
        });

        // Close handlers
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });

        document.addEventListener('keydown', function handler(e) {
            if (e.key === 'Escape' && overlay.parentNode) {
                overlay.remove();
                document.removeEventListener('keydown', handler);
            }
        });
    },

    toggleActivitiesOverview(forceOpen = false) {
        let overview = document.getElementById('activities-overview');
        const activitiesBtn = document.getElementById('activities-btn');
        
        if (overview && !forceOpen) {
            overview.remove();
            activitiesBtn.classList.remove('active');
            return;
        }

        if (overview) return; // Already open

        activitiesBtn.classList.add('active');
        overview = document.createElement('div');
        overview.id = 'activities-overview';
        
        const windowPreviews = WindowManager.windows.map(w => `
            <div class="activity-window-preview" data-window-id="${w.id}">
                <div class="preview-close">✕</div>
                <div class="preview-header">
                    ${w.element.querySelector('.window-title').innerHTML}
                </div>
                <div class="preview-content">
                    ${w.app} window
                </div>
            </div>
        `).join('');

        overview.innerHTML = `
            <div class="activities-search">
                <input type="text" placeholder="Type to search..." autofocus>
            </div>
            <div class="activities-windows">
                ${windowPreviews || '<div class="activities-empty">No open windows</div>'}
            </div>
            <div class="workspaces-indicator">
                <div class="workspace-thumb active"></div>
                <div class="workspace-thumb add-workspace">+</div>
            </div>
        `;

        document.getElementById('desktop').appendChild(overview);

        // Click on preview to focus window
        overview.querySelectorAll('.activity-window-preview').forEach(preview => {
            preview.addEventListener('click', (e) => {
                if (e.target.classList.contains('preview-close')) {
                    // Close the window
                    const windowId = preview.dataset.windowId;
                    const windowData = WindowManager.windows.find(w => w.id === windowId);
                    if (windowData) {
                        WindowManager.closeWindow(windowData);
                    }
                    preview.remove();
                    if (overview.querySelectorAll('.activity-window-preview').length === 0) {
                        overview.querySelector('.activities-windows').innerHTML = '<div class="activities-empty">No open windows</div>';
                    }
                    return;
                }
                
                const windowId = preview.dataset.windowId;
                const windowData = WindowManager.windows.find(w => w.id === windowId);
                if (windowData) {
                    windowData.element.classList.remove('minimized');
                    WindowManager.focusWindow(windowData);
                }
                overview.remove();
                activitiesBtn.classList.remove('active');
            });
        });

        // Search
        const searchInput = overview.querySelector('input');
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            overview.querySelectorAll('.activity-window-preview').forEach(preview => {
                const title = preview.querySelector('.preview-header').textContent.toLowerCase();
                preview.style.display = title.includes(query) ? '' : 'none';
            });
        });

        // Close on click outside or Escape
        overview.addEventListener('click', (e) => {
            if (e.target === overview) {
                overview.remove();
                activitiesBtn.classList.remove('active');
            }
        });

        document.addEventListener('keydown', function handler(e) {
            if (e.key === 'Escape' && overview.parentNode) {
                overview.remove();
                activitiesBtn.classList.remove('active');
                document.removeEventListener('keydown', handler);
            }
        });
    },

    selectIcon(icon) {
        this.deselectAll();
        icon.classList.add('selected');
        this.selectedIcon = icon;
    },

    deselectAll() {
        document.querySelectorAll('.desktop-icon').forEach(i => {
            i.classList.remove('selected');
        });
        this.selectedIcon = null;
    },

    openIcon(icon) {
        const type = icon.dataset.type;
        const path = icon.dataset.path;

        switch (type) {
            case 'folder':
                WindowManager.openApp('files', { path });
                break;
            case 'file':
                const content = icon.dataset.content;
                const name = icon.querySelector('.icon-label').textContent;
                if (content && FileContents[content]) {
                    WindowManager.openApp('text-editor', {
                        title: name,
                        filename: name,
                        content: FileContents[content]
                    });
                }
                break;
            case 'link':
                const url = icon.dataset.url;
                if (url) {
                    window.open(url, '_blank');
                }
                break;
        }
    },

    changeBackground() {
        this.currentBgIndex = (this.currentBgIndex + 1) % this.backgrounds.length;
        const desktop = document.getElementById('desktop');
        desktop.style.backgroundImage = `url('${this.backgrounds[this.currentBgIndex]}')`;
    },

    initKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Super key (Windows key) for activities
            if (e.key === 'Meta' || e.key === 'Super') {
                this.toggleActivitiesOverview();
            }

            // Enter to open selected icon
            if (e.key === 'Enter' && this.selectedIcon) {
                this.openIcon(this.selectedIcon);
            }

            // Delete - just deselect (no actual delete in portfolio)
            if (e.key === 'Delete' && this.selectedIcon) {
                this.deselectAll();
            }

            // Escape to deselect
            if (e.key === 'Escape') {
                this.deselectAll();
                document.getElementById('context-menu').classList.add('hidden');
                document.getElementById('system-menu').classList.add('hidden');
                document.getElementById('calendar-dropdown').classList.add('hidden');
            }
        });
    }
};
