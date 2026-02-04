export interface ProductBatch {
  batch_id: number;
  batch_code: string;
  product_id: number;
  production_date: string;
  expired_date: string;
  created_at?: string;
}

export interface ProductBatchWithDetails {
  batch_id: number;
  batch_code: string;
  product_id: number;
  product_code: string;
  product_name: string;
  unit: string;
  production_date: string;
  expired_date: string;
  status: string;
  quantity: number;
  disposed_reason?: string | null; 
  disposed_at?: string | null; 
  inventory_id?: number; 
  created_at: string;
}

export interface ProductBatchCreateRequest {
  batch_code: string;
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
