export interface Store {
  store_id: number;
  store_code: string;
  store_name: string;
  store_address: string;
  is_active: boolean;
  created_at: string;
  updated_at?: Date;
}

export interface StoreCreateRequest {
  store_code: string;
  store_name: string;
  store_address: string;
  is_active?: boolean;
}

export interface StoreUpdateRequest {
  store_code?: string; 
  store_name?: string;
  store_address?: string;
  is_active?: boolean;
}
