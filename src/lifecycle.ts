import { Card, ColumnType, AgingInfo } from './model';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const msPerDay = 86400000;
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / msPerDay);
}

/**
 * Apply lifecycle transition when a card moves between column types.
 * Mutates the card's lifecycle in place.
 */
export function applyLifecycleTransition(
  card: Card,
  fromType: ColumnType,
  toType: ColumnType,
): void {
  const now = today();
  const lc = card.lifecycle;

  // Ensure created is always set
  if (!lc.created) lc.created = now;

  if (toType === 'active' && fromType !== 'active') {
    if (!lc.started) lc.started = now;
    // Reopened from done
    if (fromType === 'done') delete lc.completed;
  } else if (toType === 'done') {
    if (!lc.started) lc.started = now;
    lc.completed = now;
  } else if (toType === 'inbox' && fromType === 'done') {
    // Full reset
    delete lc.started;
    delete lc.completed;
  }
  // hold: no timestamp changes
}

/**
 * Ensure a newly created card has lifecycle.created set.
 */
export function initLifecycle(card: Card): void {
  if (!card.lifecycle.created) {
    card.lifecycle.created = today();
  }
}

/**
 * Compute aging info for display.
 */
export function computeAging(card: Card, columnType: ColumnType): AgingInfo {
  const now = today();
  const created = card.lifecycle.created ?? now;
  const started = card.lifecycle.started;

  const daysSinceCreated = daysBetween(created, now);

  let daysInCurrentColumn: number;
  if (columnType === 'active' && started) {
    daysInCurrentColumn = daysBetween(started, now);
  } else {
    daysInCurrentColumn = daysSinceCreated;
  }

  let isOverdue = false;
  let daysUntilDue: number | undefined;
  if (card.dueDate) {
    daysUntilDue = daysBetween(now, card.dueDate);
    isOverdue = daysUntilDue < 0;
  }

  return { daysSinceCreated, daysInCurrentColumn, isOverdue, daysUntilDue };
}
