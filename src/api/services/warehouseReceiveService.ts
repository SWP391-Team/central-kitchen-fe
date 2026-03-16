import api from '../axiosConfig';
import {
  WarehouseReceiveWithDetails,
  WarehouseReceiveCreateRequest,
} from '../types/warehouseReceive';
import { ApiResponse } from '../types/user';

export const warehouseReceiveService = {
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
