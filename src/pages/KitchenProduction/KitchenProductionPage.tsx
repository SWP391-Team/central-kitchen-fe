import { useState, useEffect } from 'react';
import { kitchenProductionService } from '@/api/services/kitchenProductionService';
import { productService } from '@/api/services/productService';
import { ProductBatchWithDetails, ProductBatchCreateRequest, BatchStatus } from '@/api/types/productBatch';
import { Product } from '@/api/types';
import { useToast } from '@/contexts/ToastContext';
import Button from '@/components/Button';

const KitchenProductionPage = () => {
  const { showToast } = useToast();
  const [batches, setBatches] = useState<ProductBatchWithDetails[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showProduceModal, setShowProduceModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<ProductBatchWithDetails | null>(null);

  // Form states
  const [batchPlans, setBatchPlans] = useState<ProductBatchCreateRequest[]>([
    { batch_code: '', product_id: 0, planned_quantity: 0 }
  ]);

  const [produceForm, setProduceForm] = useState({
    produced_quantity: 0,
    production_date: new Date().toISOString().split('T')[0],
    expired_date: ''
  });

  const [stockForm, setStockForm] = useState({
    stocked_quantity: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [batchesRes, productsData] = await Promise.all([
        kitchenProductionService.getAllBatchPlans(),
        productService.getAllProducts()
      ]);
      setBatches(batchesRes.data || []);
      setProducts(productsData || []);
    } catch (error) {
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBatchPlan = () => {
    setBatchPlans([...batchPlans, { batch_code: '', product_id: 0, planned_quantity: 0 }]);
  };

  const handleRemoveBatchPlan = (index: number) => {
    if (batchPlans.length > 1) {
      setBatchPlans(batchPlans.filter((_, i) => i !== index));
    }
  };

  const handleBatchPlanChange = (index: number, field: keyof ProductBatchCreateRequest, value: any) => {
    const updated = [...batchPlans];
    updated[index] = { ...updated[index], [field]: value };
    setBatchPlans(updated);
  };

  const handleCreateBatchPlans = async () => {
    try {
      // Validate
      for (const plan of batchPlans) {
        if (!plan.batch_code || !plan.product_id || plan.planned_quantity <= 0) {
          showToast('Please fill all required fields', 'error');
          return;
        }
      }

      await kitchenProductionService.createBatchPlans(batchPlans);
      showToast('Batch plans created successfully', 'success');
      setShowCreateModal(false);
      setBatchPlans([{ batch_code: '', product_id: 0, planned_quantity: 0 }]);
      loadData();
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to create batch plans', 'error');
    }
  };

  const handleOpenProduceModal = (batch: ProductBatchWithDetails) => {
    setSelectedBatch(batch);
    setProduceForm({
      produced_quantity: 0,
      production_date: new Date().toISOString().split('T')[0],
      expired_date: ''
    });
    setShowProduceModal(true);
  };

  const handleProduceBatch = async () => {
    if (!selectedBatch) return;

    try {
      if (produceForm.produced_quantity <= 0 || produceForm.produced_quantity > selectedBatch.planned_quantity) {
        showToast(`Produced quantity must be between 1 and ${selectedBatch.planned_quantity}`, 'error');
        return;
      }

      if (!produceForm.production_date || !produceForm.expired_date) {
        showToast('Please fill all required fields', 'error');
        return;
      }

      await kitchenProductionService.produceBatch(selectedBatch.batch_id, produceForm);
      showToast('Batch produced successfully', 'success');
      setShowProduceModal(false);
      loadData();
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to produce batch', 'error');
    }
  };

  const handleOpenStockModal = (batch: ProductBatchWithDetails) => {
    setSelectedBatch(batch);
    setStockForm({ stocked_quantity: batch.produced_quantity || 0 });
    setShowStockModal(true);
  };

  const handleStockBatch = async () => {
    if (!selectedBatch) return;

    try {
      if (stockForm.stocked_quantity <= 0 || stockForm.stocked_quantity > (selectedBatch.produced_quantity || 0)) {
        showToast(`Stocked quantity must be between 1 and ${selectedBatch.produced_quantity}`, 'error');
        return;
      }

      await kitchenProductionService.stockBatch(selectedBatch.batch_id, stockForm);
      showToast('Batch stocked successfully', 'success');
      setShowStockModal(false);
      loadData();
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to stock batch', 'error');
    }
  };

  const handleCancelBatch = async (batchId: number) => {
    if (!confirm('Are you sure you want to cancel this batch?')) return;

    try {
      await kitchenProductionService.cancelBatch(batchId);
      showToast('Batch cancelled successfully', 'success');
      loadData();
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to cancel batch', 'error');
    }
  };

  const getStatusColor = (status: BatchStatus) => {
    switch (status) {
      case 'PLANNED': return 'bg-blue-100 text-blue-800';
      case 'PRODUCED': return 'bg-yellow-100 text-yellow-800';
      case 'STOCKED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Kitchen Production</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          Create Batch Plan
        </Button>
      </div>

      {/* Batch Plans Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Planned Qty</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produced Qty</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Production Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expired Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {batches.map((batch) => (
              <tr key={batch.batch_id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{batch.batch_code}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{batch.product_name}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(batch.status)}`}>
                    {batch.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{batch.planned_quantity} {batch.unit}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {batch.produced_quantity ? `${batch.produced_quantity} ${batch.unit}` : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {batch.production_date ? new Date(batch.production_date).toLocaleDateString() : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {batch.expired_date ? new Date(batch.expired_date).toLocaleDateString() : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                  {batch.status === 'PLANNED' && (
                    <>
                      <button
                        onClick={() => handleOpenProduceModal(batch)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Produce
                      </button>
                      <button
                        onClick={() => handleCancelBatch(batch.batch_id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  {batch.status === 'PRODUCED' && (
                    <>
                      <button
                        onClick={() => handleOpenStockModal(batch)}
                        className="text-green-600 hover:text-green-800"
                      >
                        Stock
                      </button>
                      <button
                        onClick={() => handleCancelBatch(batch.batch_id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  {(batch.status === 'STOCKED' || batch.status === 'CANCELLED') && (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Batch Plans Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Create Batch Plans</h2>
            
            {batchPlans.map((plan, index) => (
              <div key={index} className="mb-4 p-4 border rounded">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold">Batch #{index + 1}</h3>
                  {batchPlans.length > 1 && (
                    <button
                      onClick={() => handleRemoveBatchPlan(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Batch Code *</label>
                    <input
                      type="text"
                      value={plan.batch_code}
                      onChange={(e) => handleBatchPlanChange(index, 'batch_code', e.target.value.toUpperCase())}
                      placeholder="BATCH-YYYYMM-XXX"
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Product *</label>
                    <select
                      value={plan.product_id}
                      onChange={(e) => handleBatchPlanChange(index, 'product_id', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border rounded"
                    >
                      <option value={0}>Select Product</option>
                      {products.map((product) => (
                        <option key={product.product_id} value={product.product_id}>
                          {product.product_name} ({product.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Planned Quantity *</label>
                    <input
                      type="number"
                      value={plan.planned_quantity || ''}
                      onChange={(e) => handleBatchPlanChange(index, 'planned_quantity', parseInt(e.target.value) || 0)}
                      min="1"
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>
                </div>
              </div>
            ))}

            <div className="flex gap-2 mb-4">
              <Button onClick={handleAddBatchPlan} variant="secondary">
                Add Another Batch
              </Button>
            </div>

            <div className="flex justify-end gap-2">
              <Button onClick={() => setShowCreateModal(false)} variant="secondary">
                Cancel
              </Button>
              <Button onClick={handleCreateBatchPlans}>
                Create Batch Plans
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Produce Modal */}
      {showProduceModal && selectedBatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Produce Batch</h2>
            <p className="text-sm text-gray-600 mb-4">
              Batch: {selectedBatch.batch_code} | Planned: {selectedBatch.planned_quantity} {selectedBatch.unit}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Produced Quantity *</label>
                <input
                  type="number"
                  value={produceForm.produced_quantity || ''}
                  onChange={(e) => setProduceForm({ ...produceForm, produced_quantity: parseInt(e.target.value) || 0 })}
                  max={selectedBatch.planned_quantity}
                  min="1"
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Production Date *</label>
                <input
                  type="date"
                  value={produceForm.production_date}
                  onChange={(e) => setProduceForm({ ...produceForm, production_date: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Expired Date *</label>
                <input
                  type="date"
                  value={produceForm.expired_date}
                  onChange={(e) => setProduceForm({ ...produceForm, expired_date: e.target.value })}
                  min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button onClick={() => setShowProduceModal(false)} variant="secondary">
                Cancel
              </Button>
              <Button onClick={handleProduceBatch}>
                Produce
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Modal */}
      {showStockModal && selectedBatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Stock Batch</h2>
            <p className="text-sm text-gray-600 mb-4">
              Batch: {selectedBatch.batch_code} | Produced: {selectedBatch.produced_quantity} {selectedBatch.unit}
            </p>

            <div>
              <label className="block text-sm font-medium mb-1">Stocked Quantity *</label>
              <input
                type="number"
                value={stockForm.stocked_quantity || ''}
                onChange={(e) => setStockForm({ stocked_quantity: parseInt(e.target.value) || 0 })}
                max={selectedBatch.produced_quantity || 0}
                min="1"
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button onClick={() => setShowStockModal(false)} variant="secondary">
                Cancel
              </Button>
              <Button onClick={handleStockBatch}>
                Stock
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KitchenProductionPage;
