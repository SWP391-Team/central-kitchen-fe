import { useState, useEffect } from 'react';
import { inventoryService } from '@/api/services/inventoryService';
import { ProductBatchWithDetails } from '@/api/types';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { XMarkIcon } from '@heroicons/react/24/outline';

const InventoryManagement = () => {
  const [batches, setBatches] = useState<ProductBatchWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDisposeModalOpen, setIsDisposeModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<ProductBatchWithDetails | null>(null);
  const [disposeReason, setDisposeReason] = useState<'WRONG_DATA' | 'DEFECTIVE' | ''>('');
  const { showToast } = useToast();
  const { user } = useAuth();

  const loadData = async () => {
    try {
      setLoading(true);
      const batchesData = await inventoryService.getCentralKitchenInventory();
      setBatches(batchesData);
    } catch (error: any) {
      showToast('Failed to load data', 'error');
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDispose = async (batch: ProductBatchWithDetails) => {
    if (batch.inventory_status === 'DISPOSED') {
      showToast('Inventory item is already disposed', 'error');
      return;
    }

    if (!batch.inventory_id) {
      showToast('Inventory ID not found', 'error');
      return;
    }

    setSelectedBatch(batch);

    if (batch.inventory_status === 'EXPIRED') {
      if (!window.confirm(`Are you sure you want to dispose inventory #${batch.inventory_id}?`)) {
        return;
      }
      
      try {
        await inventoryService.disposeInventory(batch.inventory_id, { disposed_reason: 'EXPIRED' });
        showToast('Inventory item disposed successfully', 'success');
        loadData();
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || 'Failed to dispose inventory';
        showToast(errorMessage, 'error');
      }
      return;
    }

    setDisposeReason('');
    setIsDisposeModalOpen(true);
  };

  const handleDisposeWithReason = async () => {
    if (!selectedBatch || !disposeReason) {
      showToast('Please select a reason', 'error');
      return;
    }

    if (!selectedBatch.inventory_id) {
      showToast('Inventory ID not found', 'error');
      return;
    }

    try {
      await inventoryService.disposeInventory(selectedBatch.inventory_id, { disposed_reason: disposeReason });
      showToast('Batch disposed successfully', 'success');
      setIsDisposeModalOpen(false);
      setSelectedBatch(null);
      setDisposeReason('');
      loadData();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to dispose batch';
      showToast(errorMessage, 'error');
    }
  };

  const getAvailableReasons = (): Array<{ value: 'WRONG_DATA' | 'DEFECTIVE'; label: string }> => {
    if (user?.role_id === 1) {
      return [
        { value: 'WRONG_DATA', label: 'Wrong Data' },
        { value: 'DEFECTIVE', label: 'Defective' },
      ];
    } else {
      return [{ value: 'DEFECTIVE', label: 'Defective' }];
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'NEAR_EXPIRY':
        return 'bg-yellow-100 text-yellow-800';
      case 'EXPIRED':
        return 'bg-red-100 text-red-800';
      case 'DISPOSED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isReadOnly = (status?: string) => {
    return status === 'EXPIRED' || status === 'DISPOSED';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Central Kitchen Inventory</h2>
      </div>

      {/* Batches Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading inventory...</p>
          </div>
        ) : batches.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No inventory items found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Batch ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Batch Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Production Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expired Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Disposed Reason
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {batches.map((batch) => (
                  <tr
                    key={batch.batch_id}
                    className={`${isReadOnly(batch.inventory_status) ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      #{batch.batch_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-700">
                      {batch.batch_code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-700">
                      {batch.product_code || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {batch.product_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {batch.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {batch.inventory_quantity || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {batch.production_date ? new Date(batch.production_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {batch.expired_date ? new Date(batch.expired_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                          batch.inventory_status
                        )}`}
                      >
                        {batch.inventory_status || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {batch.inventory_disposed_reason || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {batch.inventory_status !== 'DISPOSED' ? (
                        <button
                          onClick={() => handleDispose(batch)}
                          className="text-red-600 hover:text-red-900"
                          title="Dispose"
                        >
                          Dispose
                        </button>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal for Dispose Reason */}
      {isDisposeModalOpen && selectedBatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Dispose Batch #{selectedBatch.batch_id}</h3>
              <button
                onClick={() => {
                  setIsDisposeModalOpen(false);
                  setSelectedBatch(null);
                  setDisposeReason('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dispose Reason *
                </label>
                <select
                  value={disposeReason}
                  onChange={(e) => setDisposeReason(e.target.value as 'WRONG_DATA' | 'DEFECTIVE' | '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a reason</option>
                  {getAvailableReasons().map((reason) => (
                    <option key={reason.value} value={reason.value}>
                      {reason.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>Product:</strong> {selectedBatch.product_name}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Quantity:</strong> {selectedBatch.inventory_quantity || 0}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Status:</strong> {selectedBatch.inventory_status || '-'}
                </p>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsDisposeModalOpen(false);
                    setSelectedBatch(null);
                    setDisposeReason('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDisposeWithReason}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  disabled={!disposeReason}
                >
                  Dispose
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManagement;
