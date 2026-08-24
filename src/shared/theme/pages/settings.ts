import { PageTheme } from '../types';

export const settingsTheme: PageTheme = {
  id: 'settings',
  name: 'Настройки',
  accentHex: '#64748b',
  checkboxVariant: 'primary',
  tooltipAccent: 'gray',
  spinnerBorder: 'border-t-gray-400',
  nav: {
    activeGradient: 'from-gray-700 to-gray-600',
    activeShadow: 'shadow-gray-600/30',
  },
  primaryButton: {
    gradient: 'bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500',
    text: 'text-white font-bold',
    shadow: 'shadow-md shadow-gray-700/20',
    solid: 'bg-gray-700 hover:bg-gray-600 text-white font-bold',
  },
  filterButton: {
    active: 'bg-gray-700/40 text-white border border-gray-600 shadow-sm',
    badgeActive: 'bg-gray-600 text-white font-extrabold',
    iconActive: 'text-gray-300',
  },
  badge: {
    subtle: 'bg-gray-800 text-gray-300 border border-gray-700',
    solid: 'bg-gray-700 text-white font-bold',
    dashed: 'border-dashed border-gray-600 text-gray-400',
  },
  accent: {
    text: 'text-gray-400',
    textHover: 'hover:text-white',
    textLight: 'text-gray-300',
    bgSubtle: 'bg-gray-800/40',
    borderSubtle: 'border-gray-700',
    borderHover: 'hover:border-gray-500',
    borderFocus: 'border-gray-500 focus:ring-1 focus:ring-gray-500',
  },
  card: {
    highlight: 'bg-[#16181d] border border-[#242930]',
    borderLeft: 'border-l-4 border-gray-600 bg-gradient-to-r from-gray-700/10 via-transparent to-transparent',
  },
};
