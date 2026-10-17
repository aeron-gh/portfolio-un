// What a window frame shares with the app inside it. Apps draw their own header bar (as GTK apps do), and the
// header needs the window it belongs to and the frame's drag-to-move handler.
import { getContext, setContext } from 'svelte';
import type { Win } from './windows';

export type WindowContext = { readonly win: Win; startMove: (e: PointerEvent) => void };

const KEY = Symbol('window');

export function provideWindow(context: WindowContext): void {
  setContext(KEY, context);
}

export function useWindow(): WindowContext {
  return getContext<WindowContext>(KEY);
}
