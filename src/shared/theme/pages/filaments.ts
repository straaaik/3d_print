import { PageTheme } from '../types';

export const filamentsTheme: PageTheme = {
  id: 'filaments',
  name: 'Филаменты',
  accentHex: '#8b5cf6',
  checkboxVariant: 'purple',
  tooltipAccent: 'purple',
  spinnerBorder: 'border-t-violet-500',
  nav: {
    activeGradient: 'from-violet-600 to-violet-500',
    activeShadow: 'shadow-violet-500/30',
  },
  primaryButton: {
    gradient: 'bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400',
    text: 'text-white font-bold',
    shadow: 'shadow-md shadow-violet-500/20',
    solid: 'bg-violet-500 hover:bg-violet-600 text-white font-bold',
  },
  filterButton: {
    active: 'bg-violet-500/20 text-white border border-violet-500/50 shadow-sm',
    badgeActive: 'bg-violet-500 text-white font-extrabold',
    iconActive: 'text-violet-400',
  },
  badge: {
    subtle: 'bg-violet-500/15 text-violet-300 border border-violet-500/30',
    solid: 'bg-violet-500 text-white font-bold',
    dashed: 'border-dashed border-violet-500/60 text-violet-400',
  },
  accent: {
    text: 'text-violet-400',
    textHover: 'hover:text-violet-400',
    textLight: 'text-violet-300',
    bgSubtle: 'bg-violet-500/10',
    borderSubtle: 'border-violet-500/30',
    borderHover: 'hover:border-violet-500/40',
    borderFocus: 'border-violet-500 focus:ring-1 focus:ring-violet-500',
  },
  card: {
    highlight: 'bg-gradient-to-br from-violet-500/15 via-violet-500/5 to-transparent border border-violet-500/30',
    borderLeft: 'border-l-4 border-violet-500 bg-gradient-to-r from-violet-500/5 via-transparent to-transparent',
  },
};
