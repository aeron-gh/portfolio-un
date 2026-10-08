// Tab and Shift+Tab stay inside a modal dialog, as GNOME's modal grab keeps key focus inside it.
const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

export function trapFocus(node: HTMLElement): { destroy(): void } {
  const onkey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const items = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (!items.length) return;
    const at = items.indexOf(document.activeElement as HTMLElement);
    const next = e.shiftKey ? (at <= 0 ? items.length - 1 : at - 1) : at < 0 || at === items.length - 1 ? 0 : at + 1;
    e.preventDefault();
    items[next].focus();
  };
  addEventListener('keydown', onkey, true);
  return { destroy: () => removeEventListener('keydown', onkey, true) };
}
