import { App, PluginSettingTab, Setting } from 'obsidian';
import type GongmyungKanbanPlugin from './main';
import { t } from './i18n';

export class GKSettingsTab extends PluginSettingTab {
  private plugin: GongmyungKanbanPlugin;

  constructor(app: App, plugin: GongmyungKanbanPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // ─── Aging ───
    containerEl.createEl('h3', { text: t('settings.aging_section') });

    new Setting(containerEl)
      .setName(t('settings.aging_warm'))
      .setDesc(t('settings.aging_warm_desc'))
      .addText(text => text
        .setValue(String(this.plugin.settings.agingWarm))
        .onChange(async (val) => {
          const n = parseInt(val, 10);
          if (!isNaN(n) && n > 0) {
            this.plugin.settings.agingWarm = n;
            await this.plugin.saveSettings();
          }
        }));

    new Setting(containerEl)
      .setName(t('settings.aging_hot'))
      .setDesc(t('settings.aging_hot_desc'))
      .addText(text => text
        .setValue(String(this.plugin.settings.agingHot))
        .onChange(async (val) => {
          const n = parseInt(val, 10);
          if (!isNaN(n) && n > 0) {
            this.plugin.settings.agingHot = n;
            await this.plugin.saveSettings();
          }
        }));

    new Setting(containerEl)
      .setName(t('settings.aging_critical'))
      .setDesc(t('settings.aging_critical_desc'))
      .addText(text => text
        .setValue(String(this.plugin.settings.agingCritical))
        .onChange(async (val) => {
          const n = parseInt(val, 10);
          if (!isNaN(n) && n > 0) {
            this.plugin.settings.agingCritical = n;
            await this.plugin.saveSettings();
          }
        }));

    // ─── Display ───
    containerEl.createEl('h3', { text: t('settings.display_section') });

    new Setting(containerEl)
      .setName(t('settings.show_archive'))
      .setDesc(t('settings.show_archive_desc'))
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showArchive)
        .onChange(async (val) => {
          this.plugin.settings.showArchive = val;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName(t('settings.date_format'))
      .setDesc(t('settings.date_format_desc'))
      .addDropdown(drop => drop
        .addOption('yyyy-mm-dd', 'YYYY-MM-DD')
        .addOption('relative', 'Relative (D-3, D-Day)')
        .addOption('mm/dd', 'MM/DD')
        .setValue(this.plugin.settings.dateFormat)
        .onChange(async (val) => {
          this.plugin.settings.dateFormat = val as 'yyyy-mm-dd' | 'relative' | 'mm/dd';
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName(t('settings.language'))
      .setDesc(t('settings.language_desc'))
      .addDropdown(drop => drop
        .addOption('auto', 'Auto')
        .addOption('ko', '한국어')
        .addOption('en', 'English')
        .setValue(this.plugin.settings.language)
        .onChange(async (val) => {
          this.plugin.settings.language = val as 'ko' | 'en' | 'auto';
          await this.plugin.saveSettings();
        }));

    // ─── Badges ───
    containerEl.createEl('h3', { text: t('settings.badges_section') });

    new Setting(containerEl)
      .setName(t('settings.show_aging_badge'))
      .setDesc(t('settings.show_aging_badge_desc'))
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showAgingBadge)
        .onChange(async (val) => {
          this.plugin.settings.showAgingBadge = val;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName(t('settings.show_due_date_badge'))
      .setDesc(t('settings.show_due_date_badge_desc'))
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showDueDateBadge)
        .onChange(async (val) => {
          this.plugin.settings.showDueDateBadge = val;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName(t('settings.show_cycle_time'))
      .setDesc(t('settings.show_cycle_time_desc'))
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showCycleTime)
        .onChange(async (val) => {
          this.plugin.settings.showCycleTime = val;
          await this.plugin.saveSettings();
        }));

    // ─── Default Columns ───
    containerEl.createEl('h3', { text: t('settings.defaults_section') });

    new Setting(containerEl)
      .setName(t('settings.default_columns'))
      .setDesc(t('settings.default_columns_desc'))
      .addTextArea(text => {
        text.inputEl.rows = 8;
        text.inputEl.cols = 40;
        text.inputEl.style.fontFamily = 'monospace';
        text.inputEl.style.fontSize = '12px';
        text
          .setValue(JSON.stringify(this.plugin.settings.defaultColumns, null, 2))
          .onChange(async (val) => {
            try {
              const parsed = JSON.parse(val);
              if (Array.isArray(parsed) && parsed.length > 0) {
                this.plugin.settings.defaultColumns = parsed;
                await this.plugin.saveSettings();
                text.inputEl.style.borderColor = '';
              }
            } catch {
              text.inputEl.style.borderColor = 'var(--text-error)';
            }
          });
      });
  }
}
