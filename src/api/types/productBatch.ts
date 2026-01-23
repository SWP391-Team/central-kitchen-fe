// ProductBatch related types
export interface ProductBatch {
  batch_id: number;
  product_id: number;
  production_date: string;
  expired_date: string;
  status: 'ACTIVE' | 'NEAR_EXPIRY' | 'EXPIRED' | 'DISPOSED';
  disposed_reason?: 'EXPIRED' | 'WRONG_DATA' | 'DEFECTIVE' | null;
  disposed_at?: string | null;
  created_at?: string;
}

export interface ProductBatchWithDetails {
  batch_id: number;
  product_id: number;
  product_name: string;
  unit: string;
  production_date: string;
  expired_date: string;
  status: string;
  quantity: number;
  disposed_reason?: string | null;
  disposed_at?: string | null;
  created_at: string;
}

export interface ProductBatchCreateRequest {
  product_id: number;
  production_date: string;
  expired_date: string;
  quantity: number;
}

export interface BatchesCreateRequest {
  batches: ProductBatchCreateRequest[];
}

export interface DisposeBatchRequest {
  disposed_reason: 'EXPIRED' | 'WRONG_DATA' | 'DEFECTIVE';
}
