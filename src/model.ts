/** Column type determines lifecycle behavior */
export type ColumnType = 'inbox' | 'active' | 'done' | 'hold';

/** Lifecycle timestamps — YYYY-MM-DD strings */
export interface Lifecycle {
  created?: string;
  started?: string;
  completed?: string;
}

/** A single card (task) on the board */
export interface Card {
  title: string;
  checked: boolean;
  body: string[];       // Indented lines below title (raw, with leading \t)
  dueDate?: string;     // From @{YYYY-MM-DD}
  lifecycle: Lifecycle;  // From ⏱{created:...|started:...|completed:...}
  tags: string[];       // #tag extracted from title
  source?: string;      // 출처: [[...]] wiki-link path
}

/** Column definition from frontmatter */
export interface ColumnDef {
  name: string;
  type: ColumnType;
  wip?: number;
}

/** A column on the board */
export interface Column {
  name: string;
  type: ColumnType;
  wip?: number;
  cards: Card[];
}

/** The full board model */
export interface Board {
  columns: Column[];
  archive: Card[];
  headerText: string;   // Free text between frontmatter and first ## heading
}

/** Aging info computed from lifecycle */
export interface AgingInfo {
  daysSinceCreated: number;
  daysInCurrentColumn: number;
  isOverdue: boolean;
  daysUntilDue?: number;
}
