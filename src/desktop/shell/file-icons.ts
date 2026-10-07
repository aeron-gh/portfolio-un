import { HOME, type FsNode } from '../fs/vfs';

const SPECIAL: Record<string, string> = {
  [HOME]: 'user-home',
  [`${HOME}/Desktop`]: 'user-desktop',
  [`${HOME}/.local/share/Trash/files`]: 'user-trash',
};

export function iconFor(path: string, node: FsNode): string {
  if (SPECIAL[path]) return SPECIAL[path];
  if (node.kind === 'dir') return 'folder';
  if (node.mime === 'text/markdown') return 'text-markdown';
  if (node.mime === 'application/pdf') return 'application-pdf';
  if (node.mime?.startsWith('image/')) return 'image-x-generic';
  return 'text-x-generic';
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
