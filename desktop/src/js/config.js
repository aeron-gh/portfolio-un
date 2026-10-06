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

  // Desktop wallpapers (AVIF, made by scripts/convert-wallpapers.ts). The first one is the default.
  backgrounds: [
    "assets/wallpapers/wallpaper-01.avif",
    "assets/wallpapers/wallpaper-02.avif",
    "assets/wallpapers/wallpaper-03.avif",
    "assets/wallpapers/wallpaper-04.avif",
    "assets/wallpapers/wallpaper-05.avif",
    "assets/wallpapers/wallpaper-06.avif",
    "assets/wallpapers/wallpaper-07.avif",
    "assets/wallpapers/wallpaper-08.avif",
    "assets/wallpapers/wallpaper-09.avif",
  ],

  defaultWallpaper: "url('assets/wallpapers/wallpaper-01.avif')",

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
