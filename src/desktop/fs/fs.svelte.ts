// The one file system instance shared by every app, plus a counter that changes on every write.
import { safeStorage } from '../system/settings';
import { loadOverlay, saveOverlay, Vfs, type FsNode } from './vfs';

let instance: Vfs | null = null;
export const fsState = $state({ version: 0, resetNotice: false });

export function initFs(seed: FsNode): Vfs {
  const store = safeStorage();
  const { overlay, corrupt } = loadOverlay(store);
  // Island props arrive as a $state proxy (@astrojs/svelte), which structuredClone cannot copy.
  instance = new Vfs($state.snapshot(seed) as FsNode, overlay);
  fsState.resetNotice = corrupt;
  if (corrupt) saveOverlay(store, {}); // replace it with the seed for good, so the reset notice shows only once

  instance.watch('/', () => {
    fsState.version++;
    saveOverlay(store, instance!.overlay());
  });
  return instance;
}

export function fs(): Vfs {
  if (!instance) throw new Error('file system not started');
  return instance;
}
