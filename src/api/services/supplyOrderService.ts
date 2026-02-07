import api from '../axiosConfig';
import { 
  SupplyOrder,
  SupplyOrderCreateRequest,
  SupplyOrderDetailResponse,
  ReviewSupplyOrderRequest,
  ConfirmReceivedRequest,
  StockSupplyOrderRequest,
  ApiResponse 
} from '../types';

export const supplyOrderService = {
  getAllSupplyOrders: async (): Promise<SupplyOrder[]> => {
    const response = await api.get<ApiResponse<SupplyOrder[]>>('/supply-orders/store');
    return response.data.data;
  },

  getSupplyOrderById: async (id: number): Promise<SupplyOrderDetailResponse> => {
    const response = await api.get<ApiResponse<SupplyOrderDetailResponse>>(`/supply-orders/store/${id}`);
    return response.data.data;
  },

  createSupplyOrder: async (orderData: SupplyOrderCreateRequest): Promise<SupplyOrder> => {
    const response = await api.post<ApiResponse<SupplyOrder>>('/supply-orders/store', orderData);
    return response.data.data;
  },

  getSupplyOrdersByStore: async (storeId: number): Promise<SupplyOrder[]> => {
    const response = await api.get<ApiResponse<SupplyOrder[]>>(`/supply-orders/store/by-store/${storeId}`);
    return response.data.data;
  },

  getAllSupplyOrdersCentral: async (): Promise<SupplyOrder[]> => {
    const response = await api.get<ApiResponse<SupplyOrder[]>>('/supply-orders/central');
    return response.data.data;
  },

  getSupplyOrderByIdCentral: async (id: number): Promise<SupplyOrderDetailResponse> => {
    const response = await api.get<ApiResponse<SupplyOrderDetailResponse>>(`/supply-orders/central/${id}`);
    return response.data.data;
  },

  reviewSupplyOrder: async (id: number, data: ReviewSupplyOrderRequest): Promise<SupplyOrderDetailResponse> => {
    const response = await api.post<ApiResponse<SupplyOrderDetailResponse>>(`/supply-orders/central/${id}/review`, data);
    return response.data.data;
  },

  startDelivery: async (id: number): Promise<SupplyOrderDetailResponse> => {
    const response = await api.post<ApiResponse<SupplyOrderDetailResponse>>(`/supply-orders/central/${id}/start-delivery`);
    return response.data.data;
  },

  confirmReceived: async (id: number, data: ConfirmReceivedRequest): Promise<SupplyOrderDetailResponse> => {
    const response = await api.post<ApiResponse<SupplyOrderDetailResponse>>(`/supply-orders/store/${id}/confirm-received`, data);
    return response.data.data;
  },

  stockSupplyOrder: async (id: number, data: StockSupplyOrderRequest): Promise<SupplyOrderDetailResponse> => {
    const response = await api.post<ApiResponse<SupplyOrderDetailResponse>>(`/supply-orders/store/${id}/stock`, data);
    return response.data.data;
  },

  cancelSupplyOrder: async (id: number): Promise<SupplyOrderDetailResponse> => {
    const response = await api.post<ApiResponse<SupplyOrderDetailResponse>>(`/supply-orders/store/${id}/cancel`);
    return response.data.data;
  },

  cancelSupplyOrderCentral: async (id: number): Promise<SupplyOrderDetailResponse> => {
    const response = await api.post<ApiResponse<SupplyOrderDetailResponse>>(`/supply-orders/central/${id}/cancel`);
    return response.data.data;
  },
};
