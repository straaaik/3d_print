import { PageTheme } from '../types';

export const productsTheme: PageTheme = {
  id: 'products',
  name: 'Товары',
  accentHex: '#f59e0b',
  checkboxVariant: 'amber',
  tooltipAccent: 'orange',
  spinnerBorder: 'border-t-amber-500',
  nav: {
    activeGradient: 'from-amber-500 to-yellow-400',
    activeShadow: 'shadow-amber-500/30',
  },
  primaryButton: {
    gradient: 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-yellow-400 hover:to-amber-400',
    text: 'text-black font-bold',
    shadow: 'shadow-md shadow-amber-500/20',
    solid: 'bg-amber-500 hover:bg-amber-600 text-black font-bold',
  },
  filterButton: {
    active: 'bg-amber-500/20 text-white border border-amber-500/50 shadow-sm',
    badgeActive: 'bg-amber-500 text-black font-extrabold',
    iconActive: 'text-amber-400',
  },
  badge: {
    subtle: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
    solid: 'bg-amber-500 text-black font-bold',
    dashed: 'border-dashed border-amber-500/60 text-amber-400',
  },
  accent: {
    text: 'text-amber-400',
    textHover: 'hover:text-amber-400',
    textLight: 'text-amber-300',
    bgSubtle: 'bg-amber-500/10',
    borderSubtle: 'border-amber-500/30',
    borderHover: 'hover:border-amber-500/40',
    borderFocus: 'border-amber-500 focus:ring-1 focus:ring-amber-500',
  },
  card: {
    highlight: 'bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/30',
    borderLeft: 'border-l-4 border-amber-500/60 bg-gradient-to-r from-amber-500/5 via-transparent to-transparent',
  },
};
