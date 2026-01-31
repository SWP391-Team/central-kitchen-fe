import api from '../axiosConfig';
import { Store, StoreCreateRequest, StoreUpdateRequest, ApiResponse } from '../types';

export const storeService = {
  getStores: async (params?: {
    search?: string;
    is_active?: boolean;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<Store[]>> => {
    const response = await api.get('/stores', { params });
    return response.data;
  },

  getStoreById: async (storeId: number): Promise<ApiResponse<Store>> => {
    const response = await api.get(`/stores/${storeId}`);
    return response.data;
  },

  createStore: async (data: StoreCreateRequest): Promise<ApiResponse<Store>> => {
    const response = await api.post('/stores', data);
    return response.data;
  },

  updateStore: async (storeId: number, data: StoreUpdateRequest): Promise<ApiResponse<Store>> => {
    const response = await api.put(`/stores/${storeId}`, data);
    return response.data;
  },

  toggleStoreStatus: async (storeId: number, is_active: boolean): Promise<ApiResponse<Store>> => {
    const response = await api.patch(`/stores/${storeId}/status`, { is_active });
    return response.data;
  },

  deleteStore: async (storeId: number): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/stores/${storeId}`);
    return response.data;
  },
};
