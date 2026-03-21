type LangKey = 'ko' | 'en';

const strings: Record<string, Record<LangKey, string>> = {
  // Action buttons
  'action.archive': {
    ko: '완료 카드 아카이브',
    en: 'Archive completed cards',
  },
  'action.toggle_archive': {
    ko: '아카이브 컬럼 토글',
    en: 'Toggle archive column',
  },
  'action.toggle_markdown': {
    ko: '문서 모드로 전환',
    en: 'Open as markdown',
  },

  // Notices
  'notice.wip_exceeded': {
    ko: '⚠️ WIP 제한 초과: {col} ({count}/{limit})',
    en: '⚠️ WIP limit exceeded: {col} ({count}/{limit})',
  },
  'notice.migrated': {
    ko: '✅ 마이그레이션 완료: {name}',
    en: '✅ Migrated: {name}',
  },
  'notice.no_active_file': {
    ko: '마이그레이션할 파일이 없습니다',
    en: 'No active file to migrate',
  },
  'notice.not_kanban': {
    ko: '이 파일은 obsidian-kanban 보드가 아닙니다',
    en: 'This file is not an obsidian-kanban board',
  },
  'notice.already_migrated': {
    ko: '이미 gongmyung-kanban 형식입니다',
    en: 'This file is already in gongmyung-kanban format',
  },
  'notice.board_created': {
    ko: '📋 보드 생성됨: {name}',
    en: '📋 Board created: {name}',
  },
  'notice.archived': {
    ko: '📦 {count}개 카드 아카이브됨',
    en: '📦 {count} cards archived',
  },
  'notice.nothing_to_archive': {
    ko: '아카이브할 완료 카드가 없습니다',
    en: 'No completed cards to archive',
  },

  // Placeholders
  'placeholder.new_card': {
    ko: '새 할일 입력... (Enter 저장, @ 마감일, Esc 취소)',
    en: 'New task... (Enter to save, @ for due date, Esc to cancel)',
  },
  'placeholder.header_memo': {
    ko: '좌우명, 다짐, 메모...',
    en: 'Motto, goals, notes...',
  },
  'placeholder.header_empty': {
    ko: '클릭하여 메모 추가...',
    en: 'Click to add a note...',
  },
  'placeholder.board_name': {
    ko: '보드 이름',
    en: 'Board name',
  },

  // Context menu
  'menu.delete': {
    ko: '삭제',
    en: 'Delete',
  },

  // Modal
  'modal.create_board_title': {
    ko: '새 칸반 보드 만들기',
    en: 'Create new kanban board',
  },
  'modal.create': {
    ko: '만들기',
    en: 'Create',
  },

  // Due date display
  'due.dday': {
    ko: 'D-Day',
    en: 'D-Day',
  },
  'due.overdue': {
    ko: '{days}일 지남',
    en: '{days}d overdue',
  },

  // Settings
  'settings.aging_section': {
    ko: '에이징 배지',
    en: 'Aging badges',
  },
  'settings.aging_warm': {
    ko: '주의 임계값 (일)',
    en: 'Warm threshold (days)',
  },
  'settings.aging_warm_desc': {
    ko: '이 일수 이상 컬럼에 머물면 노란색 배지 표시',
    en: 'Show yellow badge after this many days in a column',
  },
  'settings.aging_hot': {
    ko: '경고 임계값 (일)',
    en: 'Hot threshold (days)',
  },
  'settings.aging_hot_desc': {
    ko: '이 일수 이상 컬럼에 머물면 주황색 배지 표시',
    en: 'Show orange badge after this many days in a column',
  },
  'settings.aging_critical': {
    ko: '위험 임계값 (일)',
    en: 'Critical threshold (days)',
  },
  'settings.aging_critical_desc': {
    ko: '이 일수 이상 컬럼에 머물면 빨간색 배지 표시',
    en: 'Show red badge after this many days in a column',
  },
  'settings.display_section': {
    ko: '표시',
    en: 'Display',
  },
  'settings.show_archive': {
    ko: '아카이브 표시',
    en: 'Show archive',
  },
  'settings.show_archive_desc': {
    ko: '보드 하단에 아카이브된 카드 표시',
    en: 'Show archived cards at the bottom of each board',
  },
  'settings.date_format': {
    ko: '날짜 형식',
    en: 'Date format',
  },
  'settings.date_format_desc': {
    ko: '마감일 배지에 표시할 날짜 형식',
    en: 'Date format for due date badges',
  },
  'settings.language': {
    ko: '언어',
    en: 'Language',
  },
  'settings.language_desc': {
    ko: 'UI 텍스트 언어',
    en: 'Language for UI text',
  },
  'settings.badges_section': {
    ko: '배지',
    en: 'Badges',
  },
  'settings.show_cycle_time': {
    ko: '사이클 타임 배지',
    en: 'Cycle time badge',
  },
  'settings.show_cycle_time_desc': {
    ko: '완료 카드에 생성~완료 소요일 표시',
    en: 'Show days from creation to completion on done cards',
  },
  'settings.show_aging_badge': {
    ko: '에이징 배지',
    en: 'Aging badge',
  },
  'settings.show_aging_badge_desc': {
    ko: '컬럼 체류 기간 배지 표시',
    en: 'Show how long a card has been in the current column',
  },
  'settings.show_due_date_badge': {
    ko: '마감일 배지',
    en: 'Due date badge',
  },
  'settings.show_due_date_badge_desc': {
    ko: '마감일 카운트다운 배지 표시',
    en: 'Show due date countdown badge',
  },
  'settings.defaults_section': {
    ko: '새 보드 기본값',
    en: 'New board defaults',
  },
  'settings.default_columns': {
    ko: '기본 컬럼',
    en: 'Default columns',
  },
  'settings.default_columns_desc': {
    ko: '새 보드 생성 시 사용할 기본 컬럼 구성 (JSON)',
    en: 'Default column configuration for new boards (JSON)',
  },
};

let currentLang: LangKey = 'en';

export function setLanguage(lang: 'ko' | 'en' | 'auto'): void {
  if (lang === 'auto') {
    // Use Obsidian's locale or navigator
    const locale = navigator.language?.slice(0, 2);
    currentLang = locale === 'ko' ? 'ko' : 'en';
  } else {
    currentLang = lang;
  }
}

export function t(key: string, vars?: Record<string, string | number>): string {
  const entry = strings[key];
  if (!entry) return key;
  let text = entry[currentLang] ?? entry['en'] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }
  return text;
}
