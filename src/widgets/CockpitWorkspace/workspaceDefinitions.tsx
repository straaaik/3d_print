import type React from 'react';
import type { OrdersTableProps } from '../Orders/OrdersTable';
import type { ProductsListProps } from '../ProductsList/ProductsList';
import {
  CalculatorSkeleton,
  FilamentsSkeleton,
  OrdersSkeleton,
  PrintersSkeleton,
  ProductsSkeleton,
  StatsSkeleton,
} from '../../shared/ui/CockpitSkeleton';

export interface WorkspaceDefinition<TProps extends object = Record<string, never>> {
  load: () => Promise<React.ComponentType<TProps>>;
  loading: React.ComponentType;
}

export interface WorkspaceDynamicAdapter {
  <TProps extends object>(
  load: () => Promise<React.ComponentType<TProps>>,
  options: { loading: () => React.ReactNode },
  ): React.ComponentType<TProps>;
}

export const workspaceDefinitions = {
  orders: {
    load: () => import('../Orders/OrdersTable').then((module) => module.OrdersTable),
    loading: OrdersSkeleton,
  } satisfies WorkspaceDefinition<OrdersTableProps>,
  stats: {
    load: () => import('../Stats/StatsDashboard').then((module) => module.StatsDashboard),
    loading: StatsSkeleton,
  } satisfies WorkspaceDefinition,
  calculator: {
    load: () => import('../Calculator/Calculator').then((module) => module.Calculator),
    loading: CalculatorSkeleton,
  } satisfies WorkspaceDefinition,
  products: {
    load: () => import('../ProductsList/ProductsList').then((module) => module.ProductsList),
    loading: ProductsSkeleton,
  } satisfies WorkspaceDefinition<ProductsListProps>,
  filaments: {
    load: () => import('../FilamentList/FilamentList').then((module) => module.FilamentList),
    loading: FilamentsSkeleton,
  } satisfies WorkspaceDefinition,
  printers: {
    load: () => import('../PrinterList/PrinterList').then((module) => module.PrinterList),
    loading: PrintersSkeleton,
  } satisfies WorkspaceDefinition,
};

export function createWorkspaceComponents(dynamicAdapter: WorkspaceDynamicAdapter) {
  return {
    orders: dynamicAdapter(workspaceDefinitions.orders.load, { loading: workspaceDefinitions.orders.loading }),
    stats: dynamicAdapter(workspaceDefinitions.stats.load, { loading: workspaceDefinitions.stats.loading }),
    calculator: dynamicAdapter(workspaceDefinitions.calculator.load, { loading: workspaceDefinitions.calculator.loading }),
    products: dynamicAdapter(workspaceDefinitions.products.load, { loading: workspaceDefinitions.products.loading }),
    filaments: dynamicAdapter(workspaceDefinitions.filaments.load, { loading: workspaceDefinitions.filaments.loading }),
    printers: dynamicAdapter(workspaceDefinitions.printers.load, { loading: workspaceDefinitions.printers.loading }),
  };
}
