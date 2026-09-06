import type React from 'react';
import {
  CalculatorSkeleton,
  FilamentsSkeleton,
  OrdersSkeleton,
  PrintersSkeleton,
  ProductsSkeleton,
  StatsSkeleton,
} from '../../shared/ui/CockpitSkeleton';

type WorkspaceComponent = React.ElementType;

export interface WorkspaceDefinition {
  load: () => Promise<WorkspaceComponent>;
  loading: React.ComponentType;
}

export type WorkspaceDynamicAdapter = (
  load: () => Promise<WorkspaceComponent>,
  options: { loading: () => React.ReactNode },
) => WorkspaceComponent;

export const workspaceDefinitions = {
  orders: {
    load: () => import('../Orders/OrdersTable').then((module) => module.OrdersTable),
    loading: OrdersSkeleton,
  },
  stats: {
    load: () => import('../Stats/StatsDashboard').then((module) => module.StatsDashboard),
    loading: StatsSkeleton,
  },
  calculator: {
    load: () => import('../Calculator/Calculator').then((module) => module.Calculator),
    loading: CalculatorSkeleton,
  },
  products: {
    load: () => import('../ProductsList/ProductsList').then((module) => module.ProductsList),
    loading: ProductsSkeleton,
  },
  filaments: {
    load: () => import('../FilamentList/FilamentList').then((module) => module.FilamentList),
    loading: FilamentsSkeleton,
  },
  printers: {
    load: () => import('../PrinterList/PrinterList').then((module) => module.PrinterList),
    loading: PrintersSkeleton,
  },
} satisfies Record<string, WorkspaceDefinition>;

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
