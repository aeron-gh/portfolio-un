// Desktop - Handles desktop icons and interactions

const Desktop = {
    backgrounds: [
        // Official Ubuntu wallpapers
        'https://ubuntucommunity.s3.us-east-2.amazonaws.com/original/3X/7/6/76e37f6ab91c7e4ef2b4e0c4d84fc0063da6f4cc.jpeg', // Ubuntu 24.04 Noble Numbat
        'https://ubuntucommunity.s3.us-east-2.amazonaws.com/original/3X/f/4/f4f0a25fc5ad53fce6481bdf98ae951b24cf2d94.jpeg', // Ubuntu 23.10 Mantic Minotaur
        'https://ubuntucommunity.s3.us-east-2.amazonaws.com/original/3X/4/2/425e6e32b2a6d9a2a0a7f3b1e8d7f2c4a3b5e6d7.jpeg', // Ubuntu gradient
        'https://raw.githubusercontent.com/ubuntu/yaru/master/backgrounds/Jammy-Jellyfish_WP_1920x1080.png', // Ubuntu 22.04
        'https://512pixels.net/downloads/macos-wallpapers-thumbs/10-14-Day-Thumb.jpg', // Gradient backup
    ],
    // Default Ubuntu wallpaper (Jammy Jellyfish style gradient)
    defaultWallpaper: 'linear-gradient(135deg, #E95420 0%, #772953 50%, #2C001E 100%)',
    currentBgIndex: -1, // Start with default gradient
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
        // Position icons in a grid on the bottom right corner of desktop
        const icons = document.querySelectorAll('.desktop-icon');
        const desktopArea = document.getElementById('desktop-area');
        const areaWidth = desktopArea ? desktopArea.offsetWidth : window.innerWidth - 80;
        const areaHeight = desktopArea ? desktopArea.offsetHeight : window.innerHeight - 60;
        
        const totalIcons = icons.length;
        const maxCols = Math.ceil(totalIcons / Math.ceil(Math.sqrt(totalIcons)));
        
        // Start from bottom right
        const startX = areaWidth - this.gridSize - 20;
        const startY = areaHeight - this.gridSize - 20;
        
        let col = 0;
        let row = 0;
        const maxRows = Math.floor((areaHeight - 100) / this.gridSize);
        
        icons.forEach((icon, index) => {
            // Position from bottom right, going up then left
            const x = startX - col * this.gridSize;
            const y = startY - row * this.gridSize;
            icon.style.left = x + 'px';
            icon.style.top = y + 'px';
            icon.dataset.gridX = col;
            icon.dataset.gridY = row;
            
            row++;
            if (row >= maxRows || y - this.gridSize < 0) {
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
        overlay.className = 'ubuntu-app-grid-overlay';
        overlay.innerHTML = `
            <div class="ubuntu-app-grid-container">
                <div class="ubuntu-search-container">
                    <div class="ubuntu-search-box">
                        <svg class="ubuntu-search-icon" viewBox="0 0 16 16" width="16" height="16">
                            <path fill="currentColor" d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                        </svg>
                        <input type="text" placeholder="Type to search..." id="app-search" autofocus>
                    </div>
                </div>
                <div class="ubuntu-app-grid" id="app-grid">
                    <div class="ubuntu-app-item" data-app="files">
                        <div class="ubuntu-app-icon ubuntu-icon-files">
                            <svg viewBox="0 0 48 48" width="48" height="48">
                                <rect x="4" y="8" width="40" height="32" rx="3" fill="#3D3846"/>
                                <path d="M4 14h40v23a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V14z" fill="#5E5C64"/>
                                <path d="M4 11a3 3 0 0 1 3-3h12l4 4h18a3 3 0 0 1 3 3v2H4v-6z" fill="#8B8780"/>
                            </svg>
                        </div>
                        <span class="ubuntu-app-name">Files</span>
                    </div>
                    <div class="ubuntu-app-item" data-app="browser">
                        <div class="ubuntu-app-icon ubuntu-icon-firefox">
                            <svg viewBox="0 0 48 48" width="48" height="48">
                                <circle cx="24" cy="24" r="20" fill="#FF7139"/>
                                <circle cx="24" cy="24" r="14" fill="#FF9F5A"/>
                                <path d="M24 10c-7.7 0-14 6.3-14 14s6.3 14 14 14c1.5 0 3-.2 4.4-.7-3.4-1.2-6.4-5.6-6.4-10.3 0-6 4-11 9.5-12.3-2.2-.5-4.5-.7-7.5-.7z" fill="#FF3B30"/>
                            </svg>
                        </div>
                        <span class="ubuntu-app-name">Firefox</span>
                    </div>
                    <div class="ubuntu-app-item" data-app="terminal">
                        <div class="ubuntu-app-icon ubuntu-icon-terminal">
                            <svg viewBox="0 0 48 48" width="48" height="48">
                                <rect x="4" y="8" width="40" height="32" rx="3" fill="#300A24"/>
                                <path d="M12 18l6 6-6 6" stroke="#8AE234" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                                <line x1="22" y1="30" x2="36" y2="30" stroke="#EEEEEC" stroke-width="2.5" stroke-linecap="round"/>
                            </svg>
                        </div>
                        <span class="ubuntu-app-name">Terminal</span>
                    </div>
                    <div class="ubuntu-app-item" data-app="text-editor">
                        <div class="ubuntu-app-icon ubuntu-icon-editor">
                            <svg viewBox="0 0 48 48" width="48" height="48">
                                <rect x="8" y="4" width="32" height="40" rx="2" fill="#FFFFFF"/>
                                <rect x="8" y="4" width="32" height="8" fill="#3584E4"/>
                                <line x1="14" y1="18" x2="34" y2="18" stroke="#CCCCCC" stroke-width="2"/>
                                <line x1="14" y1="24" x2="30" y2="24" stroke="#CCCCCC" stroke-width="2"/>
                                <line x1="14" y1="30" x2="32" y2="30" stroke="#CCCCCC" stroke-width="2"/>
                                <line x1="14" y1="36" x2="26" y2="36" stroke="#CCCCCC" stroke-width="2"/>
                            </svg>
                        </div>
                        <span class="ubuntu-app-name">Text Editor</span>
                    </div>
                    <div class="ubuntu-app-item" data-app="settings">
                        <div class="ubuntu-app-icon ubuntu-icon-settings">
                            <svg viewBox="0 0 48 48" width="48" height="48">
                                <circle cx="24" cy="24" r="20" fill="#5E5C64"/>
                                <path d="M24 8v4M24 36v4M8 24h4M36 24h4M12.7 12.7l2.8 2.8M32.5 32.5l2.8 2.8M12.7 35.3l2.8-2.8M32.5 15.5l2.8-2.8" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>
                                <circle cx="24" cy="24" r="8" fill="#3D3846"/>
                                <circle cx="24" cy="24" r="4" fill="#FFFFFF"/>
                            </svg>
                        </div>
                        <span class="ubuntu-app-name">Settings</span>
                    </div>
                    <div class="ubuntu-app-item" data-app="about">
                        <div class="ubuntu-app-icon ubuntu-icon-about">
                            <svg viewBox="0 0 48 48" width="48" height="48">
                                <circle cx="24" cy="24" r="20" fill="#E95420"/>
                                <circle cx="24" cy="16" r="6" fill="#FFFFFF"/>
                                <path d="M14 38c0-8 4.5-12 10-12s10 4 10 12" fill="#FFFFFF"/>
                            </svg>
                        </div>
                        <span class="ubuntu-app-name">About Me</span>
                    </div>
                    <div class="ubuntu-app-item" data-app="github">
                        <div class="ubuntu-app-icon ubuntu-icon-github">
                            <svg viewBox="0 0 48 48" width="48" height="48">
                                <circle cx="24" cy="24" r="20" fill="#24292F"/>
                                <path d="M24 8C15.2 8 8 15.2 8 24c0 7.1 4.6 13.1 11 15.2.8.1 1.1-.4 1.1-.8v-2.8c-4.5 1-5.4-2.2-5.4-2.2-.7-1.9-1.8-2.4-1.8-2.4-1.5-1 .1-1 .1-1 1.6.1 2.5 1.7 2.5 1.7 1.5 2.5 3.8 1.8 4.7 1.4.1-1.1.6-1.8 1-2.2-3.6-.4-7.3-1.8-7.3-8 0-1.8.6-3.2 1.7-4.4-.2-.4-.7-2.1.2-4.3 0 0 1.4-.4 4.5 1.7 1.3-.4 2.7-.5 4.1-.5s2.8.2 4.1.5c3.1-2.1 4.5-1.7 4.5-1.7.9 2.2.4 3.9.2 4.3 1 1.1 1.7 2.6 1.7 4.4 0 6.3-3.8 7.6-7.4 8 .6.5 1.1 1.5 1.1 3v4.5c0 .4.3.9 1.1.8 6.4-2.1 11-8.1 11-15.2C40 15.2 32.8 8 24 8z" fill="#FFFFFF"/>
                            </svg>
                        </div>
                        <span class="ubuntu-app-name">GitHub</span>
                    </div>
                    <div class="ubuntu-app-item" data-app="calculator">
                        <div class="ubuntu-app-icon ubuntu-icon-calculator">
                            <svg viewBox="0 0 48 48" width="48" height="48">
                                <rect x="8" y="4" width="32" height="40" rx="4" fill="#3D3846"/>
                                <rect x="12" y="8" width="24" height="10" rx="2" fill="#62A0EA"/>
                                <rect x="12" y="22" width="6" height="6" rx="1" fill="#5E5C64"/>
                                <rect x="21" y="22" width="6" height="6" rx="1" fill="#5E5C64"/>
                                <rect x="30" y="22" width="6" height="6" rx="1" fill="#E95420"/>
                                <rect x="12" y="31" width="6" height="6" rx="1" fill="#5E5C64"/>
                                <rect x="21" y="31" width="6" height="6" rx="1" fill="#5E5C64"/>
                                <rect x="30" y="31" width="6" height="6" rx="1" fill="#E95420"/>
                            </svg>
                        </div>
                        <span class="ubuntu-app-name">Calculator</span>
                    </div>
                    <div class="ubuntu-app-item" data-app="image-viewer">
                        <div class="ubuntu-app-icon ubuntu-icon-photos">
                            <svg viewBox="0 0 48 48" width="48" height="48">
                                <rect x="4" y="8" width="40" height="32" rx="3" fill="#26A269"/>
                                <circle cx="16" cy="18" r="4" fill="#FFC107"/>
                                <path d="M4 32l12-10 8 8 10-12 10 10v9a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-5z" fill="#2EC27E"/>
                            </svg>
                        </div>
                        <span class="ubuntu-app-name">Photos</span>
                    </div>
                    <div class="ubuntu-app-item" data-app="music">
                        <div class="ubuntu-app-icon ubuntu-icon-music">
                            <svg viewBox="0 0 48 48" width="48" height="48">
                                <circle cx="24" cy="24" r="20" fill="#FF7800"/>
                                <circle cx="24" cy="24" r="8" fill="#1C1C1C"/>
                                <circle cx="24" cy="24" r="3" fill="#FF7800"/>
                                <path d="M24 6v18" stroke="#1C1C1C" stroke-width="2"/>
                            </svg>
                        </div>
                        <span class="ubuntu-app-name">Music</span>
                    </div>
                    <div class="ubuntu-app-item" data-app="software">
                        <div class="ubuntu-app-icon ubuntu-icon-software">
                            <svg viewBox="0 0 48 48" width="48" height="48">
                                <rect x="4" y="4" width="40" height="40" rx="8" fill="#E95420"/>
                                <circle cx="24" cy="24" r="12" fill="none" stroke="#FFFFFF" stroke-width="3"/>
                                <circle cx="24" cy="12" r="3" fill="#FFFFFF"/>
                                <circle cx="12" cy="30" r="3" fill="#FFFFFF"/>
                                <circle cx="36" cy="30" r="3" fill="#FFFFFF"/>
                            </svg>
                        </div>
                        <span class="ubuntu-app-name">Software</span>
                    </div>
                    <div class="ubuntu-app-item" data-app="help">
                        <div class="ubuntu-app-icon ubuntu-icon-help">
                            <svg viewBox="0 0 48 48" width="48" height="48">
                                <circle cx="24" cy="24" r="20" fill="#9141AC"/>
                                <text x="24" y="32" text-anchor="middle" font-size="24" font-weight="bold" fill="#FFFFFF">?</text>
                            </svg>
                        </div>
                        <span class="ubuntu-app-name">Help</span>
                    </div>
                </div>
                <div class="ubuntu-app-grid-pagination">
                    <div class="ubuntu-pagination-dot active"></div>
                    <div class="ubuntu-pagination-dot"></div>
                </div>
            </div>
        `;

        document.getElementById('desktop').appendChild(overlay);

        // App clicks
        overlay.querySelectorAll('.ubuntu-app-item').forEach(item => {
            item.addEventListener('click', () => {
                const app = item.dataset.app;
                App.playSound('sound-open');
                
                // Handle different apps
                if (app === 'github') {
                    window.open('https://github.com/aeron-gh', '_blank');
                } else if (app === 'calculator' || app === 'image-viewer' || app === 'music' || app === 'software' || app === 'help') {
                    // Show notification for unimplemented apps
                    App.showNotification('ℹ️', 'Not Available', `${item.querySelector('.ubuntu-app-name').textContent} is not available yet`);
                } else {
                    WindowManager.openApp(app);
                }
                overlay.remove();
            });
        });

        // Search functionality
        const searchInput = overlay.querySelector('#app-search');
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            overlay.querySelectorAll('.ubuntu-app-item').forEach(item => {
                const name = item.querySelector('.ubuntu-app-name').textContent.toLowerCase();
                item.style.display = name.includes(query) ? '' : 'none';
            });
        });

        // Close handlers
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay || e.target.classList.contains('ubuntu-app-grid-container')) overlay.remove();
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
        if (this.currentBgIndex === -1) {
            desktop.style.backgroundImage = this.defaultWallpaper;
        } else {
            desktop.style.backgroundImage = `url('${this.backgrounds[this.currentBgIndex]}')`;
        }
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
