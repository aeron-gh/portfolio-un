// What a double-click does anywhere on the desktop: open a file or folder with its default app.
import { fs } from '../fs/fs.svelte';
import { launch } from '../wm/wm.svelte';
import { appFor } from './open';
import { appById } from './registry';

/** False when no installed app handles it: the caller shows GNOME's "no app" dialog. */
export async function openPath(path: string): Promise<boolean> {
  const node = fs().stat(path);
  const app = node && appFor(node);
  if (!app) return false;
  const entry = appById(app);
  if (entry.open) await entry.open(path);
  else await launch(app, { path });
  return true;
}
