import api from '../axiosConfig';
import { ReworkRecordWithDetails, ReworkRecordStartRequest, ReworkRecordFinishRequest } from '../types/reworkRecord';

export const reworkRecordService = {
  async startRework(data: ReworkRecordStartRequest) {
    const response = await api.post('/rework-records/start', data);
    return response.data;
  },

  async finishRework(reworkId: number, data: ReworkRecordFinishRequest) {
    const response = await api.put(`/rework-records/${reworkId}/finish`, data);
    return response.data;
  },

  async sendToQC(batchId: number) {
    const response = await api.put(`/rework-records/batch/${batchId}/send-to-qc`);
    return response.data;
  },

  async getAllReworkRecords(): Promise<ReworkRecordWithDetails[]> {
    const response = await api.get('/rework-records');
    return response.data.data;
  },

  async getReworkById(reworkId: number): Promise<ReworkRecordWithDetails> {
    const response = await api.get(`/rework-records/${reworkId}`);
    return response.data.data;
  },

  async getReworksByBatchId(batchId: number): Promise<ReworkRecordWithDetails[]> {
    const response = await api.get(`/rework-records/batch/${batchId}`);
    return response.data.data;
  },
};
