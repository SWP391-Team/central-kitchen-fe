export interface Store {
  location_id: number;
  location_code: string;
  location_name: string;
  location_address: string;
  location_type: 'CK_PRODUCTION' | 'CK_WAREHOUSE' | 'STORE';
  is_active: boolean;
  created_at: string;
  updated_at?: Date;
}

export interface StoreCreateRequest {
  location_code: string;
  location_name: string;
  location_address: string;
  location_type: 'CK_PRODUCTION' | 'CK_WAREHOUSE' | 'STORE';
  is_active?: boolean;
}

export interface StoreUpdateRequest {
  location_code?: string; 
  location_name?: string;
  location_address?: string;
  location_type?: 'CK_PRODUCTION' | 'CK_WAREHOUSE' | 'STORE';
  is_active?: boolean;
}
