// Store related types
export interface Store {
  store_id: number;
  store_name: string;
  store_address: string;
  is_active: boolean;
  created_at: string;
  updated_at?: Date;
}

export interface StoreCreateRequest {
  store_name: string;
  store_address: string;
  is_active?: boolean;
}

export interface StoreUpdateRequest {
  store_name?: string;
  store_address?: string;
  is_active?: boolean;
}
