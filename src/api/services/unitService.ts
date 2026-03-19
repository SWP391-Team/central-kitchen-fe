import api from '../axiosConfig';
import { ApiResponse, Unit, UnitCreateRequest, UnitUpdateRequest } from '../types';

export const unitService = {
  getAllUnits: async (
    status?: 'all' | 'active' | 'inactive',
    searchTerm?: string
  ): Promise<Unit[]> => {
    const queryParams = new URLSearchParams();

    if (status && status !== 'all') {
      queryParams.set('status', status);
    }

    if (searchTerm && searchTerm.trim()) {
      queryParams.set('q', searchTerm.trim());
    }

    const queryString = queryParams.toString();
    const url = queryString ? `/units?${queryString}` : '/units';
    const response = await api.get<ApiResponse<Unit[]>>(url);
    return response.data.data;
  },

  getActiveUnits: async (): Promise<Unit[]> => {
    const response = await api.get<ApiResponse<Unit[]>>('/units/active');
    return response.data.data;
  },

  createUnit: async (unitData: UnitCreateRequest): Promise<Unit> => {
    const response = await api.post<ApiResponse<Unit>>('/units', unitData);
    return response.data.data;
  },

  updateUnit: async (id: number, unitData: UnitUpdateRequest): Promise<Unit> => {
    const response = await api.put<ApiResponse<Unit>>(`/units/${id}`, unitData);
    return response.data.data;
  },

  toggleUnitActive: async (id: number): Promise<Unit> => {
    const response = await api.put<ApiResponse<Unit>>(`/units/${id}/toggle-active`);
    return response.data.data;
  },
};
