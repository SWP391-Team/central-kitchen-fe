import { useState, useEffect } from 'react';
import { inventoryService } from '@/api/services/inventoryService';
import { ProductBatchWithDetails } from '@/api/types';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { XMarkIcon, ChevronDownIcon, ChevronUpIcon, EyeIcon } from '@heroicons/react/24/outline';

interface GroupedProduct {
  product_name: string;
  product_code: string;
  unit: string;
  batches: ProductBatchWithDetails[];
  totalQuantity: number;
}

const InventoryManagement = () => {
  const [batches, setBatches] = useState<ProductBatchWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDisposeModalOpen, setIsDisposeModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<ProductBatchWithDetails | null>(null);
  const [disposeReason, setDisposeReason] = useState<'WRONG_DATA' | 'DEFECTIVE' | ''>('');
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<GroupedProduct | null>(null);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const { showToast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const batchesData = await inventoryService.getCentralKitchenInventory();
      setBatches(batchesData);
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
    if (batch.inventory_status === 'DISPOSED') {
      showToast('Batch is already disposed', 'error');
      return;
    }

    if (!batch.inventory_id) {
      showToast('Inventory ID not found', 'error');
      return;
    }

    setSelectedBatch(batch);

    if (batch.inventory_status === 'EXPIRED') {
      if (!window.confirm(`Are you sure you want to dispose batch #${batch.batch_id}?`)) {
        return;
      }
      
      try {
        await inventoryService.disposeInventory(batch.inventory_id, { disposed_reason: 'EXPIRED' });
        showToast('Batch disposed successfully', 'success');
        loadData();
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

  const groupBatchesByProduct = (): GroupedProduct[] => {
    const grouped = batches.reduce((acc, batch) => {
      const key = batch.product_name;
      if (!acc[key]) {
        acc[key] = {
          product_name: batch.product_name,
          product_code: batch.product_code || '-',
          unit: batch.unit,
          batches: [],
          totalQuantity: 0,
        };
      }
      acc[key].batches.push(batch);
      acc[key].totalQuantity += batch.inventory_quantity || 0;
      return acc;
    }, {} as Record<string, GroupedProduct>);

    return Object.values(grouped);
  };

  const toggleProductExpansion = (productName: string) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productName)) {
      newExpanded.delete(productName);
    } else {
      newExpanded.add(productName);
    }
    setExpandedProducts(newExpanded);
  };

  const handleViewDetail = (product: GroupedProduct) => {
    setSelectedProduct(product);
    setIsDetailModalOpen(true);
  };

  const groupedProducts = groupBatchesByProduct();

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
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Central Kitchen Inventory</h1>
          <p className="text-gray-600 mt-1">Product batches in central kitchen inventory</p>
        </div>
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Quantity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Unit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Batches
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {groupedProducts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  No inventory batches found
                </td>
              </tr>
            ) : (
              groupedProducts.map((product) => {
                const isExpanded = expandedProducts.has(product.product_name);
                const visibleBatches = isExpanded ? product.batches : product.batches.slice(0, 0);
                
                return (
                  <>
                    <tr key={product.product_name} className="bg-gray-50 hover:bg-gray-100">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {product.batches.length >= 1 && (
                          <button
                            onClick={() => toggleProductExpansion(product.product_name)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            {isExpanded ? (
                              <ChevronUpIcon className="h-5 w-5" />
                            ) : (
                              <ChevronDownIcon className="h-5 w-5" />
                            )}
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {product.product_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.product_code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                        {product.totalQuantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.batches.length} batch{product.batches.length > 1 ? 'es' : ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleViewDetail(product)}
                          className="text-blue-600 hover:text-blue-900 font-medium flex items-center gap-1"
                        >
                          <EyeIcon className="h-4 w-4" />
                          View Detail
                        </button>
                      </td>
                    </tr>
                    
                    {/* Batch rows */}
                    {product.batches.length > 0 && (
                      <tr>
                        <td colSpan={7} className="px-0 py-0">
                          <div className={`${product.batches.length > 3 && !isExpanded ? 'max-h-48 overflow-y-auto' : ''}`}>
                            <table className="min-w-full">
                              <tbody className="divide-y divide-gray-100">
                                {visibleBatches.map((batch) => (
                                  <tr key={batch.batch_id} className="bg-white hover:bg-gray-50">
                                    <td className="w-12"></td>
                                    <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">
                                      Batch #{batch.batch_id}
                                    </td>
                                    <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-900 font-medium">
                                      {batch.batch_code || '-'}
                                    </td>
                                    <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-700 font-semibold">
                                      {batch.inventory_quantity}
                                    </td>
                                    <td className="px-9 py-6 whitespace-nowrap text-xs text-gray-500">
                                      {batch.unit}
                                    </td>
                                    <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">
                                      <div>Production Date: {batch.production_date ? formatDate(batch.production_date) : '-'}</div>
                                    </td>
                                    <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">
                                      <div>Expiry Date: {batch.expired_date ? formatDate(batch.expired_date) : '-'}</div>
                                    </td>
                                    <td className="px-6 py-3 whitespace-nowrap text-xs">
                                      <div className="flex items-center gap-2">
                                        <span className={getStatusBadgeClass(batch.inventory_status || '')}>
                                          {getStatusText(batch.inventory_status || '')}
                                        </span>
                                        {batch.inventory_status !== 'DISPOSED' && (
                                          <button
                                            onClick={() => handleDispose(batch)}
                                            className="text-red-600 hover:text-red-900 font-medium"
                                          >
                                            Dispose
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
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
              {batches.reduce((sum, batch) => sum + (batch.inventory_quantity || 0), 0)}
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
                Quantity: <span className="font-semibold">{selectedBatch.inventory_quantity} {selectedBatch.unit}</span>
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

      {/* View Detail Modal */}
      {isDetailModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {selectedProduct.product_name}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Product Code: {selectedProduct.product_code} | Total Quantity: {selectedProduct.totalQuantity} {selectedProduct.unit}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedProduct(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-gray-900 mb-2">Summary</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Total Batches:</span>
                    <span className="ml-2 font-semibold text-gray-900">{selectedProduct.batches.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Quantity:</span>
                    <span className="ml-2 font-semibold text-gray-900">{selectedProduct.totalQuantity} {selectedProduct.unit}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Active Batches:</span>
                    <span className="ml-2 font-semibold text-gray-900">
                      {selectedProduct.batches.filter(b => b.inventory_status === 'ACTIVE').length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Batch ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Batch Code
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Production Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Expiry Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedProduct.batches.map((batch) => (
                      <tr key={batch.batch_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          #{batch.batch_id}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {batch.batch_code || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-semibold">
                          {batch.inventory_quantity} {batch.unit}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {batch.production_date ? formatDate(batch.production_date) : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {batch.expired_date ? formatDate(batch.expired_date) : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={getStatusBadgeClass(batch.inventory_status || '')}>
                            {getStatusText(batch.inventory_status || '')}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {batch.inventory_status !== 'DISPOSED' && (
                            <button
                              onClick={() => {
                                setIsDetailModalOpen(false);
                                handleDispose(batch);
                              }}
                              className="text-red-600 hover:text-red-900 font-medium"
                            >
                              Dispose
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedProduct(null);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManagement;
