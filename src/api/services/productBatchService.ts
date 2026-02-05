import api from '../axiosConfig';
import { 
  ProductBatchWithDetails, 
  BatchPlansCreateRequest,
  ApiResponse 
} from '../types';

export const productBatchService = {
  getAllBatches: async (): Promise<ProductBatchWithDetails[]> => {
    const response = await api.get<ApiResponse<ProductBatchWithDetails[]>>('/batches');
    return response.data.data;
  },

  getBatchesByStore: async (storeId: number): Promise<ProductBatchWithDetails[]> => {
    const response = await api.get<ApiResponse<ProductBatchWithDetails[]>>(`/batches/store/${storeId}`);
    return response.data.data;
  },

  createBatches: async (batchesData: BatchPlansCreateRequest): Promise<ProductBatchWithDetails[]> => {
    const response = await api.post<ApiResponse<ProductBatchWithDetails[]>>('/batches', batchesData);
    return response.data.data;
  },
};
