import api from '../axiosConfig';
import { 
  ProductionPlan,
  ProductionPlanWithProduct,
  ProductionPlanCreateRequest,
  ProductionPlanListParams,
  ApiResponse 
} from '../types';

export const productionPlanService = {
  getProductionPlans: async (params: ProductionPlanListParams): Promise<{
    data: ProductionPlanWithProduct[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> => {
    const queryParams = new URLSearchParams();
    
    if (params.search) queryParams.append('search', params.search);
    if (params.status) queryParams.append('status', params.status);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());

    const response = await api.get<ApiResponse<ProductionPlanWithProduct[]> & {
      pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
    }>(`/production-plans?${queryParams.toString()}`);
    
    return {
      data: response.data.data,
      pagination: response.data.pagination
    };
  },

  getProductionPlanById: async (id: number): Promise<ProductionPlanWithProduct> => {
    const response = await api.get<ApiResponse<ProductionPlanWithProduct>>(`/production-plans/${id}`);
    return response.data.data;
  },

  createProductionPlan: async (planData: ProductionPlanCreateRequest): Promise<ProductionPlan> => {
    const response = await api.post<ApiResponse<ProductionPlan>>('/production-plans', planData);
    return response.data.data;
  },

  cancelProductionPlan: async (id: number): Promise<ProductionPlan> => {
    const response = await api.put<ApiResponse<ProductionPlan>>(`/production-plans/${id}/cancel`);
    return response.data.data;
  },

  releasePlan: async (id: number): Promise<ProductionPlan> => {
    const response = await api.put<ApiResponse<ProductionPlan>>(`/production-plans/${id}/release`);
    return response.data.data;
  },

  closeProductionPlan: async (id: number): Promise<ProductionPlan> => {
    const response = await api.put<ApiResponse<ProductionPlan>>(`/production-plans/${id}/close`);
    return response.data.data;
  },
};
