import api from '../axiosConfig';
import {
  ReceivedBySuggestion,
  WarehouseReceiveWithDetails,
  WarehouseReceiveCreateRequest,
} from '../types/warehouseReceive';
import { ApiResponse } from '../types/user';

export const warehouseReceiveService = {
  searchReceivedBySuggestions: async (
    batchTransferId: number,
    keyword: string
  ): Promise<ReceivedBySuggestion[]> => {
    const response = await api.get<ApiResponse<ReceivedBySuggestion[]>>(
      `/warehouse-receives/received-by-suggestions?batch_transfer_id=${batchTransferId}&q=${encodeURIComponent(keyword)}`
    );
    return response.data.data;
  },

  getAll: async (): Promise<WarehouseReceiveWithDetails[]> => {
    const response = await api.get<ApiResponse<WarehouseReceiveWithDetails[]>>(
      '/warehouse-receives'
    );
    return response.data.data;
  },

  getByTransferId: async (
    transferId: number
  ): Promise<WarehouseReceiveWithDetails[]> => {
    const response = await api.get<ApiResponse<WarehouseReceiveWithDetails[]>>(
      `/warehouse-receives/transfer/${transferId}`
    );
    return response.data.data;
  },

  getById: async (receiveId: number): Promise<WarehouseReceiveWithDetails> => {
    const response = await api.get<ApiResponse<WarehouseReceiveWithDetails>>(
      `/warehouse-receives/${receiveId}`
    );
    return response.data.data;
  },

  create: async (
    data: WarehouseReceiveCreateRequest
  ): Promise<WarehouseReceiveWithDetails> => {
    const response = await api.post<ApiResponse<WarehouseReceiveWithDetails>>(
      '/warehouse-receives',
      data
    );
    return response.data.data;
  },
};
