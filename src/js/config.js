/**
 * Application Configuration
 * Central configuration file for the Ubuntu Portfolio
 */

const CONFIG = {
  // App Info
  app: {
    name: "Abhishek Agarwal Portfolio",
    version: "1.0.0",
    author: "Abhishek Agarwal",
    github: "https://github.com/aeron-gh",
  },

  // Asset Paths
  paths: {
    icons: "assets/icons/",
    images: "assets/images/",
    backgrounds: "assets/backgrounds/",
    audio: "assets/audio/",
  },

  // Desktop Backgrounds - Local Ubuntu wallpapers only
  backgrounds: [
    "assets/wallpapers/ubuntu-logo-magenta-3840x2160-18138.png",
    "assets/wallpapers/wp12561378-4k-ubuntu-wallpapers.jpg",
    "assets/wallpapers/wp12561483-4k-ubuntu-wallpapers.jpg",
    "assets/wallpapers/wp8398476-ubuntu-2004-wallpapers.jpg",
    "assets/wallpapers/wp8398504-ubuntu-2004-wallpapers.jpg",
    "assets/wallpapers/wp10240930-ubuntu-mate-wallpapers.jpg",
    "assets/wallpapers/wallpaperflare.com_wallpaper.jpg",
    "assets/wallpapers/wallpaperflare.com_wallpaper-un.jpg",
    "assets/wallpapers/wallpaperflare.com_wallpaper .jpg",
  ],

  // Default wallpaper - Ubuntu Magenta
  defaultWallpaper: "url('assets/wallpapers/ubuntu-logo-magenta-3840x2160-18138.png')",

  // Audio URLs (external)
  audio: {
    click: "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3",
    open: "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3",
    close: "https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3",
    startup:
      "https://assets.mixkit.co/active_storage/sfx/2574/2574-preview.mp3",
  },

  // Desktop Settings
  desktop: {
    gridSize: 100,
    iconSize: 64,
    bootDuration: 3000,
  },
};

// Freeze config to prevent modifications
Object.freeze(CONFIG);
Object.freeze(CONFIG.app);
Object.freeze(CONFIG.paths);
Object.freeze(CONFIG.audio);
Object.freeze(CONFIG.desktop);
