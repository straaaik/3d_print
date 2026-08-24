import { PageTheme } from '../types';

export const calculatorTheme: PageTheme = {
  id: 'calculator',
  name: 'Калькулятор',
  accentHex: '#0CB4E0',
  checkboxVariant: 'primary',
  tooltipAccent: 'primary',
  spinnerBorder: 'border-t-[#0CB4E0]',
  nav: {
    activeGradient: 'from-[#0993b8] to-[#0CB4E0]',
    activeShadow: 'shadow-primary/30',
  },
  primaryButton: {
    gradient: 'bg-gradient-to-r from-[#0993b8] to-[#0CB4E0] hover:from-[#0CB4E0] hover:to-[#29d0fb]',
    text: 'text-[#0d0e12] font-bold',
    shadow: 'shadow-md shadow-[#0CB4E0]/20',
    solid: 'bg-[#0CB4E0] hover:bg-[#29d0fb] text-[#0d0e12] font-bold',
  },
  filterButton: {
    active: 'bg-primary/20 text-white border border-primary/50 shadow-sm',
    badgeActive: 'bg-primary text-black font-extrabold',
    iconActive: 'text-primary',
  },
  badge: {
    subtle: 'bg-[#0CB4E0]/15 text-[#67e2ff] border border-[#0CB4E0]/30',
    solid: 'bg-[#0CB4E0] text-black font-bold',
    dashed: 'border-dashed border-[#0CB4E0]/60 text-[#0CB4E0]',
  },
  accent: {
    text: 'text-primary',
    textHover: 'hover:text-primary',
    textLight: 'text-[#67e2ff]',
    bgSubtle: 'bg-primary/10',
    borderSubtle: 'border-primary/30',
    borderHover: 'hover:border-primary/40',
    borderFocus: 'border-primary focus:ring-1 focus:ring-primary',
  },
  card: {
    highlight: 'bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border border-primary/30',
    borderLeft: 'border-l-4 border-primary bg-gradient-to-r from-primary/5 via-transparent to-transparent',
  },
};
