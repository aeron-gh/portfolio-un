import { HOME, type FsNode } from '../fs/vfs';

const SPECIAL: Record<string, string> = {
  [HOME]: 'user-home',
  [`${HOME}/Desktop`]: 'user-desktop',
  [`${HOME}/Documents`]: 'folder-documents',
  [`${HOME}/Downloads`]: 'folder-download',
  [`${HOME}/Music`]: 'folder-music',
  [`${HOME}/Pictures`]: 'folder-pictures',
  [`${HOME}/Public`]: 'folder-publicshare',
  [`${HOME}/Templates`]: 'folder-templates',
  [`${HOME}/Videos`]: 'folder-videos',
  [`${HOME}/.local/share/Trash/files`]: 'user-trash',
};

/** The icon GIO finds for a type: the type's own name, or the generic-icon shared-mime-info gives it. */
const TYPE_ICONS: Record<string, string> = {
  'text/markdown': 'text-markdown',
  'text/x-shellscript': 'text-x-script',
  'text/javascript': 'application-javascript',
  'application/json': 'application-json',
  'application/pdf': 'application-pdf',
  'application/x-desktop': 'application-x-desktop',
  'application/octet-stream': 'application-octet-stream',
};

export function iconFor(path: string, node: FsNode): string {
  if (SPECIAL[path]) return SPECIAL[path];
  if (node.kind === 'dir') return 'folder';
  if (node.mime?.startsWith('image/')) return 'image-x-generic';
  return TYPE_ICONS[node.mime ?? ''] ?? 'text-x-generic';
}

/** Type names exactly as shared-mime-info words them (what GNOME shows). */
const TYPE_NAMES: Record<string, string> = {
  'text/plain': 'Plain text document',
  'text/markdown': 'Markdown document',
  'text/x-shellscript': 'Shell script',
  'text/javascript': 'JavaScript program',
  'application/json': 'JSON document',
  'application/pdf': 'PDF document',
  'application/x-desktop': 'Desktop entry',
  'image/avif': 'AVIF image',
  'image/png': 'PNG image',
  'image/jpeg': 'JPEG image',
  'image/webp': 'WebP image',
  'image/svg+xml': 'SVG image',
};

export function typeLabel(node: FsNode): string {
  if (node.kind === 'dir') return 'Folder';
  return TYPE_NAMES[node.mime ?? ''] ?? 'Unknown';
}

/** The dialog Nautilus shows when no app can open a file (show_unhandled_type_error). */
export function noAppDialog(name: string, node: FsNode): { title: string; body: string } {
  const known = node.kind === 'dir' || (node.mime ?? '') in TYPE_NAMES;
  return {
    title: `Could Not Display “${name}”`,
    body: known ? `There is no app installed for “${typeLabel(node)}” files` : 'The file is of an unknown type',
  };
}
