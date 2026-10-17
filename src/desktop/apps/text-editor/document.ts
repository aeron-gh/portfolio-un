// A Text Editor document and how it is named (GNOME Text Editor 50: editor-document.c, editor-page.c, editor-window.c).
import { basename, dirname, HOME } from '../../fs/vfs';

export type Doc = {
  id: string;
  /** null for a draft that has never been saved. */
  path: string | null;
  text: string;
  /** The text as last saved or loaded. */
  saved: string;
  readonly: boolean;
};

const TITLE_MAX_LEN = 100;
const TITLE_LAST_WORD_POS = 20;
const SPACE = /\s/u;
const COMMON_OR_LATIN = /[\p{Script=Common}\p{Script=Latin}]/u;
const ALNUM = /[\p{L}\p{N}]/u;

/** A draft's title is the start of its text: words separated by single spaces, ended by a blank line. */
export function draftTitle(text: string): string | null {
  const chars = [...text];
  let out = '';
  let count = 0;
  for (let i = 0; i < chars.length && count < TITLE_MAX_LEN; i++) {
    const ch = chars[i];
    if (ch === '\n' && out && chars[i + 1] === '\n') break;
    if (SPACE.test(ch) || (COMMON_OR_LATIN.test(ch) && !ALNUM.test(ch))) {
      if (count > TITLE_LAST_WORD_POS) break;
      if (out && !out.endsWith(' ')) {
        count++;
        out += ' ';
      }
    } else {
      count++;
      out += ch;
    }
  }
  return out.trimEnd() || null;
}

/** _editor_path_collapse: the home folder is written as ~. */
export function collapse(path: string): string {
  return path === HOME ? '~' : path.startsWith(`${HOME}/`) ? `~${path.slice(HOME.length)}` : path;
}

export function titleOf(doc: Doc): string {
  const title = doc.path ? basename(doc.path) : (draftTitle(doc.text) ?? 'New Document');
  return doc.readonly ? `${title} [Read-Only]` : title;
}

export function subtitleOf(doc: Doc): string {
  return doc.path ? collapse(dirname(doc.path)) : 'Draft';
}

export function isModified(doc: Doc): boolean {
  return doc.text !== doc.saved;
}

/** The header bar hides the subtitle of a draft nobody has typed in yet. */
export function subtitleVisible(doc: Doc): boolean {
  return doc.path !== null || isModified(doc);
}

export function windowTitle(doc: Doc): string {
  return `${titleOf(doc)} (${subtitleOf(doc)}) - Text Editor`;
}

/** The file name a draft is saved under (in ~/Documents) from the "Save Changes?" dialog. */
export function suggestedName(doc: Doc): string {
  const title = draftTitle(doc.text) ?? 'New Document';
  return title.endsWith('.txt') ? title : `${title}.txt`;
}
