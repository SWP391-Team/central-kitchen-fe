export interface ProductionPlan {
  plan_id: number;
  plan_code: string;
  product_id: number;
  planned_qty: number;
  actual_qty: number;
  variance_qty: number;
  planned_date: string;
  status: 'draft' | 'planned' | 'in_production' | 'completed' | 'closed' | 'cancelled';
  created_by: number;
  created_at: string;
}

export interface ProductionPlanWithProduct extends ProductionPlan {
  product_code: string;
  product_name: string;
}

export interface ProductionPlanCreateRequest {
  product_id: number;
  planned_qty: number;
  planned_date: string;
}

export interface ProductionPlanListParams {
  search?: string;
  status?: string;
  sortBy?: 'planned_date' | 'created_at' | 'plan_code';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface ProductionPlanListResponse {
  plans: ProductionPlanWithProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
