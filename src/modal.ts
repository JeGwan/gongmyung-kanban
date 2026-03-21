import { App, Modal, Setting } from 'obsidian';
import { t } from './i18n';

export class CreateBoardModal extends Modal {
  private result: string = '';
  private onSubmit: (name: string) => void;

  constructor(app: App, onSubmit: (name: string) => void) {
    super(app);
    this.onSubmit = onSubmit;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: t('modal.create_board_title') });

    new Setting(contentEl)
      .setName(t('placeholder.board_name'))
      .addText(text => {
        text.setPlaceholder('My Board');
        text.onChange(val => { this.result = val; });
        // Submit on Enter
        text.inputEl.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Enter' && this.result.trim()) {
            e.preventDefault();
            this.close();
            this.onSubmit(this.result.trim());
          }
        });
        // Focus after render
        setTimeout(() => text.inputEl.focus(), 10);
      });

    new Setting(contentEl)
      .addButton(btn => btn
        .setButtonText(t('modal.create'))
        .setCta()
        .onClick(() => {
          if (this.result.trim()) {
            this.close();
            this.onSubmit(this.result.trim());
          }
        }));
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
