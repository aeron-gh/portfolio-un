// Email button: copy, slide to "Copied", slide back. If the clipboard is blocked, select the text instead.
import { copyText } from './copy-text';
import { toast } from './toast';

document.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((btn) => {
  let timer: number | undefined;
  btn.addEventListener('click', async () => {
    if (await copyText(btn.dataset.copy ?? '')) {
      btn.classList.add('copied');
      window.clearTimeout(timer);
      timer = window.setTimeout(() => btn.classList.remove('copied'), 1800);
      return;
    }
    const range = document.createRange();
    range.selectNodeContents(btn.querySelector('.mail-a') ?? btn);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    toast('Press Ctrl C to copy');
  });
});
