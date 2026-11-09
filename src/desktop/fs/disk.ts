// The machine's one disk. These are values chosen for this desktop, not read from anywhere: a 64 GiB disk, of which
// Ubuntu's own files take 11 GB. Everything in the file system comes off what is left.
import type { FsNode } from './vfs';

export const DISK_SIZE = 68_719_476_736;
export const SYSTEM_USED = 11_000_000_000;

const usedBy = (node: FsNode): number => Object.values(node.children ?? {}).reduce((n, c) => n + usedBy(c), node.size);

/** Bytes free, given the root of the file system. */
export const freeSpace = (root: FsNode) => DISK_SIZE - SYSTEM_USED - usedBy(root);
