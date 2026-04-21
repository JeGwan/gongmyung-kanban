import { App, Component, MarkdownRenderer, setIcon } from 'obsidian';
import { Board, Card, Column } from '../model';
import { renderCard, CardRenderContext } from './card';
import { el } from './components';
import { createInlineEditor } from './editor';
import { t } from '../i18n';
import type { GKSettings } from '../settings';

export interface BoardCallbacks {
  onCardMove: (cardIndex: number, fromCol: number, toCol: number, targetIndex: number) => void;
  onCardCheckToggle: (colIndex: number, cardIndex: number) => void;
  onCardContextMenu: (colIndex: number, cardIndex: number, evt: MouseEvent) => void;
  onCardDblClick: (colIndex: number, cardIndex: number, cardEl: HTMLElement) => void;
  onAddCard: (colIndex: number) => void;
  onHeaderTextChange: (newText: string) => void;
}

export async function renderBoard(
  container: HTMLElement,
  board: Board,
  app: App,
  sourcePath: string,
  component: Component,
  callbacks: BoardCallbacks,
  settings: GKSettings,
  showArchiveColumn = false
): Promise<void> {
  container.empty();

  const wrapper = el('div', { class: 'gk-wrapper' });

  // Header memo area
  if (board.headerText !== undefined) {
    const headerArea = await renderHeaderMemo(board.headerText, app, sourcePath, component, callbacks);
    wrapper.appendChild(headerArea);
  }

  const boardEl = el('div', { class: 'gk-board' });

  for (let colIdx = 0; colIdx < board.columns.length; colIdx++) {
    const col = board.columns[colIdx];
    const colEl = await renderColumn(col, colIdx, app, sourcePath, component, callbacks, settings);
    boardEl.appendChild(colEl);
  }

  // Archive column (read-only, no drag-drop)
  if (showArchiveColumn && board.archive.length > 0) {
    const archiveCol = renderArchiveColumn(board.archive);
    boardEl.appendChild(archiveCol);
  }

  wrapper.appendChild(boardEl);
  container.appendChild(wrapper);
}

function renderArchiveColumn(cards: Card[]): HTMLElement {
  const colEl = el('div', { class: 'gk-column gk-archive-column' });

  const headerEl = el('div', { class: 'gk-column-header' });
  const titleEl = el('span', { class: 'gk-column-title', text: `📦 Archive` });
  headerEl.appendChild(titleEl);
  const countEl = el('span', { class: 'gk-column-count', text: String(cards.length) });
  headerEl.appendChild(countEl);
  colEl.appendChild(headerEl);

  const bodyEl = el('div', { class: 'gk-column-body' });
  for (const card of cards) {
    const cardEl = el('div', { class: 'gk-card gk-archive-card' });
    const titleDiv = el('div', { class: 'gk-card-title' });
    titleDiv.textContent = card.title;
    cardEl.appendChild(titleDiv);
    bodyEl.appendChild(cardEl);
  }
  colEl.appendChild(bodyEl);

  return colEl;
}

async function renderHeaderMemo(
  text: string,
  app: App,
  sourcePath: string,
  component: Component,
  callbacks: BoardCallbacks
): Promise<HTMLElement> {
  const container = el('div', { class: 'gk-header-memo' });

  // Preview mode
  const previewEl = el('div', { class: 'gk-header-preview' });
  if (text.trim()) {
    await MarkdownRenderer.render(app, text, previewEl, sourcePath, component);
  } else {
    previewEl.classList.add('gk-header-empty');
    previewEl.textContent = t('placeholder.header_empty');
  }
  container.appendChild(previewEl);

  // Click preview → CM6 editor
  previewEl.addEventListener('click', () => {
    previewEl.style.display = 'none';

    const editorEl = el('div', { class: 'gk-header-edit' });
    container.appendChild(editorEl);

    const closeEditor = (newText?: string) => {
      destroy();
      editorEl.remove();
      previewEl.style.display = '';
      if (newText !== undefined && newText !== text) {
        callbacks.onHeaderTextChange(newText);
      }
    };

    const { view, destroy } = createInlineEditor(editorEl, {
      initialValue: text,
      placeholder: t('placeholder.header_memo'),
      saveOnMetaEnter: true,
      onSave: (val) => closeEditor(val),
      onCancel: () => closeEditor(),
      onBlur: (val) => closeEditor(val),
    });

    view.focus();
  });

  return container;
}

async function renderColumn(
  col: Column,
  colIdx: number,
  app: App,
  sourcePath: string,
  component: Component,
  callbacks: BoardCallbacks,
  settings: GKSettings
): Promise<HTMLElement> {
  const colEl = el('div', { class: 'gk-column' });
  colEl.dataset.colIndex = String(colIdx);

  // Header
  const headerEl = el('div', { class: 'gk-column-header' });

  const titleEl = el('span', { class: 'gk-column-title', text: col.name });
  headerEl.appendChild(titleEl);

  const countEl = el('span', { class: 'gk-column-count', text: String(col.cards.length) });
  headerEl.appendChild(countEl);

  // WIP badge
  if (col.wip) {
    const wipText = `${col.cards.length}/${col.wip}`;
    const wipEl = el('span', { class: 'gk-wip-badge', text: wipText });
    headerEl.appendChild(wipEl);
    if (col.cards.length > col.wip) {
      colEl.classList.add('gk-wip-exceeded');
    }
  }

  // Add card button
  const addBtn = el('button', { class: 'gk-column-add-btn' });
  setIcon(addBtn, 'plus');
  addBtn.addEventListener('click', () => callbacks.onAddCard(colIdx));
  headerEl.appendChild(addBtn);

  colEl.appendChild(headerEl);

  // Card body (drop zone)
  const bodyEl = el('div', { class: 'gk-column-body' });
  bodyEl.dataset.colIndex = String(colIdx);

  for (let cardIdx = 0; cardIdx < col.cards.length; cardIdx++) {
    const card = col.cards[cardIdx];
    const ctx: CardRenderContext = {
      app,
      sourcePath,
      component,
      columnType: col.type,
      settings,
      onCheckToggle: () => callbacks.onCardCheckToggle(colIdx, cardIdx),
      onContextMenu: (_card: Card, evt: MouseEvent) => callbacks.onCardContextMenu(colIdx, cardIdx, evt),
      onDblClick: (_card: Card, cardEl: HTMLElement) => callbacks.onCardDblClick(colIdx, cardIdx, cardEl),
    };
    const cardEl = await renderCard(card, ctx);
    cardEl.dataset.colIndex = String(colIdx);
    cardEl.dataset.cardIndex = String(cardIdx);
    bodyEl.appendChild(cardEl);
  }

  // Drop zone setup
  setupDropZone(bodyEl, colIdx, callbacks);

  colEl.appendChild(bodyEl);
  return colEl;
}

// ─── Drag & Drop ───

// Shared drag title for ghost card preview
let _dragTitle = '';

function setupDropZone(bodyEl: HTMLElement, colIdx: number, callbacks: BoardCallbacks): void {
  bodyEl.addEventListener('dragover', (e: DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';

    // Show drop indicator (card-shaped ghost)
    let ind = bodyEl.querySelector('.gk-drop-indicator') as HTMLElement | null;
    if (!ind) {
      ind = el('div', { class: 'gk-drop-indicator' });
      // Copy title from dragged card for preview
      const title = e.dataTransfer?.types.includes('text/x-gk-title')
        ? _dragTitle : '';
      if (title) ind.textContent = title;
      bodyEl.appendChild(ind);
    }

    // Position indicator
    const target = getDropTarget(bodyEl, e.clientY);
    if (target) {
      bodyEl.insertBefore(ind, target);
    } else {
      bodyEl.appendChild(ind);
    }
  });

  bodyEl.addEventListener('dragleave', (e: DragEvent) => {
    // Only remove indicator when actually leaving the column
    const related = e.relatedTarget as HTMLElement | null;
    if (related && bodyEl.contains(related)) return;
    bodyEl.querySelector('.gk-drop-indicator')?.remove();
  });

  bodyEl.addEventListener('drop', (e: DragEvent) => {
    e.preventDefault();
    bodyEl.querySelector('.gk-drop-indicator')?.remove();

    const srcCol = parseInt(e.dataTransfer?.getData('text/x-gk-col') ?? '-1', 10);
    const srcCard = parseInt(e.dataTransfer?.getData('text/x-gk-card') ?? '-1', 10);
    if (srcCol < 0 || srcCard < 0) return;

    // Determine target index
    const target = getDropTarget(bodyEl, e.clientY);
    let targetIdx: number;
    if (target && target.dataset.cardIndex) {
      targetIdx = parseInt(target.dataset.cardIndex, 10);
      // If dropping in same column and source is before target, adjust
      if (srcCol === colIdx && srcCard < targetIdx) targetIdx--;
    } else {
      // Drop at end
      const cards = bodyEl.querySelectorAll('.gk-card');
      targetIdx = cards.length;
      if (srcCol === colIdx) targetIdx--;
    }

    callbacks.onCardMove(srcCard, srcCol, colIdx, targetIdx);
  });
}

function getDropTarget(bodyEl: HTMLElement, clientY: number): HTMLElement | null {
  const cards = Array.from(bodyEl.querySelectorAll('.gk-card:not(.gk-dragging)'));
  for (const card of cards) {
    const rect = card.getBoundingClientRect();
    if (clientY < rect.top + rect.height / 2) {
      return card as HTMLElement;
    }
  }
  return null;
}

// Call this on each card element after rendering to enable drag start
export function enableCardDrag(cardEl: HTMLElement): void {
  cardEl.addEventListener('dragstart', (e: DragEvent) => {
    if (!e.dataTransfer) return;
    e.dataTransfer.setData('text/x-gk-col', cardEl.dataset.colIndex ?? '');
    e.dataTransfer.setData('text/x-gk-card', cardEl.dataset.cardIndex ?? '');
    e.dataTransfer.setData('text/x-gk-title', '1'); // flag for type check
    e.dataTransfer.effectAllowed = 'move';
    // Store title for ghost preview
    const titleEl = cardEl.querySelector('.gk-card-title');
    _dragTitle = titleEl?.textContent?.trim() ?? '';
    cardEl.classList.add('gk-dragging');
    requestAnimationFrame(() => cardEl.classList.add('gk-dragging'));
  });

  cardEl.addEventListener('dragend', () => {
    cardEl.classList.remove('gk-dragging');
    _dragTitle = '';
  });
}
