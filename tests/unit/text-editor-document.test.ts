import { describe, expect, test } from 'bun:test';
import { draftTitle, isModified, subtitleOf, subtitleVisible, suggestedName, titleOf, windowTitle, type Doc } from '../../src/desktop/apps/text-editor/document';

const doc = (over: Partial<Doc> = {}): Doc => ({ id: 'd1', path: null, text: '', saved: '', readonly: false, ...over });

describe('draft titles (editor_document_dup_title)', () => {
  test('an empty draft has no title of its own', () => {
    expect(draftTitle('')).toBeNull();
    expect(draftTitle('  \n\n')).toBeNull();
  });

  test('the title is the first words of the text, with punctuation turned into single spaces', () => {
    expect(draftTitle('Shopping list')).toBe('Shopping list');
    expect(draftTitle('# Notes: day-one')).toBe('Notes day one');
    expect(draftTitle('hello   world')).toBe('hello world');
  });

  test('a blank line ends the title', () => {
    expect(draftTitle('Title\n\nBody text')).toBe('Title');
    expect(draftTitle('one\ntwo')).toBe('one two');
  });

  test('after 20 characters the title stops at the next word break, and never passes 100', () => {
    expect(draftTitle("# Welcome to Abhishek's computer\n\nmore")).toBe('Welcome to Abhishek s');
    expect(draftTitle('a'.repeat(150))).toBe('a'.repeat(100));
  });
});

describe('titles and subtitles', () => {
  test('a file shows its name and its folder with ~ for home', () => {
    const d = doc({ path: '/home/ubuntu/Desktop/README.md', text: 'x', saved: 'x' });
    expect(titleOf(d)).toBe('README.md');
    expect(subtitleOf(d)).toBe('~/Desktop');
    expect(windowTitle(d)).toBe('README.md (~/Desktop) - Text Editor');
    expect(subtitleOf(doc({ path: '/etc/hostname' }))).toBe('/etc');
    expect(subtitleOf(doc({ path: '/home/ubuntu/.bashrc' }))).toBe('~');
  });

  test('a draft is "New Document" until it has text, with "Draft" underneath', () => {
    expect(titleOf(doc())).toBe('New Document');
    expect(subtitleOf(doc())).toBe('Draft');
    expect(titleOf(doc({ text: 'Shopping list\n\nmilk' }))).toBe('Shopping list');
    expect(windowTitle(doc())).toBe('New Document (Draft) - Text Editor');
  });

  test('a read-only file says so in its title', () => {
    expect(titleOf(doc({ path: '/etc/hostname', readonly: true }))).toBe('hostname [Read-Only]');
  });

  test('the subtitle shows for files and for drafts with changes, not for a fresh draft', () => {
    expect(subtitleVisible(doc())).toBe(false);
    expect(subtitleVisible(doc({ text: 'a' }))).toBe(true);
    expect(subtitleVisible(doc({ path: '/home/ubuntu/a.txt' }))).toBe(true);
  });

  test('modified means the text differs from what was saved', () => {
    expect(isModified(doc({ text: 'a', saved: 'a' }))).toBe(false);
    expect(isModified(doc({ text: 'ab', saved: 'a' }))).toBe(true);
  });

  test('a draft is saved as its title plus .txt', () => {
    expect(suggestedName(doc())).toBe('New Document.txt');
    expect(suggestedName(doc({ text: 'Shopping list' }))).toBe('Shopping list.txt');
    expect(suggestedName(doc({ text: 'notes.txt' }))).toBe('notes txt.txt');
  });
});
