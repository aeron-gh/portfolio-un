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
                width: 800,
                height: 600,
                getContent: (options) => TextEditor.getEditorHTML(options),
                onInit: (windowEl, options) => TextEditor.initEditor(windowEl, options)
            },
            'music-player': {
                title: 'Aeron Fav Songs',
                icon: '🎧',
                width: 450,
                height: 650,
                getContent: () => MusicPlayer.getWindowContent(),
                onInit: (windowEl) => MusicPlayer.initWindow(windowEl)
            },
            browser: {
                title: 'Firefox',
                icon: '🦊',
                width: 1000,
                height: 700,
                getContent: (options) => Firefox.getContent(options),
                onInit: (windowEl, options) => Firefox.initEvents(windowEl)
            },
            about: {
                title: 'About Abhishek',
                icon: '👤',
                width: 500,
                height: 650,
                getContent: () => `
                    <div class="about-content">
                        <div class="about-header">
                            <img class="about-photo" src="assets/photos/abhishek.jpeg" alt="Abhishek Agarwal">
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
                                <a href="https://linkedin.com/in/aeron-li" target="_blank" class="social-link">
                                    💼 LinkedIn
                                </a>
                                <a href="https://x.com/aeron_tw" target="_blank" class="social-link">
                                    𝕏 Twitter / X
                                </a>
                            </div>
                        </div>
                    </div>
                `
            },
            settings: {
                title: 'Settings',
                icon: '⚙️',
                width: 800,
                height: 550,
                getContent: () => Settings.getContent(),
                onInit: (windowEl) => Settings.initEvents(windowEl)
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
