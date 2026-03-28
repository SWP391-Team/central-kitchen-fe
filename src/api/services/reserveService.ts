import api from '../axiosConfig';
import { ApiResponse } from '../types';
import {
  ReserveBatchAllocationRequest,
  ReserveBatchRecord,
  ReserveHistoryRecord,
  ReserveProductRecord,
} from '../types/reserve';

export const reserveService = {
  getReserveProducts: async (params?: {
    status?: string;
    product_id?: number;
    supply_order_code?: string;
    supply_order_item_id?: number;
  }): Promise<ReserveProductRecord[]> => {
    const response = await api.get<ApiResponse<ReserveProductRecord[]>>('/reserves/products', { params });
    return response.data.data;
  },

  getReserveBatches: async (params?: {
    status?: string;
    product_id?: number;
    supply_order_code?: string;
    supply_order_item_id?: number;
  }): Promise<ReserveBatchRecord[]> => {
    const response = await api.get<ApiResponse<ReserveBatchRecord[]>>('/reserves/batches', { params });
    return response.data.data;
  },

  getReserveHistory: async (params?: {
    reserve_id?: number;
    supply_order_id?: number;
  }): Promise<ReserveHistoryRecord[]> => {
    const response = await api.get<ApiResponse<ReserveHistoryRecord[]>>('/reserves/history', { params });
    return response.data.data;
  },

  allocateReserveBatches: async (
    reserveId: number,
    payload: ReserveBatchAllocationRequest
  ): Promise<void> => {
    await api.post(`/reserves/products/${reserveId}/allocate`, payload);
  },
};
