import { App, Component } from 'obsidian';
import { Card, ColumnType } from '../model';
import { computeAging } from '../lifecycle';
import { el, badge } from './components';
import { isInteractiveTarget, renderMarkdown } from './markdown';
import type { GKSettings } from '../settings';

export interface CardRenderContext {
  app: App;
  sourcePath: string;
  component: Component;
  columnType: ColumnType;
  settings: GKSettings;
  onCheckToggle: (card: Card) => void;
  onContextMenu: (card: Card, evt: MouseEvent) => void;
  onDblClick: (card: Card, cardEl: HTMLElement) => void;
}

export async function renderCard(card: Card, ctx: CardRenderContext): Promise<HTMLElement> {
  const cardEl = el('div', { class: 'gk-card' });
  cardEl.setAttribute('draggable', 'true');

  const aging = computeAging(card, ctx.columnType);
  if (aging.isOverdue) cardEl.classList.add('gk-overdue');

  // Header: title only (checkbox hidden — column is the status)
  const header = el('div', { class: 'gk-card-header' });

  const titleEl = el('div', { class: 'gk-card-title' });
  await renderMarkdown(ctx.app, card.title, titleEl, ctx.sourcePath, ctx.component);
  const p = titleEl.querySelector('p');
  if (p) {
    while (p.firstChild) titleEl.insertBefore(p.firstChild, p);
    p.remove();
  }
  header.appendChild(titleEl);

  // Source link — top of card, before title
  if (card.source) {
    const sourceEl = el('div', { class: 'gk-card-source' });
    await renderMarkdown(ctx.app, `[[${card.source}]]`, sourceEl, ctx.sourcePath, ctx.component);
    cardEl.appendChild(sourceEl);
  }

  cardEl.appendChild(header);

  // Body (non-metadata lines only)
  // Blank lines are markdown block separators — keep them, or a plain line after a
  // list gets absorbed into the last list item as a lazy continuation.
  const bodyLines = card.body.filter(line => {
    const trimmed = line.trim();
    if (/⏱\{/.test(trimmed)) return false;
    if (/^출처:/.test(trimmed)) return false;
    if (/^@\{\d{4}-\d{2}-\d{2}\}$/.test(trimmed)) return false;
    return true;
  });
  while (bodyLines.length > 0 && bodyLines[0].trim() === '') bodyLines.shift();
  while (bodyLines.length > 0 && bodyLines[bodyLines.length - 1].trim() === '') bodyLines.pop();

  if (bodyLines.length > 0) {
    const bodyEl = el('div', { class: 'gk-card-body' });
    const bodyText = bodyLines
      .map(l => l.replace(/^\t/, ''))
      .join('\n')
      .replace(/\n{3,}/g, '\n\n');
    await renderMarkdown(ctx.app, bodyText, bodyEl, ctx.sourcePath, ctx.component);
    cardEl.appendChild(bodyEl);
  }

  // Footer: due date + aging badges
  const footer = el('div', { class: 'gk-card-footer' });
  let hasFooter = false;
  const { settings } = ctx;

  // Due date — if present, show countdown (D-X / D-Day / Xd overdue) and skip aging
  const hasDue = settings.showDueDateBadge && card.dueDate && aging.daysUntilDue !== undefined;
  if (hasDue) {
    hasFooter = true;
    const dueEl = el('span', { class: 'gk-card-due' });
    if (ctx.columnType === 'done') {
      dueEl.textContent = formatDueDate(card.dueDate!, settings.dateFormat);
    } else if (aging.daysUntilDue! > 0) {
      dueEl.textContent = `D-${aging.daysUntilDue}`;
      if (aging.daysUntilDue! <= 3) dueEl.classList.add('gk-due-urgent');
    } else if (aging.daysUntilDue === 0) {
      dueEl.textContent = 'D-Day';
      dueEl.classList.add('gk-due-urgent');
    } else {
      dueEl.textContent = `${Math.abs(aging.daysUntilDue!)}d overdue`;
      dueEl.classList.add('gk-overdue');
    }
    footer.appendChild(dueEl);
  }

  // Aging badge — only when no due date (non-done cards)
  if (!hasDue && settings.showAgingBadge && ctx.columnType !== 'done') {
    const days = aging.daysInCurrentColumn;
    if (days >= settings.agingCritical) {
      hasFooter = true;
      footer.appendChild(badge(`${days}d`, 'gk-aging-critical'));
    } else if (days >= settings.agingHot) {
      hasFooter = true;
      footer.appendChild(badge(`${days}d`, 'gk-aging-hot'));
    } else if (days >= settings.agingWarm) {
      hasFooter = true;
      footer.appendChild(badge(`${days}d`, 'gk-aging-warm'));
    }
  }

  // Cycle time for done cards
  if (settings.showCycleTime && ctx.columnType === 'done') {
    hasFooter = true;
    const days = aging.daysSinceCreated;
    footer.appendChild(badge(days === 0 ? '<1d' : `${days}d`, 'gk-cycle-time'));
  }

  if (hasFooter) cardEl.appendChild(footer);

  // Event listeners
  cardEl.addEventListener('contextmenu', (e) => {
    if (isInteractiveTarget(e.target)) return;
    e.preventDefault();
    ctx.onContextMenu(card, e);
  });

  cardEl.addEventListener('dblclick', (e) => {
    if (isInteractiveTarget(e.target)) return;
    ctx.onDblClick(card, cardEl);
  });

  return cardEl;
}

function formatDueDate(date: string, format: GKSettings['dateFormat']): string {
  if (format === 'mm/dd') {
    const parts = date.split('-');
    return `${parts[1]}/${parts[2]}`;
  }
  // yyyy-mm-dd or relative (relative is handled above for close dates)
  return date;
}
