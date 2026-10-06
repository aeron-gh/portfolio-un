// Settings - Full Ubuntu Settings Application

const Settings = {
    // State management with defaults
    state: {
        appearance: {
            theme: 'dark',
            accentColor: '#E95420',
            wallpaperIndex: 0
        },
        notifications: {
            doNotDisturb: false,
            showOnLockScreen: true,
            showBanners: true,
            showInPopups: true
        },
        sound: {
            masterVolume: 50,
            soundEffects: true,
            alertSound: 'default',
            startupSound: true,
            inputVolume: 50,
            outputDevice: 'Speakers'
        },
        power: {
            powerMode: 'balanced',
            screenBlankTimeout: 5,
            autoSuspend: true,
            showBatteryPercentage: true,
            powerButtonAction: 'suspend'
        },
        displays: {
            brightness: 100,
            nightLight: false,
            nightLightSchedule: 'sunset-to-sunrise',
            nightLightTemperature: 4000
        }
    },

    currentPanel: 'appearance',

    init() {
        this.loadState();
        this.applySettings();
    },

    loadState() {
        const saved = localStorage.getItem('ubuntuSettings');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                this.state = { ...this.state, ...parsed };
            } catch (e) {
                console.warn('Failed to load settings:', e);
            }
        }
    },

    saveState() {
        localStorage.setItem('ubuntuSettings', JSON.stringify(this.state));
    },

    applySettings() {
        // Apply theme
        document.body.classList.toggle('light-theme', this.state.appearance.theme === 'light');
        
        // Apply accent color
        document.documentElement.style.setProperty('--accent-color', this.state.appearance.accentColor);
        
        // Apply volume
        if (typeof App !== 'undefined') {
            App.volume = this.state.sound.masterVolume / 100;
            App.soundEnabled = this.state.sound.soundEffects;
        }
        
        // Apply brightness
        const overlay = document.getElementById('brightness-overlay');
        if (overlay) {
            overlay.style.opacity = (100 - this.state.displays.brightness) / 100;
        }
        
        // Apply night light
        document.body.classList.toggle('night-light', this.state.displays.nightLight);
    },

    getContent() {
        return `
            <div class="settings-app">
                <div class="settings-sidebar">
                    <div class="settings-item ${this.currentPanel === 'appearance' ? 'active' : ''}" data-panel="appearance">
                        <span>🖥️</span> Appearance
                    </div>
                    <div class="settings-item ${this.currentPanel === 'notifications' ? 'active' : ''}" data-panel="notifications">
                        <span>🔔</span> Notifications
                    </div>
                    <div class="settings-item ${this.currentPanel === 'sound' ? 'active' : ''}" data-panel="sound">
                        <span>🔊</span> Sound
                    </div>
                    <div class="settings-item ${this.currentPanel === 'power' ? 'active' : ''}" data-panel="power">
                        <span>⚡</span> Power
                    </div>
                    <div class="settings-item ${this.currentPanel === 'displays' ? 'active' : ''}" data-panel="displays">
                        <span>📱</span> Displays
                    </div>
                    <div class="settings-item ${this.currentPanel === 'about' ? 'active' : ''}" data-panel="about">
                        <span>ℹ️</span> About
                    </div>
                </div>
                <div class="settings-content" id="settings-panel-content">
                    ${this.getPanelContent(this.currentPanel)}
                </div>
            </div>
        `;
    },

    getPanelContent(panel) {
        switch (panel) {
            case 'appearance': return this.getAppearancePanel();
            case 'notifications': return this.getNotificationsPanel();
            case 'sound': return this.getSoundPanel();
            case 'power': return this.getPowerPanel();
            case 'displays': return this.getDisplaysPanel();
            case 'about': return this.getAboutPanel();
            default: return this.getAppearancePanel();
        }
    },

    getAppearancePanel() {
        const backgrounds = typeof Desktop !== 'undefined' ? Desktop.backgrounds : [];
        const wallpaperGrid = backgrounds.map((bg, idx) => `
            <div class="wallpaper-item ${idx === this.state.appearance.wallpaperIndex ? 'active' : ''}" 
                 data-index="${idx}" 
                 style="background-image: url('${bg}'); background-size: cover; background-position: center;">
            </div>
        `).join('');

        return `
            <h2>Appearance</h2>
            <div class="settings-section">
                <h3>Style</h3>
                <div class="theme-selector">
                    <div class="theme-option ${this.state.appearance.theme === 'dark' ? 'active' : ''}" data-theme="dark">
                        <div class="theme-preview dark"></div>
                        <span>Dark</span>
                    </div>
                    <div class="theme-option ${this.state.appearance.theme === 'light' ? 'active' : ''}" data-theme="light">
                        <div class="theme-preview light"></div>
                        <span>Light</span>
                    </div>
                </div>
            </div>
            <div class="settings-section">
                <h3>Accent Color</h3>
                <div class="accent-color-selector">
                    <div class="accent-color-option ${this.state.appearance.accentColor === '#E95420' ? 'active' : ''}" 
                         data-color="#E95420" style="background: #E95420;" title="Ubuntu Orange"></div>
                    <div class="accent-color-option ${this.state.appearance.accentColor === '#772953' ? 'active' : ''}" 
                         data-color="#772953" style="background: #772953;" title="Aubergine"></div>
                    <div class="accent-color-option ${this.state.appearance.accentColor === '#3498db' ? 'active' : ''}" 
                         data-color="#3498db" style="background: #3498db;" title="Blue"></div>
                    <div class="accent-color-option ${this.state.appearance.accentColor === '#27ae60' ? 'active' : ''}" 
                         data-color="#27ae60" style="background: #27ae60;" title="Green"></div>
                    <div class="accent-color-option ${this.state.appearance.accentColor === '#9b59b6' ? 'active' : ''}" 
                         data-color="#9b59b6" style="background: #9b59b6;" title="Purple"></div>
                    <div class="accent-color-option ${this.state.appearance.accentColor === '#e74c3c' ? 'active' : ''}" 
                         data-color="#e74c3c" style="background: #e74c3c;" title="Red"></div>
                    <div class="accent-color-option ${this.state.appearance.accentColor === '#f39c12' ? 'active' : ''}" 
                         data-color="#f39c12" style="background: #f39c12;" title="Yellow"></div>
                    <div class="accent-color-option ${this.state.appearance.accentColor === '#1abc9c' ? 'active' : ''}" 
                         data-color="#1abc9c" style="background: #1abc9c;" title="Teal"></div>
                </div>
            </div>
            <div class="settings-section">
                <h3>Background</h3>
                <div class="wallpaper-grid">
                    ${wallpaperGrid}
                </div>
            </div>
        `;
    },

    getNotificationsPanel() {
        return `
            <h2>Notifications</h2>
            <div class="settings-section">
                <div class="settings-row">
                    <div class="settings-row-info">
                        <div class="settings-row-title">Do Not Disturb</div>
                        <div class="settings-row-subtitle">Mute all notification sounds and banners</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="dnd-toggle" ${this.state.notifications.doNotDisturb ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
            <div class="settings-section">
                <h3>Lock Screen</h3>
                <div class="settings-row">
                    <div class="settings-row-info">
                        <div class="settings-row-title">Lock Screen Notifications</div>
                        <div class="settings-row-subtitle">Show notifications on the lock screen</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="lockscreen-notif-toggle" ${this.state.notifications.showOnLockScreen ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
            <div class="settings-section">
                <h3>Popup Notifications</h3>
                <div class="settings-row">
                    <div class="settings-row-info">
                        <div class="settings-row-title">Notification Banners</div>
                        <div class="settings-row-subtitle">Show popup banners for notifications</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="banners-toggle" ${this.state.notifications.showBanners ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <div class="settings-row">
                    <div class="settings-row-info">
                        <div class="settings-row-title">Show in Pop-ups</div>
                        <div class="settings-row-subtitle">Allow notifications to pop up while using apps</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="popups-toggle" ${this.state.notifications.showInPopups ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
        `;
    },

    getSoundPanel() {
        return `
            <h2>Sound</h2>
            <div class="settings-section">
                <h3>Volume Levels</h3>
                <div class="settings-slider-row">
                    <span class="slider-icon">🔊</span>
                    <div class="slider-container">
                        <div class="slider-label">
                            <span>Output Volume</span>
                            <span id="volume-value">${this.state.sound.masterVolume}%</span>
                        </div>
                        <input type="range" class="settings-slider" id="master-volume-slider" 
                               min="0" max="100" value="${this.state.sound.masterVolume}">
                    </div>
                </div>
                <div class="settings-slider-row">
                    <span class="slider-icon">🎤</span>
                    <div class="slider-container">
                        <div class="slider-label">
                            <span>Input Volume</span>
                            <span id="input-volume-value">${this.state.sound.inputVolume}%</span>
                        </div>
                        <input type="range" class="settings-slider" id="input-volume-slider" 
                               min="0" max="100" value="${this.state.sound.inputVolume}">
                    </div>
                </div>
            </div>
            <div class="settings-section">
                <h3>System Sounds</h3>
                <div class="settings-row">
                    <div class="settings-row-info">
                        <div class="settings-row-title">Sound Effects</div>
                        <div class="settings-row-subtitle">Play sounds for window actions and clicks</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="sound-effects-toggle" ${this.state.sound.soundEffects ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <div class="settings-row">
                    <div class="settings-row-info">
                        <div class="settings-row-title">Startup Sound</div>
                        <div class="settings-row-subtitle">Play sound when system starts</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="startup-sound-toggle" ${this.state.sound.startupSound ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
            <div class="settings-section">
                <h3>Alert Sound</h3>
                <div class="alert-sound-selector">
                    <div class="alert-sound-option ${this.state.sound.alertSound === 'default' ? 'active' : ''}" data-sound="default">
                        <span class="alert-icon">🔔</span>
                        <span>Default</span>
                    </div>
                    <div class="alert-sound-option ${this.state.sound.alertSound === 'bark' ? 'active' : ''}" data-sound="bark">
                        <span class="alert-icon">🐕</span>
                        <span>Bark</span>
                    </div>
                    <div class="alert-sound-option ${this.state.sound.alertSound === 'drip' ? 'active' : ''}" data-sound="drip">
                        <span class="alert-icon">💧</span>
                        <span>Drip</span>
                    </div>
                    <div class="alert-sound-option ${this.state.sound.alertSound === 'glass' ? 'active' : ''}" data-sound="glass">
                        <span class="alert-icon">🪟</span>
                        <span>Glass</span>
                    </div>
                    <div class="alert-sound-option ${this.state.sound.alertSound === 'sonar' ? 'active' : ''}" data-sound="sonar">
                        <span class="alert-icon">📡</span>
                        <span>Sonar</span>
                    </div>
                </div>
            </div>
        `;
    },

    getPowerPanel() {
        return `
            <h2>Power</h2>
            <div class="settings-section">
                <h3>Power Mode</h3>
                <div class="power-mode-selector">
                    <div class="power-mode-option ${this.state.power.powerMode === 'power-saver' ? 'active' : ''}" data-mode="power-saver">
                        <span class="power-mode-icon">🔋</span>
                        <div class="power-mode-info">
                            <div class="power-mode-title">Power Saver</div>
                            <div class="power-mode-desc">Reduce performance to save battery</div>
                        </div>
                    </div>
                    <div class="power-mode-option ${this.state.power.powerMode === 'balanced' ? 'active' : ''}" data-mode="balanced">
                        <span class="power-mode-icon">⚖️</span>
                        <div class="power-mode-info">
                            <div class="power-mode-title">Balanced</div>
                            <div class="power-mode-desc">Standard performance and battery life</div>
                        </div>
                    </div>
                    <div class="power-mode-option ${this.state.power.powerMode === 'performance' ? 'active' : ''}" data-mode="performance">
                        <span class="power-mode-icon">🚀</span>
                        <div class="power-mode-info">
                            <div class="power-mode-title">Performance</div>
                            <div class="power-mode-desc">Maximum performance, higher power use</div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="settings-section">
                <h3>Power Saving Options</h3>
                <div class="settings-slider-row">
                    <span class="slider-icon">🖥️</span>
                    <div class="slider-container">
                        <div class="slider-label">
                            <span>Screen Blank</span>
                            <span id="screen-blank-value">${this.state.power.screenBlankTimeout === 0 ? 'Never' : this.state.power.screenBlankTimeout + ' min'}</span>
                        </div>
                        <input type="range" class="settings-slider" id="screen-blank-slider" 
                               min="0" max="15" value="${this.state.power.screenBlankTimeout}">
                    </div>
                </div>
                <div class="settings-row">
                    <div class="settings-row-info">
                        <div class="settings-row-title">Automatic Suspend</div>
                        <div class="settings-row-subtitle">Suspend when inactive for too long</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="auto-suspend-toggle" ${this.state.power.autoSuspend ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
            <div class="settings-section">
                <h3>Battery</h3>
                <div class="settings-row">
                    <div class="settings-row-info">
                        <div class="settings-row-title">Show Battery Percentage</div>
                        <div class="settings-row-subtitle">Display percentage in top bar</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="battery-percentage-toggle" ${this.state.power.showBatteryPercentage ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <div class="settings-row">
                    <div class="settings-row-info">
                        <div class="settings-row-title">Power Button Action</div>
                    </div>
                    <select class="settings-select" id="power-button-action">
                        <option value="suspend" ${this.state.power.powerButtonAction === 'suspend' ? 'selected' : ''}>Suspend</option>
                        <option value="shutdown" ${this.state.power.powerButtonAction === 'shutdown' ? 'selected' : ''}>Power Off</option>
                        <option value="hibernate" ${this.state.power.powerButtonAction === 'hibernate' ? 'selected' : ''}>Hibernate</option>
                        <option value="nothing" ${this.state.power.powerButtonAction === 'nothing' ? 'selected' : ''}>Nothing</option>
                    </select>
                </div>
            </div>
        `;
    },

    getDisplaysPanel() {
        return `
            <h2>Displays</h2>
            <div class="settings-section">
                <div class="display-preview">
                    <div class="display-monitor">
                        <div class="display-screen">
                            <div class="display-wallpaper"></div>
                        </div>
                        <div class="display-stand"></div>
                    </div>
                    <div class="display-info">Built-in Display</div>
                </div>
            </div>
            <div class="settings-section">
                <h3>Brightness</h3>
                <div class="settings-slider-row">
                    <span class="slider-icon">🔆</span>
                    <div class="slider-container">
                        <div class="slider-label">
                            <span>Screen Brightness</span>
                            <span id="brightness-value">${this.state.displays.brightness}%</span>
                        </div>
                        <input type="range" class="settings-slider" id="display-brightness-slider" 
                               min="20" max="100" value="${this.state.displays.brightness}">
                    </div>
                </div>
            </div>
            <div class="settings-section">
                <h3>Night Light</h3>
                <div class="settings-row">
                    <div class="settings-row-info">
                        <div class="settings-row-title">Night Light</div>
                        <div class="settings-row-subtitle">Reduce blue light to help prevent eye strain</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="night-light-toggle" ${this.state.displays.nightLight ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <div class="settings-slider-row ${this.state.displays.nightLight ? '' : 'disabled'}">
                    <span class="slider-icon">🌡️</span>
                    <div class="slider-container">
                        <div class="slider-label">
                            <span>Color Temperature</span>
                            <span id="temp-value">${this.state.displays.nightLightTemperature}K</span>
                        </div>
                        <input type="range" class="settings-slider" id="night-light-temp-slider" 
                               min="2700" max="6500" value="${this.state.displays.nightLightTemperature}"
                               ${this.state.displays.nightLight ? '' : 'disabled'}>
                    </div>
                </div>
            </div>
            <div class="settings-section">
                <h3>Display Configuration</h3>
                <div class="info-grid">
                    <div class="info-row">
                        <span class="info-label">Resolution</span>
                        <span class="info-value">${window.screen.width} × ${window.screen.height}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Refresh Rate</span>
                        <span class="info-value">60.00 Hz</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Scale</span>
                        <span class="info-value">${Math.round(window.devicePixelRatio * 100)}%</span>
                    </div>
                </div>
            </div>
        `;
    },

    getAboutPanel() {
        const memoryGB = navigator.deviceMemory || 8;
        const cores = navigator.hardwareConcurrency || 4;
        
        return `
            <h2>About</h2>
            <div class="settings-section">
                <div class="about-header">
                    <div class="about-logo">
                        <img src="assets/icons/ubuntu-logo.svg" alt="Ubuntu" width="96" height="96">
                    </div>
                    <div class="about-title">
                        <h3>Abhishek's Ubuntu</h3>
                        <p>Personal Portfolio OS</p>
                    </div>
                </div>
            </div>
            <div class="settings-section">
                <h3>Device</h3>
                <div class="info-grid">
                    <div class="info-row">
                        <span class="info-label">Device Name</span>
                        <span class="info-value">abhishek-portfolio</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Memory</span>
                        <span class="info-value">${memoryGB} GB</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Processor</span>
                        <span class="info-value">${cores}-Core CPU</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Graphics</span>
                        <span class="info-value">WebGL Renderer</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Disk Capacity</span>
                        <span class="info-value">∞ GB (Cloud)</span>
                    </div>
                </div>
            </div>
            <div class="settings-section">
                <h3>Software</h3>
                <div class="info-grid">
                    <div class="info-row">
                        <span class="info-label">OS Name</span>
                        <span class="info-value">Ubuntu 24.04 LTS</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">OS Type</span>
                        <span class="info-value">64-bit (Web)</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">GNOME Version</span>
                        <span class="info-value">46</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Windowing System</span>
                        <span class="info-value">Wayland (Simulated)</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Kernel</span>
                        <span class="info-value">JavaScript ${navigator.userAgent.includes('Chrome') ? 'V8' : 'Engine'}</span>
                    </div>
                </div>
            </div>
            <div class="settings-section about-links">
                <a href="https://github.com/aeron-gh" target="_blank" class="about-link">
                    <span>🐙</span> View Source Code
                </a>
                <a href="https://github.com/aeron-gh" target="_blank" class="about-link">
                    <span>👤</span> About the Developer
                </a>
            </div>
        `;
    },

    initEvents(windowElement) {
        if (!windowElement) return;

        // Panel switching
        const sidebarItems = windowElement.querySelectorAll('.settings-item');
        sidebarItems.forEach(item => {
            item.addEventListener('click', () => {
                const panel = item.dataset.panel;
                this.currentPanel = panel;
                
                // Update active state
                sidebarItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                
                // Update content
                const contentEl = windowElement.querySelector('#settings-panel-content');
                if (contentEl) {
                    contentEl.innerHTML = this.getPanelContent(panel);
                    this.initPanelEvents(windowElement, panel);
                }
            });
        });

        // Initialize current panel events
        this.initPanelEvents(windowElement, this.currentPanel);
    },

    initPanelEvents(windowElement, panel) {
        switch (panel) {
            case 'appearance':
                this.initAppearanceEvents(windowElement);
                break;
            case 'notifications':
                this.initNotificationsEvents(windowElement);
                break;
            case 'sound':
                this.initSoundEvents(windowElement);
                break;
            case 'power':
                this.initPowerEvents(windowElement);
                break;
            case 'displays':
                this.initDisplaysEvents(windowElement);
                break;
        }
    },

    initAppearanceEvents(windowElement) {
        // Theme selection
        const themeOptions = windowElement.querySelectorAll('.theme-option');
        themeOptions.forEach(option => {
            option.addEventListener('click', () => {
                const theme = option.dataset.theme;
                this.state.appearance.theme = theme;
                themeOptions.forEach(o => o.classList.remove('active'));
                option.classList.add('active');
                this.applySettings();
                this.saveState();
            });
        });

        // Accent color selection
        const colorOptions = windowElement.querySelectorAll('.accent-color-option');
        colorOptions.forEach(option => {
            option.addEventListener('click', () => {
                const color = option.dataset.color;
                this.state.appearance.accentColor = color;
                colorOptions.forEach(o => o.classList.remove('active'));
                option.classList.add('active');
                this.applySettings();
                this.saveState();
            });
        });

        // Wallpaper selection
        const wallpaperItems = windowElement.querySelectorAll('.wallpaper-item');
        wallpaperItems.forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                this.state.appearance.wallpaperIndex = index;
                wallpaperItems.forEach(w => w.classList.remove('active'));
                item.classList.add('active');
                
                // Apply wallpaper
                if (typeof Desktop !== 'undefined') {
                    Desktop.currentBgIndex = index;
                    Desktop.changeBackground(index);
                }
                this.saveState();
            });
        });
    },

    initNotificationsEvents(windowElement) {
        // DND toggle
        const dndToggle = windowElement.querySelector('#dnd-toggle');
        if (dndToggle) {
            dndToggle.addEventListener('change', (e) => {
                this.state.notifications.doNotDisturb = e.target.checked;
                
                // Update system tray DND indicator
                const dndQuickToggle = document.getElementById('toggle-dnd');
                if (dndQuickToggle) {
                    dndQuickToggle.classList.toggle('active', !e.target.checked);
                }
                this.saveState();
            });
        }

        // Lock screen notifications toggle
        const lockscreenToggle = windowElement.querySelector('#lockscreen-notif-toggle');
        if (lockscreenToggle) {
            lockscreenToggle.addEventListener('change', (e) => {
                this.state.notifications.showOnLockScreen = e.target.checked;
                this.saveState();
            });
        }

        // Banners toggle
        const bannersToggle = windowElement.querySelector('#banners-toggle');
        if (bannersToggle) {
            bannersToggle.addEventListener('change', (e) => {
                this.state.notifications.showBanners = e.target.checked;
                this.saveState();
            });
        }

        // Popups toggle
        const popupsToggle = windowElement.querySelector('#popups-toggle');
        if (popupsToggle) {
            popupsToggle.addEventListener('change', (e) => {
                this.state.notifications.showInPopups = e.target.checked;
                this.saveState();
            });
        }
    },

    initSoundEvents(windowElement) {
        // Master volume slider
        const volumeSlider = windowElement.querySelector('#master-volume-slider');
        const volumeValue = windowElement.querySelector('#volume-value');
        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.state.sound.masterVolume = value;
                if (volumeValue) volumeValue.textContent = value + '%';
                
                // Apply to App
                if (typeof App !== 'undefined') {
                    App.volume = value / 100;
                }
                
                // Also update system menu slider
                const systemVolumeSlider = document.getElementById('volume-slider');
                if (systemVolumeSlider) {
                    systemVolumeSlider.value = value;
                }
                this.saveState();
            });
        }

        // Input volume slider
        const inputSlider = windowElement.querySelector('#input-volume-slider');
        const inputValue = windowElement.querySelector('#input-volume-value');
        if (inputSlider) {
            inputSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.state.sound.inputVolume = value;
                if (inputValue) inputValue.textContent = value + '%';
                this.saveState();
            });
        }

        // Sound effects toggle
        const soundEffectsToggle = windowElement.querySelector('#sound-effects-toggle');
        if (soundEffectsToggle) {
            soundEffectsToggle.addEventListener('change', (e) => {
                this.state.sound.soundEffects = e.target.checked;
                if (typeof App !== 'undefined') {
                    App.soundEnabled = e.target.checked;
                }
                this.saveState();
            });
        }

        // Startup sound toggle
        const startupToggle = windowElement.querySelector('#startup-sound-toggle');
        if (startupToggle) {
            startupToggle.addEventListener('change', (e) => {
                this.state.sound.startupSound = e.target.checked;
                this.saveState();
            });
        }

        // Alert sound selection
        const alertOptions = windowElement.querySelectorAll('.alert-sound-option');
        alertOptions.forEach(option => {
            option.addEventListener('click', () => {
                const sound = option.dataset.sound;
                this.state.sound.alertSound = sound;
                alertOptions.forEach(o => o.classList.remove('active'));
                option.classList.add('active');
                
                // Play preview sound
                if (typeof App !== 'undefined') {
                    App.playSound('sound-click');
                }
                this.saveState();
            });
        });
    },

    initPowerEvents(windowElement) {
        // Power mode selection
        const modeOptions = windowElement.querySelectorAll('.power-mode-option');
        modeOptions.forEach(option => {
            option.addEventListener('click', () => {
                const mode = option.dataset.mode;
                this.state.power.powerMode = mode;
                modeOptions.forEach(o => o.classList.remove('active'));
                option.classList.add('active');
                this.saveState();
            });
        });

        // Screen blank slider
        const screenBlankSlider = windowElement.querySelector('#screen-blank-slider');
        const screenBlankValue = windowElement.querySelector('#screen-blank-value');
        if (screenBlankSlider) {
            screenBlankSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.state.power.screenBlankTimeout = value;
                if (screenBlankValue) {
                    screenBlankValue.textContent = value === 0 ? 'Never' : value + ' min';
                }
                this.saveState();
            });
        }

        // Auto suspend toggle
        const autoSuspendToggle = windowElement.querySelector('#auto-suspend-toggle');
        if (autoSuspendToggle) {
            autoSuspendToggle.addEventListener('change', (e) => {
                this.state.power.autoSuspend = e.target.checked;
                this.saveState();
            });
        }

        // Battery percentage toggle
        const batteryToggle = windowElement.querySelector('#battery-percentage-toggle');
        if (batteryToggle) {
            batteryToggle.addEventListener('change', (e) => {
                this.state.power.showBatteryPercentage = e.target.checked;
                this.saveState();
            });
        }

        // Power button action select
        const powerButtonSelect = windowElement.querySelector('#power-button-action');
        if (powerButtonSelect) {
            powerButtonSelect.addEventListener('change', (e) => {
                this.state.power.powerButtonAction = e.target.value;
                this.saveState();
            });
        }
    },

    initDisplaysEvents(windowElement) {
        // Brightness slider
        const brightnessSlider = windowElement.querySelector('#display-brightness-slider');
        const brightnessValue = windowElement.querySelector('#brightness-value');
        if (brightnessSlider) {
            brightnessSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.state.displays.brightness = value;
                if (brightnessValue) brightnessValue.textContent = value + '%';
                
                // Apply brightness
                const overlay = document.getElementById('brightness-overlay');
                if (overlay) {
                    overlay.style.opacity = (100 - value) / 100;
                }
                
                // Also update system menu slider
                const systemBrightnessSlider = document.getElementById('brightness-slider');
                if (systemBrightnessSlider) {
                    systemBrightnessSlider.value = value;
                }
                this.saveState();
            });
        }

        // Night light toggle
        const nightLightToggle = windowElement.querySelector('#night-light-toggle');
        const tempSliderRow = windowElement.querySelector('.settings-slider-row.disabled, .settings-slider-row:has(#night-light-temp-slider)');
        const tempSlider = windowElement.querySelector('#night-light-temp-slider');
        
        if (nightLightToggle) {
            nightLightToggle.addEventListener('change', (e) => {
                this.state.displays.nightLight = e.target.checked;
                document.body.classList.toggle('night-light', e.target.checked);
                
                // Enable/disable temperature slider
                if (tempSlider) {
                    tempSlider.disabled = !e.target.checked;
                }
                if (tempSliderRow) {
                    tempSliderRow.classList.toggle('disabled', !e.target.checked);
                }
                this.saveState();
            });
        }

        // Night light temperature slider
        const tempValue = windowElement.querySelector('#temp-value');
        if (tempSlider) {
            tempSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.state.displays.nightLightTemperature = value;
                if (tempValue) tempValue.textContent = value + 'K';
                this.saveState();
            });
        }
    }
};

// Initialize Settings when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Settings.init();
});
