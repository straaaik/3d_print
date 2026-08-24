import { PageTheme } from '../types';

export const printersTheme: PageTheme = {
  id: 'printers',
  name: 'Принтеры',
  accentHex: '#38bdf8',
  checkboxVariant: 'primary',
  tooltipAccent: 'primary',
  spinnerBorder: 'border-t-sky-400',
  nav: {
    activeGradient: 'from-sky-600 to-sky-400',
    activeShadow: 'shadow-sky-400/30',
  },
  primaryButton: {
    gradient: 'bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400',
    text: 'text-white font-bold',
    shadow: 'shadow-md shadow-sky-500/20',
    solid: 'bg-sky-500 hover:bg-sky-600 text-white font-bold',
  },
  filterButton: {
    active: 'bg-sky-500/20 text-white border border-sky-500/50 shadow-sm',
    badgeActive: 'bg-sky-500 text-black font-extrabold',
    iconActive: 'text-sky-400',
  },
  badge: {
    subtle: 'bg-sky-500/15 text-sky-300 border border-sky-500/30',
    solid: 'bg-sky-500 text-black font-bold',
    dashed: 'border-dashed border-sky-500/60 text-sky-400',
  },
  accent: {
    text: 'text-sky-400',
    textHover: 'hover:text-sky-400',
    textLight: 'text-sky-300',
    bgSubtle: 'bg-sky-500/10',
    borderSubtle: 'border-sky-500/30',
    borderHover: 'hover:border-sky-500/40',
    borderFocus: 'border-sky-500 focus:ring-1 focus:ring-sky-500',
  },
  card: {
    highlight: 'bg-gradient-to-br from-sky-500/15 via-sky-500/5 to-transparent border border-sky-500/30',
    borderLeft: 'border-l-4 border-sky-500 bg-gradient-to-r from-sky-500/5 via-transparent to-transparent',
  },
};
