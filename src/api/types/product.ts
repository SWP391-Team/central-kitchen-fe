export interface Product {
  product_id: number;
  product_code: string;
  product_name: string;
  unit: string;
  shelf_life_days: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ProductCreateRequest {
  product_name: string;
  unit: string;
  shelf_life_days: number;
}

export interface ProductUpdateRequest {
  product_name?: string;
  unit?: string;
  shelf_life_days?: number;
}
