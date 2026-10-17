import { describe, expect, test } from 'bun:test';
import type { AppId } from '../../src/desktop/apps/registry';
import { appFor } from '../../src/desktop/apps/open';

const all = () => true;
const file = (mime: string) => ({ kind: 'file' as const, mime });

describe('which app opens a file', () => {
  test('text opens in Text Editor: plain text, Markdown, scripts, JSON', () => {
    for (const mime of ['text/plain', 'text/markdown', 'text/x-shellscript', 'text/javascript', 'application/json']) {
      expect(appFor(file(mime), all)).toBe('text-editor');
    }
  });

  test('images open in Image Viewer, PDFs in Document Viewer, folders in Files', () => {
    expect(appFor(file('image/avif'), all)).toBe('image-viewer');
    expect(appFor(file('image/svg+xml'), all)).toBe('image-viewer');
    expect(appFor(file('application/pdf'), all)).toBe('document-viewer');
    expect(appFor({ kind: 'dir' }, all)).toBe('files');
  });

  test('a type nothing handles opens nothing', () => {
    expect(appFor(file('application/octet-stream'), all)).toBeNull();
    expect(appFor(file('application/x-desktop'), all)).toBeNull();
    expect(appFor({ kind: 'file' }, all)).toBeNull();
  });

  test('an app that is not installed yet opens nothing', () => {
    const only = (id: AppId) => id === 'text-editor';
    expect(appFor(file('text/markdown'), only)).toBe('text-editor');
    expect(appFor(file('application/pdf'), only)).toBeNull();
    expect(appFor({ kind: 'dir' }, only)).toBeNull();
  });
});
