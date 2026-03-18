import api from '../axiosConfig';
import {
  ApiResponse,
  CkInventoryRow,
  CreateSupplyOrderRequest,
  SupplyOrder,
  SupplyOrderDetailResponse,
  ApproveSupplyOrderRequest,
  CreateSupplyOrderDeliveryRequest,
  CloseSupplyOrderRequest,
  RequesterSuggestion,
} from '../types';

interface SupplyOrderListResponse {
  success: boolean;
  data: SupplyOrder[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}

const normalizeOrder = (order: SupplyOrder): SupplyOrder => {
  const closeReason = order.close_reason ?? order.closed_reason ?? null;
  const closeNote = order.close_note ?? order.closed_note ?? null;

  return {
    ...order,
    close_reason: closeReason,
    close_note: closeNote,
  };
};

const normalizeDetail = (detail: SupplyOrderDetailResponse): SupplyOrderDetailResponse => {
  return {
    ...detail,
    order: normalizeOrder(detail.order),
  };
};

export const supplyOrderService = {
  getCkInventory: async (): Promise<CkInventoryRow[]> => {
    const response = await api.get<ApiResponse<CkInventoryRow[]>>('/supply-orders/ck-inventory');
    return response.data.data;
  },

  searchRequesters: async (q: string): Promise<RequesterSuggestion[]> => {
    const response = await api.get<ApiResponse<RequesterSuggestion[]>>('/supply-orders/requesters', {
      params: { q },
    });
    return response.data.data;
  },

  getList: async (params?: {
    search?: string;
    status?: string;
    location_id?: number;
    page?: number;
    limit?: number;
  }): Promise<{ data: SupplyOrder[]; total: number; page: number; limit: number }> => {
    const response = await api.get<SupplyOrderListResponse>('/supply-orders', { params });
    return {
      data: response.data.data.map(normalizeOrder),
      total: response.data.pagination.total,
      page: response.data.pagination.page,
      limit: response.data.pagination.limit,
    };
  },

  getDetail: async (id: number): Promise<SupplyOrderDetailResponse> => {
    const response = await api.get<ApiResponse<SupplyOrderDetailResponse>>(`/supply-orders/${id}`);
    return normalizeDetail(response.data.data);
  },

  create: async (payload: CreateSupplyOrderRequest): Promise<SupplyOrderDetailResponse> => {
    const response = await api.post<ApiResponse<SupplyOrderDetailResponse>>('/supply-orders', payload);
    return normalizeDetail(response.data.data);
  },

  sendToCk: async (id: number): Promise<SupplyOrder> => {
    const response = await api.put<ApiResponse<SupplyOrder>>(`/supply-orders/${id}/send-to-ck`);
    return response.data.data;
  },

  approve: async (id: number, payload: ApproveSupplyOrderRequest): Promise<SupplyOrderDetailResponse> => {
    const response = await api.put<ApiResponse<SupplyOrderDetailResponse>>(`/supply-orders/${id}/approve`, payload);
    return normalizeDetail(response.data.data);
  },

  deliverItem: async (
    orderId: number,
    itemId: number,
    payload: CreateSupplyOrderDeliveryRequest
  ): Promise<SupplyOrderDetailResponse> => {
    const response = await api.post<ApiResponse<SupplyOrderDetailResponse>>(
      `/supply-orders/${orderId}/items/${itemId}/deliver`,
      payload
    );
    return normalizeDetail(response.data.data);
  },

  closeOrder: async (
    id: number,
    payload: CloseSupplyOrderRequest
  ): Promise<SupplyOrderDetailResponse> => {
    const response = await api.put<ApiResponse<SupplyOrderDetailResponse>>(
      `/supply-orders/${id}/close`,
      payload
    );
    return normalizeDetail(response.data.data);
  },
};
