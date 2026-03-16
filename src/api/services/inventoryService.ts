import api from '../axiosConfig';
import { BatchInventory, InventoryTransaction } from '../types/inventory';
import { ApiResponse } from '../types/user';

export const inventoryService = {
  getBatchInventory: async (): Promise<BatchInventory[]> => {
    const response = await api.get<ApiResponse<BatchInventory[]>>(
      '/inventory/batches'
    );
    return response.data.data;
  },

  getTransactions: async (): Promise<InventoryTransaction[]> => {
    const response = await api.get<ApiResponse<InventoryTransaction[]>>(
      '/inventory/transactions'
    );
    return response.data.data;
  },
};
