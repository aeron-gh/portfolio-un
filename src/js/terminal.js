// Terminal - Ubuntu GNOME Terminal Style

const Terminal = {
    commands: {},
    commandHistory: [],
    historyIndex: -1,

    init() {
        this.registerCommands();
    },

    registerCommands() {
        this.commands = {
            help: {
                description: 'Show available commands',
                run: (ctx) => {
                    const cmds = Object.entries(this.commands)
                        .map(([name, cmd]) => `  <span class="terminal-highlight">${name.padEnd(12)}</span> ${cmd.description}`)
                        .join('\n');
                    return `<span class="terminal-success">Available commands:</span>\n\n${cmds}\n\n<span class="terminal-output">Tip: Tab=autocomplete, ↑↓=history, Ctrl+L=clear</span>`;
                }
            },
            about: {
                description: 'About me',
                run: () => `<span class="terminal-success">╔══════════════════════════════════════════╗
║          ABHISHEK AGARWAL                ║
╚══════════════════════════════════════════╝</span>

👋 Hey there! I'm a developer who loves building things.

<span class="terminal-highlight">🎯 Currently working on:</span>
   • Web applications
   • Collaborative tools
   • Creative side projects

Type <span class="terminal-highlight">skills</span> to see my skills, <span class="terminal-highlight">projects</span> to see my work.`
            },
            skills: {
                description: 'List my technical skills',
                run: () => `<span class="terminal-success">═══ Technical Skills ═══</span>

<span class="terminal-highlight">Languages:</span>
   JavaScript ████████████████░░░░ 80%
   Python     ██████████████░░░░░░ 70%
   C++        ████████████░░░░░░░░ 60%
   TypeScript ██████████████░░░░░░ 70%

<span class="terminal-highlight">Frameworks & Tools:</span>
   • React.js / Node.js
   • Git & GitHub
   • VS Code / Linux`
            },
            projects: {
                description: 'Show my projects',
                run: () => `<span class="terminal-success">═══ My Projects ═══</span>

<span class="terminal-highlight">1. CollabCode</span>
   Real-time collaborative code editor with CRDT
   <span class="terminal-link" data-url="https://aeron-gh.github.io/collabcode/">→ https://aeron-gh.github.io/collabcode/</span>

<span class="terminal-highlight">2. Tic-Tac-Toe</span>
   Terminal-based two-player game in C++
   <span class="terminal-link" data-url="https://github.com/aeron-gh">→ View on GitHub</span>

<span class="terminal-highlight">More on GitHub:</span>
   <span class="terminal-link" data-url="https://github.com/aeron-gh">→ github.com/aeron-gh</span>`
            },
            contact: {
                description: 'Contact information',
                run: () => `<span class="terminal-success">═══ Contact ═══</span>

📧 Email:    your.email@example.com
🐙 GitHub:   <span class="terminal-link" data-url="https://github.com/aeron-gh">github.com/aeron-gh</span>
💼 LinkedIn: your-linkedin-here`
            },
            clear: {
                description: 'Clear the terminal',
                run: (ctx) => {
                    ctx.clear();
                    return null;
                }
            },
            ls: {
                description: 'List directory contents',
                run: () => `<span class="terminal-highlight">projects/</span>  <span class="terminal-success">about_me.txt</span>  <span class="terminal-success">skills.txt</span>  <span class="terminal-success">contact.txt</span>  <span class="terminal-link" data-url="https://github.com/aeron-gh">GitHub</span>`
            },
            pwd: {
                description: 'Print working directory',
                run: () => '/home/abhishek'
            },
            whoami: {
                description: 'Print current user',
                run: () => 'abhishek'
            },
            hostname: {
                description: 'Print hostname',
                run: () => 'portfolio'
            },
            date: {
                description: 'Print current date',
                run: () => new Date().toString()
            },
            echo: {
                description: 'Print arguments',
                run: (ctx, args) => args.join(' ')
            },
            uname: {
                description: 'Print system info',
                run: (ctx, args) => args.includes('-a') 
                    ? 'Linux portfolio 5.15.0-web #1 SMP JavaScript x86_64 GNU/Linux'
                    : 'Linux'
            },
            uptime: {
                description: 'Print system uptime',
                run: () => {
                    const m = Math.floor(performance.now() / 60000);
                    const h = String(new Date().getHours()).padStart(2, '0');
                    const min = String(new Date().getMinutes()).padStart(2, '0');
                    return ` ${h}:${min}  up ${m} min,  1 user,  load average: 0.00, 0.01, 0.05`;
                }
            },
            neofetch: {
                description: 'System information',
                run: () => {
                    const m = Math.floor(performance.now() / 60000);
                    return `<span class="terminal-success">        _</span>             <span class="terminal-success">abhishek</span>@<span class="terminal-success">portfolio</span>
<span class="terminal-success">       / \\</span>            ─────────────────────
<span class="terminal-success">      /   \\</span>           <span class="terminal-highlight">OS:</span> Ubuntu 22.04 LTS x86_64
<span class="terminal-success">     /     \\</span>          <span class="terminal-highlight">Host:</span> GitHub Pages
<span class="terminal-success">    /       \\</span>         <span class="terminal-highlight">Kernel:</span> JavaScript ES2024
<span class="terminal-success">   /    _    \\</span>        <span class="terminal-highlight">Uptime:</span> ${m} mins
<span class="terminal-success">  /    / \\    \\</span>       <span class="terminal-highlight">Shell:</span> bash 5.1.16
<span class="terminal-success"> /____/   \\____\\</span>      <span class="terminal-highlight">Terminal:</span> gnome-terminal
                       <span class="terminal-highlight">Theme:</span> Yaru-dark [GTK3]
                       
                       <span style="color:#CC0000">███</span><span style="color:#4E9A06">███</span><span style="color:#C4A000">███</span><span style="color:#3465A4">███</span><span style="color:#75507B">███</span><span style="color:#06989A">███</span><span style="color:#D3D7CF">███</span>`;
                }
            },
            cat: {
                description: 'Print file contents',
                run: (ctx, args) => {
                    if (!args[0]) return '<span class="terminal-error">cat: missing operand</span>';
                    const files = {
                        'about_me.txt': 'about', 'about.txt': 'about',
                        'skills.txt': 'skills', 'contact.txt': 'contact',
                        'README.txt': 'readme', 'readme.txt': 'readme'
                    };
                    if (files[args[0]] && FileContents[files[args[0]]]) {
                        return FileContents[files[args[0]]];
                    }
                    return `<span class="terminal-error">cat: ${args[0]}: No such file or directory</span>`;
                }
            },
            cd: {
                description: 'Change directory',
                run: (ctx, args) => !args[0] || args[0] === '~' ? '' : ''
            },
            history: {
                description: 'Show command history',
                run: () => {
                    if (!Terminal.commandHistory.length) return 'No commands in history';
                    return Terminal.commandHistory.map((c, i) => `  ${String(i+1).padStart(4)}  ${c}`).join('\n');
                }
            },
            github: {
                description: 'Open GitHub profile',
                run: () => {
                    window.open('https://github.com/aeron-gh', '_blank');
                    return '<span class="terminal-success">Opening GitHub...</span>';
                }
            },
            cowsay: {
                description: 'Cow says...',
                run: (ctx, args) => {
                    const msg = args.join(' ') || 'Moo!';
                    const b = '─'.repeat(msg.length + 2);
                    return ` ┌${b}┐\n │ ${msg} │\n └${b}┘\n        \\   ^__^\n         \\  (oo)\\_______\n            (__)\\       )\\/\\\n                ||----w |\n                ||     ||`;
                }
            },
            fortune: {
                description: 'Print a random quote',
                run: () => {
                    const f = [
                        '"The best way to predict the future is to invent it." - Alan Kay',
                        '"Talk is cheap. Show me the code." - Linus Torvalds',
                        '"First, solve the problem. Then, write the code." - John Johnson',
                        '"Simplicity is the soul of efficiency." - Austin Freeman'
                    ];
                    return f[Math.floor(Math.random() * f.length)];
                }
            },
            sudo: {
                description: 'Execute as superuser',
                run: () => `<span class="terminal-error">[sudo] password for abhishek: </span>
<span class="terminal-error">Sorry, try again.</span>
<span class="terminal-output">(Nice try! 😄)</span>`
            },
            rm: {
                description: 'Remove files',
                run: (ctx, args) => `<span class="terminal-error">rm: cannot remove: Read-only file system</span>`
            },
            exit: {
                description: 'Close terminal',
                run: (ctx) => {
                    App.playSound('sound-close');
                    setTimeout(() => ctx.close(), 200);
                    return 'logout';
                }
            },
            open: {
                description: 'Open an application',
                run: (ctx, args) => {
                    if (!args[0]) return 'Usage: open [files|terminal|browser|about]';
                    const apps = ['files', 'terminal', 'browser', 'about'];
                    if (apps.includes(args[0])) {
                        setTimeout(() => WindowManager.openApp(args[0]), 100);
                        return `<span class="terminal-success">Opening ${args[0]}...</span>`;
                    }
                    return `<span class="terminal-error">open: ${args[0]}: Application not found</span>`;
                }
            },
            man: {
                description: 'Display manual page',
                run: (ctx, args) => {
                    if (!args[0]) return 'What manual page do you want?';
                    const cmd = Terminal.commands[args[0]];
                    if (cmd) {
                        return `<span class="terminal-highlight">${args[0].toUpperCase()}(1)</span>

<span class="terminal-success">NAME</span>
       ${args[0]} - ${cmd.description}

<span class="terminal-success">DESCRIPTION</span>
       ${cmd.description}`;
                    }
                    return `<span class="terminal-error">No manual entry for ${args[0]}</span>`;
                }
            }
        };
    },

    getWindowContent() {
        return `<div class="terminal-window"><div class="terminal" tabindex="0"></div></div>`;
    },

    initWindow(windowEl) {
        const terminal = windowEl.querySelector('.terminal');
        const self = this;
        
        // Welcome message
        this.print(terminal, '<span class="terminal-output">Welcome to Portfolio Terminal</span>');
        this.print(terminal, '<span class="terminal-output">Type </span><span class="terminal-highlight">help</span><span class="terminal-output"> for available commands.</span>');
        this.print(terminal, '');
        
        // Create prompt
        this.prompt(terminal, windowEl);

        // Click to focus + links
        terminal.addEventListener('click', (e) => {
            if (e.target.classList.contains('terminal-link')) {
                const url = e.target.dataset.url;
                if (url) window.open(url, '_blank');
            }
            const inp = terminal.querySelector('.terminal-input:not([disabled])');
            if (inp) inp.focus();
        });
    },

    print(terminal, html) {
        const line = document.createElement('div');
        line.className = 'terminal-line';
        line.innerHTML = html;
        terminal.appendChild(line);
    },

    prompt(terminal, windowEl) {
        const line = document.createElement('div');
        line.className = 'terminal-line terminal-input-line';
        line.innerHTML = `<span class="terminal-user">abhishek</span><span class="terminal-at">@</span><span class="terminal-host">portfolio</span><span class="terminal-colon">:</span><span class="terminal-path">~</span><span class="terminal-dollar">$ </span><input type="text" class="terminal-input" spellcheck="false" autocomplete="off" autocapitalize="off">`;
        terminal.appendChild(line);
        
        const input = line.querySelector('.terminal-input');
        input.focus();
        
        const self = this;
        input.addEventListener('keydown', function(e) {
            self.handleKey(e, this, terminal, windowEl);
        });
    },

    handleKey(e, input, terminal, windowEl) {
        const self = this;
        
        if (e.key === 'Enter') {
            e.preventDefault();
            const cmd = input.value.trim();
            input.disabled = true;
            
            // Replace input with text
            const line = input.parentElement;
            line.innerHTML = `<span class="terminal-user">abhishek</span><span class="terminal-at">@</span><span class="terminal-host">portfolio</span><span class="terminal-colon">:</span><span class="terminal-path">~</span><span class="terminal-dollar">$ </span>${this.esc(cmd)}`;
            
            if (cmd) {
                this.commandHistory.push(cmd);
                this.historyIndex = -1;
                
                const ctx = {
                    terminal,
                    windowEl,
                    clear: () => { terminal.innerHTML = ''; },
                    close: () => {
                        const w = WindowManager.windows.find(w => w.element === windowEl);
                        if (w) WindowManager.closeWindow(w);
                    }
                };
                
                const output = this.exec(cmd, ctx);
                if (output !== null && output !== undefined && output !== '') {
                    this.print(terminal, output);
                }
            }
            
            this.prompt(terminal, windowEl);
            terminal.scrollTop = terminal.scrollHeight;
            
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (this.historyIndex < this.commandHistory.length - 1) {
                this.historyIndex++;
                input.value = this.commandHistory[this.commandHistory.length - 1 - this.historyIndex];
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (this.historyIndex > 0) {
                this.historyIndex--;
                input.value = this.commandHistory[this.commandHistory.length - 1 - this.historyIndex];
            } else {
                this.historyIndex = -1;
                input.value = '';
            }
        } else if (e.key === 'Tab') {
            e.preventDefault();
            const v = input.value.toLowerCase();
            const m = Object.keys(this.commands).filter(c => c.startsWith(v));
            if (m.length === 1) input.value = m[0];
            else if (m.length > 1) {
                this.print(terminal, m.join('  '));
                terminal.scrollTop = terminal.scrollHeight;
            }
        } else if (e.key === 'l' && e.ctrlKey) {
            e.preventDefault();
            terminal.innerHTML = '';
            this.prompt(terminal, windowEl);
        } else if (e.key === 'c' && e.ctrlKey) {
            e.preventDefault();
            input.disabled = true;
            input.parentElement.innerHTML += '^C';
            this.print(terminal, '');
            this.prompt(terminal, windowEl);
        }
    },

    exec(cmdLine, ctx) {
        const parts = cmdLine.trim().split(/\s+/);
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);
        
        if (this.commands[cmd]) {
            try {
                return this.commands[cmd].run(ctx, args);
            } catch (err) {
                return `<span class="terminal-error">Error: ${err.message}</span>`;
            }
        }
        if (cmd === '') return null;
        return `<span class="terminal-error">${cmd}: command not found</span>`;
    },

    esc(text) {
        const d = document.createElement('div');
        d.textContent = text;
        return d.innerHTML;
    }
};
