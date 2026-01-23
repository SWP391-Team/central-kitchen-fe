// Inventory related types
export interface Inventory {
  inventory_id: number;
  store_id: number;
  batch_id: number;
  quantity: number;
  created_at?: string;
}

export interface InventoryCreateRequest {
  store_id: number;
  batch_id: number;
  quantity: number;
}

export interface InventoryUpdateRequest {
  quantity?: number;
}
