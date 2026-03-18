import api from '../axiosConfig';
import { Location, LocationCreateRequest, LocationUpdateRequest, ApiResponse } from '../types';

export const locationService = {
  getLocations: async (params?: {
    search?: string;
    is_active?: boolean;
    location_type?: 'CK_PRODUCTION' | 'CK_WAREHOUSE' | 'STORE';
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<Location[]>> => {
    const response = await api.get('/locations', { params });
    return response.data;
  },

  getLocationById: async (locationId: number): Promise<ApiResponse<Location>> => {
    const response = await api.get(`/locations/${locationId}`);
    return response.data;
  },

  createLocation: async (data: LocationCreateRequest): Promise<ApiResponse<Location>> => {
    const response = await api.post('/locations', data);
    return response.data;
  },

  updateLocation: async (locationId: number, data: LocationUpdateRequest): Promise<ApiResponse<Location>> => {
    const response = await api.put(`/locations/${locationId}`, data);
    return response.data;
  },

  toggleLocationStatus: async (locationId: number, is_active: boolean): Promise<ApiResponse<Location>> => {
    const response = await api.patch(`/locations/${locationId}/status`, { is_active });
    return response.data;
  },

  deleteLocation: async (locationId: number): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/locations/${locationId}`);
    return response.data;
  },
};
