import api from '../axiosConfig';
import { 
  ProductBatch, 
  ProductBatchWithDetails, 
  ProductBatchCreateRequest, 
  ProduceBatchRequest, 
  StockBatchRequest 
} from '../types/productBatch';
import { ApiResponse } from '../types';

export const kitchenProductionService = {
  getAllBatchPlans: async (): Promise<ApiResponse<ProductBatchWithDetails[]>> => {
    const response = await api.get('/kitchen-production');
    return response.data;
  },

  createBatchPlans: async (batches: ProductBatchCreateRequest[]): Promise<ApiResponse<ProductBatch[]>> => {
    const response = await api.post('/kitchen-production', batches);
    return response.data;
  },

  produceBatch: async (batchId: number, data: ProduceBatchRequest): Promise<ApiResponse<ProductBatch>> => {
    const response = await api.post(`/kitchen-production/${batchId}/produce`, data);
    return response.data;
  },

  stockBatch: async (batchId: number, data: StockBatchRequest): Promise<ApiResponse<ProductBatch>> => {
    const response = await api.post(`/kitchen-production/${batchId}/stock`, data);
    return response.data;
  },

  cancelBatch: async (batchId: number): Promise<ApiResponse<ProductBatch>> => {
    const response = await api.post(`/kitchen-production/${batchId}/cancel`);
    return response.data;
  },
};
