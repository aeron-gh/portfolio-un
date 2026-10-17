// Every app the desktop knows. Real apps ship later (built: false keeps them out of the dock, the app grid and
// search). Two hidden test apps exist only with ?test-apps in the URL, so tests can drive real windows.
import type { Component } from 'svelte';

export type AppId =
  | 'firefox' | 'files' | 'terminal' | 'text-editor' | 'music' | 'app-center' | 'help' | 'settings'
  | 'image-viewer' | 'document-viewer' | 'test-window' | 'test-utility';

export type AppProps = { winId: string; args?: unknown };

export type AppEntry = {
  id: AppId;
  name: string;
  /** Yaru icon name. */
  icon: string;
  keywords?: string[];
  built: boolean;
  testOnly?: boolean;
  folder?: 'Utilities';
  window: { w: number; h: number; minW: number; minH: number };
  load?: () => Promise<{ default: Component<AppProps> }>;
  /** Opens a file in this app when a new window is not always the answer (a tab in the window already open). */
  open?: (path: string) => Promise<void>;
};

const WIDE = { w: 1100, h: 720, minW: 450, minH: 300 };
const NORMAL = { w: 900, h: 640, minW: 360, minH: 240 };

export const APPS: AppEntry[] = [
  { id: 'firefox', name: 'Firefox', icon: 'firefox', keywords: ['web', 'browser', 'internet'], built: false, window: WIDE },
  { id: 'files', name: 'Files', icon: 'org.gnome.Nautilus', keywords: ['folder', 'manager', 'explore'], built: false, window: NORMAL },
  { id: 'terminal', name: 'Terminal', icon: 'org.gnome.Ptyxis', keywords: ['shell', 'prompt', 'command'], built: false, window: NORMAL },
  {
    id: 'text-editor', name: 'Text Editor', icon: 'org.gnome.TextEditor', keywords: ['text', 'edit', 'notes'], built: true, window: NORMAL,
    load: () => import('./text-editor/TextEditor.svelte'),
    open: (path) => import('./text-editor/session.svelte').then((m) => m.openDocument(path)),
  },
  { id: 'music', name: 'Music', icon: 'spotify-client', keywords: ['songs', 'playlist', 'spotify'], built: false, window: NORMAL },
  { id: 'app-center', name: 'App Center', icon: 'snap-store', keywords: ['software', 'install', 'store'], built: false, window: WIDE },
  { id: 'help', name: 'Help', icon: 'org.gnome.Yelp', keywords: ['documentation', 'manual'], built: false, window: NORMAL },
  { id: 'settings', name: 'Settings', icon: 'org.gnome.Settings', keywords: ['preferences', 'configuration'], built: false, window: WIDE },
  { id: 'image-viewer', name: 'Image Viewer', icon: 'org.gnome.Loupe', keywords: ['photo', 'picture'], built: false, window: NORMAL },
  { id: 'document-viewer', name: 'Document Viewer', icon: 'org.gnome.Papers', keywords: ['pdf'], built: false, window: NORMAL },
  {
    id: 'test-window', name: 'Test Window', icon: 'application-x-executable', keywords: ['test'], built: true, testOnly: true,
    window: { w: 640, h: 420, minW: 320, minH: 200 }, load: () => import('./test-window/TestWindow.svelte'),
  },
  {
    id: 'test-utility', name: 'Test Utility', icon: 'application-x-executable', keywords: ['test'], built: true, testOnly: true,
    folder: 'Utilities', window: { w: 480, h: 360, minW: 320, minH: 200 }, load: () => import('./test-window/TestUtility.svelte'),
  },
];

/** Ubuntu's dock order with the owner's apps (Settings is not pinned on real Ubuntu). */
export const PINNED_DEFAULT: AppId[] = ['firefox', 'files', 'terminal', 'text-editor', 'music', 'app-center', 'help'];

export function testModeFrom(search: string): boolean {
  return new URLSearchParams(search).has('test-apps');
}

export const TEST_MODE = typeof location !== 'undefined' && testModeFrom(location.search);

export function appById(id: AppId): AppEntry {
  return APPS.find((a) => a.id === id)!;
}

export function isAvailable(app: AppEntry, testMode: boolean = TEST_MODE): boolean {
  return app.built && (!app.testOnly || testMode);
}

export function availableApps(testMode: boolean = TEST_MODE): AppEntry[] {
  return APPS.filter((a) => isAvailable(a, testMode));
}
