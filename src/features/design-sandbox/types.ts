export interface DrawerDesignConfig {
  // 1. Контейнер выпадающего блока
  drawerBg: string;
  drawerBorderColor: string;
  drawerBorderWidth: number; // px
  drawerPadding: number; // px
  drawerRadius: number; // px
  sectionGap: number; // px

  // 2. Карточки / Блоки (Разделы 01, 02, 03, 04)
  cardBg: string;
  cardBorderColor: string;
  cardBorderWidth: number; // px
  cardRadius: number; // px
  cardPadding: number; // px
  cardDividerColor: string;

  // 3. Заголовки разделов (РАЗДЕЛ 01 · ...)
  headerFontSize: number; // px
  headerTextColor: string;
  headerTracking: number; // px
  headerFontWeight: 'normal' | 'medium' | 'semibold' | 'bold';

  // 4. Раздел 01: Бейджи и Название
  orderNumberBg: string;
  orderNumberColor: string;
  orderNumberBorder: string;

  badgeExpenseBg: string;
  badgeExpenseColor: string;
  badgeExpenseBorder: string;

  badgeIncomeBg: string;
  badgeIncomeColor: string;
  badgeIncomeBorder: string;

  badgeRadius: number; // px

  titleFontSize: number; // px
  titleColor: string;
  titlePlaceholderColor: string;
  titleFontWeight: 'light' | 'normal' | 'medium' | 'semibold';

  dateButtonBg: string;
  dateButtonBorder: string;
  dateButtonColor: string;
  dateButtonRadius: number; // px

  // 5. Раздел 02: Категории затрат
  searchBg: string;
  searchBorder: string;
  searchTextColor: string;
  searchPlaceholderColor: string;
  searchRadius: number; // px

  categoryColumns: number; // 2, 3, 4
  categoryFontSize: number; // px
  categoryInactiveColor: string;
  categoryHoverColor: string;
  categoryActiveColor: string;
  categoryUnderlineColor: string;
  categoryGapX: number; // px
  categoryGapY: number; // px

  addCategoryColor: string;
  addCategoryHoverColor: string;

  // 6. Раздел 03: Сумма и Списание
  amountFontSize: number; // px
  amountColor: string;
  amountFontWeight: 'light' | 'normal' | 'medium' | 'semibold' | 'bold';
  amountSuffixColor: string;
  amountSuffixFontSize: number; // px

  presetActiveBg: string;
  presetActiveColor: string;
  presetActiveBorder: string;

  presetInactiveBg: string;
  presetInactiveColor: string;
  presetInactiveBorder: string;
  presetRadius: number; // px

  financeLabelColor: string;
  financeValueColor: string;
  statusLabelColor: string;
  statusValueColor: string;

  // 7. Раздел 04: Заметки и трекинг
  notesFontSize: number; // px
  notesColor: string;
  notesPlaceholderColor: string;
  notesMinHeight: number; // px
}

export interface DesignPreset {
  id: string;
  name: string;
  description: string;
  config: DrawerDesignConfig;
  isCustom?: boolean;
}
