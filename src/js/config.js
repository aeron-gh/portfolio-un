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

  // Desktop Backgrounds - Ubuntu 24.04 LTS and community wallpapers
  backgrounds: [
    "assets/wallpapers/wallpaperflare.com_wallpaper.jpg",
    "assets/wallpapers/wallpaperflare.com_wallpaper-un.jpg",
    "assets/wallpapers/wallpaperflare.com_wallpaper .jpg",
    "https://raw.githubusercontent.com/ubuntu/wallpapers/main/Noble/Noble%20Numbat.png",
    "https://i.imgur.com/Qn8LGZR.jpeg",
    "https://raw.githubusercontent.com/ubuntu/yaru/master/backgrounds/Jammy-Jellyfish_WP_1920x1080.png",
    "https://i.imgur.com/YQ8VWXK.jpeg",
    "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1920&q=80",
    "https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=1920&q=80",
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=80",
    "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1920&q=80",
    "https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=1920&q=80",
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&q=80",
    "https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=1920&q=80",
  ],

  // Default Ubuntu gradient
  defaultWallpaper:
    "linear-gradient(135deg, #E95420 0%, #772953 50%, #2C001E 100%)",

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
