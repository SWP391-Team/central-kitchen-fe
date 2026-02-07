export type SupplyOrderStatus = 
  | 'SUBMITTED' 
  | 'APPROVED' 
  | 'PARTLY_APPROVED' 
  | 'REJECTED' 
  | 'DELIVERING' 
  | 'RECEIPTED'
  | 'STOCKED'
  | 'CANCELLED';

export type SupplyOrderItemStatus = 
  | 'PENDING'
  | 'APPROVED'
  | 'PARTLY_APPROVED'
  | 'REJECTED';

export interface SupplyOrderItemBatch {
  item_batch_id: number;
  supply_order_item_id: number;
  batch_id: number;
  inventory_id: number;
  quantity: number; 
  receipted_quantity: number | null;
  stocked_quantity: number | null;
  created_at: string;
  batch_code?: string;
  product_name?: string;
}

export interface SupplyOrderItem {
  supply_order_item_id: number;
  supply_order_id: number;
  product_id: number;
  requested_quantity: number;
  approved_quantity: number | null;
  status: SupplyOrderItemStatus;
  product_code?: string;
  product_name?: string;
  unit?: string;
  available_quantity?: number;
  batches?: SupplyOrderItemBatch[];
}

export interface SupplyOrder {
  supply_order_id: number;
  supply_order_code: string;
  store_id: number;
  status: SupplyOrderStatus;
  created_at: string;
  created_by: number;
  store_name?: string;
  created_by_username?: string;
  items?: SupplyOrderItem[];
}

export interface SupplyOrderItemCreateRequest {
  product_id: number;
  requested_quantity: number;
}

export interface SupplyOrderCreateRequest {
  supply_order_code: string;
  items: SupplyOrderItemCreateRequest[];
}

export interface SupplyOrderDetailResponse extends SupplyOrder {
  items: SupplyOrderItem[];
}

export interface ReviewItemRequest {
  supply_order_item_id: number;
  action: 'APPROVE' | 'PARTLY_APPROVE' | 'REJECT';
  approved_quantity?: number;
}

export interface ReviewSupplyOrderRequest {
  items: ReviewItemRequest[];
}

export interface ConfirmReceivedBatchRequest {
  item_batch_id: number;
  receipted_quantity: number;
}

export interface ConfirmReceivedRequest {
  batches: ConfirmReceivedBatchRequest[];
}

export interface StockBatchRequest {
  item_batch_id: number;
  stocked_quantity: number;
}

export interface StockSupplyOrderRequest {
  batches: StockBatchRequest[];
}
