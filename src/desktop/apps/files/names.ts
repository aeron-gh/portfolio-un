// Whether a name can be used (nautilus-filename-validator.c), and where a name stops and its extension starts.
const NAME_MAX = 255; // bytes, as the file system counts them

export type NameCheck = { passed: boolean; feedback: string | null; duplicate: boolean };

export function checkName(text: string, { folder, exists, original }: { folder: boolean; exists: (name: string) => boolean; original?: string }): NameCheck {
  const name = text.trim(); // nautilus_filename_strip
  const kind = folder ? 'Folder' : 'File';
  const a = folder ? 'A folder' : 'A file';
  let feedback: string | null = null;
  if (name.includes('/')) feedback = `${kind} names cannot contain “/”`;
  else if (name === '.' || name === '..') feedback = `${a} cannot be called “${name}”`;
  else if (new TextEncoder().encode(name).length > NAME_MAX) feedback = `${kind} name is too long`;
  const valid = !!name && !feedback;
  if (valid && name.startsWith('.')) feedback = `${kind}s with “.” at the beginning of their name are hidden`;
  const duplicate = valid && name !== original && exists(name);
  return { passed: valid && !duplicate, feedback, duplicate };
}

/** nautilus_filename_get_extension: the rename entry selects the name up to here. */
export function nameEnd(name: string): number {
  const dot = name.lastIndexOf('.');
  if (dot <= 0 || dot === name.length - 1 || /\s/.test(name.slice(dot))) return name.length;
  return dot > 4 && name.slice(dot - 4, dot) === '.tar' ? dot - 4 : dot; // .tar.gz and friends are one extension
}
