import { useState, useEffect } from 'react';
import { productBatchService } from '@/api/services/productBatchService';
import { productService } from '@/api/services/productService';
import { ProductBatchWithDetails, Product, ProductBatchCreateRequest } from '@/api/types';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';

const InventoryManagement = () => {
  const [batches, setBatches] = useState<ProductBatchWithDetails[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDisposeModalOpen, setIsDisposeModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<ProductBatchWithDetails | null>(null);
  const [disposeReason, setDisposeReason] = useState<'WRONG_DATA' | 'DEFECTIVE' | ''>('');
  const [batchForms, setBatchForms] = useState<ProductBatchCreateRequest[]>([
    {
      product_id: 0,
      production_date: new Date().toISOString().split('T')[0],
      expired_date: '',
      quantity: 0,
    },
  ]);
  const { showToast } = useToast();
  const { user } = useAuth();

  // Load batches and products
  const loadData = async () => {
    try {
      setLoading(true);
      const [batchesData, productsData] = await Promise.all([
        productBatchService.getAllBatches(),
        productService.getActiveProducts(),
      ]);
      setBatches(batchesData);
      setProducts(productsData);
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

  // Open modal
  const openModal = () => {
    setBatchForms([
      {
        product_id: 0,
        production_date: new Date().toISOString().split('T')[0],
        expired_date: '',
        quantity: 0,
      },
    ]);
    setIsModalOpen(true);
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setBatchForms([
      {
        product_id: 0,
        production_date: new Date().toISOString().split('T')[0],
        expired_date: '',
        quantity: 0,
      },
    ]);
  };

  // Add new batch form
  const addBatchForm = () => {
    setBatchForms([
      ...batchForms,
      {
        product_id: 0,
        production_date: new Date().toISOString().split('T')[0],
        expired_date: '',
        quantity: 0,
      },
    ]);
  };

  // Remove batch form
  const removeBatchForm = (index: number) => {
    if (batchForms.length > 1) {
      setBatchForms(batchForms.filter((_, i) => i !== index));
    }
  };

  // Update batch form
  const updateBatchForm = (index: number, field: keyof ProductBatchCreateRequest, value: any) => {
    const newForms = [...batchForms];
    newForms[index] = { ...newForms[index], [field]: value };
    setBatchForms(newForms);
  };

  // Submit batches
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all forms
    for (let i = 0; i < batchForms.length; i++) {
      const form = batchForms[i];
      if (!form.product_id || form.product_id === 0) {
        showToast(`Batch ${i + 1}: Please select a product`, 'error');
        return;
      }
      if (!form.expired_date) {
        showToast(`Batch ${i + 1}: Please select expired date`, 'error');
        return;
      }
      if (!form.quantity || form.quantity <= 0) {
        showToast(`Batch ${i + 1}: Quantity must be greater than 0`, 'error');
        return;
      }

      // Validate expired date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiredDate = new Date(form.expired_date);
      expiredDate.setHours(0, 0, 0, 0);

      if (expiredDate <= today) {
        showToast(`Batch ${i + 1}: Expired date must be after today`, 'error');
        return;
      }
    }

    try {
      await productBatchService.createBatches({ batches: batchForms });
      showToast(`${batchForms.length} batch(es) created successfully`, 'success');
      closeModal();
      loadData();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to create batches';
      showToast(errorMessage, 'error');
    }
  };

  // Handle dispose
  const handleDispose = async (batch: ProductBatchWithDetails) => {
    if (batch.status === 'DISPOSED') {
      showToast('Batch is already disposed', 'error');
      return;
    }

    setSelectedBatch(batch);

    // For EXPIRED batches, dispose immediately with EXPIRED reason
    if (batch.status === 'EXPIRED') {
      if (!window.confirm(`Are you sure you want to dispose batch #${batch.batch_id}?`)) {
        return;
      }
      
      try {
        await productBatchService.disposeBatch(batch.batch_id, { disposed_reason: 'EXPIRED' });
        showToast('Batch disposed successfully', 'success');
        loadData();
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || 'Failed to dispose batch';
        showToast(errorMessage, 'error');
      }
      return;
    }

    // For ACTIVE or NEAR_EXPIRY batches, show modal to select reason
    setDisposeReason('');
    setIsDisposeModalOpen(true);
  };

  // Handle dispose with reason
  const handleDisposeWithReason = async () => {
    if (!selectedBatch || !disposeReason) {
      showToast('Please select a reason', 'error');
      return;
    }

    try {
      await productBatchService.disposeBatch(selectedBatch.batch_id, { disposed_reason: disposeReason });
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

  // Get available dispose reasons based on user role
  const getAvailableReasons = (): Array<{ value: 'WRONG_DATA' | 'DEFECTIVE'; label: string }> => {
    if (user?.role_id === 1) {
      // Admin sees both
      return [
        { value: 'WRONG_DATA', label: 'Wrong Data' },
        { value: 'DEFECTIVE', label: 'Defective' },
      ];
    } else {
      // Central Staff only sees DEFECTIVE
      return [{ value: 'DEFECTIVE', label: 'Defective' }];
    }
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
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

  // Check if batch is read-only
  const isReadOnly = (status: string) => {
    return status === 'EXPIRED' || status === 'DISPOSED';
  };

  // Get tomorrow's date for min expired_date
  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Inventory Management</h2>
        <button
          onClick={openModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Create Batch
        </button>
      </div>

      {/* Batches Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading batches...</p>
          </div>
        ) : batches.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No batches yet. Create your first batch!
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
                    className={`${isReadOnly(batch.status) ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      #{batch.batch_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {batch.product_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {batch.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {batch.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(batch.production_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(batch.expired_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                          batch.status
                        )}`}
                      >
                        {batch.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {batch.disposed_reason ? (
                        <span className="text-gray-700">{batch.disposed_reason}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {batch.status !== 'DISPOSED' ? (
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

      {/* Modal for Create Batches */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Create New Batches</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {batchForms.map((form, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 relative">
                  {batchForms.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeBatchForm(index)}
                      className="absolute top-2 right-2 text-red-600 hover:text-red-800"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  )}

                  <h4 className="font-semibold mb-3 text-gray-700">Batch {index + 1}</h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Product *
                      </label>
                      <select
                        value={form.product_id}
                        onChange={(e) => updateBatchForm(index, 'product_id', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value={0}>Select a product</option>
                        {products.map((product) => (
                          <option key={product.product_id} value={product.product_id}>
                            {product.product_name} ({product.unit})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={form.quantity || ''}
                        onChange={(e) => updateBatchForm(index, 'quantity', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter quantity"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Production Date *
                      </label>
                      <input
                        type="date"
                        value={form.production_date}
                        onChange={(e) => updateBatchForm(index, 'production_date', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Expired Date *
                      </label>
                      <input
                        type="date"
                        min={getTomorrowDate()}
                        value={form.expired_date}
                        onChange={(e) => updateBatchForm(index, 'expired_date', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addBatchForm}
                className="w-full border-2 border-dashed border-gray-300 rounded-lg py-3 text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Another Batch
              </button>

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create {batchForms.length} Batch{batchForms.length > 1 ? 'es' : ''}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  <strong>Quantity:</strong> {selectedBatch.quantity}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Status:</strong> {selectedBatch.status}
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
