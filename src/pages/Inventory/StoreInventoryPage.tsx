import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { inventoryService } from '@/api/services/inventoryService';
import { ProductBatchWithDetails } from '@/api/types';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { XMarkIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

const StoreInventoryPage = () => {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const [batches, setBatches] = useState<ProductBatchWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDisposeModalOpen, setIsDisposeModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<ProductBatchWithDetails | null>(null);
  const [disposeReason, setDisposeReason] = useState<'WRONG_DATA' | 'DEFECTIVE' | ''>('');
  const { showToast } = useToast();
  const { user } = useAuth();

  const numericStoreId = storeId ? parseInt(storeId) : null;

  useEffect(() => {
    if (numericStoreId) {
      loadInventory();
    }
  }, [numericStoreId]);

  const loadInventory = async () => {
    if (!numericStoreId) return;
    
    try {
      setLoading(true);
      const data = await inventoryService.getInventoryByStore(numericStoreId);
      setBatches(data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadgeClass = (status: string) => {
    const baseClass = 'px-3 py-1 rounded-full text-xs font-semibold';
    switch (status) {
      case 'ACTIVE':
        return `${baseClass} bg-green-100 text-green-800`;
      case 'NEAR_EXPIRY':
        return `${baseClass} bg-yellow-100 text-yellow-800`;
      case 'EXPIRED':
        return `${baseClass} bg-red-100 text-red-800`;
      case 'DISPOSED':
        return `${baseClass} bg-gray-100 text-gray-800`;
      default:
        return `${baseClass} bg-gray-100 text-gray-800`;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'Active';
      case 'NEAR_EXPIRY': return 'Near Expiry';
      case 'EXPIRED': return 'Expired';
      case 'DISPOSED': return 'Disposed';
      default: return status;
    }
  };

  const handleDispose = async (batch: ProductBatchWithDetails) => {
    if (batch.status === 'DISPOSED') {
      showToast('Batch is already disposed', 'error');
      return;
    }

    if (!batch.inventory_id) {
      showToast('Inventory ID not found', 'error');
      return;
    }

    setSelectedBatch(batch);

    if (batch.status === 'EXPIRED') {
      if (!window.confirm(`Are you sure you want to dispose batch #${batch.batch_id}?`)) {
        return;
      }
      
      try {
        await inventoryService.disposeInventory(batch.inventory_id, { disposed_reason: 'EXPIRED' });
        showToast('Batch disposed successfully', 'success');
        loadInventory();
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || 'Failed to dispose batch';
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
      loadInventory();
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

  const getStoreName = () => {
    if (numericStoreId === 1) return 'Central Kitchen';
    return `Store (ID: ${numericStoreId})`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Loading inventory...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">{getStoreName()} Inventory</h1>
            <p className="text-gray-600 mt-1">Product batches in store inventory</p>
          </div>
        </div>
        <button
          onClick={loadInventory}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Inventory Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
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
                Product Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Unit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Production Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Expiry Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {batches.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-6 py-8 text-center text-gray-500">
                  No inventory batches found
                </td>
              </tr>
            ) : (
              batches.map((batch) => (
                <tr key={batch.batch_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{batch.batch_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-700">
                    {batch.batch_code || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {batch.product_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {batch.product_code || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                    {batch.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {batch.unit}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(batch.production_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(batch.expired_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={getStatusBadgeClass(batch.status)}>
                      {getStatusText(batch.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {batch.status !== 'DISPOSED' && (
                      <button
                        onClick={() => handleDispose(batch)}
                        className="text-red-600 hover:text-red-900 font-medium"
                      >
                        Dispose
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Summary</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-blue-700">Total Batches:</span>
            <span className="ml-2 font-semibold text-blue-900">{batches.length}</span>
          </div>
          <div>
            <span className="text-blue-700">Total Items:</span>
            <span className="ml-2 font-semibold text-blue-900">
              {batches.reduce((sum, batch) => sum + batch.quantity, 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Dispose Modal */}
      {isDisposeModalOpen && selectedBatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Dispose Batch #{selectedBatch.batch_id}
              </h3>
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

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Product: <span className="font-semibold">{selectedBatch.product_name}</span>
              </p>
              <p className="text-sm text-gray-600">
                Quantity: <span className="font-semibold">{selectedBatch.quantity} {selectedBatch.unit}</span>
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for disposal <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {getAvailableReasons().map((reason) => (
                  <label key={reason.value} className="flex items-center">
                    <input
                      type="radio"
                      name="disposeReason"
                      value={reason.value}
                      checked={disposeReason === reason.value}
                      onChange={(e) => setDisposeReason(e.target.value as 'WRONG_DATA' | 'DEFECTIVE')}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">{reason.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
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
                disabled={!disposeReason}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Dispose
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreInventoryPage;
