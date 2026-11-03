// In GTK a click on a header, a label or a toolbar button leaves the keyboard where it was (focus-on-click is off, and a
// label cannot take focus). In a browser the click would move it to the window, and the app's shortcuts would stop.
export function keepFocus(e: MouseEvent): void {
  if (!(e.target as Element).closest('input, textarea, [data-takes-focus]')) e.preventDefault();
}
