// Data the page hands to the desktop (besides the file system seed).
export type Env = {
  fullName: string;
  avatar: string;
  wallpaperLight: string;
  wallpaperDark: string;
  placeholders: { light: string; dark: string };
};
