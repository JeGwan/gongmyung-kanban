import { DatePicker } from './date-picker';

/**
 * Auto-resize textarea to fit content.
 */
export function autoResize(textarea: HTMLTextAreaElement): void {
  textarea.style.height = 'auto';
  textarea.style.height = textarea.scrollHeight + 'px';
}

/**
 * Setup a textarea with auto-resize and @ date picker.
 * Returns a cleanup function.
 */
export function setupEditableTextarea(
  textarea: HTMLTextAreaElement,
  opts: {
    onSave: () => void;
    onCancel: () => void;
    saveOnEnter?: boolean;   // Enter to save (default: true for single-line)
    saveOnMetaEnter?: boolean; // Cmd+Enter to save (default: false)
  }
): () => void {
  let datePicker: DatePicker | null = null;

  // Auto-resize on input
  const onInput = () => autoResize(textarea);
  textarea.addEventListener('input', onInput);

  // Initial resize
  requestAnimationFrame(() => autoResize(textarea));

  const onKeydown = (e: KeyboardEvent) => {
    // If date picker is open, delegate to it
    if (datePicker) {
      const handled = datePicker.handleKeydown(e);
      if (handled) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    }

    // @ triggers date picker
    if (e.key === '@' && !datePicker) {
      // Don't prevent default — let @ be typed, we'll replace it
      requestAnimationFrame(() => {
        const cursorPos = textarea.selectionStart;
        datePicker = new DatePicker({
          anchorEl: textarea,
          onSelect: (dateStr: string) => {
            // Replace the @ with @{date}
            const val = textarea.value;
            // Find the @ we just typed (should be at cursorPos - 1)
            const atPos = val.lastIndexOf('@', cursorPos);
            if (atPos >= 0) {
              textarea.value = val.slice(0, atPos) + `@{${dateStr}}` + val.slice(cursorPos);
              const newPos = atPos + dateStr.length + 3; // @{} = 3 chars
              textarea.setSelectionRange(newPos, newPos);
            }
            textarea.focus();
            autoResize(textarea);
          },
          onClose: () => {
            datePicker = null;
            textarea.focus();
          },
        });
      });
      return;
    }

    if (e.key === 'Enter') {
      if (opts.saveOnEnter && !e.shiftKey && !e.metaKey) {
        e.preventDefault();
        closePicker();
        opts.onSave();
      } else if (opts.saveOnMetaEnter && e.metaKey) {
        e.preventDefault();
        closePicker();
        opts.onSave();
      }
      // Otherwise allow newline (Shift+Enter) — resize after DOM update
      requestAnimationFrame(() => {
        autoResize(textarea);
        requestAnimationFrame(() => autoResize(textarea));
      });
    } else if (e.key === 'Escape') {
      closePicker();
      opts.onCancel();
    }
  };

  textarea.addEventListener('keydown', onKeydown);

  function closePicker() {
    if (datePicker) {
      datePicker.close();
      datePicker = null;
    }
  }

  // Cleanup
  return () => {
    closePicker();
    textarea.removeEventListener('input', onInput);
    textarea.removeEventListener('keydown', onKeydown);
  };
}
