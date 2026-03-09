export interface ProductionBatch {
  batch_id: number;
  plan_id: number;
  batch_code: string;
  product_id: number;
  produced_qty: number | null;
  production_date: string | null;
  expired_date: string | null;
  status: 'producing' | 'produced' | 'cancelled';
  created_at: string;
  created_by: number;
}

export interface ProductionBatchWithDetails extends ProductionBatch {
  plan_code?: string;
  product_name?: string;
  product_code?: string;
  created_by_username?: string;
}

export interface ProductionBatchCreateRequest {
  plan_id: number;
  product_id: number;
}

export interface ProductionBatchFinishRequest {
  produced_qty: number;
  production_date: string;
  expired_date: string;
}

export interface ProduceBatchResponse {
  batch: ProductionBatch;
  plan: {
    plan_id: number;
    plan_code: string;
    product_id: number;
    planned_qty: number;
    actual_qty: number;
    variance_qty: number;
    planned_date: string;
    status: string;
    created_at: string;
    created_by: number;
  };
}
