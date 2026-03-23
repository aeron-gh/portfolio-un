// Main Application Entry Point

const App = {
    soundEnabled: true,
    volume: 0.5,
    brightness: 100,

    init() {
        this.bootSequence();
        this.initClock();
        this.initSystemMenu();
        this.initContextMenu();
        this.initBrightness();
        this.initLockScreen();
    },

    // Sound Effects
    playSound(soundId) {
        if (!this.soundEnabled) return;
        const sound = document.getElementById(soundId);
        if (sound) {
            sound.currentTime = 0;
            sound.volume = this.volume;
            sound.play().catch(() => {}); // Ignore autoplay errors
        }
    },

    bootSequence() {
        const bootScreen = document.getElementById('boot-screen');
        const desktop = document.getElementById('desktop');

        // Simulate boot loading
        setTimeout(() => {
            this.playSound('sound-startup');
            bootScreen.style.animation = 'fadeOut 0.5s ease forwards';
            setTimeout(() => {
                bootScreen.classList.add('hidden');
                desktop.classList.remove('hidden');
                desktop.style.animation = 'fadeIn 0.5s ease';
                
                // Initialize desktop components after boot
                Desktop.init();
                WindowManager.init();
                FileManager.init();
                Terminal.init();
            }, 500);
        }, 2500);
    },

    initClock() {
        const clockEl = document.getElementById('clock');
        
        const updateClock = () => {
            const now = new Date();
            const options = { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit', 
                minute: '2-digit'
            };
            clockEl.textContent = now.toLocaleString('en-US', options);
        };

        updateClock();
        setInterval(updateClock, 1000);
    },

    initBrightness() {
        const overlay = document.getElementById('brightness-overlay');
        const slider = document.getElementById('brightness-slider');
        
        if (slider && overlay) {
            slider.addEventListener('input', (e) => {
                this.brightness = parseInt(e.target.value);
                // Invert: 100 brightness = 0 opacity (no darkening)
                overlay.style.opacity = (100 - this.brightness) / 100;
            });
        }
    },

    initLockScreen() {
        const lockScreen = document.getElementById('lock-screen');
        const lockBtn = document.getElementById('lock-btn');
        const lockTime = document.getElementById('lock-time');
        const lockDate = document.getElementById('lock-date');

        const updateLockTime = () => {
            const now = new Date();
            lockTime.textContent = now.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false 
            });
            lockDate.textContent = now.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
            });
        };

        // Lock button
        if (lockBtn) {
            lockBtn.addEventListener('click', () => {
                this.playSound('sound-click');
                lockScreen.classList.remove('hidden');
                document.getElementById('system-menu').classList.add('hidden');
                updateLockTime();
            });
        }

        // Unlock on click or keypress
        lockScreen.addEventListener('click', () => {
            this.playSound('sound-open');
            lockScreen.classList.add('hidden');
        });

        document.addEventListener('keydown', () => {
            if (!lockScreen.classList.contains('hidden')) {
                this.playSound('sound-open');
                lockScreen.classList.add('hidden');
            }
        });

        // Update time while locked
        setInterval(updateLockTime, 1000);
    },

    initSystemMenu() {
        const systemTray = document.getElementById('system-tray');
        const menu = document.getElementById('system-menu');
        const clockBtn = document.getElementById('clock-btn');
        const calendarDropdown = document.getElementById('calendar-dropdown');
        const powerBtn = document.getElementById('power-btn');
        const restartBtn = document.getElementById('restart-btn');
        const suspendBtn = document.getElementById('suspend-btn');
        const settingsBtn = document.getElementById('settings-btn');
        const volumeSlider = document.getElementById('volume-slider');

        // System tray click opens menu
        systemTray.addEventListener('click', (e) => {
            e.stopPropagation();
            this.playSound('sound-click');
            menu.classList.toggle('hidden');
            calendarDropdown.classList.add('hidden');
            systemTray.classList.toggle('active', !menu.classList.contains('hidden'));
            clockBtn.classList.remove('active');
        });

        // Clock click opens calendar
        clockBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.playSound('sound-click');
            calendarDropdown.classList.toggle('hidden');
            menu.classList.add('hidden');
            clockBtn.classList.toggle('active', !calendarDropdown.classList.contains('hidden'));
            systemTray.classList.remove('active');
            if (!calendarDropdown.classList.contains('hidden')) {
                this.updateCalendar();
            }
        });

        // Click outside closes dropdowns
        document.addEventListener('click', () => {
            menu.classList.add('hidden');
            calendarDropdown.classList.add('hidden');
            systemTray.classList.remove('active');
            clockBtn.classList.remove('active');
        });

        // Prevent menu click from closing
        menu.addEventListener('click', (e) => e.stopPropagation());
        calendarDropdown.addEventListener('click', (e) => e.stopPropagation());

        // Quick toggle buttons
        document.querySelectorAll('.quick-toggle').forEach(toggle => {
            toggle.addEventListener('click', () => {
                this.playSound('sound-click');
                toggle.classList.toggle('active');
            });
        });

        // Volume slider
        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                this.volume = parseInt(e.target.value) / 100;
            });
        }

        // Power buttons
        if (powerBtn) {
            powerBtn.addEventListener('click', () => {
                this.playSound('sound-click');
                this.showPowerDialog();
            });
        }
        
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                this.playSound('sound-click');
                this.performShutdown();
            });
        }
        
        if (suspendBtn) {
            suspendBtn.addEventListener('click', () => {
                this.playSound('sound-click');
                document.getElementById('lock-screen').classList.remove('hidden');
                menu.classList.add('hidden');
            });
        }
        
        // Settings button
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.playSound('sound-click');
                menu.classList.add('hidden');
                WindowManager.openApp('settings');
            });
        }
    },

    updateCalendar() {
        const now = new Date();
        const dateEl = document.getElementById('calendar-date');
        const dayNameEl = document.getElementById('calendar-day-name');
        const daysContainer = document.getElementById('calendar-days');
        
        dateEl.textContent = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        dayNameEl.textContent = now.toLocaleDateString('en-US', { weekday: 'long' });
        
        // Generate calendar days
        const year = now.getFullYear();
        const month = now.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();
        
        let html = '';
        
        // Previous month's days
        for (let i = firstDay - 1; i >= 0; i--) {
            html += `<div class="calendar-day-cell other-month">${daysInPrevMonth - i}</div>`;
        }
        
        // Current month's days
        for (let i = 1; i <= daysInMonth; i++) {
            const isToday = i === now.getDate();
            html += `<div class="calendar-day-cell${isToday ? ' today' : ''}">${i}</div>`;
        }
        
        // Next month's days
        const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
        const remaining = totalCells - (firstDay + daysInMonth);
        for (let i = 1; i <= remaining; i++) {
            html += `<div class="calendar-day-cell other-month">${i}</div>`;
        }
        
        daysContainer.innerHTML = html;
    },

    showPowerDialog() {
        const dialog = document.createElement('div');
        dialog.className = 'power-dialog-overlay';
        dialog.innerHTML = `
            <div class="power-dialog">
                <div class="power-dialog-title">Power Off</div>
                <div class="power-dialog-message">What would you like to do?</div>
                <div class="power-dialog-buttons">
                    <button class="power-btn-option" data-action="restart">🔄 Restart</button>
                    <button class="power-btn-option" data-action="shutdown">⏻ Power Off</button>
                    <button class="power-btn-option cancel" data-action="cancel">Cancel</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        dialog.querySelectorAll('.power-btn-option').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                this.playSound('sound-click');
                
                if (action === 'restart' || action === 'shutdown') {
                    dialog.remove();
                    this.performShutdown();
                } else {
                    dialog.remove();
                }
            });
        });

        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                dialog.remove();
            }
        });
    },

    performShutdown() {
        const shutdownScreen = document.createElement('div');
        shutdownScreen.id = 'shutdown-screen';
        shutdownScreen.innerHTML = `
            <div class="shutdown-content">
                <div class="ubuntu-logo">
                    <svg viewBox="0 0 100 100" width="80" height="80">
                        <circle cx="50" cy="50" r="45" fill="none" stroke="#E95420" stroke-width="8"/>
                        <circle cx="50" cy="10" r="8" fill="#E95420"/>
                        <circle cx="15" cy="70" r="8" fill="#E95420"/>
                        <circle cx="85" cy="70" r="8" fill="#E95420"/>
                    </svg>
                </div>
                <div class="shutdown-text">Shutting down...</div>
            </div>
        `;
        document.body.appendChild(shutdownScreen);

        setTimeout(() => {
            location.reload();
        }, 2000);
    },

    initContextMenu() {
        const contextMenu = document.getElementById('context-menu');
        const desktopArea = document.getElementById('desktop-area');

        desktopArea.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            contextMenu.style.left = e.clientX + 'px';
            contextMenu.style.top = e.clientY + 'px';
            contextMenu.classList.remove('hidden');
        });

        document.addEventListener('click', () => {
            contextMenu.classList.add('hidden');
        });

        contextMenu.querySelectorAll('.context-item').forEach(item => {
            item.addEventListener('click', () => {
                const action = item.dataset.action;
                this.playSound('sound-click');
                switch(action) {
                    case 'open-terminal':
                        WindowManager.openApp('terminal');
                        break;
                    case 'change-bg':
                        Desktop.changeBackground();
                        this.showNotification('🖼️', 'Wallpaper Changed', 'Desktop background updated');
                        break;
                }
                contextMenu.classList.add('hidden');
            });
        });
    },

    showNotification(icon, title, message) {
        // Remove existing notifications
        document.querySelectorAll('.notification-toast').forEach(n => n.remove());
        
        const toast = document.createElement('div');
        toast.className = 'notification-toast';
        toast.innerHTML = `
            <div class="notification-toast-icon">${icon}</div>
            <div class="notification-toast-content">
                <div class="notification-toast-title">${title}</div>
                <div class="notification-toast-message">${message}</div>
            </div>
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.remove(), 3000);
    }
};

// File system structure - More realistic Ubuntu structure
const FileSystem = {
    structure: {
        '/': {
            type: 'folder',
            children: {
                'home': {
                    type: 'folder',
                    icon: '🏠',
                    children: {
                        'abhishek': {
                            type: 'folder',
                            icon: '👤',
                            children: {
                                'Desktop': {
                                    type: 'folder',
                                    icon: '🖥️',
                                    children: {
                                        'about_abhishek': {
                                            type: 'link-folder',
                                            icon: '📂',
                                            target: '/home/abhishek/about_abhishek'
                                        },
                                        'README.txt': {
                                            type: 'file',
                                            icon: '📄',
                                            content: 'readme'
                                        }
                                    }
                                },
                                'Documents': {
                                    type: 'folder',
                                    icon: '📁',
                                    children: {
                                        'notes.txt': {
                                            type: 'file',
                                            icon: '📝',
                                            content: 'notes'
                                        }
                                    }
                                },
                                'Downloads': {
                                    type: 'folder',
                                    icon: '⬇️',
                                    children: {}
                                },
                                'Music': {
                                    type: 'folder',
                                    icon: '🎵',
                                    children: {
                                        'aeron fav songs': {
                                            type: 'folder',
                                            icon: '🎧',
                                            children: {
                                                '23 - Cheema Y.mp3': { type: 'audio', icon: '🎵', file: 'assets/songs/23 - Cheema Y.mp3' },
                                                '52 Bars.mp3': { type: 'audio', icon: '🎵', file: 'assets/songs/52 Bars.mp3' },
                                                '5_7_1.mp3': { type: 'audio', icon: '🎵', file: 'assets/songs/5_7_1.mp3' },
                                                '7_7_Magnitude_1.mp3': { type: 'audio', icon: '🎵', file: 'assets/songs/7_7_Magnitude_1.mp3' },
                                                'At_Peace_1.mp3': { type: 'audio', icon: '🎵', file: 'assets/songs/At_Peace_1.mp3' },
                                                'Daytona_1.mp3': { type: 'audio', icon: '🎵', file: 'assets/songs/Daytona_1.mp3' },
                                                'Excuse Me - Cheema Y.mp3': { type: 'audio', icon: '🎵', file: 'assets/songs/Excuse Me - Cheema Y.mp3' },
                                                'I Really Do.mp3': { type: 'audio', icon: '🎵', file: 'assets/songs/I Really Do.mp3' },
                                                'Nanak_Niva_Jo_Challe_1.mp3': { type: 'audio', icon: '🎵', file: 'assets/songs/Nanak_Niva_Jo_Challe_1.mp3' },
                                                'Soch.mp3': { type: 'audio', icon: '🎵', file: 'assets/songs/Soch.mp3' },
                                                'Wavy_1.mp3': { type: 'audio', icon: '🎵', file: 'assets/songs/Wavy_1.mp3' }
                                            }
                                        }
                                    }
                                },
                                'Pictures': {
                                    type: 'folder',
                                    icon: '🖼️',
                                    children: {
                                        'screenshots': {
                                            type: 'folder',
                                            icon: '📷',
                                            children: {}
                                        }
                                    }
                                },
                                'Videos': {
                                    type: 'folder',
                                    icon: '🎬',
                                    children: {}
                                },
                                'about_abhishek': {
                                    type: 'folder',
                                    icon: '📂',
                                    children: {
                                        'about_me.txt': {
                                            type: 'file',
                                            icon: '📄',
                                            content: 'about'
                                        },
                                        'skills.txt': {
                                            type: 'file',
                                            icon: '📊',
                                            content: 'skills'
                                        },
                                        'projects': {
                                            type: 'folder',
                                            icon: '💼',
                                            children: {
                                                'CollabCode': {
                                                    type: 'link',
                                                    icon: '🔗',
                                                    url: 'https://aeron-gh.github.io/collabcode/',
                                                    description: 'Real-time collaborative code editor'
                                                },
                                                'TicTacToe': {
                                                    type: 'link',
                                                    icon: '🎮',
                                                    url: 'https://github.com/aeron-gh/tictactoe',
                                                    description: 'Terminal-based game in C++'
                                                },
                                                'More_on_GitHub': {
                                                    type: 'link',
                                                    icon: '🐙',
                                                    url: 'https://github.com/aeron-gh'
                                                }
                                            }
                                        },
                                        'contact.txt': {
                                            type: 'file',
                                            icon: '📧',
                                            content: 'contact'
                                        },
                                        'GitHub': {
                                            type: 'link',
                                            icon: '🐙',
                                            url: 'https://github.com/aeron-gh'
                                        }
                                    }
                                },
                                '.bashrc': {
                                    type: 'file',
                                    icon: '⚙️',
                                    content: 'bashrc',
                                    hidden: true
                                },
                                '.config': {
                                    type: 'folder',
                                    icon: '⚙️',
                                    hidden: true,
                                    children: {}
                                }
                            }
                        }
                    }
                },
                'usr': {
                    type: 'folder',
                    icon: '📦',
                    children: {
                        'bin': {
                            type: 'folder',
                            icon: '⚡',
                            children: {}
                        },
                        'share': {
                            type: 'folder',
                            icon: '📁',
                            children: {
                                'applications': {
                                    type: 'folder',
                                    icon: '📱',
                                    children: {}
                                }
                            }
                        }
                    }
                },
                'etc': {
                    type: 'folder',
                    icon: '⚙️',
                    children: {
                        'hostname': {
                            type: 'file',
                            icon: '📄',
                            content: 'hostname'
                        }
                    }
                },
                'tmp': {
                    type: 'folder',
                    icon: '🗑️',
                    children: {}
                }
            }
        }
    },

    getItem(path) {
        if (path === '/') return this.structure['/'];
        
        const parts = path.split('/').filter(p => p);
        let current = this.structure['/'];
        
        for (const part of parts) {
            if (current.children && current.children[part]) {
                current = current.children[part];
            } else {
                return null;
            }
        }
        return current;
    },

    getChildren(path, showHidden = false) {
        const item = this.getItem(path);
        if (item && item.children) {
            return Object.entries(item.children)
                .filter(([name, data]) => showHidden || !data.hidden)
                .map(([name, data]) => ({
                    name,
                    ...data
                }));
        }
        return [];
    },

    getParentPath(path) {
        if (path === '/') return '/';
        const parts = path.split('/').filter(p => p);
        parts.pop();
        return '/' + parts.join('/') || '/';
    },

    getPathParts(path) {
        if (path === '/') return [{ name: '/', path: '/' }];
        const parts = path.split('/').filter(p => p);
        const result = [{ name: '/', path: '/' }];
        let currentPath = '';
        for (const part of parts) {
            currentPath += '/' + part;
            result.push({ name: part, path: currentPath });
        }
        return result;
    }
};

// File contents
const FileContents = {
    readme: `
╔══════════════════════════════════════════════════════════════╗
║                    Welcome to My Portfolio                     ║
║                                                                ║
║  Hey! I'm Abhishek Agarwal                                    ║
║  A Developer who loves building things                        ║
║                                                                ║
║  Navigate around this Ubuntu-style desktop to learn more!     ║
║                                                                ║
║  📂 Open "about_abhishek" folder to explore my work           ║
║  ⬛ Try the Terminal - type 'help' for commands               ║
║  🐙 Click GitHub icon to visit my profile                     ║
║                                                                ║
╚══════════════════════════════════════════════════════════════╝
    `,

    about: `
┌─────────────────────────────────────┐
│         ABOUT ME                    │
└─────────────────────────────────────┘

👋 Hi, I'm Abhishek Agarwal!

I'm a passionate developer who enjoys building 
creative and functional applications.

🎯 What I Do:
   • Full-stack web development
   • Building collaborative tools
   • Creating fun side projects

🌟 Interests:
   • Open Source
   • Web Technologies
   • System Design
   • Creative Coding

Feel free to explore my projects and reach out!
    `,

    skills: `
┌─────────────────────────────────────┐
│         TECHNICAL SKILLS            │
└─────────────────────────────────────┘

💻 Languages:
   • JavaScript / TypeScript
   • Python
   • C++
   • HTML / CSS

🛠️ Frameworks & Tools:
   • React.js
   • Node.js
   • Git & GitHub
   • VS Code

🌐 Web Technologies:
   • REST APIs
   • WebSockets
   • CRDT (Conflict-free Replicated Data Types)

📚 Currently Learning:
   • System Design
   • Cloud Technologies
   • Advanced Algorithms
    `,

    contact: `
┌─────────────────────────────────────┐
│         GET IN TOUCH                │
└─────────────────────────────────────┘

📧 Email: [Your Email Here]

🐙 GitHub: https://github.com/aeron-gh

💼 LinkedIn: [Your LinkedIn Here]

🐦 Twitter: [Your Twitter Here]

Feel free to reach out for:
   • Collaboration opportunities
   • Project discussions
   • Just saying hi!

──────────────────────────────────────
Thanks for visiting my portfolio! 🚀
    `,

    notes: `
┌─────────────────────────────────────┐
│           NOTES                     │
└─────────────────────────────────────┘

📝 Personal Notes

This is where I keep my random thoughts
and ideas for future projects.

Ideas:
- Build a music visualizer
- Create a CLI tool for git workflows
- Contribute to open source projects

TODO:
[ ] Update portfolio projects
[ ] Learn Rust
[ ] Explore WebAssembly
    `,

    bashrc: `# ~/.bashrc: executed by bash(1) for non-login shells.

# If not running interactively, don't do anything
case $- in
    *i*) ;;
      *) return;;
esac

# Alias definitions
alias ll='ls -alF'
alias la='ls -A'
alias l='ls -CF'
alias cls='clear'

# Custom prompt
PS1='\\[\\033[01;32m\\]\\u@\\h\\[\\033[00m\\]:\\[\\033[01;34m\\]\\w\\[\\033[00m\\]\\$ '

# Enable color support
alias ls='ls --color=auto'
alias grep='grep --color=auto'

# Custom aliases
alias projects='cd ~/about_abhishek/projects'
alias dev='cd ~/Development'

# Welcome message
echo "Welcome back, Abhishek! 🚀"
    `,

    hostname: `portfolio`
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
