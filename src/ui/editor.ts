import { EditorView, keymap, placeholder as cmPlaceholder } from '@codemirror/view';
import { EditorState, Prec } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { DatePicker } from './date-picker';

export interface InlineEditorOptions {
  initialValue?: string;
  placeholder?: string;
  onSave: (value: string) => void;
  onCancel: () => void;
  onBlur?: (value: string) => void;
  saveOnEnter?: boolean;
  saveOnMetaEnter?: boolean;
}

export interface InlineEditor {
  view: EditorView;
  destroy: () => void;
}

/**
 * Create an inline CodeMirror 6 editor with markdown editing support.
 * Features: URL paste → markdown link, Cmd+B/I, undo/redo, @ date picker.
 */
export function createInlineEditor(
  parent: HTMLElement,
  opts: InlineEditorOptions
): InlineEditor {
  let datePicker: DatePicker | null = null;
  let destroyed = false;

  function closePicker() {
    if (datePicker) {
      datePicker.close();
      datePicker = null;
    }
  }

  // ── Date picker: delegate keys when open + @ trigger ──
  const datePickerHandler = EditorView.domEventHandlers({
    keydown(event, view) {
      if (datePicker) {
        const handled = datePicker.handleKeydown(event);
        if (handled) {
          event.preventDefault();
          event.stopPropagation();
          return true;
        }
      }

      if (event.key === '@' && !datePicker) {
        requestAnimationFrame(() => {
          const cursorPos = view.state.selection.main.head;
          datePicker = new DatePicker({
            anchorEl: view.dom,
            onSelect: (dateStr: string) => {
              const doc = view.state.doc.toString();
              const atPos = doc.lastIndexOf('@', cursorPos);
              if (atPos >= 0) {
                const replacement = `@{${dateStr}}`;
                view.dispatch({
                  changes: { from: atPos, to: view.state.selection.main.head, insert: replacement },
                  selection: { anchor: atPos + replacement.length },
                });
              }
              view.focus();
            },
            onClose: () => {
              datePicker = null;
              view.focus();
            },
          });
        });
      }
      return false;
    },
  });

  // ── Paste: URL over selection → [text](url) ──
  const pasteHandler = EditorView.domEventHandlers({
    paste(event, view) {
      const clipText = event.clipboardData?.getData('text/plain') ?? '';
      const { from, to } = view.state.selection.main;
      if (from === to) return false;

      if (/^https?:\/\/\S+$/.test(clipText.trim())) {
        event.preventDefault();
        const selectedText = view.state.sliceDoc(from, to);
        const link = `[${selectedText}](${clipText.trim()})`;
        view.dispatch({
          changes: { from, to, insert: link },
          selection: { anchor: from + link.length },
        });
        return true;
      }
      return false;
    },
  });

  // ── Markdown shortcuts: Cmd+B, Cmd+I ──
  const markdownKeymap = keymap.of([
    { key: 'Mod-b', run: (v) => wrapSelection(v, '**') },
    { key: 'Mod-i', run: (v) => wrapSelection(v, '*') },
  ]);

  // ── Save / Cancel keymap ──
  const saveKeymap = keymap.of([
    ...(opts.saveOnEnter
      ? [{
          key: 'Enter' as const,
          run: (view: EditorView) => {
            if (datePicker) return false;
            closePicker();
            opts.onSave(view.state.doc.toString());
            return true;
          },
        }]
      : []),
    ...(opts.saveOnMetaEnter
      ? [{
          key: 'Mod-Enter' as const,
          run: (view: EditorView) => {
            closePicker();
            opts.onSave(view.state.doc.toString());
            return true;
          },
        }]
      : []),
    {
      key: 'Escape',
      run: () => {
        closePicker();
        opts.onCancel();
        return true;
      },
    },
  ]);

  // ── Blur → save ──
  const blurHandler = opts.onBlur
    ? EditorView.domEventHandlers({
        focusout(_event, view) {
          setTimeout(() => {
            if (!document.querySelector('.gk-date-picker') && !destroyed) {
              opts.onBlur!(view.state.doc.toString());
            }
          }, 150);
          return false;
        },
      })
    : [];

  // ── Theme (inherit kanban card styling, strip CM6 chrome) ──
  const theme = EditorView.theme({
    '&': { fontSize: 'inherit', fontFamily: 'inherit' },
    '&.cm-focused': { outline: 'none' },
    '.cm-content': { padding: '0', caretColor: 'var(--text-normal)' },
    '.cm-line': { padding: '0' },
    '.cm-cursor': { borderLeftColor: 'var(--text-normal)' },
    '.cm-placeholder': { color: 'var(--text-faint)' },
  });

  // ── Assemble extensions ──
  const extensions = [
    Prec.highest(datePickerHandler),
    Prec.high(saveKeymap),
    markdownKeymap,
    history(),
    keymap.of([...defaultKeymap, ...historyKeymap]),
    pasteHandler,
    EditorView.lineWrapping,
    theme,
    ...(opts.placeholder ? [cmPlaceholder(opts.placeholder)] : []),
    ...(Array.isArray(blurHandler) ? blurHandler : [blurHandler]),
  ];

  const state = EditorState.create({
    doc: opts.initialValue ?? '',
    extensions,
  });

  const view = new EditorView({ state, parent });

  return {
    view,
    destroy: () => {
      destroyed = true;
      closePicker();
      view.destroy();
    },
  };
}

function wrapSelection(view: EditorView, wrapper: string): boolean {
  const { from, to } = view.state.selection.main;
  if (from === to) return false;
  const selected = view.state.sliceDoc(from, to);
  view.dispatch({
    changes: { from, to, insert: `${wrapper}${selected}${wrapper}` },
    selection: { anchor: from + wrapper.length, head: to + wrapper.length },
  });
  return true;
}
