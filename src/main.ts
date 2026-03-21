import { Plugin, WorkspaceLeaf, MarkdownView, TFile, Notice } from 'obsidian';
import { KanbanView, VIEW_TYPE_KANBAN } from './view';
import { migrateFromObsidianKanban } from './migrate';
import { GKSettings, DEFAULT_SETTINGS, ColumnConfig } from './settings';
import { GKSettingsTab } from './settings-tab';
import { CreateBoardModal } from './modal';
import { setLanguage, t } from './i18n';

export default class GongmyungKanbanPlugin extends Plugin {
  settings: GKSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    await this.loadSettings();
    setLanguage(this.settings.language);

    this.addSettingTab(new GKSettingsTab(this.app, this));

    this.registerView(VIEW_TYPE_KANBAN, (leaf: WorkspaceLeaf) => new KanbanView(leaf, this));

    // Intercept file-open for .md files with gongmyung-kanban frontmatter
    this.registerEvent(
      this.app.workspace.on('file-open', (file: TFile | null) => {
        if (!file || file.extension !== 'md') return;
        void this.tryOpenAsKanban(file);
      })
    );

    // Intercept layout-change to catch tabs restored from previous session
    this.registerEvent(
      this.app.workspace.on('layout-change', () => {
        const file = this.app.workspace.getActiveFile();
        if (!file || file.extension !== 'md') return;
        const leaf = this.app.workspace.getActiveViewOfType(MarkdownView)?.leaf;
        if (!leaf) return;
        void this.tryOpenAsKanban(file);
      })
    );

    // ─── Commands ───

    this.addCommand({
      id: 'create-new-board',
      name: 'Create new kanban board',
      callback: () => {
        new CreateBoardModal(this.app, (name) => {
          void this.createNewBoard(name);
        }).open();
      },
    });

    this.addCommand({
      id: 'open-as-kanban',
      name: 'Open as kanban board',
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!file) return false;
        const cache = this.app.metadataCache.getFileCache(file);
        if (cache?.frontmatter?.['gongmyung-kanban'] !== 'board') return false;
        // Only show when NOT already in kanban view
        const view = this.app.workspace.getActiveViewOfType(KanbanView);
        if (view) return false;
        if (checking) return true;
        const leaf = this.app.workspace.getMostRecentLeaf();
        if (leaf) {
          void leaf.setViewState({
            type: VIEW_TYPE_KANBAN,
            state: { file: file.path },
          });
        }
        return true;
      },
    });

    this.addCommand({
      id: 'open-as-markdown',
      name: 'Open as markdown',
      checkCallback: (checking) => {
        const view = this.app.workspace.getActiveViewOfType(KanbanView);
        if (!view) return false;
        if (checking) return true;
        const leaf = view.leaf;
        const file = view.file;
        if (leaf && file) {
          void leaf.setViewState({
            type: 'markdown',
            state: { file: file.path },
          });
        }
        return true;
      },
    });

    this.addCommand({
      id: 'archive-done-cards',
      name: 'Archive completed cards',
      checkCallback: (checking) => {
        const view = this.app.workspace.getActiveViewOfType(KanbanView);
        if (!view) return false;
        if (checking) return true;
        view.archiveDoneCards();
        return true;
      },
    });

    this.addCommand({
      id: 'migrate-from-obsidian-kanban',
      name: 'Migrate from obsidian-kanban format',
      callback: () => { void this.migrateCurrentFile(); },
    });
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    setLanguage(this.settings.language);
    await this.saveData(this.settings);
  }

  private async tryOpenAsKanban(file: TFile): Promise<void> {
    const cache = this.app.metadataCache.getFileCache(file);
    if (cache?.frontmatter?.['gongmyung-kanban'] !== 'board') return;

    const leaf = this.app.workspace.getActiveViewOfType(MarkdownView)?.leaf;
    if (!leaf) return;

    await leaf.setViewState({
      type: VIEW_TYPE_KANBAN,
      state: { file: file.path },
    });
  }

  private async createNewBoard(name: string): Promise<void> {
    const columns = this.settings.defaultColumns;
    const frontmatter = buildFrontmatter(columns);
    const headings = columns.map(col => `## ${col.name}\n`).join('\n');
    const content = `${frontmatter}\n${headings}`;

    // Create in active folder or vault root
    const activeFile = this.app.workspace.getActiveFile();
    const folder = activeFile?.parent?.path ?? '';
    const path = folder ? `${folder}/${name}.md` : `${name}.md`;

    const file = await this.app.vault.create(path, content);
    const leaf = this.app.workspace.getMostRecentLeaf() ?? this.app.workspace.getLeaf(true);
    await leaf.openFile(file);
    new Notice(t('notice.board_created', { name }));
  }

  private async migrateCurrentFile(): Promise<void> {
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      new Notice(t('notice.no_active_file'));
      return;
    }

    const content = await this.app.vault.read(file);
    if (!content.includes('kanban-plugin')) {
      new Notice(t('notice.not_kanban'));
      return;
    }

    if (content.includes('gongmyung-kanban')) {
      new Notice(t('notice.already_migrated'));
      return;
    }

    const migrated = migrateFromObsidianKanban(content);
    await this.app.vault.modify(file, migrated);
    new Notice(t('notice.migrated', { name: file.basename }));

    // Reopen the file to trigger kanban view
    const leaf = this.app.workspace.getActiveViewOfType(MarkdownView)?.leaf
      ?? this.app.workspace.getMostRecentLeaf();
    if (leaf) {
      await leaf.openFile(file);
    }
  }
}

function buildFrontmatter(columns: ColumnConfig[]): string {
  const lines = ['---', 'gongmyung-kanban: board', 'columns:'];
  for (const col of columns) {
    let line = `  - { name: "${col.name}", type: ${col.type}`;
    if (col.wip) line += `, wip: ${col.wip}`;
    line += ' }';
    lines.push(line);
  }
  lines.push('---');
  return lines.join('\n');
}
