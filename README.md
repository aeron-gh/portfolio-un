# Abhishek's Ubuntu Portfolio

An interactive portfolio website that mimics an Ubuntu desktop interface with fully functional apps.

## 🚀 Live Demo
Host on GitHub Pages: `https://aeron-gh.github.io/portfolio-un/`

## ✨ Features

### Desktop Environment
- **Ubuntu Boot Screen** - Animated loading screen with Ubuntu branding
- **GNOME-style Desktop** - Official Ubuntu gradient wallpaper
- **Top Bar** - Clock, system tray, notifications
- **Dock** - Quick app launcher with tooltips
- **Desktop Icons** - Draggable icons, positioned bottom-right
- **Application Grid** - Press "Show Applications" for Ubuntu-style app launcher

### Applications

| App | Features |
|-----|----------|
| **Files** | Full Nautilus-style file manager with sidebar, breadcrumbs, grid/list view |
| **Terminal** | Interactive bash-like terminal with custom commands |
| **Firefox** | Browser with tabs, URL bar, search, bookmarks, new tab page with shortcuts |
| **Text Editor** | Full-featured editor with save, undo/redo, find/replace, zoom, line numbers |
| **Settings** | System preferences panel |
| **About Me** | Portfolio information card |

### Text Editor Features
- Menu bar (File, Edit, Search, View, Help)
- Toolbar with common actions
- Line numbers & word wrap toggle
- Find & Replace (Ctrl+F, Ctrl+H)
- Go to Line (Ctrl+G)
- Zoom controls (Ctrl++/-)
- Save to browser localStorage
- Keyboard shortcuts
- Unsaved changes indicator

### Firefox Browser Features
- Tab bar with favicon
- Navigation (Back, Forward, Reload, Home)
- URL bar with secure icon
- Google search integration
- New tab page with shortcuts (Google, YouTube, GitHub, etc.)
- Pocket-style recommendations

## 🎮 Terminal Commands

```bash
help        # Show all commands
about       # About me
skills      # Technical skills  
projects    # View projects
contact     # Contact info
neofetch    # Fun system info
github      # Open GitHub
ls          # List files
cd [dir]    # Change directory
cat [file]  # Display file contents
clear       # Clear terminal
```

## 📁 Project Structure

```
proj-portfolio/
├── index.html              # Main HTML entry point
├── README.md               # Documentation
├── CNAME                   # Custom domain config
│
├── assets/                 # Static assets
│   ├── icons/              # SVG icons
│   │   ├── ubuntu-logo.svg
│   │   ├── favicon.svg
│   │   ├── wifi.svg
│   │   ├── volume.svg
│   │   ├── battery.svg
│   │   ├── folder.svg
│   │   ├── file.svg
│   │   ├── terminal.svg
│   │   ├── browser.svg
│   │   ├── text-editor.svg
│   │   ├── user.svg
│   │   ├── github.svg
│   │   └── settings.svg
│   ├── images/             # Image assets
│   ├── backgrounds/        # Desktop wallpapers
│   └── audio/              # Sound effects
│
└── src/                    # Source code
    ├── css/                # Stylesheets
    │   ├── style.css       # Base styles, desktop, top bar, dock
    │   ├── ubuntu-theme.css# Ubuntu color variables & theme
    │   ├── window.css      # Window component styles
    │   ├── apps.css        # App-specific styles
    │   └── text-editor.css # Text Editor app styles
    │
    └── js/                 # JavaScript modules
        ├── config.js       # App configuration & constants
        ├── main.js         # App initialization, system menu
        ├── window-manager.js # Window management system
        ├── file-manager.js # Files app logic
        ├── terminal.js     # Terminal emulator
        ├── text-editor.js  # Text editor functionality
        ├── desktop.js      # Desktop & app grid
        ├── components/     # Reusable UI components
        └── utils/          # Utility functions
```

### Module Overview

| File | Purpose |
|------|---------|
| `config.js` | Centralized app configuration and constants |
| `main.js` | Boot sequence, clock, system menu, file contents data |
| `window-manager.js` | Creates windows, handles drag/resize/minimize/maximize |
| `file-manager.js` | Nautilus file browser with navigation & views |
| `terminal.js` | Bash-like terminal with command parser |
| `text-editor.js` | Full text editor with menus, toolbar, dialogs |
| `desktop.js` | Desktop icons, application grid, wallpaper management |

## 🎨 Customization

### Update Your Info
Edit `src/js/main.js` to update:
- `FileContents.about` - Your bio
- `FileContents.skills` - Your skills
- `FileContents.contact` - Your contact info
- `FileSystem.structure` - Your projects/links

### Change Wallpaper
Edit `src/js/config.js`:
- `CONFIG.backgrounds` array - List of wallpaper URLs
- `CONFIG.defaultWallpaper` - Default gradient/image

### Add New Apps
1. Add app config in `src/js/window-manager.js` → `getAppConfig()`
2. Add app icon in dock/app grid (`index.html` & `src/js/desktop.js`)
3. Create CSS in `src/css/apps.css` or new file
4. Create JS module in `src/js/` folder if needed

## 🚀 Deployment

### GitHub Pages
1. Create a new repository on GitHub
2. Push this code to the repository
3. Go to Settings → Pages
4. Select "main" branch and save
5. Your portfolio will be live!

### Custom Domain
1. Add your domain to `CNAME` file
2. Configure DNS records with your provider

## 🛠 Tech Stack

- **Pure HTML/CSS/JavaScript** - No frameworks
- **No build tools required** - Just serve the files
- **Google Fonts** - Ubuntu font family
- **LocalStorage** - For saving files in Text Editor

## 📝 License

MIT - Feel free to use and modify!

---
Made with ❤️ and a love for Ubuntu 🐧