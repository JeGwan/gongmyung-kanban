import { el } from './components';

/**
 * Date picker popover triggered by '@' in textarea.
 * Arrow keys to navigate, Enter to select, Esc to close.
 */
export class DatePicker {
  private containerEl: HTMLElement;
  private selectedDate: Date;
  private onSelect: (dateStr: string) => void;
  private onClose: () => void;

  constructor(opts: {
    anchorEl: HTMLElement;
    onSelect: (dateStr: string) => void;
    onClose: () => void;
  }) {
    this.selectedDate = new Date();
    this.onSelect = opts.onSelect;
    this.onClose = opts.onClose;

    this.containerEl = el('div', { class: 'gk-date-picker' });

    // Position near anchor
    const rect = opts.anchorEl.getBoundingClientRect();
    this.containerEl.style.position = 'fixed';
    this.containerEl.style.left = `${rect.left}px`;
    this.containerEl.style.top = `${rect.bottom + 4}px`;
    this.containerEl.style.zIndex = '1000';

    this.render();
    document.body.appendChild(this.containerEl);

    // Close on outside click
    setTimeout(() => {
      document.addEventListener('mousedown', this.handleOutsideClick);
    }, 0);
  }

  private handleOutsideClick = (e: MouseEvent) => {
    if (!this.containerEl.contains(e.target as Node)) {
      this.close();
    }
  };

  private render(): void {
    this.containerEl.empty();

    const year = this.selectedDate.getFullYear();
    const month = this.selectedDate.getMonth();

    // Header: < Month Year >
    const header = el('div', { class: 'gk-dp-header' });

    const prevBtn = el('button', { class: 'gk-dp-nav', text: '‹' });
    prevBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.selectedDate.setMonth(month - 1);
      this.render();
    });
    header.appendChild(prevBtn);

    const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
    header.appendChild(el('span', { class: 'gk-dp-title', text: `${year}년 ${monthNames[month]}` }));

    const nextBtn = el('button', { class: 'gk-dp-nav', text: '›' });
    nextBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.selectedDate.setMonth(month + 1);
      this.render();
    });
    header.appendChild(nextBtn);

    this.containerEl.appendChild(header);

    // Day labels
    const dayLabels = el('div', { class: 'gk-dp-days-header' });
    for (const d of ['일', '월', '화', '수', '목', '금', '토']) {
      dayLabels.appendChild(el('span', { class: 'gk-dp-day-label', text: d }));
    }
    this.containerEl.appendChild(dayLabels);

    // Calendar grid
    const grid = el('div', { class: 'gk-dp-grid' });
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const todayStr = this.formatDate(today);
    const selectedStr = this.formatDate(this.selectedDate);

    // Empty cells for days before month start
    for (let i = 0; i < firstDay; i++) {
      grid.appendChild(el('span', { class: 'gk-dp-cell gk-dp-empty' }));
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = this.formatDate(date);
      const cell = el('button', { class: 'gk-dp-cell', text: String(day) });

      if (dateStr === todayStr) cell.classList.add('gk-dp-today');
      if (dateStr === selectedStr) cell.classList.add('gk-dp-selected');

      cell.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.onSelect(dateStr);
        this.close();
      });

      grid.appendChild(cell);
    }

    this.containerEl.appendChild(grid);

    // Quick select buttons
    const quick = el('div', { class: 'gk-dp-quick' });
    const shortcuts = [
      { label: '오늘', days: 0 },
      { label: '내일', days: 1 },
      { label: '이번주 금', days: this.daysUntilFriday() },
      { label: '다음주 월', days: this.daysUntilNextMonday() },
    ];
    for (const s of shortcuts) {
      const btn = el('button', { class: 'gk-dp-quick-btn', text: s.label });
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const d = new Date();
        d.setDate(d.getDate() + s.days);
        this.onSelect(this.formatDate(d));
        this.close();
      });
      quick.appendChild(btn);
    }
    this.containerEl.appendChild(quick);
  }

  handleKeydown(e: KeyboardEvent): boolean {
    const day = this.selectedDate.getDate();

    switch (e.key) {
      case 'ArrowLeft':
        this.selectedDate.setDate(day - 1);
        this.render();
        return true;
      case 'ArrowRight':
        this.selectedDate.setDate(day + 1);
        this.render();
        return true;
      case 'ArrowUp':
        this.selectedDate.setDate(day - 7);
        this.render();
        return true;
      case 'ArrowDown':
        this.selectedDate.setDate(day + 7);
        this.render();
        return true;
      case 'Enter':
        this.onSelect(this.formatDate(this.selectedDate));
        this.close();
        return true;
      case 'Escape':
        this.close();
        return true;
      default:
        return false;
    }
  }

  close(): void {
    document.removeEventListener('mousedown', this.handleOutsideClick);
    this.containerEl.remove();
    this.onClose();
  }

  private formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private daysUntilFriday(): number {
    const today = new Date().getDay();
    return today <= 5 ? 5 - today : 5 + 7 - today;
  }

  private daysUntilNextMonday(): number {
    const today = new Date().getDay();
    return today === 0 ? 1 : 8 - today;
  }
}
