import api from '../axiosConfig';
import {
  BatchTransferWithDetails,
  BatchTransferCreateRequest,
} from '../types/batchTransfer';
import { ApiResponse } from '../types/user';

export const batchTransferService = {
  getAll: async (): Promise<BatchTransferWithDetails[]> => {
    const response = await api.get<ApiResponse<BatchTransferWithDetails[]>>(
      '/batch-transfers'
    );
    return response.data.data;
  },

  getDelivering: async (): Promise<BatchTransferWithDetails[]> => {
    const response = await api.get<ApiResponse<BatchTransferWithDetails[]>>(
      '/batch-transfers/delivering'
    );
    return response.data.data;
  },

  getByBatchId: async (batchId: number): Promise<BatchTransferWithDetails[]> => {
    const response = await api.get<ApiResponse<BatchTransferWithDetails[]>>(
      `/batch-transfers/batch/${batchId}`
    );
    return response.data.data;
  },

  create: async (
    data: BatchTransferCreateRequest
  ): Promise<BatchTransferWithDetails> => {
    const response = await api.post<ApiResponse<BatchTransferWithDetails>>(
      '/batch-transfers',
      data
    );
    return response.data.data;
  },

  completeReceive: async (transferId: number): Promise<void> => {
    await api.post(`/batch-transfers/${transferId}/complete-receive`);
  },
};
