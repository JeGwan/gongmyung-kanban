import { TextFileView, WorkspaceLeaf, Menu, Notice } from 'obsidian';
import type GongmyungKanbanPlugin from './main';
import { Board, Card } from './model';
import { parseBoard, serializeBoard } from './parser';
import { applyLifecycleTransition, initLifecycle } from './lifecycle';
import { renderBoard, enableCardDrag, BoardCallbacks } from './ui/board';
import { setupEditableTextarea } from './ui/editor';
import { t } from './i18n';
import type { GKSettings } from './settings';

export const VIEW_TYPE_KANBAN = 'gongmyung-kanban';

export class KanbanView extends TextFileView {
  plugin: GongmyungKanbanPlugin;
  private board: Board | null = null;
  private showArchiveColumn = false;

  constructor(leaf: WorkspaceLeaf, plugin: GongmyungKanbanPlugin) {
    super(leaf);
    this.plugin = plugin;

    // Action buttons (top-right of view header)
    this.addAction('archive', t('action.archive'), () => {
      this.archiveDoneCards();
    });

    this.addAction('columns-3', t('action.toggle_archive'), () => {
      this.showArchiveColumn = !this.showArchiveColumn;
      void this.render();
    });

    this.addAction('file-text', t('action.toggle_markdown'), () => {
      if (this.file) {
        this.plugin.markdownOverrides.add(this.file.path);
        void this.leaf.setViewState({
          type: 'markdown',
          state: { file: this.file.path },
        });
      }
    });
  }

  get settings(): GKSettings {
    return this.plugin.settings;
  }

  getViewType(): string {
    return VIEW_TYPE_KANBAN;
  }

  getDisplayText(): string {
    return this.file?.basename ?? 'Kanban';
  }

  getIcon(): string {
    return 'layout-dashboard';
  }

  // ─── TextFileView interface ───

  setViewData(data: string, _clear: boolean): void {
    this.data = data;
    this.board = parseBoard(data);
    void this.render();
  }

  getViewData(): string {
    if (!this.board) return this.data;
    return serializeBoard(this.board);
  }

  clear(): void {
    this.board = null;
    this.contentEl.empty();
  }

  // ─── Public methods (called from commands) ───

  archiveDoneCards(): void {
    if (!this.board) return;
    let archived = 0;
    this.mutate(board => {
      for (const col of board.columns) {
        if (col.type !== 'done') continue;
        const done = col.cards.splice(0, col.cards.length);
        for (const card of done) {
          card.checked = true;
          board.archive.push(card);
          archived++;
        }
      }
    });
    if (archived > 0) {
      new Notice(t('notice.archived', { count: archived }));
    } else {
      new Notice(t('notice.nothing_to_archive'));
    }
  }

  // ─── Rendering ───

  private async render(): Promise<void> {
    if (!this.board || !this.file) return;

    const callbacks: BoardCallbacks = {
      onCardMove: (cardIdx, fromCol, toCol, targetIdx) => this.moveCard(cardIdx, fromCol, toCol, targetIdx),
      onCardCheckToggle: (colIdx, cardIdx) => this.toggleCheck(colIdx, cardIdx),
      onCardContextMenu: (colIdx, cardIdx, evt) => this.showCardMenu(colIdx, cardIdx, evt),
      onCardDblClick: (colIdx, cardIdx, cardEl) => this.startInlineEdit(colIdx, cardIdx, cardEl),
      onAddCard: (colIdx) => this.addCard(colIdx),
      onHeaderTextChange: (newText) => this.updateHeaderText(newText),
    };

    await renderBoard(
      this.contentEl,
      this.board,
      this.app,
      this.file.path,
      this,
      callbacks,
      this.settings,
      this.showArchiveColumn
    );

    // Enable drag on all card elements
    this.contentEl.querySelectorAll('.gk-card').forEach(cardEl => {
      enableCardDrag(cardEl as HTMLElement);
    });

    // Set board height explicitly (Obsidian's flex chain doesn't propagate height)
    this.updateBoardHeight();
  }

  private updateBoardHeight(): void {
    const board = this.contentEl.querySelector('.gk-board') as HTMLElement;
    const headerMemo = this.contentEl.querySelector('.gk-header-memo') as HTMLElement;
    if (!board) return;

    const viewHeight = this.contentEl.clientHeight;
    const headerHeight = headerMemo ? headerMemo.offsetHeight : 0;
    board.style.maxHeight = `${viewHeight - headerHeight}px`;
  }

  onResize(): void {
    this.updateBoardHeight();
  }

  // ─── Mutations (all go through mutate → requestSave → re-render) ───

  private mutate(fn: (board: Board) => void): void {
    if (!this.board) return;
    fn(this.board);
    this.data = serializeBoard(this.board);
    this.requestSave();
    void this.render();
  }

  private moveCard(cardIdx: number, fromCol: number, toCol: number, targetIdx: number): void {
    this.mutate(board => {
      const fromColumn = board.columns[fromCol];
      const toColumn = board.columns[toCol];
      if (!fromColumn || !toColumn) return;

      const [card] = fromColumn.cards.splice(cardIdx, 1);
      if (!card) return;

      // Apply lifecycle transition
      if (fromCol !== toCol) {
        applyLifecycleTransition(card, fromColumn.type, toColumn.type);
      }

      // Insert at target position
      toColumn.cards.splice(targetIdx, 0, card);

      // Update checked state based on column type
      if (toColumn.type === 'done') card.checked = true;
      if (toColumn.type !== 'done' && card.checked) card.checked = false;

      // WIP warning
      if (toColumn.wip && toColumn.cards.length > toColumn.wip) {
        new Notice(t('notice.wip_exceeded', {
          col: toColumn.name,
          count: toColumn.cards.length,
          limit: toColumn.wip,
        }));
      }
    });
  }

  private toggleCheck(colIdx: number, cardIdx: number): void {
    this.mutate(board => {
      const card = board.columns[colIdx]?.cards[cardIdx];
      if (card) card.checked = !card.checked;
    });
  }

  private showCardMenu(colIdx: number, cardIdx: number, evt: MouseEvent): void {
    if (!this.board) return;
    const card = this.board.columns[colIdx]?.cards[cardIdx];
    if (!card) return;

    const menu = new Menu();

    // Move to column options
    this.board.columns.forEach((col, idx) => {
      if (idx === colIdx) return;
      menu.addItem(item =>
        item.setTitle(`→ ${col.name}`)
          .onClick(() => this.moveCard(cardIdx, colIdx, idx, col.cards.length))
      );
    });

    menu.addSeparator();

    menu.addItem(item =>
      item.setTitle(t('menu.delete'))
        .setIcon('trash')
        .setWarning(true)
        .onClick(() => this.deleteCard(colIdx, cardIdx))
    );

    menu.showAtMouseEvent(evt);
  }

  private updateHeaderText(newText: string): void {
    this.mutate(board => {
      board.headerText = newText;
    });
  }

  private deleteCard(colIdx: number, cardIdx: number): void {
    this.mutate(board => {
      board.columns[colIdx]?.cards.splice(cardIdx, 1);
    });
  }

  private addCard(colIdx: number): void {
    if (!this.board) return;

    const colBody = this.contentEl.querySelectorAll('.gk-column-body')[colIdx];
    if (!colBody) return;

    const textarea = document.createElement('textarea');
    textarea.className = 'gk-card-edit';
    textarea.placeholder = t('placeholder.new_card');

    colBody.insertBefore(textarea, colBody.firstChild);
    textarea.focus();

    let cleaned = false;
    const cleanup = setupEditableTextarea(textarea, {
      saveOnEnter: true,
      onSave: () => {
        const text = textarea.value.trim();
        if (!cleaned) { cleaned = true; cleanup(); }
        textarea.remove();
        if (!text) return;

        this.mutate(board => {
          const newCard: Card = {
            title: text,
            checked: false,
            body: [],
            lifecycle: {},
            tags: [],
          };
          initLifecycle(newCard);
          board.columns[colIdx]?.cards.unshift(newCard);
        });
      },
      onCancel: () => {
        if (!cleaned) { cleaned = true; cleanup(); }
        textarea.remove();
      },
    });

    textarea.addEventListener('blur', () => {
      // Small delay to allow date picker click
      setTimeout(() => {
        if (!document.querySelector('.gk-date-picker') && !cleaned) {
          const text = textarea.value.trim();
          if (!cleaned) { cleaned = true; cleanup(); }
          textarea.remove();
          if (!text) return;

          this.mutate(board => {
            const newCard: Card = {
              title: text,
              checked: false,
              body: [],
              lifecycle: {},
              tags: [],
            };
            initLifecycle(newCard);
            board.columns[colIdx]?.cards.unshift(newCard);
          });
        }
      }, 150);
    });
  }

  private startInlineEdit(colIdx: number, cardIdx: number, cardEl: HTMLElement): void {
    if (!this.board) return;
    const card = this.board.columns[colIdx]?.cards[cardIdx];
    if (!card) return;

    const originalHTML = cardEl.innerHTML;
    const fullText = card.title + (card.body.length > 0 ? '\n' + card.body.map(l => l.replace(/^\t/, '')).join('\n') : '');

    cardEl.empty();
    const textarea = document.createElement('textarea');
    textarea.className = 'gk-card-edit';
    textarea.value = fullText;
    cardEl.appendChild(textarea);
    textarea.focus();
    textarea.setSelectionRange(0, card.title.length);

    let cleaned = false;

    const doSave = () => {
      const text = textarea.value.trim();
      if (!text) {
        cardEl.innerHTML = originalHTML;
        return;
      }

      const lines = text.split('\n');
      const newTitle = lines[0];
      const newBody = lines.slice(1).map(l => '\t' + l);

      this.mutate(board => {
        const c = board.columns[colIdx]?.cards[cardIdx];
        if (!c) return;
        c.title = newTitle;
        c.body = newBody;
        // Extract due date from edited text if @{YYYY-MM-DD} was added
        const dueDateMatch = text.match(/@\{(\d{4}-\d{2}-\d{2})\}/);
        if (dueDateMatch) {
          c.dueDate = dueDateMatch[1];
          c.body = newBody.filter(l => !/^\t?@\{\d{4}-\d{2}-\d{2}\}$/.test(l.trim()));
        }
      });
    };

    const cleanup = setupEditableTextarea(textarea, {
      saveOnEnter: true,
      onSave: () => {
        if (!cleaned) { cleaned = true; cleanup(); }
        doSave();
      },
      onCancel: () => {
        if (!cleaned) { cleaned = true; cleanup(); }
        cardEl.innerHTML = originalHTML;
      },
    });

    textarea.addEventListener('blur', () => {
      setTimeout(() => {
        if (!document.querySelector('.gk-date-picker') && !cleaned) {
          if (!cleaned) { cleaned = true; cleanup(); }
          doSave();
        }
      }, 150);
    });
  }
}
