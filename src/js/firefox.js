// Firefox Browser - Full Proton UI Implementation

const Firefox = {
    // State
    tabs: [],
    activeTabId: null,
    tabIdCounter: 1,
    history: {},  // Per-tab history
    bookmarks: [],
    downloads: [],
    isPrivate: false,
    findState: { query: '', currentIndex: 0, total: 0 },
    
    // Settings
    settings: {
        showBookmarksBar: true,
        homePage: 'about:newtab',
        searchEngine: 'google',
        blockPopups: true,
        doNotTrack: true
    },

    init() {
        this.loadBookmarks();
        this.loadSettings();
    },

    loadBookmarks() {
        const saved = localStorage.getItem('firefoxBookmarks');
        if (saved) {
            try {
                this.bookmarks = JSON.parse(saved);
            } catch (e) {
                this.bookmarks = this.getDefaultBookmarks();
            }
        } else {
            this.bookmarks = this.getDefaultBookmarks();
        }
    },

    getDefaultBookmarks() {
        return [
            { id: 1, title: 'Google', url: 'https://google.com', favicon: 'G' },
            { id: 2, title: 'YouTube', url: 'https://youtube.com', favicon: '▶' },
            { id: 3, title: 'GitHub', url: 'https://github.com', favicon: '🐙' },
            { id: 4, title: 'Reddit', url: 'https://reddit.com', favicon: '🔴' },
            { id: 5, title: 'Twitter', url: 'https://twitter.com', favicon: '𝕏' },
            { id: 6, title: 'Wikipedia', url: 'https://wikipedia.org', favicon: 'W' }
        ];
    },

    saveBookmarks() {
        localStorage.setItem('firefoxBookmarks', JSON.stringify(this.bookmarks));
    },

    loadSettings() {
        const saved = localStorage.getItem('firefoxSettings');
        if (saved) {
            try {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            } catch (e) {}
        }
    },

    saveSettings() {
        localStorage.setItem('firefoxSettings', JSON.stringify(this.settings));
    },

    // Tab Management
    createTab(url = '', title = 'New Tab', isActive = true) {
        const tabId = this.tabIdCounter++;
        const tab = {
            id: tabId,
            url: url,
            title: title || 'New Tab',
            favicon: '🌐',
            isLoading: !!url,
            isPinned: false,
            isMuted: false,
            hasAudio: false,
            canGoBack: false,
            canGoForward: false
        };
        
        this.tabs.push(tab);
        this.history[tabId] = {
            entries: url ? [url] : [],
            currentIndex: url ? 0 : -1
        };
        
        if (isActive) {
            this.activeTabId = tabId;
        }
        
        return tab;
    },

    closeTab(tabId) {
        const index = this.tabs.findIndex(t => t.id === tabId);
        if (index === -1 || this.tabs.length === 1) return false;
        
        this.tabs.splice(index, 1);
        delete this.history[tabId];
        
        // Switch to adjacent tab if closing active
        if (this.activeTabId === tabId) {
            const newIndex = Math.min(index, this.tabs.length - 1);
            this.activeTabId = this.tabs[newIndex].id;
        }
        
        return true;
    },

    switchTab(tabId) {
        const tab = this.tabs.find(t => t.id === tabId);
        if (tab) {
            this.activeTabId = tabId;
            return tab;
        }
        return null;
    },

    pinTab(tabId) {
        const tab = this.tabs.find(t => t.id === tabId);
        if (tab) {
            tab.isPinned = !tab.isPinned;
            // Reorder: pinned tabs first
            this.tabs.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
            return tab;
        }
        return null;
    },

    muteTab(tabId) {
        const tab = this.tabs.find(t => t.id === tabId);
        if (tab) {
            tab.isMuted = !tab.isMuted;
            return tab;
        }
        return null;
    },

    getActiveTab() {
        return this.tabs.find(t => t.id === this.activeTabId);
    },

    moveTab(fromIndex, toIndex) {
        const tab = this.tabs.splice(fromIndex, 1)[0];
        this.tabs.splice(toIndex, 0, tab);
    },

    duplicateTab(tabId) {
        const tab = this.tabs.find(t => t.id === tabId);
        if (tab) {
            return this.createTab(tab.url, tab.title);
        }
        return null;
    },

    // Navigation
    navigate(tabId, url, addToHistory = true) {
        const tab = this.tabs.find(t => t.id === tabId);
        if (!tab) return;

        // Parse URL
        let finalUrl = url;
        if (url && !url.startsWith('http') && !url.startsWith('about:')) {
            if (url.includes('.') && !url.includes(' ')) {
                finalUrl = 'https://' + url;
            } else {
                // Search query
                const engines = {
                    google: 'https://www.google.com/search?q=',
                    duckduckgo: 'https://duckduckgo.com/?q=',
                    bing: 'https://www.bing.com/search?q='
                };
                finalUrl = engines[this.settings.searchEngine] + encodeURIComponent(url);
            }
        }

        tab.url = finalUrl;
        tab.isLoading = true;
        tab.title = this.extractDomain(finalUrl) || 'Loading...';
        tab.favicon = this.getFavicon(finalUrl);

        // Update history
        if (addToHistory && finalUrl) {
            const hist = this.history[tabId];
            // Remove forward entries when navigating from middle
            hist.entries = hist.entries.slice(0, hist.currentIndex + 1);
            hist.entries.push(finalUrl);
            hist.currentIndex = hist.entries.length - 1;
        }

        this.updateNavButtons(tabId);
        return finalUrl;
    },

    goBack(tabId) {
        const hist = this.history[tabId];
        if (hist && hist.currentIndex > 0) {
            hist.currentIndex--;
            const url = hist.entries[hist.currentIndex];
            const tab = this.tabs.find(t => t.id === tabId);
            if (tab) {
                tab.url = url;
                tab.title = this.extractDomain(url);
                tab.favicon = this.getFavicon(url);
            }
            this.updateNavButtons(tabId);
            return url;
        }
        return null;
    },

    goForward(tabId) {
        const hist = this.history[tabId];
        if (hist && hist.currentIndex < hist.entries.length - 1) {
            hist.currentIndex++;
            const url = hist.entries[hist.currentIndex];
            const tab = this.tabs.find(t => t.id === tabId);
            if (tab) {
                tab.url = url;
                tab.title = this.extractDomain(url);
                tab.favicon = this.getFavicon(url);
            }
            this.updateNavButtons(tabId);
            return url;
        }
        return null;
    },

    updateNavButtons(tabId) {
        const hist = this.history[tabId];
        const tab = this.tabs.find(t => t.id === tabId);
        if (hist && tab) {
            tab.canGoBack = hist.currentIndex > 0;
            tab.canGoForward = hist.currentIndex < hist.entries.length - 1;
        }
    },

    reload(tabId) {
        const tab = this.tabs.find(t => t.id === tabId);
        if (tab && tab.url) {
            tab.isLoading = true;
            return tab.url;
        }
        return null;
    },

    stopLoading(tabId) {
        const tab = this.tabs.find(t => t.id === tabId);
        if (tab) {
            tab.isLoading = false;
        }
    },

    // Bookmarks
    addBookmark(url, title) {
        const id = Date.now();
        const bookmark = {
            id,
            url,
            title: title || this.extractDomain(url),
            favicon: this.getFavicon(url)[0] || '🔖'
        };
        this.bookmarks.push(bookmark);
        this.saveBookmarks();
        return bookmark;
    },

    removeBookmark(id) {
        const index = this.bookmarks.findIndex(b => b.id === id);
        if (index !== -1) {
            this.bookmarks.splice(index, 1);
            this.saveBookmarks();
            return true;
        }
        return false;
    },

    isBookmarked(url) {
        return this.bookmarks.some(b => b.url === url);
    },

    // Downloads
    simulateDownload(filename, size) {
        const download = {
            id: Date.now(),
            filename,
            size,
            progress: 0,
            status: 'downloading',
            startTime: new Date()
        };
        this.downloads.unshift(download);
        
        // Simulate progress
        const interval = setInterval(() => {
            download.progress += Math.random() * 15;
            if (download.progress >= 100) {
                download.progress = 100;
                download.status = 'complete';
                clearInterval(interval);
            }
        }, 200);
        
        return download;
    },

    // Find in page
    startFind(query) {
        this.findState.query = query;
        // In a real implementation, this would search the iframe content
        // For simulation, we'll just track the state
        this.findState.total = Math.floor(Math.random() * 10) + 1;
        this.findState.currentIndex = this.findState.total > 0 ? 1 : 0;
        return this.findState;
    },

    findNext() {
        if (this.findState.currentIndex < this.findState.total) {
            this.findState.currentIndex++;
        }
        return this.findState;
    },

    findPrevious() {
        if (this.findState.currentIndex > 1) {
            this.findState.currentIndex--;
        }
        return this.findState;
    },

    clearFind() {
        this.findState = { query: '', currentIndex: 0, total: 0 };
    },

    // Utilities
    extractDomain(url) {
        if (!url || url.startsWith('about:')) return url;
        try {
            const domain = new URL(url).hostname;
            return domain.replace('www.', '');
        } catch (e) {
            return url;
        }
    },

    getFavicon(url) {
        if (!url || url.startsWith('about:')) return '🦊';
        const domain = this.extractDomain(url);
        
        // Known favicons
        const favicons = {
            'google.com': 'G',
            'youtube.com': '▶',
            'github.com': '🐙',
            'reddit.com': '🔴',
            'twitter.com': '𝕏',
            'wikipedia.org': 'W',
            'amazon.com': 'a',
            'facebook.com': 'f',
            'linkedin.com': 'in',
            'stackoverflow.com': '⚡',
            'medium.com': 'M',
            'netflix.com': 'N'
        };
        
        return favicons[domain] || '🌐';
    },

    // Get HTML content for browser
    getContent(options = {}) {
        // Initialize if needed
        if (this.tabs.length === 0) {
            this.createTab(options.url || '', options.title || 'New Tab');
        }

        const activeTab = this.getActiveTab();
        const pinnedTabs = this.tabs.filter(t => t.isPinned);
        const regularTabs = this.tabs.filter(t => !t.isPinned);

        return `
            <div class="browser firefox ${this.isPrivate ? 'private-mode' : ''}" data-browser-id="${Date.now()}">
                <!-- Tab Bar -->
                <div class="ff-tabbar">
                    <div class="ff-tabs-container">
                        <div class="ff-tabs-wrapper">
                            ${pinnedTabs.map(tab => this.renderTab(tab, true)).join('')}
                            ${regularTabs.map(tab => this.renderTab(tab, false)).join('')}
                            <button class="ff-new-tab-btn" title="Open a new tab (Ctrl+T)">
                                <svg viewBox="0 0 16 16" width="12" height="12"><path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Toolbar -->
                <div class="ff-toolbar">
                    <div class="ff-nav-group">
                        <button class="ff-nav-btn ff-back-btn" ${activeTab.canGoBack ? '' : 'disabled'} title="Go back (Alt+←)">
                            <svg viewBox="0 0 16 16" width="16" height="16"><path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        </button>
                        <button class="ff-nav-btn ff-forward-btn" ${activeTab.canGoForward ? '' : 'disabled'} title="Go forward (Alt+→)">
                            <svg viewBox="0 0 16 16" width="16" height="16"><path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        </button>
                        <button class="ff-nav-btn ff-reload-btn" title="${activeTab.isLoading ? 'Stop (Esc)' : 'Reload (Ctrl+R)'}">
                            ${activeTab.isLoading ? 
                                '<svg viewBox="0 0 16 16" width="16" height="16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' :
                                '<svg viewBox="0 0 16 16" width="16" height="16"><path d="M13.5 8a5.5 5.5 0 11-1.3-3.5M13.5 2v3H10.5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>'
                            }
                        </button>
                        <button class="ff-nav-btn ff-home-btn" title="Home">
                            <svg viewBox="0 0 16 16" width="16" height="16"><path d="M2 8l6-6 6 6M4 7v6h3v-4h2v4h3V7" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        </button>
                    </div>

                    <div class="ff-urlbar-container">
                        <div class="ff-urlbar ${activeTab.url && activeTab.url.startsWith('https') ? 'secure' : ''}">
                            <span class="ff-security-icon">
                                ${activeTab.url && activeTab.url.startsWith('https') ? 
                                    '<svg viewBox="0 0 16 16" width="14" height="14"><path d="M8 1L3 3v4c0 3.5 2.2 6.5 5 7.5 2.8-1 5-4 5-7.5V3L8 1z" fill="#30e60b" stroke="#30e60b"/><path d="M6 8l2 2 3-4" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>' :
                                    '<svg viewBox="0 0 16 16" width="14" height="14"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M8 4v4M8 10v1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
                                }
                            </span>
                            <input type="text" class="ff-url-input" value="${activeTab.url || ''}" placeholder="Search with ${this.settings.searchEngine.charAt(0).toUpperCase() + this.settings.searchEngine.slice(1)} or enter address">
                            <button class="ff-urlbar-btn ff-bookmark-btn ${this.isBookmarked(activeTab.url) ? 'bookmarked' : ''}" title="${this.isBookmarked(activeTab.url) ? 'Edit bookmark' : 'Bookmark this page'}">
                                <svg viewBox="0 0 16 16" width="14" height="14"><path d="M8 2l1.5 3 3.5.5-2.5 2.5.5 3.5L8 10l-3 1.5.5-3.5L3 5.5 6.5 5z" stroke="currentColor" stroke-width="1.5" fill="${this.isBookmarked(activeTab.url) ? 'currentColor' : 'none'}" stroke-linejoin="round"/></svg>
                            </button>
                        </div>
                    </div>

                    <div class="ff-toolbar-actions">
                        <button class="ff-action-btn ff-downloads-btn" title="Downloads (Ctrl+J)">
                            <svg viewBox="0 0 16 16" width="16" height="16"><path d="M8 2v8M5 7l3 3 3-3M3 12v1h10v-1" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
                            ${this.downloads.some(d => d.status === 'downloading') ? '<span class="ff-badge">●</span>' : ''}
                        </button>
                        <button class="ff-action-btn ff-sidebar-btn" title="Toggle sidebar (Ctrl+B)">
                            <svg viewBox="0 0 16 16" width="16" height="16"><path d="M2 2h12v12H2z" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M6 2v12" stroke="currentColor" stroke-width="1.5"/></svg>
                        </button>
                        <button class="ff-action-btn ff-menu-btn" title="Open application menu">
                            <svg viewBox="0 0 16 16" width="16" height="16"><path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                        </button>
                    </div>
                </div>

                <!-- Bookmarks Bar -->
                ${this.settings.showBookmarksBar ? `
                <div class="ff-bookmarks-bar">
                    ${this.bookmarks.slice(0, 8).map(b => `
                        <button class="ff-bookmark-item" data-url="${b.url}" title="${b.title}">
                            <span class="ff-bookmark-favicon">${b.favicon}</span>
                            <span class="ff-bookmark-title">${b.title}</span>
                        </button>
                    `).join('')}
                    ${this.bookmarks.length > 8 ? `
                        <button class="ff-bookmark-more" title="Show more bookmarks">
                            <svg viewBox="0 0 16 16" width="12" height="12"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        </button>
                    ` : ''}
                </div>
                ` : ''}

                <!-- Browser Content -->
                <div class="ff-content">
                    ${activeTab.url ? this.renderIframe(activeTab) : this.renderNewTabPage()}
                </div>

                <!-- Find Bar (hidden by default) -->
                <div class="ff-findbar hidden">
                    <div class="ff-find-input-container">
                        <input type="text" class="ff-find-input" placeholder="Find in page...">
                        <span class="ff-find-count">${this.findState.currentIndex}/${this.findState.total}</span>
                    </div>
                    <button class="ff-find-btn ff-find-prev" title="Previous (Shift+Enter)">
                        <svg viewBox="0 0 16 16" width="12" height="12"><path d="M4 10l4-4 4 4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                    <button class="ff-find-btn ff-find-next" title="Next (Enter)">
                        <svg viewBox="0 0 16 16" width="12" height="12"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                    <label class="ff-find-option">
                        <input type="checkbox" class="ff-highlight-all"> Highlight All
                    </label>
                    <label class="ff-find-option">
                        <input type="checkbox" class="ff-match-case"> Match Case
                    </label>
                    <button class="ff-find-close" title="Close (Esc)">
                        <svg viewBox="0 0 16 16" width="12" height="12"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                    </button>
                </div>

                <!-- Downloads Panel (hidden by default) -->
                <div class="ff-downloads-panel hidden">
                    <div class="ff-panel-header">
                        <span>Downloads</span>
                        <button class="ff-panel-close">✕</button>
                    </div>
                    <div class="ff-downloads-list">
                        ${this.downloads.length === 0 ? 
                            '<div class="ff-empty-message">No downloads yet</div>' :
                            this.downloads.map(d => this.renderDownload(d)).join('')
                        }
                    </div>
                    <div class="ff-panel-footer">
                        <a href="#" class="ff-show-all-downloads">Show all downloads</a>
                    </div>
                </div>

                <!-- Firefox Menu (hidden by default) -->
                <div class="ff-main-menu hidden">
                    <div class="ff-menu-section">
                        <button class="ff-menu-item"><span class="ff-menu-icon">📄</span> New Tab <span class="ff-menu-shortcut">Ctrl+T</span></button>
                        <button class="ff-menu-item"><span class="ff-menu-icon">🪟</span> New Window <span class="ff-menu-shortcut">Ctrl+N</span></button>
                        <button class="ff-menu-item ff-private-mode-btn"><span class="ff-menu-icon">🕵️</span> New Private Window <span class="ff-menu-shortcut">Ctrl+Shift+P</span></button>
                    </div>
                    <div class="ff-menu-divider"></div>
                    <div class="ff-menu-section">
                        <button class="ff-menu-item"><span class="ff-menu-icon">🔖</span> Bookmarks</button>
                        <button class="ff-menu-item"><span class="ff-menu-icon">📚</span> History <span class="ff-menu-shortcut">Ctrl+H</span></button>
                        <button class="ff-menu-item"><span class="ff-menu-icon">⬇️</span> Downloads <span class="ff-menu-shortcut">Ctrl+J</span></button>
                    </div>
                    <div class="ff-menu-divider"></div>
                    <div class="ff-menu-section">
                        <button class="ff-menu-item"><span class="ff-menu-icon">🔍</span> Find in Page <span class="ff-menu-shortcut">Ctrl+F</span></button>
                        <div class="ff-menu-zoom">
                            <span class="ff-menu-icon">🔎</span>
                            <span>Zoom</span>
                            <button class="ff-zoom-btn">−</button>
                            <span class="ff-zoom-level">100%</span>
                            <button class="ff-zoom-btn">+</button>
                        </div>
                        <button class="ff-menu-item ff-fullscreen-btn"><span class="ff-menu-icon">⛶</span> Full Screen <span class="ff-menu-shortcut">F11</span></button>
                    </div>
                    <div class="ff-menu-divider"></div>
                    <div class="ff-menu-section">
                        <button class="ff-menu-item"><span class="ff-menu-icon">💾</span> Save Page As... <span class="ff-menu-shortcut">Ctrl+S</span></button>
                        <button class="ff-menu-item"><span class="ff-menu-icon">📷</span> Take Screenshot</button>
                        <button class="ff-menu-item"><span class="ff-menu-icon">🖨️</span> Print... <span class="ff-menu-shortcut">Ctrl+P</span></button>
                    </div>
                    <div class="ff-menu-divider"></div>
                    <div class="ff-menu-section">
                        <button class="ff-menu-item"><span class="ff-menu-icon">🧩</span> Add-ons and Themes</button>
                        <button class="ff-menu-item ff-settings-btn"><span class="ff-menu-icon">⚙️</span> Settings</button>
                    </div>
                    <div class="ff-menu-divider"></div>
                    <div class="ff-menu-section">
                        <button class="ff-menu-item"><span class="ff-menu-icon">❓</span> Help</button>
                    </div>
                </div>

                <!-- Sidebar (hidden by default) -->
                <div class="ff-sidebar hidden">
                    <div class="ff-sidebar-header">
                        <div class="ff-sidebar-tabs">
                            <button class="ff-sidebar-tab active" data-panel="bookmarks">Bookmarks</button>
                            <button class="ff-sidebar-tab" data-panel="history">History</button>
                        </div>
                        <button class="ff-sidebar-close">✕</button>
                    </div>
                    <div class="ff-sidebar-content">
                        <div class="ff-sidebar-panel active" data-panel="bookmarks">
                            <div class="ff-sidebar-search">
                                <input type="text" placeholder="Search bookmarks...">
                            </div>
                            <div class="ff-sidebar-list">
                                ${this.bookmarks.map(b => `
                                    <div class="ff-sidebar-item" data-url="${b.url}">
                                        <span class="ff-sidebar-favicon">${b.favicon}</span>
                                        <span class="ff-sidebar-title">${b.title}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        <div class="ff-sidebar-panel" data-panel="history">
                            <div class="ff-sidebar-search">
                                <input type="text" placeholder="Search history...">
                            </div>
                            <div class="ff-sidebar-list">
                                <div class="ff-sidebar-group">Today</div>
                                ${this.getRecentHistory().map(h => `
                                    <div class="ff-sidebar-item" data-url="${h.url}">
                                        <span class="ff-sidebar-favicon">${h.favicon}</span>
                                        <span class="ff-sidebar-title">${h.title}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Tab Context Menu (hidden by default) -->
                <div class="ff-tab-context-menu hidden">
                    <button class="ff-context-item" data-action="reload-tab">Reload Tab</button>
                    <button class="ff-context-item" data-action="mute-tab">Mute Tab</button>
                    <button class="ff-context-item" data-action="pin-tab">Pin Tab</button>
                    <button class="ff-context-item" data-action="duplicate-tab">Duplicate Tab</button>
                    <div class="ff-context-divider"></div>
                    <button class="ff-context-item" data-action="close-other-tabs">Close Other Tabs</button>
                    <button class="ff-context-item" data-action="close-tabs-right">Close Tabs to the Right</button>
                    <div class="ff-context-divider"></div>
                    <button class="ff-context-item" data-action="close-tab">Close Tab</button>
                </div>
            </div>
        `;
    },

    renderTab(tab, isPinned) {
        const isActive = tab.id === this.activeTabId;
        return `
            <div class="ff-tab ${isActive ? 'active' : ''} ${isPinned ? 'pinned' : ''} ${tab.isLoading ? 'loading' : ''}" data-tab-id="${tab.id}">
                <div class="ff-tab-content">
                    ${tab.isLoading ? 
                        '<div class="ff-tab-spinner"></div>' : 
                        `<span class="ff-tab-favicon">${tab.favicon}</span>`
                    }
                    ${!isPinned ? `<span class="ff-tab-title">${tab.title}</span>` : ''}
                    ${tab.hasAudio ? `
                        <button class="ff-tab-audio ${tab.isMuted ? 'muted' : ''}" title="${tab.isMuted ? 'Unmute tab' : 'Mute tab'}">
                            ${tab.isMuted ? '🔇' : '🔊'}
                        </button>
                    ` : ''}
                </div>
                ${!isPinned ? `
                    <button class="ff-tab-close" title="Close tab">
                        <svg viewBox="0 0 16 16" width="10" height="10"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                    </button>
                ` : ''}
            </div>
        `;
    },

    renderNewTabPage() {
        return `
            <div class="ff-newtab">
                <div class="ff-newtab-header">
                    <svg class="ff-newtab-logo" viewBox="0 0 512 512" width="80" height="80">
                        <defs>
                            <linearGradient id="ff-grad-${Date.now()}" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style="stop-color:#FF980E"/>
                                <stop offset="30%" style="stop-color:#FF3647"/>
                                <stop offset="60%" style="stop-color:#E31587"/>
                                <stop offset="100%" style="stop-color:#9059FF"/>
                            </linearGradient>
                        </defs>
                        <circle cx="256" cy="256" r="220" fill="url(#ff-grad-${Date.now()})"/>
                        <path d="M256 100c-86.2 0-156 69.8-156 156 0 86.2 69.8 156 156 156V100z" fill="rgba(255,255,255,0.15)"/>
                    </svg>
                </div>
                <div class="ff-search-wrapper">
                    <div class="ff-search-box">
                        <svg class="ff-search-icon" viewBox="0 0 16 16" width="16" height="16">
                            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.5" fill="none"/>
                            <path d="M10.5 10.5l3.5 3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        <input type="text" class="ff-search-input" placeholder="Search with ${this.settings.searchEngine.charAt(0).toUpperCase() + this.settings.searchEngine.slice(1)} or enter address">
                    </div>
                </div>
                <div class="ff-shortcuts-section">
                    <h3>Top Sites</h3>
                    <div class="ff-shortcuts-grid">
                        ${this.bookmarks.slice(0, 8).map(b => `
                            <div class="ff-shortcut" data-url="${b.url}">
                                <div class="ff-shortcut-icon" style="background: ${this.getColorForDomain(b.url)}">
                                    <span>${b.favicon}</span>
                                </div>
                                <span class="ff-shortcut-label">${b.title}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="ff-pocket-section">
                    <h3><span class="ff-pocket-logo">📖</span> Recommended by Pocket</h3>
                    <div class="ff-pocket-grid">
                        <div class="ff-pocket-card">
                            <div class="ff-pocket-image" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);"></div>
                            <div class="ff-pocket-info">
                                <span class="ff-pocket-title">10 Tips for Better Productivity</span>
                                <span class="ff-pocket-source">productivity.com</span>
                            </div>
                        </div>
                        <div class="ff-pocket-card">
                            <div class="ff-pocket-image" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);"></div>
                            <div class="ff-pocket-info">
                                <span class="ff-pocket-title">The Future of Web Development</span>
                                <span class="ff-pocket-source">techblog.dev</span>
                            </div>
                        </div>
                        <div class="ff-pocket-card">
                            <div class="ff-pocket-image" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);"></div>
                            <div class="ff-pocket-info">
                                <span class="ff-pocket-title">Open Source Projects to Watch</span>
                                <span class="ff-pocket-source">opensource.org</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    renderIframe(tab) {
        return `
            <div class="ff-page-container">
                <div class="ff-loading-bar ${tab.isLoading ? 'loading' : ''}"></div>
                <iframe src="${tab.url}" sandbox="allow-scripts allow-same-origin allow-popups allow-forms" title="${tab.title}"></iframe>
            </div>
        `;
    },

    renderDownload(download) {
        return `
            <div class="ff-download-item ${download.status}">
                <div class="ff-download-icon">📄</div>
                <div class="ff-download-info">
                    <div class="ff-download-name">${download.filename}</div>
                    <div class="ff-download-status">
                        ${download.status === 'downloading' ? 
                            `<div class="ff-download-progress"><div class="ff-download-bar" style="width: ${download.progress}%"></div></div>` :
                            '<span class="ff-download-complete">✓ Complete</span>'
                        }
                    </div>
                </div>
                <button class="ff-download-action" title="${download.status === 'complete' ? 'Open file' : 'Cancel'}">
                    ${download.status === 'complete' ? '📂' : '✕'}
                </button>
            </div>
        `;
    },

    getRecentHistory() {
        // Collect all URLs from history
        const urls = [];
        Object.values(this.history).forEach(hist => {
            hist.entries.forEach(url => {
                if (url && !urls.some(u => u.url === url)) {
                    urls.push({
                        url,
                        title: this.extractDomain(url),
                        favicon: this.getFavicon(url)
                    });
                }
            });
        });
        return urls.slice(-10).reverse();
    },

    getColorForDomain(url) {
        const colors = [
            '#4285f4', '#ea4335', '#fbbc05', '#34a853', '#ff6d00',
            '#00bcd4', '#9c27b0', '#e91e63', '#607d8b', '#795548'
        ];
        const domain = this.extractDomain(url);
        let hash = 0;
        for (let i = 0; i < domain.length; i++) {
            hash = domain.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    },

    // Event initialization (called after window is created)
    initEvents(windowEl) {
        if (!windowEl) return;

        const browser = windowEl.querySelector('.browser.firefox');
        if (!browser) return;

        // Tab clicks
        browser.addEventListener('click', (e) => {
            const tab = e.target.closest('.ff-tab');
            if (tab && !e.target.closest('.ff-tab-close') && !e.target.closest('.ff-tab-audio')) {
                const tabId = parseInt(tab.dataset.tabId);
                this.switchTab(tabId);
                this.refreshUI(browser);
            }
        });

        // Tab close
        browser.querySelectorAll('.ff-tab-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const tab = e.target.closest('.ff-tab');
                const tabId = parseInt(tab.dataset.tabId);
                if (this.closeTab(tabId)) {
                    this.refreshUI(browser);
                }
            });
        });

        // New tab button
        const newTabBtn = browser.querySelector('.ff-new-tab-btn');
        if (newTabBtn) {
            newTabBtn.addEventListener('click', () => {
                this.createTab();
                this.refreshUI(browser);
            });
        }

        // Navigation buttons
        const backBtn = browser.querySelector('.ff-back-btn');
        const forwardBtn = browser.querySelector('.ff-forward-btn');
        const reloadBtn = browser.querySelector('.ff-reload-btn');
        const homeBtn = browser.querySelector('.ff-home-btn');

        if (backBtn) {
            backBtn.addEventListener('click', () => {
                const url = this.goBack(this.activeTabId);
                if (url) this.loadUrl(browser, url);
            });
        }

        if (forwardBtn) {
            forwardBtn.addEventListener('click', () => {
                const url = this.goForward(this.activeTabId);
                if (url) this.loadUrl(browser, url);
            });
        }

        if (reloadBtn) {
            reloadBtn.addEventListener('click', () => {
                const tab = this.getActiveTab();
                if (tab && tab.url) {
                    const iframe = browser.querySelector('.ff-content iframe');
                    if (iframe) iframe.src = iframe.src;
                }
            });
        }

        if (homeBtn) {
            homeBtn.addEventListener('click', () => {
                const tab = this.getActiveTab();
                if (tab) {
                    tab.url = '';
                    tab.title = 'New Tab';
                    this.refreshUI(browser);
                }
            });
        }

        // URL bar
        const urlInput = browser.querySelector('.ff-url-input');
        if (urlInput) {
            urlInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const url = this.navigate(this.activeTabId, urlInput.value);
                    if (url) this.loadUrl(browser, url);
                }
            });

            urlInput.addEventListener('focus', () => {
                urlInput.select();
            });
        }

        // Search input on new tab page
        const searchInput = browser.querySelector('.ff-search-input');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const url = this.navigate(this.activeTabId, searchInput.value);
                    if (url) this.loadUrl(browser, url);
                }
            });
        }

        // Shortcuts
        browser.querySelectorAll('.ff-shortcut, .ff-bookmark-item, .ff-sidebar-item').forEach(item => {
            item.addEventListener('click', () => {
                const url = item.dataset.url;
                if (url) {
                    this.navigate(this.activeTabId, url);
                    this.loadUrl(browser, url);
                }
            });
        });

        // Bookmark button
        const bookmarkBtn = browser.querySelector('.ff-bookmark-btn');
        if (bookmarkBtn) {
            bookmarkBtn.addEventListener('click', () => {
                const tab = this.getActiveTab();
                if (tab && tab.url) {
                    if (this.isBookmarked(tab.url)) {
                        const bm = this.bookmarks.find(b => b.url === tab.url);
                        if (bm) this.removeBookmark(bm.id);
                    } else {
                        this.addBookmark(tab.url, tab.title);
                    }
                    bookmarkBtn.classList.toggle('bookmarked');
                }
            });
        }

        // Menu button
        const menuBtn = browser.querySelector('.ff-menu-btn');
        const menu = browser.querySelector('.ff-main-menu');
        if (menuBtn && menu) {
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                menu.classList.toggle('hidden');
            });
        }

        // Downloads button
        const downloadsBtn = browser.querySelector('.ff-downloads-btn');
        const downloadsPanel = browser.querySelector('.ff-downloads-panel');
        if (downloadsBtn && downloadsPanel) {
            downloadsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                downloadsPanel.classList.toggle('hidden');
            });
        }

        // Sidebar button
        const sidebarBtn = browser.querySelector('.ff-sidebar-btn');
        const sidebar = browser.querySelector('.ff-sidebar');
        if (sidebarBtn && sidebar) {
            sidebarBtn.addEventListener('click', () => {
                sidebar.classList.toggle('hidden');
            });
        }

        // Sidebar tabs
        browser.querySelectorAll('.ff-sidebar-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const panel = tab.dataset.panel;
                browser.querySelectorAll('.ff-sidebar-tab').forEach(t => t.classList.remove('active'));
                browser.querySelectorAll('.ff-sidebar-panel').forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                browser.querySelector(`.ff-sidebar-panel[data-panel="${panel}"]`)?.classList.add('active');
            });
        });

        // Close panels when clicking elsewhere
        browser.addEventListener('click', (e) => {
            if (!e.target.closest('.ff-main-menu') && !e.target.closest('.ff-menu-btn')) {
                menu?.classList.add('hidden');
            }
            if (!e.target.closest('.ff-downloads-panel') && !e.target.closest('.ff-downloads-btn')) {
                downloadsPanel?.classList.add('hidden');
            }
        });

        // Find bar keyboard shortcut
        windowEl.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'f') {
                e.preventDefault();
                browser.querySelector('.ff-findbar')?.classList.remove('hidden');
                browser.querySelector('.ff-find-input')?.focus();
            }
            if (e.key === 'Escape') {
                browser.querySelector('.ff-findbar')?.classList.add('hidden');
            }
        });

        // Find bar events
        const findInput = browser.querySelector('.ff-find-input');
        const findClose = browser.querySelector('.ff-find-close');
        const findNext = browser.querySelector('.ff-find-next');
        const findPrev = browser.querySelector('.ff-find-prev');

        if (findInput) {
            findInput.addEventListener('input', (e) => {
                this.startFind(e.target.value);
                this.updateFindCount(browser);
            });
        }

        if (findClose) {
            findClose.addEventListener('click', () => {
                browser.querySelector('.ff-findbar')?.classList.add('hidden');
                this.clearFind();
            });
        }

        if (findNext) {
            findNext.addEventListener('click', () => {
                this.findNext();
                this.updateFindCount(browser);
            });
        }

        if (findPrev) {
            findPrev.addEventListener('click', () => {
                this.findPrevious();
                this.updateFindCount(browser);
            });
        }

        // Private mode button
        const privateModeBtn = browser.querySelector('.ff-private-mode-btn');
        if (privateModeBtn) {
            privateModeBtn.addEventListener('click', () => {
                this.isPrivate = !this.isPrivate;
                browser.classList.toggle('private-mode', this.isPrivate);
                menu?.classList.add('hidden');
            });
        }

        // Tab context menu
        browser.querySelectorAll('.ff-tab').forEach(tab => {
            tab.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const contextMenu = browser.querySelector('.ff-tab-context-menu');
                if (contextMenu) {
                    contextMenu.classList.remove('hidden');
                    contextMenu.style.left = e.clientX + 'px';
                    contextMenu.style.top = e.clientY + 'px';
                    contextMenu.dataset.tabId = tab.dataset.tabId;
                }
            });
        });

        // Context menu actions
        browser.querySelectorAll('.ff-context-item').forEach(item => {
            item.addEventListener('click', () => {
                const contextMenu = browser.querySelector('.ff-tab-context-menu');
                const tabId = parseInt(contextMenu.dataset.tabId);
                
                switch (item.dataset.action) {
                    case 'close-tab':
                        this.closeTab(tabId);
                        break;
                    case 'pin-tab':
                        this.pinTab(tabId);
                        break;
                    case 'mute-tab':
                        this.muteTab(tabId);
                        break;
                    case 'duplicate-tab':
                        this.duplicateTab(tabId);
                        break;
                    case 'reload-tab':
                        const t = this.tabs.find(t => t.id === tabId);
                        if (t && t.url) {
                            const iframe = browser.querySelector('.ff-content iframe');
                            if (iframe) iframe.src = iframe.src;
                        }
                        break;
                }
                
                contextMenu.classList.add('hidden');
                this.refreshUI(browser);
            });
        });

        // Close context menu on click elsewhere
        document.addEventListener('click', () => {
            browser.querySelector('.ff-tab-context-menu')?.classList.add('hidden');
        });

        // Handle iframe load
        const content = browser.querySelector('.ff-content');
        if (content) {
            const observer = new MutationObserver(() => {
                const iframe = content.querySelector('iframe');
                if (iframe) {
                    iframe.addEventListener('load', () => {
                        const tab = this.getActiveTab();
                        if (tab) {
                            tab.isLoading = false;
                            this.refreshTabBar(browser);
                        }
                    });
                }
            });
            observer.observe(content, { childList: true, subtree: true });
        }
    },

    loadUrl(browser, url) {
        const content = browser.querySelector('.ff-content');
        const urlInput = browser.querySelector('.ff-url-input');
        const tab = this.getActiveTab();
        
        if (content && tab) {
            content.innerHTML = this.renderIframe(tab);
            if (urlInput) urlInput.value = url;
            this.refreshTabBar(browser);
            this.updateNavButtons(this.activeTabId);
            this.refreshNavButtons(browser);
        }
    },

    refreshUI(browser) {
        // Refresh entire browser UI
        const parent = browser.parentElement;
        const newContent = this.getContent();
        browser.outerHTML = newContent;
        
        // Re-init events on new browser element
        const newBrowser = parent.querySelector('.browser.firefox');
        this.initEvents(newBrowser.closest('.window'));
    },

    refreshTabBar(browser) {
        const tabsWrapper = browser.querySelector('.ff-tabs-wrapper');
        if (!tabsWrapper) return;

        const pinnedTabs = this.tabs.filter(t => t.isPinned);
        const regularTabs = this.tabs.filter(t => !t.isPinned);

        const newTabBtn = tabsWrapper.querySelector('.ff-new-tab-btn');
        tabsWrapper.innerHTML = `
            ${pinnedTabs.map(tab => this.renderTab(tab, true)).join('')}
            ${regularTabs.map(tab => this.renderTab(tab, false)).join('')}
        `;
        if (newTabBtn) tabsWrapper.appendChild(newTabBtn);
        else tabsWrapper.innerHTML += `
            <button class="ff-new-tab-btn" title="Open a new tab (Ctrl+T)">
                <svg viewBox="0 0 16 16" width="12" height="12"><path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
        `;
    },

    refreshNavButtons(browser) {
        const tab = this.getActiveTab();
        if (!tab) return;

        const backBtn = browser.querySelector('.ff-back-btn');
        const forwardBtn = browser.querySelector('.ff-forward-btn');

        if (backBtn) backBtn.disabled = !tab.canGoBack;
        if (forwardBtn) forwardBtn.disabled = !tab.canGoForward;
    },

    updateFindCount(browser) {
        const countEl = browser.querySelector('.ff-find-count');
        if (countEl) {
            countEl.textContent = `${this.findState.currentIndex}/${this.findState.total}`;
        }
    }
};

// Initialize Firefox
document.addEventListener('DOMContentLoaded', () => {
    Firefox.init();
});
