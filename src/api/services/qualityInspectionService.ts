import api from '../axiosConfig';
import { 
  QualityInspectionWithDetails,
  QualityInspectionStartRequest,
  QualityInspectionFinishRequest,
  GetQualityInspectionsParams
} from '../types/qualityInspection';
import { ProductionBatch } from '../types/productionBatch';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface StartInspectionResponse {
  inspection: QualityInspectionWithDetails;
  batch: ProductionBatch;
}

class QualityInspectionService {
  async startInspection(data: QualityInspectionStartRequest): Promise<StartInspectionResponse> {
    const response = await api.post<ApiResponse<StartInspectionResponse>>(
      '/quality-inspections/start',
      data
    );
    return response.data.data;
  }

  async finishInspection(
    inspectionId: number,
    data: QualityInspectionFinishRequest
  ): Promise<StartInspectionResponse> {
    const response = await api.put<ApiResponse<StartInspectionResponse>>(
      `/quality-inspections/${inspectionId}/finish`,
      data
    );
    return response.data.data;
  }

  async reinspection(data: QualityInspectionStartRequest): Promise<StartInspectionResponse> {
    const response = await api.post<ApiResponse<StartInspectionResponse>>(
      '/quality-inspections/reinspection',
      data
    );
    return response.data.data;
  }

  async rejectBatch(batchId: number): Promise<ProductionBatch> {
    const response = await api.put<ApiResponse<ProductionBatch>>(
      `/quality-inspections/batch/${batchId}/reject`
    );
    return response.data.data;
  }

  async getQualityInspections(params: GetQualityInspectionsParams): Promise<{
    data: QualityInspectionWithDetails[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const response = await api.get<PaginatedResponse<QualityInspectionWithDetails>>(
      '/quality-inspections',
      { params }
    );
    return {
      data: response.data.data,
      pagination: response.data.pagination
    };
  }

  async getInspectionById(inspectionId: number): Promise<QualityInspectionWithDetails> {
    const response = await api.get<ApiResponse<QualityInspectionWithDetails>>(
      `/quality-inspections/${inspectionId}`
    );
    return response.data.data;
  }

  async getInspectionsByBatchId(batchId: number): Promise<QualityInspectionWithDetails[]> {
    const response = await api.get<ApiResponse<QualityInspectionWithDetails[]>>(
      `/quality-inspections/batch/${batchId}`
    );
    return response.data.data;
  }
}

export const qualityInspectionService = new QualityInspectionService();
