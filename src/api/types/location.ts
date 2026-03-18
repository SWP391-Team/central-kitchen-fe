export interface Location {
  location_id: number;
  location_code: string;
  location_name: string;
  location_address: string;
  location_type: 'CK_PRODUCTION' | 'CK_WAREHOUSE' | 'STORE';
  is_active: boolean;
  created_at: string;
  updated_at?: Date;
}

export interface LocationCreateRequest {
  location_code: string;
  location_name: string;
  location_address: string;
  location_type: 'CK_PRODUCTION' | 'CK_WAREHOUSE' | 'STORE';
  is_active?: boolean;
}

export interface LocationUpdateRequest {
  location_code?: string; 
  location_name?: string;
  location_address?: string;
  location_type?: 'CK_PRODUCTION' | 'CK_WAREHOUSE' | 'STORE';
  is_active?: boolean;
}
