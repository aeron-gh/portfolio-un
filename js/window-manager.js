// Window Manager - Handles window creation, dragging, resizing, focus

const WindowManager = {
    windows: [],
    zIndex: 1000,
    activeWindow: null,

    init() {
        this.container = document.getElementById('windows-container');
        this.template = document.getElementById('window-template');
        this.initDockHandlers();
    },

    initDockHandlers() {
        document.querySelectorAll('.dock-item').forEach(item => {
            item.addEventListener('click', () => {
                const app = item.dataset.app;
                
                // Add bounce animation
                item.classList.add('bouncing');
                setTimeout(() => item.classList.remove('bouncing'), 500);
                
                // Play click sound
                App.playSound('sound-click');
                
                if (app === 'github') {
                    window.open('https://github.com/aeron-gh', '_blank');
                } else {
                    this.openApp(app);
                }
            });
        });
    },

    openApp(appName, options = {}) {
        const existingWindow = this.windows.find(w => w.app === appName && !w.element.classList.contains('minimized'));
        
        if (existingWindow && !options.allowMultiple) {
            this.focusWindow(existingWindow);
            App.playSound('sound-click');
            return existingWindow;
        }

        // Play open sound
        App.playSound('sound-open');

        const windowData = this.createWindow(appName, options);
        this.windows.push(windowData);
        this.updateDockIndicators();
        
        return windowData;
    },

    createWindow(appName, options) {
        const clone = this.template.content.cloneNode(true);
        const windowEl = clone.querySelector('.window');
        
        const id = 'window-' + Date.now();
        windowEl.id = id;
        windowEl.dataset.app = appName;

        // Set window properties based on app
        const config = this.getAppConfig(appName);
        windowEl.querySelector('.window-title').innerHTML = `<span class="window-title-icon">${config.icon}</span> ${options.title || config.title}`;

        // Position window
        const offset = this.windows.length * 30;
        windowEl.style.left = (100 + offset) + 'px';
        windowEl.style.top = (50 + offset) + 'px';
        windowEl.style.width = (options.width || config.width || 700) + 'px';
        windowEl.style.height = (options.height || config.height || 500) + 'px';

        // Add resize handles
        windowEl.innerHTML += `
            <div class="resize-handle right"></div>
            <div class="resize-handle bottom"></div>
            <div class="resize-handle corner"></div>
        `;

        // Load app content
        const content = windowEl.querySelector('.window-content');
        content.innerHTML = config.getContent(options);

        this.container.appendChild(windowEl);

        // Initialize window events
        const windowData = {
            id,
            app: appName,
            element: windowEl,
            isMaximized: false,
            prevState: null
        };

        this.initWindowEvents(windowData);
        this.focusWindow(windowData);

        // Run app init if available
        if (config.onInit) {
            config.onInit(windowEl, options);
        }

        return windowData;
    },

    getAppConfig(appName) {
        const configs = {
            files: {
                title: 'Files',
                icon: '📁',
                width: 800,
                height: 550,
                getContent: (options) => FileManager.getWindowContent(options.path || '/home/abhishek'),
                onInit: (windowEl, options) => FileManager.initWindow(windowEl, options.path || '/home/abhishek')
            },
            terminal: {
                title: 'abhishek@portfolio: ~',
                icon: '',
                width: 720,
                height: 480,
                getContent: () => Terminal.getWindowContent(),
                onInit: (windowEl) => Terminal.initWindow(windowEl)
            },
            'text-editor': {
                title: 'Text Editor',
                icon: '📝',
                width: 600,
                height: 500,
                getContent: (options) => `
                    <div class="text-editor">
                        <div class="window-toolbar">
                            <span style="color: rgba(255,255,255,0.6);">${options.filename || 'Untitled'}</span>
                        </div>
                        <div class="text-editor-content">${options.content || ''}</div>
                    </div>
                `
            },
            browser: {
                title: 'Firefox',
                icon: '🦊',
                width: 1000,
                height: 650,
                getContent: (options) => `
                    <div class="browser firefox" data-current-url="${options.url || ''}">
                        <div class="firefox-tabbar">
                            <div class="firefox-tabs">
                                <div class="firefox-tab active" data-tab-id="1">
                                    <span class="firefox-tab-favicon">🦊</span>
                                    <span class="firefox-tab-title">${options.url ? 'Loading...' : 'New Tab'}</span>
                                    <button class="firefox-tab-close">✕</button>
                                </div>
                                <button class="firefox-new-tab" title="New Tab">+</button>
                            </div>
                            <div class="firefox-window-controls">
                                <button class="firefox-window-btn minimize">─</button>
                                <button class="firefox-window-btn maximize">□</button>
                                <button class="firefox-window-btn close">✕</button>
                            </div>
                        </div>
                        <div class="firefox-toolbar">
                            <div class="firefox-nav-buttons">
                                <button class="firefox-nav-btn back-btn" disabled title="Back">
                                    <svg viewBox="0 0 16 16" width="14" height="14"><path d="M10.5 3L5.5 8l5 5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
                                </button>
                                <button class="firefox-nav-btn forward-btn" disabled title="Forward">
                                    <svg viewBox="0 0 16 16" width="14" height="14"><path d="M5.5 3l5 5-5 5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
                                </button>
                                <button class="firefox-nav-btn reload-btn" title="Reload">
                                    <svg viewBox="0 0 16 16" width="14" height="14"><path d="M13.5 8a5.5 5.5 0 11-1.3-3.5M13.5 2v3H10.5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
                                </button>
                                <button class="firefox-nav-btn home-btn" title="Home">
                                    <svg viewBox="0 0 16 16" width="14" height="14"><path d="M2 8l6-6 6 6M4 7v6h3v-4h2v4h3V7" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
                                </button>
                            </div>
                            <div class="firefox-urlbar">
                                <span class="firefox-urlbar-icon secure">
                                    <svg viewBox="0 0 16 16" width="14" height="14"><path d="M8 1L3 3v4c0 3.5 2.2 6.5 5 7.5 2.8-1 5-4 5-7.5V3L8 1z" fill="#30e60b" stroke="#30e60b"/><path d="M6 8l2 2 3-4" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
                                </span>
                                <input type="text" class="firefox-url-input" value="${options.url || ''}" placeholder="Search with Google or enter address">
                                <button class="firefox-urlbar-action bookmark-btn" title="Bookmark this page">
                                    <svg viewBox="0 0 16 16" width="14" height="14"><path d="M8 2l1.5 3 3.5.5-2.5 2.5.5 3.5L8 10l-3 1.5.5-3.5L3 5.5 6.5 5z" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linejoin="round"/></svg>
                                </button>
                            </div>
                            <div class="firefox-toolbar-actions">
                                <button class="firefox-action-btn" title="Downloads">
                                    <svg viewBox="0 0 16 16" width="16" height="16"><path d="M8 2v8M5 7l3 3 3-3M3 12h10" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
                                </button>
                                <button class="firefox-action-btn" title="Library">
                                    <svg viewBox="0 0 16 16" width="16" height="16"><path d="M2 3h12M2 8h12M2 13h12" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>
                                </button>
                                <button class="firefox-action-btn menu-btn" title="Application menu">
                                    <svg viewBox="0 0 16 16" width="16" height="16"><circle cx="8" cy="3" r="1.5" fill="currentColor"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/><circle cx="8" cy="13" r="1.5" fill="currentColor"/></svg>
                                </button>
                            </div>
                        </div>
                        <div class="browser-content">
                            ${options.url ? `<iframe src="${options.url}" sandbox="allow-scripts allow-same-origin allow-popups allow-forms"></iframe>` : `
                            <div class="firefox-newtab">
                                <div class="firefox-newtab-logo">
                                    <svg viewBox="0 0 512 512" width="80" height="80">
                                        <defs>
                                            <linearGradient id="firefox-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                                                <stop offset="0%" style="stop-color:#FF9500"/>
                                                <stop offset="50%" style="stop-color:#FF3D00"/>
                                                <stop offset="100%" style="stop-color:#FF0066"/>
                                            </linearGradient>
                                        </defs>
                                        <circle cx="256" cy="256" r="240" fill="url(#firefox-grad)"/>
                                        <ellipse cx="256" cy="256" rx="120" ry="180" fill="#FFF0" stroke="rgba(255,255,255,0.3)" stroke-width="20"/>
                                    </svg>
                                </div>
                                <div class="firefox-search-container">
                                    <div class="firefox-search-box">
                                        <svg class="firefox-search-icon" viewBox="0 0 16 16" width="16" height="16">
                                            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.5" fill="none"/>
                                            <path d="M10 10l4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                        </svg>
                                        <input type="text" class="firefox-search-input" placeholder="Search the web">
                                        <div class="firefox-search-engine">
                                            <img src="https://www.google.com/favicon.ico" alt="Google" width="16" height="16">
                                        </div>
                                    </div>
                                </div>
                                <div class="firefox-shortcuts">
                                    <div class="firefox-shortcut" data-url="https://google.com">
                                        <div class="firefox-shortcut-icon" style="background: #4285f4;">G</div>
                                        <span>Google</span>
                                    </div>
                                    <div class="firefox-shortcut" data-url="https://youtube.com">
                                        <div class="firefox-shortcut-icon" style="background: #ff0000;">▶</div>
                                        <span>YouTube</span>
                                    </div>
                                    <div class="firefox-shortcut" data-url="https://github.com">
                                        <div class="firefox-shortcut-icon" style="background: #24292e;">
                                            <svg viewBox="0 0 16 16" width="20" height="20"><path fill="white" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
                                        </div>
                                        <span>GitHub</span>
                                    </div>
                                    <div class="firefox-shortcut" data-url="https://reddit.com">
                                        <div class="firefox-shortcut-icon" style="background: #ff4500;">
                                            <svg viewBox="0 0 20 20" width="20" height="20"><circle cx="10" cy="10" r="8" fill="white"/><circle cx="6.5" cy="9" r="1.5" fill="#ff4500"/><circle cx="13.5" cy="9" r="1.5" fill="#ff4500"/><path d="M6 13c1.5 1.5 6.5 1.5 8 0" stroke="#ff4500" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>
                                        </div>
                                        <span>Reddit</span>
                                    </div>
                                    <div class="firefox-shortcut" data-url="https://twitter.com">
                                        <div class="firefox-shortcut-icon" style="background: #1da1f2;">𝕏</div>
                                        <span>Twitter</span>
                                    </div>
                                    <div class="firefox-shortcut" data-url="https://wikipedia.org">
                                        <div class="firefox-shortcut-icon" style="background: #fff; color: #000;">W</div>
                                        <span>Wikipedia</span>
                                    </div>
                                    <div class="firefox-shortcut" data-url="https://amazon.com">
                                        <div class="firefox-shortcut-icon" style="background: #ff9900;">a</div>
                                        <span>Amazon</span>
                                    </div>
                                    <div class="firefox-shortcut" data-url="https://linkedin.com">
                                        <div class="firefox-shortcut-icon" style="background: #0077b5;">in</div>
                                        <span>LinkedIn</span>
                                    </div>
                                </div>
                                <div class="firefox-pocket-section">
                                    <h3>Recommended by Pocket</h3>
                                    <div class="firefox-pocket-stories">
                                        <div class="firefox-pocket-card">
                                            <div class="firefox-pocket-thumb" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);"></div>
                                            <div class="firefox-pocket-info">
                                                <span class="firefox-pocket-title">10 Tips for Better Productivity</span>
                                                <span class="firefox-pocket-source">productivity.com</span>
                                            </div>
                                        </div>
                                        <div class="firefox-pocket-card">
                                            <div class="firefox-pocket-thumb" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);"></div>
                                            <div class="firefox-pocket-info">
                                                <span class="firefox-pocket-title">The Future of Web Development</span>
                                                <span class="firefox-pocket-source">techblog.dev</span>
                                            </div>
                                        </div>
                                        <div class="firefox-pocket-card">
                                            <div class="firefox-pocket-thumb" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);"></div>
                                            <div class="firefox-pocket-info">
                                                <span class="firefox-pocket-title">Open Source Projects to Watch</span>
                                                <span class="firefox-pocket-source">opensource.org</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            `}
                        </div>
                        <div class="firefox-findbar hidden">
                            <input type="text" class="firefox-find-input" placeholder="Find in page">
                            <span class="firefox-find-status">0/0</span>
                            <button class="firefox-find-btn prev">▲</button>
                            <button class="firefox-find-btn next">▼</button>
                            <button class="firefox-find-close">✕</button>
                        </div>
                    </div>
                `,
                onInit: (windowEl) => {
                    const browser = windowEl.querySelector('.browser.firefox');
                    const urlInput = browser.querySelector('.firefox-url-input');
                    const searchInput = browser.querySelector('.firefox-search-input');
                    const shortcuts = browser.querySelectorAll('.firefox-shortcut');
                    const homeBtn = browser.querySelector('.home-btn');
                    const reloadBtn = browser.querySelector('.reload-btn');
                    const content = browser.querySelector('.browser-content');
                    const tabTitle = browser.querySelector('.firefox-tab-title');
                    
                    // Navigate function
                    const navigate = (url) => {
                        if (!url.startsWith('http')) {
                            url = 'https://' + url;
                        }
                        urlInput.value = url;
                        browser.dataset.currentUrl = url;
                        content.innerHTML = `<iframe src="${url}" sandbox="allow-scripts allow-same-origin allow-popups allow-forms"></iframe>`;
                        tabTitle.textContent = url.replace(/https?:\/\//, '').split('/')[0];
                    };
                    
                    // URL bar enter
                    urlInput.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') {
                            let url = urlInput.value.trim();
                            if (url && !url.includes('.')) {
                                url = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
                            }
                            if (url) navigate(url);
                        }
                    });
                    
                    // Search box enter
                    if (searchInput) {
                        searchInput.addEventListener('keypress', (e) => {
                            if (e.key === 'Enter') {
                                const query = searchInput.value.trim();
                                if (query) {
                                    navigate(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
                                }
                            }
                        });
                    }
                    
                    // Shortcuts
                    shortcuts.forEach(shortcut => {
                        shortcut.addEventListener('click', () => {
                            navigate(shortcut.dataset.url);
                        });
                    });
                    
                    // Home button
                    if (homeBtn) {
                        homeBtn.addEventListener('click', () => {
                            location.reload(); // Reset to new tab
                        });
                    }
                    
                    // Reload button
                    if (reloadBtn) {
                        reloadBtn.addEventListener('click', () => {
                            const iframe = content.querySelector('iframe');
                            if (iframe) {
                                iframe.src = iframe.src;
                            }
                        });
                    }
                }
            },
            about: {
                title: 'About Abhishek',
                icon: '👤',
                width: 500,
                height: 600,
                getContent: () => `
                    <div class="about-content">
                        <div class="about-header">
                            <div class="about-avatar">👨‍💻</div>
                            <div>
                                <div class="about-name">Abhishek Agarwal</div>
                                <div class="about-title">Developer</div>
                            </div>
                        </div>
                        
                        <div class="about-section">
                            <div class="about-section-title">About</div>
                            <div class="about-text">
                                Passionate developer who loves building creative and functional applications.
                                Currently exploring web technologies and collaborative tools.
                            </div>
                        </div>
                        
                        <div class="about-section">
                            <div class="about-section-title">Skills</div>
                            <div class="skill-tags">
                                <span class="skill-tag">JavaScript</span>
                                <span class="skill-tag">TypeScript</span>
                                <span class="skill-tag">Python</span>
                                <span class="skill-tag">C++</span>
                                <span class="skill-tag">React</span>
                                <span class="skill-tag">Node.js</span>
                                <span class="skill-tag">Git</span>
                            </div>
                        </div>
                        
                        <div class="about-section">
                            <div class="about-section-title">Links</div>
                            <div class="social-links">
                                <a href="https://github.com/aeron-gh" target="_blank" class="social-link">
                                    🐙 GitHub
                                </a>
                            </div>
                        </div>
                    </div>
                `
            },
            settings: {
                title: 'Settings',
                icon: '⚙️',
                width: 700,
                height: 500,
                getContent: () => `
                    <div class="settings-app">
                        <div class="settings-sidebar">
                            <div class="settings-item active">
                                <span>🖥️</span> Appearance
                            </div>
                            <div class="settings-item">
                                <span>🔔</span> Notifications
                            </div>
                            <div class="settings-item">
                                <span>🔊</span> Sound
                            </div>
                            <div class="settings-item">
                                <span>⚡</span> Power
                            </div>
                            <div class="settings-item">
                                <span>📱</span> Displays
                            </div>
                            <div class="settings-item">
                                <span>ℹ️</span> About
                            </div>
                        </div>
                        <div class="settings-content">
                            <h2>Appearance</h2>
                            <div class="settings-section">
                                <h3>Style</h3>
                                <div class="theme-selector">
                                    <div class="theme-option active">
                                        <div class="theme-preview dark"></div>
                                        <span>Dark</span>
                                    </div>
                                    <div class="theme-option">
                                        <div class="theme-preview light"></div>
                                        <span>Light</span>
                                    </div>
                                </div>
                            </div>
                            <div class="settings-section">
                                <h3>Wallpaper</h3>
                                <p style="color: rgba(255,255,255,0.6);">Right-click on desktop to change wallpaper</p>
                            </div>
                        </div>
                    </div>
                `
            }
        };

        return configs[appName] || configs.files;
    },

    initWindowEvents(windowData) {
        const el = windowData.element;
        const header = el.querySelector('.window-header');
        const closeBtn = el.querySelector('.window-btn.close');
        const minBtn = el.querySelector('.window-btn.minimize');
        const maxBtn = el.querySelector('.window-btn.maximize');

        // Focus on click
        el.addEventListener('mousedown', () => this.focusWindow(windowData));

        // Close button
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            App.playSound('sound-close');
            this.closeWindow(windowData);
        });

        // Minimize button
        minBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            App.playSound('sound-click');
            this.minimizeWindow(windowData);
        });

        // Maximize button
        maxBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            App.playSound('sound-click');
            this.toggleMaximize(windowData);
        });

        // Double click header to maximize
        header.addEventListener('dblclick', () => this.toggleMaximize(windowData));

        // Dragging
        this.initDrag(windowData, header);

        // Resizing
        this.initResize(windowData);
    },

    initDrag(windowData, handle) {
        let isDragging = false;
        let startX, startY, startLeft, startTop;
        let snapIndicator = null;

        const createSnapIndicator = () => {
            if (!snapIndicator) {
                snapIndicator = document.createElement('div');
                snapIndicator.className = 'snap-indicator';
                document.getElementById('windows-container').appendChild(snapIndicator);
            }
            return snapIndicator;
        };

        const showSnapIndicator = (position) => {
            const indicator = createSnapIndicator();
            const container = document.getElementById('windows-container');
            const rect = container.getBoundingClientRect();
            
            indicator.classList.add('visible');
            
            switch (position) {
                case 'left':
                    indicator.style.left = '0';
                    indicator.style.top = '0';
                    indicator.style.width = '50%';
                    indicator.style.height = '100%';
                    break;
                case 'right':
                    indicator.style.left = '50%';
                    indicator.style.top = '0';
                    indicator.style.width = '50%';
                    indicator.style.height = '100%';
                    break;
                case 'top':
                    indicator.style.left = '0';
                    indicator.style.top = '0';
                    indicator.style.width = '100%';
                    indicator.style.height = '100%';
                    break;
            }
        };

        const hideSnapIndicator = () => {
            if (snapIndicator) {
                snapIndicator.classList.remove('visible');
            }
        };

        handle.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('window-btn')) return;
            
            // If maximized, unmaximize first
            if (windowData.isMaximized) {
                this.toggleMaximize(windowData);
                // Position window under cursor
                const width = windowData.element.offsetWidth;
                windowData.element.style.left = (e.clientX - width / 2) + 'px';
                windowData.element.style.top = '26px';
            }

            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = windowData.element.offsetLeft;
            startTop = windowData.element.offsetTop;

            windowData.element.style.transition = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            windowData.element.style.left = (startLeft + dx) + 'px';
            windowData.element.style.top = Math.max(26, startTop + dy) + 'px';

            // Window snapping detection
            const threshold = 20;
            const screenWidth = window.innerWidth;
            
            if (e.clientX < threshold) {
                showSnapIndicator('left');
            } else if (e.clientX > screenWidth - threshold) {
                showSnapIndicator('right');
            } else if (e.clientY < 30) {
                showSnapIndicator('top');
            } else {
                hideSnapIndicator();
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (!isDragging) return;
            isDragging = false;
            windowData.element.style.transition = '';
            
            // Apply snapping
            const threshold = 20;
            const screenWidth = window.innerWidth;
            const container = document.getElementById('windows-container');
            const containerRect = container.getBoundingClientRect();
            
            if (e.clientX < threshold) {
                // Snap left
                windowData.prevState = {
                    left: windowData.element.style.left,
                    top: windowData.element.style.top,
                    width: windowData.element.style.width,
                    height: windowData.element.style.height
                };
                windowData.element.style.left = '0';
                windowData.element.style.top = '0';
                windowData.element.style.width = '50%';
                windowData.element.style.height = '100%';
                windowData.snapped = 'left';
            } else if (e.clientX > screenWidth - threshold) {
                // Snap right
                windowData.prevState = {
                    left: windowData.element.style.left,
                    top: windowData.element.style.top,
                    width: windowData.element.style.width,
                    height: windowData.element.style.height
                };
                windowData.element.style.left = '50%';
                windowData.element.style.top = '0';
                windowData.element.style.width = '50%';
                windowData.element.style.height = '100%';
                windowData.snapped = 'right';
            } else if (e.clientY < 30) {
                // Maximize
                this.toggleMaximize(windowData);
            }
            
            hideSnapIndicator();
        });
    },

    initResize(windowData) {
        const el = windowData.element;
        const handles = el.querySelectorAll('.resize-handle');

        handles.forEach(handle => {
            let isResizing = false;
            let startX, startY, startWidth, startHeight, startLeft, startTop;

            handle.addEventListener('mousedown', (e) => {
                if (windowData.isMaximized) return;
                
                isResizing = true;
                startX = e.clientX;
                startY = e.clientY;
                startWidth = el.offsetWidth;
                startHeight = el.offsetHeight;
                startLeft = el.offsetLeft;
                startTop = el.offsetTop;

                e.stopPropagation();
                el.style.transition = 'none';
            });

            document.addEventListener('mousemove', (e) => {
                if (!isResizing) return;

                const dx = e.clientX - startX;
                const dy = e.clientY - startY;

                if (handle.classList.contains('right') || handle.classList.contains('corner')) {
                    const newWidth = Math.max(400, startWidth + dx);
                    el.style.width = newWidth + 'px';
                }

                if (handle.classList.contains('bottom') || handle.classList.contains('corner')) {
                    const newHeight = Math.max(300, startHeight + dy);
                    el.style.height = newHeight + 'px';
                }
            });

            document.addEventListener('mouseup', () => {
                isResizing = false;
                el.style.transition = '';
            });
        });
    },

    focusWindow(windowData) {
        this.windows.forEach(w => {
            w.element.classList.remove('focused');
        });
        windowData.element.classList.add('focused');
        windowData.element.style.zIndex = ++this.zIndex;
        this.activeWindow = windowData;
        this.updateDockIndicators();
        this.updateAppMenu(windowData);
    },

    updateAppMenu(windowData) {
        const appMenuBtn = document.getElementById('app-menu-btn');
        if (appMenuBtn && windowData) {
            const config = this.getAppConfig(windowData.app);
            const title = windowData.element.querySelector('.window-title').textContent.trim();
            appMenuBtn.querySelector('.app-icon').textContent = config.icon || '🖥️';
            appMenuBtn.querySelector('.app-name').textContent = title || config.title;
        } else if (appMenuBtn) {
            appMenuBtn.querySelector('.app-icon').textContent = '🖥️';
            appMenuBtn.querySelector('.app-name').textContent = 'Desktop';
        }
    },

    closeWindow(windowData) {
        windowData.element.classList.add('closing');
        setTimeout(() => {
            windowData.element.remove();
            this.windows = this.windows.filter(w => w.id !== windowData.id);
            this.updateDockIndicators();
            
            // Update app menu to show next window or desktop
            if (this.windows.length > 0) {
                const lastWindow = this.windows[this.windows.length - 1];
                this.focusWindow(lastWindow);
            } else {
                this.activeWindow = null;
                this.updateAppMenu(null);
            }
        }, 200);
    },

    minimizeWindow(windowData) {
        windowData.element.classList.add('minimized');
        
        // Focus next visible window
        const visibleWindows = this.windows.filter(w => !w.element.classList.contains('minimized'));
        if (visibleWindows.length > 0) {
            this.focusWindow(visibleWindows[visibleWindows.length - 1]);
        } else {
            this.activeWindow = null;
            this.updateAppMenu(null);
        }
    },

    toggleMaximize(windowData) {
        if (windowData.isMaximized) {
            // Restore
            windowData.element.classList.remove('maximized');
            if (windowData.prevState) {
                windowData.element.style.left = windowData.prevState.left;
                windowData.element.style.top = windowData.prevState.top;
                windowData.element.style.width = windowData.prevState.width;
                windowData.element.style.height = windowData.prevState.height;
            }
            windowData.isMaximized = false;
        } else {
            // Save current state and maximize
            windowData.prevState = {
                left: windowData.element.style.left,
                top: windowData.element.style.top,
                width: windowData.element.style.width,
                height: windowData.element.style.height
            };
            windowData.element.classList.add('maximized');
            windowData.isMaximized = true;
        }
    },

    updateDockIndicators() {
        document.querySelectorAll('.dock-item').forEach(item => {
            const app = item.dataset.app;
            const hasWindow = this.windows.some(w => w.app === app);
            const hasFocused = this.activeWindow && this.activeWindow.app === app;
            item.classList.toggle('active', hasWindow);
            item.classList.toggle('focused', hasFocused);
        });
    }
};
