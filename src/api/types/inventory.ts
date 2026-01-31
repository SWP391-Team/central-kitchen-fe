export interface Inventory {
  inventory_id: number;
  store_id: number;
  batch_id: number;
  quantity: number;
  status: 'ACTIVE' | 'NEAR_EXPIRY' | 'EXPIRED' | 'DISPOSED';
  disposed_reason?: 'EXPIRED' | 'WRONG_DATA' | 'DEFECTIVE' | null;
  disposed_at?: string | null;
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

export interface DisposeInventoryRequest {
  disposed_reason: 'EXPIRED' | 'WRONG_DATA' | 'DEFECTIVE';
}
