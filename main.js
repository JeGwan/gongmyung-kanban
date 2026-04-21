/* Gongmyung Kanban — bundled by esbuild */
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => GongmyungKanbanPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian6 = require("obsidian");

// src/view.ts
var import_obsidian3 = require("obsidian");

// src/parser.ts
var FRONTMATTER_RE = /^---\n([\s\S]*?)\n---/;
var HEADING_RE = /^## (.+)$/;
var CARD_RE = /^- \[([ x])\] (.*)$/;
var DUE_DATE_RE = /@\{(\d{4}-\d{2}-\d{2})\}/;
var LIFECYCLE_RE = /⏱\{([^}]+)\}/;
var SOURCE_RE = /출처:\s*\[\[([^\]]+)\]\]/;
var TAG_RE = /#([\w가-힣]+)/g;
var KANBAN_SETTINGS_RE = /\n%%\s*kanban:settings[\s\S]*?%%\s*$/;
function parseFrontmatter(text) {
  const match = text.match(FRONTMATTER_RE);
  if (!match) return { raw: "", isGongmyung: false, columns: [] };
  const raw = match[1];
  const isGongmyung = /gongmyung-kanban:\s*board/.test(raw);
  const columns = [];
  if (isGongmyung) {
    const colMatches = raw.matchAll(/\{\s*name:\s*"([^"]+)"\s*,\s*type:\s*(\w+)(?:\s*,\s*wip:\s*(\d+))?\s*\}/g);
    for (const m of colMatches) {
      columns.push({
        name: m[1],
        type: m[2],
        wip: m[3] ? parseInt(m[3], 10) : void 0
      });
    }
  }
  return { raw, isGongmyung, columns };
}
function parseLifecycle(line) {
  const match = line.match(LIFECYCLE_RE);
  if (!match) return null;
  const lc = {};
  for (const pair of match[1].split("|")) {
    const [key, val] = pair.split(":");
    if (val && val.trim()) {
      lc[key.trim()] = val.trim();
    }
  }
  return lc;
}
function extractTags(title) {
  const tags = [];
  let m;
  const re = new RegExp(TAG_RE.source, TAG_RE.flags);
  while ((m = re.exec(title)) !== null) {
    tags.push(m[1]);
  }
  return tags;
}
function parseCard(titleLine, bodyLines) {
  const m = titleLine.match(CARD_RE);
  const checked = m[1] === "x";
  const title = m[2];
  let dueDate;
  let lifecycle = {};
  let source;
  const titleDue = title.match(DUE_DATE_RE);
  if (titleDue) dueDate = titleDue[1];
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
    source
  };
}
function splitSections(content) {
  const lines = content.split("\n");
  let headerText = "";
  const sections = [];
  let currentSection = null;
  let inHeader = true;
  for (const line of lines) {
    const headingMatch = line.match(HEADING_RE);
    if (headingMatch) {
      inHeader = false;
      currentSection = { heading: headingMatch[1], lines: [] };
      sections.push(currentSection);
    } else if (inHeader) {
      headerText += line + "\n";
    } else if (currentSection) {
      currentSection.lines.push(line);
    }
  }
  headerText = headerText.replace(/\n+$/, "");
  return { headerText, sections };
}
function parseCardsFromLines(lines) {
  const cards = [];
  let currentTitle = null;
  let currentBody = [];
  function flush() {
    if (currentTitle !== null) {
      while (currentBody.length > 0 && currentBody[currentBody.length - 1].trim() === "") {
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
      if (line === "**Complete**" || line === "***") {
        flush();
        continue;
      }
      currentBody.push(line);
    }
  }
  flush();
  return cards;
}
function inferColumnType(heading) {
  const h = heading.toLowerCase();
  if (h.includes("\uC778\uBC15\uC2A4") || h.includes("inbox")) return "inbox";
  if (h.includes("\uC9C4\uD589") || h.includes("progress") || h.includes("doing")) return "active";
  if (h.includes("\uC644\uB8CC") || h.includes("done") || h.includes("complete")) return "done";
  if (h.includes("\uBCF4\uB958") || h.includes("hold") || h.includes("wait")) return "hold";
  return "inbox";
}
function inferWip(heading) {
  const m = heading.match(/최대\s*(\d+)/);
  return m ? parseInt(m[1], 10) : void 0;
}
function parseBoard(markdown) {
  const cleaned = markdown.replace(KANBAN_SETTINGS_RE, "");
  const fm = parseFrontmatter(cleaned);
  const afterFrontmatter = cleaned.replace(FRONTMATTER_RE, "").replace(/^\n+/, "");
  const { headerText, sections } = splitSections(afterFrontmatter);
  const columns = [];
  const archiveCards = [];
  let seenArchive = false;
  for (const section of sections) {
    const heading = section.heading;
    const isArchive = heading.toLowerCase() === "archive";
    if (isArchive) {
      seenArchive = true;
      const cards = parseCardsFromLines(section.lines);
      archiveCards.push(...cards);
      continue;
    }
    if (seenArchive) {
      const cards = parseCardsFromLines(section.lines);
      archiveCards.push(...cards);
      continue;
    }
    const fmCol = fm.columns.find((c) => heading.includes(c.name) || c.name.includes(heading));
    const type = fmCol?.type ?? inferColumnType(heading);
    const wip = fmCol?.wip ?? inferWip(heading);
    columns.push({
      name: heading,
      type,
      wip,
      cards: parseCardsFromLines(section.lines)
    });
  }
  return { columns, archive: archiveCards, headerText };
}
function serializeLifecycle(lc) {
  const parts = [];
  if (lc.created) parts.push(`created:${lc.created}`);
  if (lc.started) parts.push(`started:${lc.started}`);
  if (lc.completed) parts.push(`completed:${lc.completed}`);
  if (parts.length === 0) return "";
  return `\u23F1{${parts.join("|")}}`;
}
function serializeCard(card) {
  const check = card.checked ? "x" : " ";
  const lines = [`- [${check}] ${card.title}`];
  for (const line of card.body) {
    if (LIFECYCLE_RE.test(line)) continue;
    if (/^\t?@\{\d{4}-\d{2}-\d{2}\}$/.test(line.trim())) continue;
    if (/^\t?출처:\s*\[\[/.test(line.trim())) continue;
    lines.push(line);
  }
  if (card.source) {
    lines.push(`	\uCD9C\uCC98: [[${card.source}]]`);
  }
  if (card.dueDate) {
    lines.push(`	@{${card.dueDate}}`);
  }
  const lcStr = serializeLifecycle(card.lifecycle);
  if (lcStr) {
    lines.push(`	${lcStr}`);
  }
  return lines.join("\n");
}
function serializeFrontmatter(columns) {
  const colDefs = columns.map((col) => {
    let def = `{ name: "${col.name}", type: ${col.type}`;
    if (col.wip) def += `, wip: ${col.wip}`;
    def += " }";
    return `  - ${def}`;
  }).join("\n");
  return `---
gongmyung-kanban: board
columns:
${colDefs}
---`;
}
function serializeBoard(board) {
  const parts = [];
  parts.push(serializeFrontmatter(board.columns));
  if (board.headerText) {
    parts.push("");
    parts.push(board.headerText);
  }
  for (const col of board.columns) {
    parts.push("");
    parts.push(`## ${col.name}`);
    parts.push("");
    for (const card of col.cards) {
      parts.push(serializeCard(card));
    }
  }
  if (board.archive.length > 0) {
    parts.push("");
    parts.push("");
    parts.push("## Archive");
    parts.push("");
    for (const card of board.archive) {
      parts.push(serializeCard(card));
    }
  }
  parts.push("");
  return parts.join("\n");
}

// src/lifecycle.ts
function today() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
function daysBetween(a, b) {
  const msPerDay = 864e5;
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / msPerDay);
}
function applyLifecycleTransition(card, fromType, toType) {
  const now = today();
  const lc = card.lifecycle;
  if (!lc.created) lc.created = now;
  if (toType === "active" && fromType !== "active") {
    if (!lc.started) lc.started = now;
    if (fromType === "done") delete lc.completed;
  } else if (toType === "done") {
    if (!lc.started) lc.started = now;
    lc.completed = now;
  } else if (toType === "inbox") {
    delete lc.started;
    delete lc.completed;
  }
}
function initLifecycle(card) {
  if (!card.lifecycle.created) {
    card.lifecycle.created = today();
  }
}
function computeAging(card, columnType) {
  const now = today();
  const created = card.lifecycle.created ?? now;
  const started = card.lifecycle.started;
  const daysSinceCreated = daysBetween(created, now);
  let daysInCurrentColumn;
  if (columnType === "active" && started) {
    daysInCurrentColumn = daysBetween(started, now);
  } else {
    daysInCurrentColumn = daysSinceCreated;
  }
  let isOverdue = false;
  let daysUntilDue;
  if (card.dueDate) {
    daysUntilDue = daysBetween(now, card.dueDate);
    isOverdue = daysUntilDue < 0 && columnType !== "done";
  }
  return { daysSinceCreated, daysInCurrentColumn, isOverdue, daysUntilDue };
}

// src/ui/board.ts
var import_obsidian2 = require("obsidian");

// src/ui/card.ts
var import_obsidian = require("obsidian");

// src/ui/components.ts
function el(tag, attrs, children) {
  const elem = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") elem.className = v;
      else if (k === "text") elem.textContent = v;
      else elem.setAttribute(k, v);
    }
  }
  if (children) {
    for (const child of children) {
      if (typeof child === "string") elem.appendText(child);
      else elem.appendChild(child);
    }
  }
  return elem;
}
function badge(text, cls) {
  return el("span", { class: `gk-badge ${cls}`, text });
}

// src/ui/card.ts
async function renderCard(card, ctx) {
  const cardEl = el("div", { class: "gk-card" });
  cardEl.setAttribute("draggable", "true");
  const aging = computeAging(card, ctx.columnType);
  if (aging.isOverdue) cardEl.classList.add("gk-overdue");
  const header = el("div", { class: "gk-card-header" });
  const titleEl = el("div", { class: "gk-card-title" });
  await import_obsidian.MarkdownRenderer.render(ctx.app, card.title, titleEl, ctx.sourcePath, ctx.component);
  const p = titleEl.querySelector("p");
  if (p) {
    while (p.firstChild) titleEl.insertBefore(p.firstChild, p);
    p.remove();
  }
  header.appendChild(titleEl);
  if (card.source) {
    const sourceEl = el("div", { class: "gk-card-source" });
    await import_obsidian.MarkdownRenderer.render(ctx.app, `[[${card.source}]]`, sourceEl, ctx.sourcePath, ctx.component);
    cardEl.appendChild(sourceEl);
  }
  cardEl.appendChild(header);
  const bodyLines = card.body.filter((line) => {
    const trimmed = line.trim();
    if (/⏱\{/.test(trimmed)) return false;
    if (/^출처:/.test(trimmed)) return false;
    if (/^@\{\d{4}-\d{2}-\d{2}\}$/.test(trimmed)) return false;
    return true;
  }).filter((line) => line.trim() !== "");
  if (bodyLines.length > 0) {
    const bodyEl = el("div", { class: "gk-card-body" });
    const bodyText = bodyLines.map((l) => l.replace(/^\t/, "")).join("\n");
    await import_obsidian.MarkdownRenderer.render(ctx.app, bodyText, bodyEl, ctx.sourcePath, ctx.component);
    cardEl.appendChild(bodyEl);
  }
  const footer = el("div", { class: "gk-card-footer" });
  let hasFooter = false;
  const { settings } = ctx;
  const hasDue = settings.showDueDateBadge && card.dueDate && aging.daysUntilDue !== void 0;
  if (hasDue) {
    hasFooter = true;
    const dueEl = el("span", { class: "gk-card-due" });
    if (ctx.columnType === "done") {
      dueEl.textContent = formatDueDate(card.dueDate, settings.dateFormat);
    } else if (aging.daysUntilDue > 0) {
      dueEl.textContent = `D-${aging.daysUntilDue}`;
      if (aging.daysUntilDue <= 3) dueEl.classList.add("gk-due-urgent");
    } else if (aging.daysUntilDue === 0) {
      dueEl.textContent = "D-Day";
      dueEl.classList.add("gk-due-urgent");
    } else {
      dueEl.textContent = `${Math.abs(aging.daysUntilDue)}d overdue`;
      dueEl.classList.add("gk-overdue");
    }
    footer.appendChild(dueEl);
  }
  if (!hasDue && settings.showAgingBadge && ctx.columnType !== "done") {
    const days = aging.daysInCurrentColumn;
    if (days >= settings.agingCritical) {
      hasFooter = true;
      footer.appendChild(badge(`${days}d`, "gk-aging-critical"));
    } else if (days >= settings.agingHot) {
      hasFooter = true;
      footer.appendChild(badge(`${days}d`, "gk-aging-hot"));
    } else if (days >= settings.agingWarm) {
      hasFooter = true;
      footer.appendChild(badge(`${days}d`, "gk-aging-warm"));
    }
  }
  if (settings.showCycleTime && ctx.columnType === "done") {
    hasFooter = true;
    const days = aging.daysSinceCreated;
    footer.appendChild(badge(days === 0 ? "<1d" : `${days}d`, "gk-cycle-time"));
  }
  if (hasFooter) cardEl.appendChild(footer);
  cardEl.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    ctx.onContextMenu(card, e);
  });
  cardEl.addEventListener("dblclick", () => {
    ctx.onDblClick(card, cardEl);
  });
  return cardEl;
}
function formatDueDate(date, format) {
  if (format === "mm/dd") {
    const parts = date.split("-");
    return `${parts[1]}/${parts[2]}`;
  }
  return date;
}

// src/ui/editor.ts
var import_view = require("@codemirror/view");
var import_state = require("@codemirror/state");
var import_commands = require("@codemirror/commands");

// src/ui/date-picker.ts
var DatePicker = class {
  containerEl;
  selectedDate;
  onSelect;
  onClose;
  constructor(opts) {
    this.selectedDate = /* @__PURE__ */ new Date();
    this.onSelect = opts.onSelect;
    this.onClose = opts.onClose;
    this.containerEl = el("div", { class: "gk-date-picker" });
    const rect = opts.anchorEl.getBoundingClientRect();
    this.containerEl.style.position = "fixed";
    this.containerEl.style.left = `${rect.left}px`;
    this.containerEl.style.top = `${rect.bottom + 4}px`;
    this.containerEl.style.zIndex = "1000";
    this.render();
    document.body.appendChild(this.containerEl);
    setTimeout(() => {
      document.addEventListener("mousedown", this.handleOutsideClick);
    }, 0);
  }
  handleOutsideClick = (e) => {
    if (!this.containerEl.contains(e.target)) {
      this.close();
    }
  };
  render() {
    this.containerEl.empty();
    const year = this.selectedDate.getFullYear();
    const month = this.selectedDate.getMonth();
    const header = el("div", { class: "gk-dp-header" });
    const prevBtn = el("button", { class: "gk-dp-nav", text: "\u2039" });
    prevBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.selectedDate.setMonth(month - 1);
      this.render();
    });
    header.appendChild(prevBtn);
    const monthNames = ["1\uC6D4", "2\uC6D4", "3\uC6D4", "4\uC6D4", "5\uC6D4", "6\uC6D4", "7\uC6D4", "8\uC6D4", "9\uC6D4", "10\uC6D4", "11\uC6D4", "12\uC6D4"];
    header.appendChild(el("span", { class: "gk-dp-title", text: `${year}\uB144 ${monthNames[month]}` }));
    const nextBtn = el("button", { class: "gk-dp-nav", text: "\u203A" });
    nextBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.selectedDate.setMonth(month + 1);
      this.render();
    });
    header.appendChild(nextBtn);
    this.containerEl.appendChild(header);
    const dayLabels = el("div", { class: "gk-dp-days-header" });
    for (const d of ["\uC77C", "\uC6D4", "\uD654", "\uC218", "\uBAA9", "\uAE08", "\uD1A0"]) {
      dayLabels.appendChild(el("span", { class: "gk-dp-day-label", text: d }));
    }
    this.containerEl.appendChild(dayLabels);
    const grid = el("div", { class: "gk-dp-grid" });
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today2 = /* @__PURE__ */ new Date();
    const todayStr = this.formatDate(today2);
    const selectedStr = this.formatDate(this.selectedDate);
    for (let i = 0; i < firstDay; i++) {
      grid.appendChild(el("span", { class: "gk-dp-cell gk-dp-empty" }));
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = this.formatDate(date);
      const cell = el("button", { class: "gk-dp-cell", text: String(day) });
      if (dateStr === todayStr) cell.classList.add("gk-dp-today");
      if (dateStr === selectedStr) cell.classList.add("gk-dp-selected");
      cell.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.onSelect(dateStr);
        this.close();
      });
      grid.appendChild(cell);
    }
    this.containerEl.appendChild(grid);
    const quick = el("div", { class: "gk-dp-quick" });
    const shortcuts = [
      { label: "\uC624\uB298", days: 0 },
      { label: "\uB0B4\uC77C", days: 1 },
      { label: "\uC774\uBC88\uC8FC \uAE08", days: this.daysUntilFriday() },
      { label: "\uB2E4\uC74C\uC8FC \uC6D4", days: this.daysUntilNextMonday() }
    ];
    for (const s of shortcuts) {
      const btn = el("button", { class: "gk-dp-quick-btn", text: s.label });
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const d = /* @__PURE__ */ new Date();
        d.setDate(d.getDate() + s.days);
        this.onSelect(this.formatDate(d));
        this.close();
      });
      quick.appendChild(btn);
    }
    this.containerEl.appendChild(quick);
  }
  handleKeydown(e) {
    const day = this.selectedDate.getDate();
    switch (e.key) {
      case "ArrowLeft":
        this.selectedDate.setDate(day - 1);
        this.render();
        return true;
      case "ArrowRight":
        this.selectedDate.setDate(day + 1);
        this.render();
        return true;
      case "ArrowUp":
        this.selectedDate.setDate(day - 7);
        this.render();
        return true;
      case "ArrowDown":
        this.selectedDate.setDate(day + 7);
        this.render();
        return true;
      case "Enter":
        this.onSelect(this.formatDate(this.selectedDate));
        this.close();
        return true;
      case "Escape":
        this.close();
        return true;
      default:
        return false;
    }
  }
  close() {
    document.removeEventListener("mousedown", this.handleOutsideClick);
    this.containerEl.remove();
    this.onClose();
  }
  formatDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  daysUntilFriday() {
    const today2 = (/* @__PURE__ */ new Date()).getDay();
    return today2 <= 5 ? 5 - today2 : 5 + 7 - today2;
  }
  daysUntilNextMonday() {
    const today2 = (/* @__PURE__ */ new Date()).getDay();
    return today2 === 0 ? 1 : 8 - today2;
  }
};

// src/ui/editor.ts
function createInlineEditor(parent, opts) {
  let datePicker = null;
  let destroyed = false;
  function closePicker() {
    if (datePicker) {
      datePicker.close();
      datePicker = null;
    }
  }
  const datePickerHandler = import_view.EditorView.domEventHandlers({
    keydown(event, view2) {
      if (datePicker) {
        const handled = datePicker.handleKeydown(event);
        if (handled) {
          event.preventDefault();
          event.stopPropagation();
          return true;
        }
      }
      if (event.key === "@" && !datePicker) {
        requestAnimationFrame(() => {
          const cursorPos = view2.state.selection.main.head;
          datePicker = new DatePicker({
            anchorEl: view2.dom,
            onSelect: (dateStr) => {
              const doc = view2.state.doc.toString();
              const atPos = doc.lastIndexOf("@", cursorPos);
              if (atPos >= 0) {
                const replacement = `@{${dateStr}}`;
                view2.dispatch({
                  changes: { from: atPos, to: view2.state.selection.main.head, insert: replacement },
                  selection: { anchor: atPos + replacement.length }
                });
              }
              view2.focus();
            },
            onClose: () => {
              datePicker = null;
              view2.focus();
            }
          });
        });
      }
      return false;
    }
  });
  const pasteHandler = import_view.EditorView.domEventHandlers({
    paste(event, view2) {
      const clipText = event.clipboardData?.getData("text/plain") ?? "";
      const { from, to } = view2.state.selection.main;
      if (from === to) return false;
      if (/^https?:\/\/\S+$/.test(clipText.trim())) {
        event.preventDefault();
        const selectedText = view2.state.sliceDoc(from, to);
        const link = `[${selectedText}](${clipText.trim()})`;
        view2.dispatch({
          changes: { from, to, insert: link },
          selection: { anchor: from + link.length }
        });
        return true;
      }
      return false;
    }
  });
  const markdownKeymap = import_view.keymap.of([
    { key: "Mod-b", run: (v) => wrapSelection(v, "**") },
    { key: "Mod-i", run: (v) => wrapSelection(v, "*") }
  ]);
  const saveKeymap = import_view.keymap.of([
    ...opts.saveOnEnter ? [{
      key: "Enter",
      run: (view2) => {
        if (datePicker) return false;
        closePicker();
        opts.onSave(view2.state.doc.toString());
        return true;
      }
    }] : [],
    ...opts.saveOnMetaEnter ? [{
      key: "Mod-Enter",
      run: (view2) => {
        closePicker();
        opts.onSave(view2.state.doc.toString());
        return true;
      }
    }] : [],
    {
      key: "Escape",
      run: () => {
        closePicker();
        opts.onCancel();
        return true;
      }
    }
  ]);
  const blurHandler = opts.onBlur ? import_view.EditorView.domEventHandlers({
    focusout(_event, view2) {
      setTimeout(() => {
        if (!document.querySelector(".gk-date-picker") && !destroyed) {
          opts.onBlur(view2.state.doc.toString());
        }
      }, 150);
      return false;
    }
  }) : [];
  const theme = import_view.EditorView.theme({
    "&": { fontSize: "inherit", fontFamily: "inherit" },
    "&.cm-focused": { outline: "none" },
    ".cm-content": { padding: "0", caretColor: "var(--text-normal)" },
    ".cm-line": { padding: "0" },
    ".cm-cursor": { borderLeftColor: "var(--text-normal)" },
    ".cm-placeholder": { color: "var(--text-faint)" }
  });
  const extensions = [
    import_state.Prec.highest(datePickerHandler),
    import_state.Prec.high(saveKeymap),
    markdownKeymap,
    (0, import_commands.history)(),
    import_view.keymap.of([...import_commands.defaultKeymap, ...import_commands.historyKeymap]),
    pasteHandler,
    import_view.EditorView.lineWrapping,
    theme,
    ...opts.placeholder ? [(0, import_view.placeholder)(opts.placeholder)] : [],
    ...Array.isArray(blurHandler) ? blurHandler : [blurHandler]
  ];
  const state = import_state.EditorState.create({
    doc: opts.initialValue ?? "",
    extensions
  });
  const view = new import_view.EditorView({ state, parent });
  return {
    view,
    destroy: () => {
      destroyed = true;
      closePicker();
      view.destroy();
    }
  };
}
function wrapSelection(view, wrapper) {
  const { from, to } = view.state.selection.main;
  if (from === to) return false;
  const selected = view.state.sliceDoc(from, to);
  view.dispatch({
    changes: { from, to, insert: `${wrapper}${selected}${wrapper}` },
    selection: { anchor: from + wrapper.length, head: to + wrapper.length }
  });
  return true;
}

// src/i18n.ts
var strings = {
  // Action buttons
  "action.archive": {
    ko: "\uC644\uB8CC \uCE74\uB4DC \uC544\uCE74\uC774\uBE0C",
    en: "Archive completed cards"
  },
  "action.toggle_archive": {
    ko: "\uC544\uCE74\uC774\uBE0C \uCEEC\uB7FC \uD1A0\uAE00",
    en: "Toggle archive column"
  },
  "action.toggle_markdown": {
    ko: "\uBB38\uC11C \uBAA8\uB4DC\uB85C \uC804\uD658",
    en: "Open as markdown"
  },
  // Notices
  "notice.wip_exceeded": {
    ko: "\u26A0\uFE0F WIP \uC81C\uD55C \uCD08\uACFC: {col} ({count}/{limit})",
    en: "\u26A0\uFE0F WIP limit exceeded: {col} ({count}/{limit})"
  },
  "notice.migrated": {
    ko: "\u2705 \uB9C8\uC774\uADF8\uB808\uC774\uC158 \uC644\uB8CC: {name}",
    en: "\u2705 Migrated: {name}"
  },
  "notice.no_active_file": {
    ko: "\uB9C8\uC774\uADF8\uB808\uC774\uC158\uD560 \uD30C\uC77C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4",
    en: "No active file to migrate"
  },
  "notice.not_kanban": {
    ko: "\uC774 \uD30C\uC77C\uC740 obsidian-kanban \uBCF4\uB4DC\uAC00 \uC544\uB2D9\uB2C8\uB2E4",
    en: "This file is not an obsidian-kanban board"
  },
  "notice.already_migrated": {
    ko: "\uC774\uBBF8 gongmyung-kanban \uD615\uC2DD\uC785\uB2C8\uB2E4",
    en: "This file is already in gongmyung-kanban format"
  },
  "notice.board_created": {
    ko: "\u{1F4CB} \uBCF4\uB4DC \uC0DD\uC131\uB428: {name}",
    en: "\u{1F4CB} Board created: {name}"
  },
  "notice.archived": {
    ko: "\u{1F4E6} {count}\uAC1C \uCE74\uB4DC \uC544\uCE74\uC774\uBE0C\uB428",
    en: "\u{1F4E6} {count} cards archived"
  },
  "notice.nothing_to_archive": {
    ko: "\uC544\uCE74\uC774\uBE0C\uD560 \uC644\uB8CC \uCE74\uB4DC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4",
    en: "No completed cards to archive"
  },
  // Placeholders
  "placeholder.new_card": {
    ko: "\uC0C8 \uD560\uC77C \uC785\uB825... (Enter \uC800\uC7A5, @ \uB9C8\uAC10\uC77C, Esc \uCDE8\uC18C)",
    en: "New task... (Enter to save, @ for due date, Esc to cancel)"
  },
  "placeholder.header_memo": {
    ko: "\uC88C\uC6B0\uBA85, \uB2E4\uC9D0, \uBA54\uBAA8...",
    en: "Motto, goals, notes..."
  },
  "placeholder.header_empty": {
    ko: "\uD074\uB9AD\uD558\uC5EC \uBA54\uBAA8 \uCD94\uAC00...",
    en: "Click to add a note..."
  },
  "placeholder.board_name": {
    ko: "\uBCF4\uB4DC \uC774\uB984",
    en: "Board name"
  },
  // Context menu
  "menu.delete": {
    ko: "\uC0AD\uC81C",
    en: "Delete"
  },
  // Modal
  "modal.create_board_title": {
    ko: "\uC0C8 \uCE78\uBC18 \uBCF4\uB4DC \uB9CC\uB4E4\uAE30",
    en: "Create new kanban board"
  },
  "modal.create": {
    ko: "\uB9CC\uB4E4\uAE30",
    en: "Create"
  },
  // Due date display
  "due.dday": {
    ko: "D-Day",
    en: "D-Day"
  },
  "due.overdue": {
    ko: "{days}\uC77C \uC9C0\uB0A8",
    en: "{days}d overdue"
  },
  // Settings
  "settings.aging_section": {
    ko: "\uC5D0\uC774\uC9D5 \uBC30\uC9C0",
    en: "Aging badges"
  },
  "settings.aging_warm": {
    ko: "\uC8FC\uC758 \uC784\uACC4\uAC12 (\uC77C)",
    en: "Warm threshold (days)"
  },
  "settings.aging_warm_desc": {
    ko: "\uC774 \uC77C\uC218 \uC774\uC0C1 \uCEEC\uB7FC\uC5D0 \uBA38\uBB3C\uBA74 \uB178\uB780\uC0C9 \uBC30\uC9C0 \uD45C\uC2DC",
    en: "Show yellow badge after this many days in a column"
  },
  "settings.aging_hot": {
    ko: "\uACBD\uACE0 \uC784\uACC4\uAC12 (\uC77C)",
    en: "Hot threshold (days)"
  },
  "settings.aging_hot_desc": {
    ko: "\uC774 \uC77C\uC218 \uC774\uC0C1 \uCEEC\uB7FC\uC5D0 \uBA38\uBB3C\uBA74 \uC8FC\uD669\uC0C9 \uBC30\uC9C0 \uD45C\uC2DC",
    en: "Show orange badge after this many days in a column"
  },
  "settings.aging_critical": {
    ko: "\uC704\uD5D8 \uC784\uACC4\uAC12 (\uC77C)",
    en: "Critical threshold (days)"
  },
  "settings.aging_critical_desc": {
    ko: "\uC774 \uC77C\uC218 \uC774\uC0C1 \uCEEC\uB7FC\uC5D0 \uBA38\uBB3C\uBA74 \uBE68\uAC04\uC0C9 \uBC30\uC9C0 \uD45C\uC2DC",
    en: "Show red badge after this many days in a column"
  },
  "settings.display_section": {
    ko: "\uD45C\uC2DC",
    en: "Display"
  },
  "settings.show_archive": {
    ko: "\uC544\uCE74\uC774\uBE0C \uD45C\uC2DC",
    en: "Show archive"
  },
  "settings.show_archive_desc": {
    ko: "\uBCF4\uB4DC \uD558\uB2E8\uC5D0 \uC544\uCE74\uC774\uBE0C\uB41C \uCE74\uB4DC \uD45C\uC2DC",
    en: "Show archived cards at the bottom of each board"
  },
  "settings.date_format": {
    ko: "\uB0A0\uC9DC \uD615\uC2DD",
    en: "Date format"
  },
  "settings.date_format_desc": {
    ko: "\uB9C8\uAC10\uC77C \uBC30\uC9C0\uC5D0 \uD45C\uC2DC\uD560 \uB0A0\uC9DC \uD615\uC2DD",
    en: "Date format for due date badges"
  },
  "settings.language": {
    ko: "\uC5B8\uC5B4",
    en: "Language"
  },
  "settings.language_desc": {
    ko: "UI \uD14D\uC2A4\uD2B8 \uC5B8\uC5B4",
    en: "Language for UI text"
  },
  "settings.badges_section": {
    ko: "\uBC30\uC9C0",
    en: "Badges"
  },
  "settings.show_cycle_time": {
    ko: "\uC0AC\uC774\uD074 \uD0C0\uC784 \uBC30\uC9C0",
    en: "Cycle time badge"
  },
  "settings.show_cycle_time_desc": {
    ko: "\uC644\uB8CC \uCE74\uB4DC\uC5D0 \uC0DD\uC131~\uC644\uB8CC \uC18C\uC694\uC77C \uD45C\uC2DC",
    en: "Show days from creation to completion on done cards"
  },
  "settings.show_aging_badge": {
    ko: "\uC5D0\uC774\uC9D5 \uBC30\uC9C0",
    en: "Aging badge"
  },
  "settings.show_aging_badge_desc": {
    ko: "\uCEEC\uB7FC \uCCB4\uB958 \uAE30\uAC04 \uBC30\uC9C0 \uD45C\uC2DC",
    en: "Show how long a card has been in the current column"
  },
  "settings.show_due_date_badge": {
    ko: "\uB9C8\uAC10\uC77C \uBC30\uC9C0",
    en: "Due date badge"
  },
  "settings.show_due_date_badge_desc": {
    ko: "\uB9C8\uAC10\uC77C \uCE74\uC6B4\uD2B8\uB2E4\uC6B4 \uBC30\uC9C0 \uD45C\uC2DC",
    en: "Show due date countdown badge"
  },
  "settings.defaults_section": {
    ko: "\uC0C8 \uBCF4\uB4DC \uAE30\uBCF8\uAC12",
    en: "New board defaults"
  },
  "settings.default_columns": {
    ko: "\uAE30\uBCF8 \uCEEC\uB7FC",
    en: "Default columns"
  },
  "settings.default_columns_desc": {
    ko: "\uC0C8 \uBCF4\uB4DC \uC0DD\uC131 \uC2DC \uC0AC\uC6A9\uD560 \uAE30\uBCF8 \uCEEC\uB7FC \uAD6C\uC131 (JSON)",
    en: "Default column configuration for new boards (JSON)"
  }
};
var currentLang = "en";
function setLanguage(lang) {
  if (lang === "auto") {
    const locale = navigator.language?.slice(0, 2);
    currentLang = locale === "ko" ? "ko" : "en";
  } else {
    currentLang = lang;
  }
}
function t(key, vars) {
  const entry = strings[key];
  if (!entry) return key;
  let text = entry[currentLang] ?? entry["en"] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }
  return text;
}

// src/ui/board.ts
async function renderBoard(container, board, app, sourcePath, component, callbacks, settings, showArchiveColumn = false) {
  container.empty();
  const wrapper = el("div", { class: "gk-wrapper" });
  if (board.headerText !== void 0) {
    const headerArea = await renderHeaderMemo(board.headerText, app, sourcePath, component, callbacks);
    wrapper.appendChild(headerArea);
  }
  const boardEl = el("div", { class: "gk-board" });
  for (let colIdx = 0; colIdx < board.columns.length; colIdx++) {
    const col = board.columns[colIdx];
    const colEl = await renderColumn(col, colIdx, app, sourcePath, component, callbacks, settings);
    boardEl.appendChild(colEl);
  }
  if (showArchiveColumn && board.archive.length > 0) {
    const archiveCol = renderArchiveColumn(board.archive);
    boardEl.appendChild(archiveCol);
  }
  wrapper.appendChild(boardEl);
  container.appendChild(wrapper);
}
function renderArchiveColumn(cards) {
  const colEl = el("div", { class: "gk-column gk-archive-column" });
  const headerEl = el("div", { class: "gk-column-header" });
  const titleEl = el("span", { class: "gk-column-title", text: `\u{1F4E6} Archive` });
  headerEl.appendChild(titleEl);
  const countEl = el("span", { class: "gk-column-count", text: String(cards.length) });
  headerEl.appendChild(countEl);
  colEl.appendChild(headerEl);
  const bodyEl = el("div", { class: "gk-column-body" });
  for (const card of cards) {
    const cardEl = el("div", { class: "gk-card gk-archive-card" });
    const titleDiv = el("div", { class: "gk-card-title" });
    titleDiv.textContent = card.title;
    cardEl.appendChild(titleDiv);
    bodyEl.appendChild(cardEl);
  }
  colEl.appendChild(bodyEl);
  return colEl;
}
async function renderHeaderMemo(text, app, sourcePath, component, callbacks) {
  const container = el("div", { class: "gk-header-memo" });
  const previewEl = el("div", { class: "gk-header-preview" });
  if (text.trim()) {
    await import_obsidian2.MarkdownRenderer.render(app, text, previewEl, sourcePath, component);
  } else {
    previewEl.classList.add("gk-header-empty");
    previewEl.textContent = t("placeholder.header_empty");
  }
  container.appendChild(previewEl);
  previewEl.addEventListener("click", () => {
    previewEl.style.display = "none";
    const editorEl = el("div", { class: "gk-header-edit" });
    container.appendChild(editorEl);
    const closeEditor = (newText) => {
      destroy();
      editorEl.remove();
      previewEl.style.display = "";
      if (newText !== void 0 && newText !== text) {
        callbacks.onHeaderTextChange(newText);
      }
    };
    const { view, destroy } = createInlineEditor(editorEl, {
      initialValue: text,
      placeholder: t("placeholder.header_memo"),
      saveOnMetaEnter: true,
      onSave: (val) => closeEditor(val),
      onCancel: () => closeEditor(),
      onBlur: (val) => closeEditor(val)
    });
    view.focus();
  });
  return container;
}
async function renderColumn(col, colIdx, app, sourcePath, component, callbacks, settings) {
  const colEl = el("div", { class: "gk-column" });
  colEl.dataset.colIndex = String(colIdx);
  const headerEl = el("div", { class: "gk-column-header" });
  const titleEl = el("span", { class: "gk-column-title", text: col.name });
  headerEl.appendChild(titleEl);
  const countEl = el("span", { class: "gk-column-count", text: String(col.cards.length) });
  headerEl.appendChild(countEl);
  if (col.wip) {
    const wipText = `${col.cards.length}/${col.wip}`;
    const wipEl = el("span", { class: "gk-wip-badge", text: wipText });
    headerEl.appendChild(wipEl);
    if (col.cards.length > col.wip) {
      colEl.classList.add("gk-wip-exceeded");
    }
  }
  const addBtn = el("button", { class: "gk-column-add-btn" });
  (0, import_obsidian2.setIcon)(addBtn, "plus");
  addBtn.addEventListener("click", () => callbacks.onAddCard(colIdx));
  headerEl.appendChild(addBtn);
  colEl.appendChild(headerEl);
  const bodyEl = el("div", { class: "gk-column-body" });
  bodyEl.dataset.colIndex = String(colIdx);
  for (let cardIdx = 0; cardIdx < col.cards.length; cardIdx++) {
    const card = col.cards[cardIdx];
    const ctx = {
      app,
      sourcePath,
      component,
      columnType: col.type,
      settings,
      onCheckToggle: () => callbacks.onCardCheckToggle(colIdx, cardIdx),
      onContextMenu: (_card, evt) => callbacks.onCardContextMenu(colIdx, cardIdx, evt),
      onDblClick: (_card, cardEl2) => callbacks.onCardDblClick(colIdx, cardIdx, cardEl2)
    };
    const cardEl = await renderCard(card, ctx);
    cardEl.dataset.colIndex = String(colIdx);
    cardEl.dataset.cardIndex = String(cardIdx);
    bodyEl.appendChild(cardEl);
  }
  setupDropZone(bodyEl, colIdx, callbacks);
  colEl.appendChild(bodyEl);
  return colEl;
}
var _dragTitle = "";
function setupDropZone(bodyEl, colIdx, callbacks) {
  bodyEl.addEventListener("dragover", (e) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    let ind = bodyEl.querySelector(".gk-drop-indicator");
    if (!ind) {
      ind = el("div", { class: "gk-drop-indicator" });
      const title = e.dataTransfer?.types.includes("text/x-gk-title") ? _dragTitle : "";
      if (title) ind.textContent = title;
      bodyEl.appendChild(ind);
    }
    const target = getDropTarget(bodyEl, e.clientY);
    if (target) {
      bodyEl.insertBefore(ind, target);
    } else {
      bodyEl.appendChild(ind);
    }
  });
  bodyEl.addEventListener("dragleave", (e) => {
    const related = e.relatedTarget;
    if (related && bodyEl.contains(related)) return;
    bodyEl.querySelector(".gk-drop-indicator")?.remove();
  });
  bodyEl.addEventListener("drop", (e) => {
    e.preventDefault();
    bodyEl.querySelector(".gk-drop-indicator")?.remove();
    const srcCol = parseInt(e.dataTransfer?.getData("text/x-gk-col") ?? "-1", 10);
    const srcCard = parseInt(e.dataTransfer?.getData("text/x-gk-card") ?? "-1", 10);
    if (srcCol < 0 || srcCard < 0) return;
    const target = getDropTarget(bodyEl, e.clientY);
    let targetIdx;
    if (target && target.dataset.cardIndex) {
      targetIdx = parseInt(target.dataset.cardIndex, 10);
      if (srcCol === colIdx && srcCard < targetIdx) targetIdx--;
    } else {
      const cards = bodyEl.querySelectorAll(".gk-card");
      targetIdx = cards.length;
      if (srcCol === colIdx) targetIdx--;
    }
    callbacks.onCardMove(srcCard, srcCol, colIdx, targetIdx);
  });
}
function getDropTarget(bodyEl, clientY) {
  const cards = Array.from(bodyEl.querySelectorAll(".gk-card:not(.gk-dragging)"));
  for (const card of cards) {
    const rect = card.getBoundingClientRect();
    if (clientY < rect.top + rect.height / 2) {
      return card;
    }
  }
  return null;
}
function enableCardDrag(cardEl) {
  cardEl.addEventListener("dragstart", (e) => {
    if (!e.dataTransfer) return;
    e.dataTransfer.setData("text/x-gk-col", cardEl.dataset.colIndex ?? "");
    e.dataTransfer.setData("text/x-gk-card", cardEl.dataset.cardIndex ?? "");
    e.dataTransfer.setData("text/x-gk-title", "1");
    e.dataTransfer.effectAllowed = "move";
    const titleEl = cardEl.querySelector(".gk-card-title");
    _dragTitle = titleEl?.textContent?.trim() ?? "";
    cardEl.classList.add("gk-dragging");
    requestAnimationFrame(() => cardEl.classList.add("gk-dragging"));
  });
  cardEl.addEventListener("dragend", () => {
    cardEl.classList.remove("gk-dragging");
    _dragTitle = "";
  });
}

// src/view.ts
var VIEW_TYPE_KANBAN = "gongmyung-kanban";
var KanbanView = class extends import_obsidian3.TextFileView {
  plugin;
  board = null;
  showArchiveColumn = false;
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.addAction("archive", t("action.archive"), () => {
      this.archiveDoneCards();
    });
    this.addAction("columns-3", t("action.toggle_archive"), () => {
      this.showArchiveColumn = !this.showArchiveColumn;
      void this.render();
    });
    this.addAction("file-text", t("action.toggle_markdown"), () => {
      if (this.file) {
        this.plugin.markdownOverrides.add(this.file.path);
        void this.leaf.setViewState({
          type: "markdown",
          state: { file: this.file.path }
        });
      }
    });
  }
  get settings() {
    return this.plugin.settings;
  }
  getViewType() {
    return VIEW_TYPE_KANBAN;
  }
  getDisplayText() {
    return this.file?.basename ?? "Kanban";
  }
  getIcon() {
    return "layout-dashboard";
  }
  // ─── TextFileView interface ───
  setViewData(data, _clear) {
    this.data = data;
    this.board = parseBoard(data);
    void this.render();
  }
  getViewData() {
    if (!this.board) return this.data;
    return serializeBoard(this.board);
  }
  clear() {
    this.board = null;
    this.contentEl.empty();
  }
  // ─── Public methods (called from commands) ───
  archiveDoneCards() {
    if (!this.board) return;
    let archived = 0;
    this.mutate((board) => {
      for (const col of board.columns) {
        if (col.type !== "done") continue;
        const done = col.cards.splice(0, col.cards.length);
        for (const card of done) {
          card.checked = true;
          board.archive.push(card);
          archived++;
        }
      }
    });
    if (archived > 0) {
      new import_obsidian3.Notice(t("notice.archived", { count: archived }));
    } else {
      new import_obsidian3.Notice(t("notice.nothing_to_archive"));
    }
  }
  // ─── Rendering ───
  async render() {
    if (!this.board || !this.file) return;
    const callbacks = {
      onCardMove: (cardIdx, fromCol, toCol, targetIdx) => this.moveCard(cardIdx, fromCol, toCol, targetIdx),
      onCardCheckToggle: (colIdx, cardIdx) => this.toggleCheck(colIdx, cardIdx),
      onCardContextMenu: (colIdx, cardIdx, evt) => this.showCardMenu(colIdx, cardIdx, evt),
      onCardDblClick: (colIdx, cardIdx, cardEl) => this.startInlineEdit(colIdx, cardIdx, cardEl),
      onAddCard: (colIdx) => this.addCard(colIdx),
      onHeaderTextChange: (newText) => this.updateHeaderText(newText)
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
    this.contentEl.querySelectorAll(".gk-card").forEach((cardEl) => {
      enableCardDrag(cardEl);
    });
    this.updateBoardHeight();
  }
  updateBoardHeight() {
    const board = this.contentEl.querySelector(".gk-board");
    const headerMemo = this.contentEl.querySelector(".gk-header-memo");
    if (!board) return;
    const viewHeight = this.contentEl.clientHeight;
    const headerHeight = headerMemo ? headerMemo.offsetHeight : 0;
    board.style.maxHeight = `${viewHeight - headerHeight}px`;
  }
  onResize() {
    this.updateBoardHeight();
  }
  // ─── Mutations (all go through mutate → requestSave → re-render) ───
  mutate(fn) {
    if (!this.board) return;
    fn(this.board);
    this.data = serializeBoard(this.board);
    this.requestSave();
    void this.render();
  }
  moveCard(cardIdx, fromCol, toCol, targetIdx) {
    this.mutate((board) => {
      const fromColumn = board.columns[fromCol];
      const toColumn = board.columns[toCol];
      if (!fromColumn || !toColumn) return;
      const [card] = fromColumn.cards.splice(cardIdx, 1);
      if (!card) return;
      if (fromCol !== toCol) {
        applyLifecycleTransition(card, fromColumn.type, toColumn.type);
      }
      toColumn.cards.splice(targetIdx, 0, card);
      if (toColumn.type === "done") card.checked = true;
      if (toColumn.type !== "done" && card.checked) card.checked = false;
      if (toColumn.wip && toColumn.cards.length > toColumn.wip) {
        new import_obsidian3.Notice(t("notice.wip_exceeded", {
          col: toColumn.name,
          count: toColumn.cards.length,
          limit: toColumn.wip
        }));
      }
    });
  }
  toggleCheck(colIdx, cardIdx) {
    this.mutate((board) => {
      const card = board.columns[colIdx]?.cards[cardIdx];
      if (card) card.checked = !card.checked;
    });
  }
  showCardMenu(colIdx, cardIdx, evt) {
    if (!this.board) return;
    const card = this.board.columns[colIdx]?.cards[cardIdx];
    if (!card) return;
    const menu = new import_obsidian3.Menu();
    this.board.columns.forEach((col, idx) => {
      if (idx === colIdx) return;
      menu.addItem(
        (item) => item.setTitle(`\u2192 ${col.name}`).onClick(() => this.moveCard(cardIdx, colIdx, idx, col.cards.length))
      );
    });
    menu.addSeparator();
    menu.addItem(
      (item) => item.setTitle(t("menu.delete")).setIcon("trash").setWarning(true).onClick(() => this.deleteCard(colIdx, cardIdx))
    );
    menu.showAtMouseEvent(evt);
  }
  updateHeaderText(newText) {
    this.mutate((board) => {
      board.headerText = newText;
    });
  }
  deleteCard(colIdx, cardIdx) {
    this.mutate((board) => {
      board.columns[colIdx]?.cards.splice(cardIdx, 1);
    });
  }
  addCard(colIdx) {
    if (!this.board) return;
    const colBody = this.contentEl.querySelectorAll(".gk-column-body")[colIdx];
    if (!colBody) return;
    const editorEl = document.createElement("div");
    editorEl.className = "gk-card-edit";
    colBody.insertBefore(editorEl, colBody.firstChild);
    let cleaned = false;
    const saveNewCard = (text) => {
      text = text.trim();
      if (!cleaned) {
        cleaned = true;
        destroy();
      }
      editorEl.remove();
      if (!text) return;
      this.mutate((board) => {
        const newCard = {
          title: text,
          checked: false,
          body: [],
          lifecycle: {},
          tags: []
        };
        initLifecycle(newCard);
        board.columns[colIdx]?.cards.unshift(newCard);
      });
    };
    const { view, destroy } = createInlineEditor(editorEl, {
      placeholder: t("placeholder.new_card"),
      saveOnEnter: true,
      onSave: saveNewCard,
      onCancel: () => {
        if (!cleaned) {
          cleaned = true;
          destroy();
        }
        editorEl.remove();
      },
      onBlur: saveNewCard
    });
    view.focus();
  }
  startInlineEdit(colIdx, cardIdx, cardEl) {
    if (!this.board) return;
    const card = this.board.columns[colIdx]?.cards[cardIdx];
    if (!card) return;
    const originalHTML = cardEl.innerHTML;
    const fullText = card.title + (card.body.length > 0 ? "\n" + card.body.map((l) => l.replace(/^\t/, "")).join("\n") : "");
    cardEl.empty();
    const editorEl = document.createElement("div");
    editorEl.className = "gk-card-edit";
    cardEl.appendChild(editorEl);
    let cleaned = false;
    const doSave = (text) => {
      text = text.trim();
      if (!text) {
        cardEl.innerHTML = originalHTML;
        return;
      }
      const lines = text.split("\n");
      const newTitle = lines[0];
      const newBody = lines.slice(1).map((l) => "	" + l);
      this.mutate((board) => {
        const c = board.columns[colIdx]?.cards[cardIdx];
        if (!c) return;
        c.title = newTitle;
        c.body = newBody;
        const dueDateMatch = text.match(/@\{(\d{4}-\d{2}-\d{2})\}/);
        if (dueDateMatch) {
          c.dueDate = dueDateMatch[1];
          c.body = newBody.filter((l) => !/^\t?@\{\d{4}-\d{2}-\d{2}\}$/.test(l.trim()));
        }
      });
    };
    const { view, destroy } = createInlineEditor(editorEl, {
      initialValue: fullText,
      saveOnEnter: true,
      onSave: (text) => {
        if (!cleaned) {
          cleaned = true;
          destroy();
        }
        doSave(text);
      },
      onCancel: () => {
        if (!cleaned) {
          cleaned = true;
          destroy();
        }
        cardEl.innerHTML = originalHTML;
      },
      onBlur: (text) => {
        if (!cleaned) {
          cleaned = true;
          destroy();
        }
        doSave(text);
      }
    });
    view.focus();
    view.dispatch({ selection: { anchor: 0, head: card.title.length } });
  }
};

// src/migrate.ts
function migrateFromObsidianKanban(markdown) {
  const today2 = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  let cleaned = markdown.replace(/\n%%\s*kanban:settings[\s\S]*?%%\s*$/, "");
  cleaned = cleaned.replace(
    /^---\n[\s\S]*?\n---/,
    "---\ngongmyung-kanban: board\ncolumns: []\n---"
  );
  const board = parseBoard(cleaned);
  for (const col of board.columns) {
    col.type = inferColumnType2(col.name);
    col.wip = inferWip2(col.name);
    col.name = normalizeColumnName(col.name, col.type);
  }
  addLifecycleToAll(board, today2);
  return serializeBoard(board);
}
function inferColumnType2(heading) {
  const h = heading.toLowerCase();
  if (h.includes("\uC778\uBC15\uC2A4") || h.includes("inbox")) return "inbox";
  if (h.includes("\uC9C4\uD589") || h.includes("progress") || h.includes("doing")) return "active";
  if (h.includes("\uC644\uB8CC") || h.includes("done") || h.includes("complete")) return "done";
  if (h.includes("\uBCF4\uB958") || h.includes("hold") || h.includes("wait")) return "hold";
  return "inbox";
}
function inferWip2(heading) {
  const m = heading.match(/최대\s*(\d+)/);
  return m ? parseInt(m[1], 10) : void 0;
}
function normalizeColumnName(heading, type) {
  const defaults = {
    inbox: "\u{1F4E5} \uC778\uBC15\uC2A4",
    active: "\u{1F504} \uC9C4\uD589\uC911",
    done: "\u2705 \uC644\uB8CC",
    hold: "\u{1F9D0} \uBCF4\uB958"
  };
  return defaults[type] ?? heading;
}
function addLifecycleToAll(board, today2) {
  const addToCard = (card, isCompleted) => {
    if (!card.lifecycle.created) {
      card.lifecycle.created = today2;
    }
    if (isCompleted && !card.lifecycle.completed) {
      card.lifecycle.completed = today2;
      if (!card.lifecycle.started) card.lifecycle.started = today2;
    }
  };
  for (const col of board.columns) {
    const isCompleted = col.type === "done";
    const isActive = col.type === "active";
    for (const card of col.cards) {
      addToCard(card, isCompleted);
      if (isActive && !card.lifecycle.started) {
        card.lifecycle.started = today2;
      }
    }
  }
  for (const card of board.archive) {
    addToCard(card, true);
  }
}

// src/settings.ts
var DEFAULT_SETTINGS = {
  agingWarm: 4,
  agingHot: 8,
  agingCritical: 15,
  defaultColumns: [
    { name: "\u{1F4E5} Inbox", type: "inbox" },
    { name: "\u{1F504} Active", type: "active", wip: 3 },
    { name: "\u2705 Done", type: "done" },
    { name: "\u23F8 Hold", type: "hold" }
  ],
  showArchive: true,
  dateFormat: "yyyy-mm-dd",
  language: "auto",
  showCycleTime: true,
  showAgingBadge: true,
  showDueDateBadge: true
};

// src/settings-tab.ts
var import_obsidian4 = require("obsidian");
var GKSettingsTab = class extends import_obsidian4.PluginSettingTab {
  plugin;
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h3", { text: t("settings.aging_section") });
    new import_obsidian4.Setting(containerEl).setName(t("settings.aging_warm")).setDesc(t("settings.aging_warm_desc")).addText((text) => text.setValue(String(this.plugin.settings.agingWarm)).onChange(async (val) => {
      const n = parseInt(val, 10);
      if (!isNaN(n) && n > 0) {
        this.plugin.settings.agingWarm = n;
        await this.plugin.saveSettings();
      }
    }));
    new import_obsidian4.Setting(containerEl).setName(t("settings.aging_hot")).setDesc(t("settings.aging_hot_desc")).addText((text) => text.setValue(String(this.plugin.settings.agingHot)).onChange(async (val) => {
      const n = parseInt(val, 10);
      if (!isNaN(n) && n > 0) {
        this.plugin.settings.agingHot = n;
        await this.plugin.saveSettings();
      }
    }));
    new import_obsidian4.Setting(containerEl).setName(t("settings.aging_critical")).setDesc(t("settings.aging_critical_desc")).addText((text) => text.setValue(String(this.plugin.settings.agingCritical)).onChange(async (val) => {
      const n = parseInt(val, 10);
      if (!isNaN(n) && n > 0) {
        this.plugin.settings.agingCritical = n;
        await this.plugin.saveSettings();
      }
    }));
    containerEl.createEl("h3", { text: t("settings.display_section") });
    new import_obsidian4.Setting(containerEl).setName(t("settings.show_archive")).setDesc(t("settings.show_archive_desc")).addToggle((toggle) => toggle.setValue(this.plugin.settings.showArchive).onChange(async (val) => {
      this.plugin.settings.showArchive = val;
      await this.plugin.saveSettings();
    }));
    new import_obsidian4.Setting(containerEl).setName(t("settings.date_format")).setDesc(t("settings.date_format_desc")).addDropdown((drop) => drop.addOption("yyyy-mm-dd", "YYYY-MM-DD").addOption("relative", "Relative (D-3, D-Day)").addOption("mm/dd", "MM/DD").setValue(this.plugin.settings.dateFormat).onChange(async (val) => {
      this.plugin.settings.dateFormat = val;
      await this.plugin.saveSettings();
    }));
    new import_obsidian4.Setting(containerEl).setName(t("settings.language")).setDesc(t("settings.language_desc")).addDropdown((drop) => drop.addOption("auto", "Auto").addOption("ko", "\uD55C\uAD6D\uC5B4").addOption("en", "English").setValue(this.plugin.settings.language).onChange(async (val) => {
      this.plugin.settings.language = val;
      await this.plugin.saveSettings();
    }));
    containerEl.createEl("h3", { text: t("settings.badges_section") });
    new import_obsidian4.Setting(containerEl).setName(t("settings.show_aging_badge")).setDesc(t("settings.show_aging_badge_desc")).addToggle((toggle) => toggle.setValue(this.plugin.settings.showAgingBadge).onChange(async (val) => {
      this.plugin.settings.showAgingBadge = val;
      await this.plugin.saveSettings();
    }));
    new import_obsidian4.Setting(containerEl).setName(t("settings.show_due_date_badge")).setDesc(t("settings.show_due_date_badge_desc")).addToggle((toggle) => toggle.setValue(this.plugin.settings.showDueDateBadge).onChange(async (val) => {
      this.plugin.settings.showDueDateBadge = val;
      await this.plugin.saveSettings();
    }));
    new import_obsidian4.Setting(containerEl).setName(t("settings.show_cycle_time")).setDesc(t("settings.show_cycle_time_desc")).addToggle((toggle) => toggle.setValue(this.plugin.settings.showCycleTime).onChange(async (val) => {
      this.plugin.settings.showCycleTime = val;
      await this.plugin.saveSettings();
    }));
    containerEl.createEl("h3", { text: t("settings.defaults_section") });
    new import_obsidian4.Setting(containerEl).setName(t("settings.default_columns")).setDesc(t("settings.default_columns_desc")).addTextArea((text) => {
      text.inputEl.rows = 8;
      text.inputEl.cols = 40;
      text.inputEl.style.fontFamily = "monospace";
      text.inputEl.style.fontSize = "12px";
      text.setValue(JSON.stringify(this.plugin.settings.defaultColumns, null, 2)).onChange(async (val) => {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.plugin.settings.defaultColumns = parsed;
            await this.plugin.saveSettings();
            text.inputEl.style.borderColor = "";
          }
        } catch {
          text.inputEl.style.borderColor = "var(--text-error)";
        }
      });
    });
  }
};

// src/modal.ts
var import_obsidian5 = require("obsidian");
var CreateBoardModal = class extends import_obsidian5.Modal {
  result = "";
  onSubmit;
  constructor(app, onSubmit) {
    super(app);
    this.onSubmit = onSubmit;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: t("modal.create_board_title") });
    new import_obsidian5.Setting(contentEl).setName(t("placeholder.board_name")).addText((text) => {
      text.setPlaceholder("My Board");
      text.onChange((val) => {
        this.result = val;
      });
      text.inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && this.result.trim()) {
          e.preventDefault();
          this.close();
          this.onSubmit(this.result.trim());
        }
      });
      setTimeout(() => text.inputEl.focus(), 10);
    });
    new import_obsidian5.Setting(contentEl).addButton((btn) => btn.setButtonText(t("modal.create")).setCta().onClick(() => {
      if (this.result.trim()) {
        this.close();
        this.onSubmit(this.result.trim());
      }
    }));
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/main.ts
var GongmyungKanbanPlugin = class extends import_obsidian6.Plugin {
  settings = DEFAULT_SETTINGS;
  /** Files the user explicitly chose to view as markdown (not kanban) */
  markdownOverrides = /* @__PURE__ */ new Set();
  async onload() {
    await this.loadSettings();
    setLanguage(this.settings.language);
    this.addSettingTab(new GKSettingsTab(this.app, this));
    this.registerView(VIEW_TYPE_KANBAN, (leaf) => new KanbanView(leaf, this));
    this.registerEvent(
      this.app.workspace.on("file-open", (file) => {
        if (!file || file.extension !== "md") return;
        void this.tryOpenAsKanban(file);
      })
    );
    this.registerEvent(
      this.app.workspace.on("layout-change", () => {
        const file = this.app.workspace.getActiveFile();
        if (!file || file.extension !== "md") return;
        const leaf = this.app.workspace.getActiveViewOfType(import_obsidian6.MarkdownView)?.leaf;
        if (!leaf) return;
        void this.tryOpenAsKanban(file);
      })
    );
    this.registerEvent(
      this.app.workspace.on("layout-change", () => {
        for (const path of this.markdownOverrides) {
          const found = this.app.workspace.getLeavesOfType("markdown").some((leaf) => leaf.view.file?.path === path);
          if (!found) this.markdownOverrides.delete(path);
        }
      })
    );
    this.addCommand({
      id: "create-new-board",
      name: "Create new kanban board",
      callback: () => {
        new CreateBoardModal(this.app, (name) => {
          void this.createNewBoard(name);
        }).open();
      }
    });
    this.addCommand({
      id: "open-as-kanban",
      name: "Open as kanban board",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!file) return false;
        const cache = this.app.metadataCache.getFileCache(file);
        if (cache?.frontmatter?.["gongmyung-kanban"] !== "board") return false;
        const view = this.app.workspace.getActiveViewOfType(KanbanView);
        if (view) return false;
        if (checking) return true;
        this.markdownOverrides.delete(file.path);
        const leaf = this.app.workspace.getMostRecentLeaf();
        if (leaf) {
          void leaf.setViewState({
            type: VIEW_TYPE_KANBAN,
            state: { file: file.path }
          });
        }
        return true;
      }
    });
    this.addCommand({
      id: "open-as-markdown",
      name: "Open as markdown",
      checkCallback: (checking) => {
        const view = this.app.workspace.getActiveViewOfType(KanbanView);
        if (!view) return false;
        if (checking) return true;
        const leaf = view.leaf;
        const file = view.file;
        if (leaf && file) {
          this.markdownOverrides.add(file.path);
          void leaf.setViewState({
            type: "markdown",
            state: { file: file.path }
          });
        }
        return true;
      }
    });
    this.addCommand({
      id: "archive-done-cards",
      name: "Archive completed cards",
      checkCallback: (checking) => {
        const view = this.app.workspace.getActiveViewOfType(KanbanView);
        if (!view) return false;
        if (checking) return true;
        view.archiveDoneCards();
        return true;
      }
    });
    this.addCommand({
      id: "migrate-from-obsidian-kanban",
      name: "Migrate from obsidian-kanban format",
      callback: () => {
        void this.migrateCurrentFile();
      }
    });
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    setLanguage(this.settings.language);
    await this.saveData(this.settings);
  }
  async tryOpenAsKanban(file) {
    if (this.markdownOverrides.has(file.path)) return;
    const cache = this.app.metadataCache.getFileCache(file);
    if (cache?.frontmatter?.["gongmyung-kanban"] !== "board") return;
    const leaf = this.app.workspace.getActiveViewOfType(import_obsidian6.MarkdownView)?.leaf;
    if (!leaf) return;
    await leaf.setViewState({
      type: VIEW_TYPE_KANBAN,
      state: { file: file.path }
    });
  }
  async createNewBoard(name) {
    const columns = this.settings.defaultColumns;
    const frontmatter = buildFrontmatter(columns);
    const headings = columns.map((col) => `## ${col.name}
`).join("\n");
    const content = `${frontmatter}
${headings}`;
    const activeFile = this.app.workspace.getActiveFile();
    const folder = activeFile?.parent?.path ?? "";
    const path = folder ? `${folder}/${name}.md` : `${name}.md`;
    const file = await this.app.vault.create(path, content);
    const leaf = this.app.workspace.getMostRecentLeaf() ?? this.app.workspace.getLeaf(true);
    await leaf.openFile(file);
    new import_obsidian6.Notice(t("notice.board_created", { name }));
  }
  async migrateCurrentFile() {
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      new import_obsidian6.Notice(t("notice.no_active_file"));
      return;
    }
    const content = await this.app.vault.read(file);
    if (!content.includes("kanban-plugin")) {
      new import_obsidian6.Notice(t("notice.not_kanban"));
      return;
    }
    if (content.includes("gongmyung-kanban")) {
      new import_obsidian6.Notice(t("notice.already_migrated"));
      return;
    }
    const migrated = migrateFromObsidianKanban(content);
    await this.app.vault.modify(file, migrated);
    new import_obsidian6.Notice(t("notice.migrated", { name: file.basename }));
    const leaf = this.app.workspace.getActiveViewOfType(import_obsidian6.MarkdownView)?.leaf ?? this.app.workspace.getMostRecentLeaf();
    if (leaf) {
      await leaf.openFile(file);
    }
  }
};
function buildFrontmatter(columns) {
  const lines = ["---", "gongmyung-kanban: board", "columns:"];
  for (const col of columns) {
    let line = `  - { name: "${col.name}", type: ${col.type}`;
    if (col.wip) line += `, wip: ${col.wip}`;
    line += " }";
    lines.push(line);
  }
  lines.push("---");
  return lines.join("\n");
}
