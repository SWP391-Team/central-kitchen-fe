export type TransactionType = 'IN' | 'OUT' | 'ADJUSTMENT';

export interface InventoryTransaction {
  inventory_transaction_id: number;
  location_id: number;
  product_id: number;
  batch_id: number;
  reference_type: string;
  reference_id: number;
  qty: number;
  transaction_type: TransactionType;
  created_at: string;

  location_name?: string;
  product_name?: string;
  product_code?: string;
  unit_name?: string | null;
  batch_code?: string;
}

export interface BatchInventory {
  batch_inventory_id: number;
  location_id: number;
  product_id: number;
  batch_id: number;
  qty_on_hand: number;
  qty_reserved: number;
  qty_available: number;
  updated_at: string;

  location_name?: string;
  product_name?: string;
  product_code?: string;
  unit_name?: string | null;
  batch_code?: string;
  production_date?: string | null;
  expired_date?: string | null;
}
