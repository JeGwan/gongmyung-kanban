# Gongmyung Kanban

Lifecycle-tracking kanban boards with aging badges, WIP limits, and automatic timestamp tracking.

![Screenshot](docs/screenshot.png)

## Features

- **Lifecycle timestamps** — Automatically tracks `created`, `started`, and `completed` dates as cards move between columns.
- **Aging badges** — Visual indicators (warm/hot/critical) show how long a card has been in its current column.
- **WIP limits** — Set per-column work-in-progress limits with visual warnings when exceeded.
- **Drag and drop** — Move cards between columns with automatic lifecycle transitions.
- **Due dates** — Type `@{YYYY-MM-DD}` in a card to set a due date. A calendar picker appears when you type `@`.
- **Cycle time** — Completed cards display total days from creation to completion.
- **Plain markdown** — Board state is stored as standard markdown. No proprietary format, no database.
- **Migration** — One-click migration from the obsidian-kanban plugin format.
- **Configurable** — Aging thresholds, default columns, badge visibility, date format, and language (English/Korean) are all configurable.

## Installation

### Community Plugins (recommended)

1. Open **Settings → Community Plugins → Browse**
2. Search for **Gongmyung Kanban**
3. Click **Install**, then **Enable**

### Manual

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/JeGwan/gongmyung-kanban/releases/latest).
2. Create a folder `.obsidian/plugins/gongmyung-kanban/` in your vault.
3. Copy the three files into that folder.
4. Reload and enable the plugin.

## Usage

### Creating a board

Use the command palette: **Gongmyung Kanban: Create new kanban board**

This creates a markdown file with kanban frontmatter and opens it in board view.

### Column types

Each column has a type that determines lifecycle behavior:

| Type | Purpose | Timestamp effect |
|------|---------|-----------------|
| `inbox` | New tasks land here | Sets `created` |
| `active` | Work in progress | Sets `started` |
| `done` | Completed tasks | Sets `completed` |
| `hold` | Paused tasks | No change |

### Card syntax

Cards are standard markdown checkboxes with optional metadata:

```markdown
- [ ] Task title #tag1 #tag2
	Body text or description
	@{2026-04-15}
	출처: [[Related Note]]
	⏱{created:2026-03-20|started:2026-03-21}
```

- `@{YYYY-MM-DD}` — Due date (calendar picker appears when you type `@`)
- `출처: [[...]]` — Source wiki-link displayed at the top of the card
- `⏱{...}` — Lifecycle timestamps (managed automatically)
- `#tag` — Tags extracted from the title

### Editing cards

- **Double-click** a card to edit its title and body inline.
- **Right-click** a card for a context menu (move to column, delete).
- Click the **+** button on a column header to add a new card.

## Commands

| Command | Description | Availability |
|---------|-------------|-------------|
| Create new kanban board | Creates a new board file with default columns | Always |
| Open as kanban board | Switch from markdown view to kanban view | When a kanban file is open in markdown mode |
| Open as markdown | Switch from kanban view to markdown source | When a kanban board is active |
| Archive completed cards | Move all done cards to the archive section | When a kanban board is active |
| Migrate from obsidian-kanban format | Convert an obsidian-kanban board to Gongmyung format | Always |

## Settings

Access settings via **Settings → Community Plugins → Gongmyung Kanban**.

### Aging badges

Configure the number of days before each aging level appears:

- **Warm** (yellow) — default 4 days
- **Hot** (orange) — default 8 days
- **Critical** (red) — default 15 days

### Display

- **Show archive** — Toggle the archive section at the bottom of boards.
- **Date format** — Choose between `YYYY-MM-DD`, `MM/DD`, or relative format.
- **Language** — English, Korean, or auto-detect.

### Badge visibility

Toggle each badge type independently:
- Aging badges
- Due date badges
- Cycle time badges

### New board defaults

Configure the default column layout (names, types, WIP limits) used when creating new boards via the command palette.

## Board format

Boards are plain markdown files with YAML frontmatter:

```yaml
---
gongmyung-kanban: board
columns:
  - { name: "📥 Inbox", type: inbox }
  - { name: "🔄 Active", type: active, wip: 3 }
  - { name: "✅ Done", type: done }
  - { name: "⏸ Hold", type: hold }
---
```

Column headings use `##`:

```markdown
## 📥 Inbox

- [ ] First task
- [ ] Second task

## 🔄 Active

- [ ] In-progress task

## ✅ Done

- [x] Completed task

## Archive

- [x] Old completed task
```

## Migrating from obsidian-kanban

1. Open your existing kanban board file.
2. Run the command **Gongmyung Kanban: Migrate from obsidian-kanban format**.
3. The file will be converted in place and opened in kanban view.

The migration:
- Converts `kanban-plugin: board` frontmatter to `gongmyung-kanban: board` with column definitions.
- Adds lifecycle timestamps to all existing cards.
- Removes the `%% kanban:settings %%` block.

## License

[MIT](LICENSE)
