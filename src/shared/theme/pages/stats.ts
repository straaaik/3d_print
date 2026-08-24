import { PageTheme } from '../types';

export const statsTheme: PageTheme = {
  id: 'stats',
  name: 'Статистика',
  accentHex: '#10B981',
  checkboxVariant: 'emerald',
  tooltipAccent: 'emerald',
  spinnerBorder: 'border-t-emerald-500',
  nav: {
    activeGradient: 'from-emerald-600 to-emerald-500',
    activeShadow: 'shadow-emerald-500/30',
  },
  primaryButton: {
    gradient: 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400',
    text: 'text-white font-bold',
    shadow: 'shadow-md shadow-emerald-500/20',
    solid: 'bg-emerald-500 hover:bg-emerald-600 text-white font-bold',
  },
  filterButton: {
    active: 'bg-emerald-500/20 text-white border border-emerald-500/50 shadow-sm',
    badgeActive: 'bg-emerald-500 text-black font-extrabold',
    iconActive: 'text-emerald-400',
  },
  badge: {
    subtle: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
    solid: 'bg-emerald-500 text-black font-bold',
    dashed: 'border-dashed border-emerald-500/60 text-emerald-400',
  },
  accent: {
    text: 'text-emerald-400',
    textHover: 'hover:text-emerald-400',
    textLight: 'text-emerald-300',
    bgSubtle: 'bg-emerald-500/10',
    borderSubtle: 'border-emerald-500/30',
    borderHover: 'hover:border-emerald-500/40',
    borderFocus: 'border-emerald-500 focus:ring-1 focus:ring-emerald-500',
  },
  card: {
    highlight: 'bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent border border-emerald-500/30',
    borderLeft: 'border-l-4 border-emerald-500 bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent',
  },
};
