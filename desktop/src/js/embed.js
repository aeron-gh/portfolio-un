// Embedded mode: the homepage loads this desktop in an iframe at /desktop/?embed=1.
// The homepage draws the boot animation and listens for two messages:
//   "desktop:ready"  the desktop has started
//   "desktop:exit"   the visitor wants to go back to the page

// Facts from the homepage's profile, injected by scripts/build-desktop.ts before this file.
window.SITE = window.SITE || { email: '', github: '', links: {}, total: '', since: '', spotifyEmbed: '' };

const EMBED = new URLSearchParams(location.search).has('embed');

function notifyParent(type) {
  if (EMBED && window.parent !== window) window.parent.postMessage({ type }, location.origin);
}

// Things that Esc already closes inside the desktop. If any is open, Esc belongs to it.
const OPEN_LAYERS = [
  '#activities-overview',
  '.ubuntu-app-grid-overlay',
  '.rename-dialog-overlay',
  '.power-dialog-overlay',
  '#lock-screen:not(.hidden)',
  '#context-menu:not(.hidden)',
  '#icon-context-menu:not(.hidden)',
  '#system-menu:not(.hidden)',
  '#calendar-dropdown:not(.hidden)',
].join(', ');

// Capture phase on window runs before the desktop's own Esc handlers close anything,
// so "Esc closed an overlay" and "Esc on a quiet desktop" can be told apart.
window.addEventListener(
  'keydown',
  (e) => {
    if (!EMBED || e.key !== 'Escape') return;
    const t = e.target;
    if (t && (t.isContentEditable || (t.closest && t.closest('input, textarea, select')))) return;
    if (document.querySelector(OPEN_LAYERS)) return;
    notifyParent('desktop:exit');
  },
  true,
);
