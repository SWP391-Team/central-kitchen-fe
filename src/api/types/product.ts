export interface Product {
  product_id: number;
  product_code: string;
  product_name: string;
  unit_id: number;
  unit_name?: string | null;
  shelf_life_days: number;
  is_active: boolean;
  created_by?: number | null;
  updated_by?: number | null;
  created_by_username?: string | null;
  updated_by_username?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProductCreateRequest {
  product_name: string;
  unit_id: number;
  shelf_life_days: number;
}

export interface ProductUpdateRequest {
  product_name?: string;
  unit_id?: number;
  shelf_life_days?: number;
}
