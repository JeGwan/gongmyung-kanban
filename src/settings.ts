import { ColumnType } from './model';

export interface ColumnConfig {
  name: string;
  type: ColumnType;
  wip?: number;
}

export interface GKSettings {
  // Aging thresholds (days in column before badge appears)
  agingWarm: number;
  agingHot: number;
  agingCritical: number;

  // Default columns for new boards
  defaultColumns: ColumnConfig[];

  // Display
  showArchive: boolean;
  dateFormat: 'yyyy-mm-dd' | 'relative' | 'mm/dd';
  language: 'ko' | 'en' | 'auto';

  // Badge visibility
  showCycleTime: boolean;
  showAgingBadge: boolean;
  showDueDateBadge: boolean;
}

export const DEFAULT_SETTINGS: GKSettings = {
  agingWarm: 4,
  agingHot: 8,
  agingCritical: 15,

  defaultColumns: [
    { name: '📥 Inbox', type: 'inbox' },
    { name: '🔄 Active', type: 'active', wip: 3 },
    { name: '✅ Done', type: 'done' },
    { name: '⏸ Hold', type: 'hold' },
  ],

  showArchive: true,
  dateFormat: 'yyyy-mm-dd',
  language: 'auto',

  showCycleTime: true,
  showAgingBadge: true,
  showDueDateBadge: true,
};
