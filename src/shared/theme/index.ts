export * from './types';
export * from './pages/products';
export * from './pages/orders';
export * from './pages/calculator';
export * from './pages/stats';
export * from './pages/filaments';
export * from './pages/printers';
export * from './pages/settings';
export * from './pages/admin';

import { PageTheme } from './types';
import { productsTheme } from './pages/products';
import { ordersTheme } from './pages/orders';
import { calculatorTheme } from './pages/calculator';
import { statsTheme } from './pages/stats';
import { filamentsTheme } from './pages/filaments';
import { printersTheme } from './pages/printers';
import { settingsTheme } from './pages/settings';
import { adminTheme } from './pages/admin';

export const pageThemes: Record<string, PageTheme> = {
  products: productsTheme,
  orders: ordersTheme,
  calculator: calculatorTheme,
  stats: statsTheme,
  filaments: filamentsTheme,
  printers: printersTheme,
  settings: settingsTheme,
  admin: adminTheme,
};

export function getPageTheme(pageId: string): PageTheme {
  return pageThemes[pageId] || settingsTheme;
}

