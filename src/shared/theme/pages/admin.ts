import { PageTheme } from '../types';

export const adminTheme: PageTheme = {
  id: 'admin',
  name: 'Админка',
  accentHex: '#8b5cf6',
  checkboxVariant: 'purple',
  tooltipAccent: 'purple',
  spinnerBorder: 'border-t-purple-500',
  nav: {
    activeGradient: 'from-purple-600 to-indigo-600',
    activeShadow: 'shadow-purple-500/30',
  },
  primaryButton: {
    gradient: 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500',
    text: 'text-white font-bold',
    shadow: 'shadow-md shadow-purple-600/25',
    solid: 'bg-purple-600 hover:bg-purple-500 text-white font-bold',
  },
  filterButton: {
    active: 'bg-purple-600/30 text-purple-300 border border-purple-500/50 shadow-sm shadow-purple-500/20',
    badgeActive: 'bg-purple-500 text-white font-extrabold',
    iconActive: 'text-purple-400',
  },
  badge: {
    subtle: 'bg-purple-950/60 text-purple-300 border border-purple-800/60',
    solid: 'bg-purple-600 text-white font-bold',
    dashed: 'border-dashed border-purple-500/60 text-purple-300',
  },
  accent: {
    text: 'text-purple-400',
    textHover: 'hover:text-purple-300',
    textLight: 'text-purple-300',
    bgSubtle: 'bg-purple-950/40',
    borderSubtle: 'border-purple-800/40',
    borderHover: 'hover:border-purple-500/60',
    borderFocus: 'border-purple-500 focus:ring-1 focus:ring-purple-500',
  },
  card: {
    highlight: 'bg-[#181524] border border-purple-900/40 hover:border-purple-700/50 shadow-xl shadow-purple-950/20',
    borderLeft: 'border-l-4 border-purple-500 bg-gradient-to-r from-purple-950/30 via-transparent to-transparent',
  },
};
