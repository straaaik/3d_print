import React from 'react';
import { WorkspaceReadyBoundary } from './WorkspaceReadyBoundary';
import type { CockpitTabId } from './CockpitWorkspace';
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

export function withWorkspaceReady<TProps extends object>(
  tab: CockpitTabId,
  load: () => Promise<React.ComponentType<TProps>>,
): () => Promise<React.ComponentType<TProps>> {
  let pending: Promise<React.ComponentType<TProps>> | undefined;
  return () => {
    pending ??= load().then((Component) => {
      function LoadedWorkspace(props: TProps) {
        return <WorkspaceReadyBoundary tab={tab}><Component {...props} /></WorkspaceReadyBoundary>;
      }
      return LoadedWorkspace;
    }).catch((error: unknown) => {
      pending = undefined;
      throw error;
    });
    return pending;
  };
}

export const workspaceDefinitions = {
  orders: {
    load: withWorkspaceReady('orders', () => import('../Orders/OrdersTable').then((module) => module.OrdersTable)),
    loading: OrdersSkeleton,
  } satisfies WorkspaceDefinition<OrdersTableProps>,
  stats: {
    load: withWorkspaceReady('stats', () => import('../Stats/StatsDashboard').then((module) => module.StatsDashboard)),
    loading: StatsSkeleton,
  } satisfies WorkspaceDefinition,
  calculator: {
    load: withWorkspaceReady('calculator', () => import('../Calculator/Calculator').then((module) => module.Calculator)),
    loading: CalculatorSkeleton,
  } satisfies WorkspaceDefinition,
  products: {
    load: withWorkspaceReady('products', () => import('../ProductsList/ProductsList').then((module) => module.ProductsList)),
    loading: ProductsSkeleton,
  } satisfies WorkspaceDefinition<ProductsListProps>,
  filaments: {
    load: withWorkspaceReady('filaments', () => import('../FilamentList/FilamentList').then((module) => module.FilamentList)),
    loading: FilamentsSkeleton,
  } satisfies WorkspaceDefinition,
  printers: {
    load: withWorkspaceReady('printers', () => import('../PrinterList/PrinterList').then((module) => module.PrinterList)),
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
