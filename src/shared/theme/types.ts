import { CheckboxVariant } from '../ui/Checkbox';

export interface PageTheme {
  id: string;
  name: string;

  /** Основной hex-код цвета темы (для PageHeader, Canvas, графиков) */
  accentHex: string;

  /** Вариант для компонента Checkbox */
  checkboxVariant: CheckboxVariant;

  /** Акцентный цвет для CustomTooltip */
  tooltipAccent: 'primary' | 'amber' | 'orange' | 'emerald' | 'purple' | 'rose' | 'gray';

  /** Tailwind классы для спиннера загрузки страницы */
  spinnerBorder: string;

  /** Стили для активного элемента в главной навигации (MainNavbar) */
  nav: {
    activeGradient: string;
    activeShadow: string;
  };

  /** Стили для главных кнопок действия */
  primaryButton: {
    gradient: string;
    text: string;
    shadow: string;
    solid: string;
  };

  /** Стили для кнопок-переключателей / фильтров */
  filterButton: {
    active: string;
    badgeActive: string;
    iconActive: string;
  };

  /** Стили для бейджей, тегов и чипсов */
  badge: {
    subtle: string;
    solid: string;
    dashed: string;
  };

  /** Цвета для иконок и текстовых акцентов */
  accent: {
    text: string;
    textHover: string;
    textLight: string;
    bgSubtle: string;
    borderSubtle: string;
    borderHover: string;
    borderFocus: string;
  };

  /** Стили карточек / секций */
  card: {
    highlight: string;
    borderLeft: string;
  };
}
