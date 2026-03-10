import api from '../axiosConfig';
import { 
  ProductionBatchCreateRequest,
  ProductionBatchFinishRequest, 
  ProduceBatchResponse,
  ProductionBatchWithDetails,
  ApiResponse 
} from '../types';

export const productionBatchService = {
  createBatch: async (data: ProductionBatchCreateRequest): Promise<ProduceBatchResponse> => {
    const response = await api.post<ApiResponse<ProduceBatchResponse>>('/production-batches', data);
    return response.data.data;
  },

  finishProduction: async (batchId: number, data: ProductionBatchFinishRequest): Promise<ProduceBatchResponse> => {
    const response = await api.put<ApiResponse<ProduceBatchResponse>>(`/production-batches/${batchId}/finish`, data);
    return response.data.data;
  },

  produceBatch: async (data: ProductionBatchCreateRequest): Promise<ProduceBatchResponse> => {
    return productionBatchService.createBatch(data);
  },

  getBatchesByPlanId: async (planId: number): Promise<ProductionBatchWithDetails[]> => {
    const response = await api.get<ApiResponse<ProductionBatchWithDetails[]>>(`/production-batches/plan/${planId}`);
    return response.data.data;
  },

  getBatchById: async (batchId: number): Promise<ProductionBatchWithDetails> => {
    const response = await api.get<ApiResponse<ProductionBatchWithDetails>>(`/production-batches/${batchId}`);
    return response.data.data;
  },

  cancelBatch: async (batchId: number): Promise<ProduceBatchResponse> => {
    const response = await api.put<ApiResponse<ProduceBatchResponse>>(`/production-batches/${batchId}/cancel`);
    return response.data.data;
  },

  sendToQC: async (batchId: number): Promise<ProductionBatchWithDetails> => {
    const response = await api.put<ApiResponse<ProductionBatchWithDetails>>(`/production-batches/${batchId}/send-to-qc`);
    return response.data.data;
  },

  getAllBatches: async (): Promise<ProductionBatchWithDetails[]> => {
    const response = await api.get<ApiResponse<ProductionBatchWithDetails[]>>('/production-batches/all');
    return response.data.data;
  },
};
