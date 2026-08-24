import { PageTheme } from '../types';

export const ordersTheme: PageTheme = {
  id: 'orders',
  name: 'Заказы',
  accentHex: '#FF6B00',
  checkboxVariant: 'orange',
  tooltipAccent: 'orange',
  spinnerBorder: 'border-t-[#FF5500]',
  nav: {
    activeGradient: 'from-[#FF5500] to-[#FF8800]',
    activeShadow: 'shadow-[#FF6B00]/30',
  },
  primaryButton: {
    gradient: 'bg-gradient-to-r from-[#FF5500] to-[#FF8800] hover:from-[#FF6600] hover:to-[#FF9900]',
    text: 'text-white font-bold',
    shadow: 'shadow-md shadow-[#FF6B00]/20',
    solid: 'bg-[#FF5500] hover:bg-[#FF6600] text-white font-bold',
  },
  filterButton: {
    active: 'bg-[#FF6B00]/20 text-white border border-[#FF6B00]/50 shadow-sm',
    badgeActive: 'bg-[#FF6B00] text-white font-extrabold',
    iconActive: 'text-[#FF8800]',
  },
  badge: {
    subtle: 'bg-[#FF6B00]/15 text-orange-300 border border-[#FF6B00]/30',
    solid: 'bg-[#FF6B00] text-white font-bold',
    dashed: 'border-dashed border-[#FF6B00]/60 text-orange-400',
  },
  accent: {
    text: 'text-[#FF8800]',
    textHover: 'hover:text-[#FF8800]',
    textLight: 'text-orange-300',
    bgSubtle: 'bg-[#FF6B00]/10',
    borderSubtle: 'border-[#FF6B00]/30',
    borderHover: 'hover:border-[#FF6B00]/40',
    borderFocus: 'border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00]',
  },
  card: {
    highlight: 'bg-gradient-to-br from-[#FF6B00]/15 via-[#FF6B00]/5 to-transparent border border-[#FF6B00]/30',
    borderLeft: 'border-l-4 border-[#FF8800] bg-gradient-to-r from-[#FF6B00]/5 via-transparent to-transparent',
  },
};
