import { Board, Card, ColumnType } from './model';
import { parseBoard, serializeBoard } from './parser';

/**
 * Migrate a markdown file from obsidian-kanban format to gongmyung-kanban format.
 *
 * Changes:
 * - Replaces frontmatter `kanban-plugin: board` with gongmyung-kanban columns definition
 * - Adds ⏱{created:TODAY} to all cards
 * - Strips `%% kanban:settings %%` block
 * - Strips `**Complete**` text
 * - Normalizes column names (removes WIP hints from names, stores as wip property)
 * - Merges duplicate Archive sections
 */
export function migrateFromObsidianKanban(markdown: string): string {
  const today = new Date().toISOString().slice(0, 10);

  // Strip kanban settings block
  let cleaned = markdown.replace(/\n%%\s*kanban:settings[\s\S]*?%%\s*$/, '');

  // Replace frontmatter
  cleaned = cleaned.replace(
    /^---\n[\s\S]*?\n---/,
    '---\ngongmyung-kanban: board\ncolumns: []\n---'
  );

  // Parse with our parser (it handles the structure)
  const board = parseBoard(cleaned);

  // Normalize column types and names
  for (const col of board.columns) {
    col.type = inferColumnType(col.name);
    col.wip = inferWip(col.name);
    col.name = normalizeColumnName(col.name, col.type);
  }

  // Add lifecycle to all cards
  addLifecycleToAll(board, today);

  return serializeBoard(board);
}

function inferColumnType(heading: string): ColumnType {
  const h = heading.toLowerCase();
  if (h.includes('인박스') || h.includes('inbox')) return 'inbox';
  if (h.includes('진행') || h.includes('progress') || h.includes('doing')) return 'active';
  if (h.includes('완료') || h.includes('done') || h.includes('complete')) return 'done';
  if (h.includes('보류') || h.includes('hold') || h.includes('wait')) return 'hold';
  return 'inbox';
}

function inferWip(heading: string): number | undefined {
  const m = heading.match(/최대\s*(\d+)/);
  return m ? parseInt(m[1], 10) : undefined;
}

function normalizeColumnName(heading: string, type: ColumnType): string {
  const defaults: Record<ColumnType, string> = {
    inbox: '📥 인박스',
    active: '🔄 진행중',
    done: '✅ 완료',
    hold: '🧐 보류',
  };
  return defaults[type] ?? heading;
}

function addLifecycleToAll(board: Board, today: string): void {
  const addToCard = (card: Card, isCompleted: boolean) => {
    if (!card.lifecycle.created) {
      card.lifecycle.created = today;
    }
    if (isCompleted && !card.lifecycle.completed) {
      card.lifecycle.completed = today;
      if (!card.lifecycle.started) card.lifecycle.started = today;
    }
  };

  for (const col of board.columns) {
    const isCompleted = col.type === 'done';
    const isActive = col.type === 'active';
    for (const card of col.cards) {
      addToCard(card, isCompleted);
      if (isActive && !card.lifecycle.started) {
        card.lifecycle.started = today;
      }
    }
  }

  // Archive cards
  for (const card of board.archive) {
    addToCard(card, true);
  }
}
