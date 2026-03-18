import api from '../axiosConfig';
import { ApiResponse, AuditLog, AuditLogListParams, AuditLogStats } from '../types';

export const auditLogService = {
  getAuditLogs: async (params: AuditLogListParams): Promise<{
    data: AuditLog[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> => {
    const queryParams = new URLSearchParams();

    if (params.search) queryParams.append('search', params.search);
    if (params.action && params.action !== 'all') queryParams.append('action', params.action);
    if (params.userId) queryParams.append('userId', String(params.userId));
    if (params.fromDate) queryParams.append('fromDate', params.fromDate);
    if (params.toDate) queryParams.append('toDate', params.toDate);
    if (params.page) queryParams.append('page', String(params.page));
    if (params.limit) queryParams.append('limit', String(params.limit));

    const response = await api.get<ApiResponse<AuditLog[]> & {
      pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
    }>(`/audit-logs?${queryParams.toString()}`);

    return {
      data: response.data.data,
      pagination: response.data.pagination,
    };
  },

  getAuditStats: async (): Promise<AuditLogStats> => {
    const response = await api.get<ApiResponse<AuditLogStats>>('/audit-logs/stats');
    return response.data.data;
  },
};
