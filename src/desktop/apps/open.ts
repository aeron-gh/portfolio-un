// Which app opens a file: Ubuntu 26.04's default applications (Text Editor, Image Viewer, Document Viewer, Files).
import type { FsNode } from '../fs/vfs';
import { appById, isAvailable, type AppId } from './registry';

/** shared-mime-info makes these sub-classes of text/plain, so they open with the text editor too. */
const TEXT = new Set(['application/json']);

/** The app that opens `node`, or null when nothing installed handles it (the caller shows GNOME's "no app" dialog). */
export function appFor(
  node: Pick<FsNode, 'kind' | 'mime'>,
  available: (id: AppId) => boolean = (id) => isAvailable(appById(id)),
): AppId | null {
  const mime = node.mime ?? '';
  let app: AppId | null = null;
  if (node.kind === 'dir') app = 'files';
  else if (mime.startsWith('text/') || TEXT.has(mime)) app = 'text-editor';
  else if (mime.startsWith('image/')) app = 'image-viewer';
  else if (mime === 'application/pdf') app = 'document-viewer';
  return app && available(app) ? app : null;
}
