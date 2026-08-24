import { SavedCalculation, ProductCollection, AssemblyPrintedPart, AssemblyHardwareItem } from '../../shared/types';

export type ProductFilter = 'all' | 'single' | 'assembly' | 'collections' | 'low_stock' | 'bestsellers';

export type CatalogTableRow =
  | {
      rowKind: 'product';
      id: string;
      item: SavedCalculation;
      parentCollectionId?: string;
      parentCollectionName?: string;
      name: string;
      category?: string;
      final_price: number;
      base_cost: number;
      stock_quantity: number;
      weight_g: number;
      hours: number;
      minutes: number;
      created_at?: string;
    }
  | {
      rowKind: 'collection';
      id: string;
      collection: ProductCollection;
      childItems: SavedCalculation[];
      name: string;
      category?: string;
      tags?: string[];
      itemsCount: number;
      singleCount: number;
      assemblyCount: number;
      totalStock: number;
      minPrice: number;
      maxPrice: number;
      minCost: number;
      maxCost: number;
      totalProfit: number;
      materialsList: string[];
      materialsColors: string[];
      minWeight: number;
      maxWeight: number;
      minHours: number;
      maxHours: number;
      minMins: number;
      maxMins: number;
      stlCount: number;
      final_price: number;
      base_cost: number;
      stock_quantity: number;
      weight_g: number;
      hours: number;
      minutes: number;
      created_at?: string;
    };

export interface SalesStatInfo {
  soldQty: number;
  orderCount: number;
  totalRevenue: number;
  isBestseller: boolean;
}

export interface WarehouseMetrics {
  totalUnits: number;
  inStockPositionsCount: number;
  totalRetailValue: number;
  totalCostValue: number;
  potentialProfit: number;
  profitMargin: number;
}

export type SortField = 'name' | 'category' | 'filament' | 'params' | 'stock' | 'cost' | 'price' | 'profit' | 'date' | 'id';
export type SortOrder = 'asc' | 'desc';
