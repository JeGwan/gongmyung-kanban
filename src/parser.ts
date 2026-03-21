import { Board, Card, Column, ColumnDef, ColumnType, Lifecycle } from './model';

// ─── Regex patterns ───

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---/;
const HEADING_RE = /^## (.+)$/;
const CARD_RE = /^- \[([ x])\] (.*)$/;
const DUE_DATE_RE = /@\{(\d{4}-\d{2}-\d{2})\}/;
const LIFECYCLE_RE = /⏱\{([^}]+)\}/;
const SOURCE_RE = /출처:\s*\[\[([^\]]+)\]\]/;
const TAG_RE = /#([\w가-힣]+)/g;
const KANBAN_SETTINGS_RE = /\n%%\s*kanban:settings[\s\S]*?%%\s*$/;

// ─── Frontmatter parsing ───

export interface ParsedFrontmatter {
  raw: string;           // Original frontmatter text (between ---)
  isGongmyung: boolean;  // Has gongmyung-kanban: board
  columns: ColumnDef[];
}

function parseFrontmatter(text: string): ParsedFrontmatter {
  const match = text.match(FRONTMATTER_RE);
  if (!match) return { raw: '', isGongmyung: false, columns: [] };

  const raw = match[1];
  const isGongmyung = /gongmyung-kanban:\s*board/.test(raw);

  const columns: ColumnDef[] = [];
  if (isGongmyung) {
    // Parse YAML columns array — simple regex-based parser for our known format
    // Matches: - { name: "...", type: ..., wip: N }
    // or flow-style: { name: "...", type: ..., wip: N }
    const colMatches = raw.matchAll(/\{\s*name:\s*"([^"]+)"\s*,\s*type:\s*(\w+)(?:\s*,\s*wip:\s*(\d+))?\s*\}/g);
    for (const m of colMatches) {
      columns.push({
        name: m[1],
        type: m[2] as ColumnType,
        wip: m[3] ? parseInt(m[3], 10) : undefined,
      });
    }
  }

  return { raw, isGongmyung, columns };
}

// ─── Card parsing ───

function parseLifecycle(line: string): Lifecycle | null {
  const match = line.match(LIFECYCLE_RE);
  if (!match) return null;
  const lc: Lifecycle = {};
  for (const pair of match[1].split('|')) {
    const [key, val] = pair.split(':');
    if (val && val.trim()) {
      (lc as Record<string, string>)[key.trim()] = val.trim();
    }
  }
  return lc;
}

function extractTags(title: string): string[] {
  const tags: string[] = [];
  let m;
  const re = new RegExp(TAG_RE.source, TAG_RE.flags);
  while ((m = re.exec(title)) !== null) {
    tags.push(m[1]);
  }
  return tags;
}

function parseCard(titleLine: string, bodyLines: string[]): Card {
  const m = titleLine.match(CARD_RE)!;
  const checked = m[1] === 'x';
  const title = m[2];

  let dueDate: string | undefined;
  let lifecycle: Lifecycle = {};
  let source: string | undefined;

  // Check title for due date
  const titleDue = title.match(DUE_DATE_RE);
  if (titleDue) dueDate = titleDue[1];

  // Parse body lines for metadata
  for (const line of bodyLines) {
    const duem = line.match(DUE_DATE_RE);
    if (duem) dueDate = duem[1];

    const lc = parseLifecycle(line);
    if (lc) lifecycle = lc;

    const srcm = line.match(SOURCE_RE);
    if (srcm) source = srcm[1];
  }

  return {
    title,
    checked,
    body: bodyLines,
    dueDate,
    lifecycle,
    tags: extractTags(title),
    source,
  };
}

// ─── Board parsing ───

interface Section {
  heading: string;
  lines: string[];
}

function splitSections(content: string): { headerText: string; sections: Section[] } {
  const lines = content.split('\n');
  let headerText = '';
  const sections: Section[] = [];
  let currentSection: Section | null = null;
  let inHeader = true;

  for (const line of lines) {
    const headingMatch = line.match(HEADING_RE);
    if (headingMatch) {
      inHeader = false;
      currentSection = { heading: headingMatch[1], lines: [] };
      sections.push(currentSection);
    } else if (inHeader) {
      headerText += line + '\n';
    } else if (currentSection) {
      currentSection.lines.push(line);
    }
  }

  // Trim trailing newline from headerText
  headerText = headerText.replace(/\n+$/, '');

  return { headerText, sections };
}

function parseCardsFromLines(lines: string[]): Card[] {
  const cards: Card[] = [];
  let currentTitle: string | null = null;
  let currentBody: string[] = [];

  function flush() {
    if (currentTitle !== null) {
      // Trim trailing empty lines from body
      while (currentBody.length > 0 && currentBody[currentBody.length - 1].trim() === '') {
        currentBody.pop();
      }
      cards.push(parseCard(currentTitle, currentBody));
    }
    currentTitle = null;
    currentBody = [];
  }

  for (const line of lines) {
    if (CARD_RE.test(line)) {
      flush();
      currentTitle = line;
    } else if (currentTitle !== null) {
      // Body line (indented or empty within card context)
      // Cards end at: next card, next heading, or special markers
      if (line === '**Complete**' || line === '***') {
        flush();
        continue;
      }
      currentBody.push(line);
    }
    // Lines before first card in section are ignored (empty lines, **Complete**, etc.)
  }
  flush();

  return cards;
}

function inferColumnType(heading: string): ColumnType {
  const h = heading.toLowerCase();
  if (h.includes('인박스') || h.includes('inbox')) return 'inbox';
  if (h.includes('진행') || h.includes('progress') || h.includes('doing')) return 'active';
  if (h.includes('완료') || h.includes('done') || h.includes('complete')) return 'done';
  if (h.includes('보류') || h.includes('hold') || h.includes('wait')) return 'hold';
  return 'inbox'; // default
}

function inferWip(heading: string): number | undefined {
  const m = heading.match(/최대\s*(\d+)/);
  return m ? parseInt(m[1], 10) : undefined;
}

export function parseBoard(markdown: string): Board {
  // Strip kanban settings block at end
  const cleaned = markdown.replace(KANBAN_SETTINGS_RE, '');

  // Extract frontmatter
  const fm = parseFrontmatter(cleaned);
  const afterFrontmatter = cleaned.replace(FRONTMATTER_RE, '').replace(/^\n+/, '');

  // Split into sections
  const { headerText, sections } = splitSections(afterFrontmatter);

  // Build columns and archive
  const columns: Column[] = [];
  const archiveCards: Card[] = [];
  let seenArchive = false;

  for (const section of sections) {
    const heading = section.heading;
    const isArchive = heading.toLowerCase() === 'archive';

    if (isArchive) {
      seenArchive = true;
      const cards = parseCardsFromLines(section.lines);
      archiveCards.push(...cards);
      continue;
    }

    // Skip sections after Archive that aren't headings (e.g., *** separator creates another Archive)
    if (seenArchive) {
      const cards = parseCardsFromLines(section.lines);
      archiveCards.push(...cards);
      continue;
    }

    // Find matching column def from frontmatter, or infer
    const fmCol = fm.columns.find(c => heading.includes(c.name) || c.name.includes(heading));
    const type = fmCol?.type ?? inferColumnType(heading);
    const wip = fmCol?.wip ?? inferWip(heading);

    columns.push({
      name: heading,
      type,
      wip,
      cards: parseCardsFromLines(section.lines),
    });
  }

  return { columns, archive: archiveCards, headerText };
}

// ─── Serialization ───

function serializeLifecycle(lc: Lifecycle): string {
  const parts: string[] = [];
  if (lc.created) parts.push(`created:${lc.created}`);
  if (lc.started) parts.push(`started:${lc.started}`);
  if (lc.completed) parts.push(`completed:${lc.completed}`);
  if (parts.length === 0) return '';
  return `⏱{${parts.join('|')}}`;
}

function serializeCard(card: Card): string {
  const check = card.checked ? 'x' : ' ';
  const lines: string[] = [`- [${check}] ${card.title}`];

  // Body lines — skip metadata that we manage separately
  for (const line of card.body) {
    if (LIFECYCLE_RE.test(line)) continue;
    // Skip standalone due date lines (but keep if mixed with other text)
    if (/^\t?@\{\d{4}-\d{2}-\d{2}\}$/.test(line.trim())) continue;
    // Skip standalone source lines
    if (/^\t?출처:\s*\[\[/.test(line.trim())) continue;
    lines.push(line);
  }

  // Re-add managed metadata
  if (card.source) {
    lines.push(`\t출처: [[${card.source}]]`);
  }
  if (card.dueDate) {
    lines.push(`\t@{${card.dueDate}}`);
  }
  const lcStr = serializeLifecycle(card.lifecycle);
  if (lcStr) {
    lines.push(`\t${lcStr}`);
  }

  return lines.join('\n');
}

function serializeFrontmatter(columns: Column[]): string {
  const colDefs = columns.map(col => {
    let def = `{ name: "${col.name}", type: ${col.type}`;
    if (col.wip) def += `, wip: ${col.wip}`;
    def += ' }';
    return `  - ${def}`;
  }).join('\n');

  return `---\ngongmyung-kanban: board\ncolumns:\n${colDefs}\n---`;
}

export function serializeBoard(board: Board): string {
  const parts: string[] = [];

  // Frontmatter
  parts.push(serializeFrontmatter(board.columns));

  // Header text
  if (board.headerText) {
    parts.push('');
    parts.push(board.headerText);
  }

  // Columns
  for (const col of board.columns) {
    parts.push('');
    parts.push(`## ${col.name}`);
    parts.push('');
    for (const card of col.cards) {
      parts.push(serializeCard(card));
    }
  }

  // Archive
  if (board.archive.length > 0) {
    parts.push('');
    parts.push('');
    parts.push('## Archive');
    parts.push('');
    for (const card of board.archive) {
      parts.push(serializeCard(card));
    }
  }

  parts.push('');
  return parts.join('\n');
}

// ─── Utility: extract column defs from board ───

export function getColumnDefs(board: Board): ColumnDef[] {
  return board.columns.map(c => ({
    name: c.name,
    type: c.type,
    wip: c.wip,
  }));
}
