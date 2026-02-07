import { useState, useEffect } from 'react';
import { kitchenProductionService } from '@/api/services/kitchenProductionService';
import { productService } from '@/api/services/productService';
import { ProductBatchWithDetails, ProductBatchCreateRequest, BatchStatus } from '@/api/types/productBatch';
import { Product } from '@/api/types';
import { useToast } from '@/contexts/ToastContext';
import Button from '@/components/Button';
import { XMarkIcon, ChevronDownIcon, ChevronUpIcon, EyeIcon } from '@heroicons/react/24/outline';

interface GroupedProduct {
  product_name: string;
  product_code: string;
  unit: string;
  batches: ProductBatchWithDetails[];
  totalPlannedQty: number;
  totalProducedQty: number;
}

const KitchenProductionPage = () => {
  const { showToast } = useToast();
  const [batches, setBatches] = useState<ProductBatchWithDetails[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showProduceModal, setShowProduceModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<ProductBatchWithDetails | null>(null);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<GroupedProduct | null>(null);

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
          totalPlannedQty: 0,
          totalProducedQty: 0,
        };
      }
      acc[key].batches.push(batch);
      acc[key].totalPlannedQty += batch.planned_quantity || 0;
      acc[key].totalProducedQty += batch.produced_quantity || 0;
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">

              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Planned Qty
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Produced Qty
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
                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                  No batch plans found
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
                        {product.totalPlannedQty}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                        {product.totalProducedQty}
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
                        <td colSpan={8} className="px-0 py-0">
                          <div className={`${product.batches.length > 3 && !isExpanded ? 'max-h-48 overflow-y-auto' : ''}`}>
                            <table className="min-w-full">
                              <tbody className="divide-y divide-gray-100">
                                {visibleBatches.map((batch) => (
                                  <tr key={batch.batch_id} className="bg-white hover:bg-gray-50">
                                    <td className="w-12"></td>
                                    <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">
                                      Batch Code: {batch.batch_code}
                                    </td>
                                    <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-700 font-semibold">
                                      Planned: {batch.planned_quantity} {batch.unit}
                                    </td>
                                    <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-700 font-semibold">
                                      Produced: {batch.produced_quantity ? `${batch.produced_quantity} ${batch.unit}` : '-'}
                                    </td>
                                    <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">
                                      Production: {batch.production_date ? formatDate(batch.production_date) : '-'}
                                    </td>
                                    <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">
                                      Expiry: {batch.expired_date ? formatDate(batch.expired_date) : '-'}
                                    </td>
                                    <td className="px-6 py-3 whitespace-nowrap text-xs">
                                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(batch.status)}`}>
                                        {batch.status}
                                      </span>
                                    </td>
                                    <td className="px-6 py-3 whitespace-nowrap text-xs space-x-2">
                                      {batch.status === 'PLANNED' && (
                                        <>
                                          <button
                                            onClick={() => handleOpenProduceModal(batch)}
                                            className="text-blue-600 hover:text-blue-800 font-medium"
                                          >
                                            Produce
                                          </button>
                                          <button
                                            onClick={() => handleCancelBatch(batch.batch_id)}
                                            className="text-red-600 hover:text-red-800 font-medium"
                                          >
                                            Cancel
                                          </button>
                                        </>
                                      )}
                                      {batch.status === 'PRODUCED' && (
                                        <>
                                          <button
                                            onClick={() => handleOpenStockModal(batch)}
                                            className="text-green-600 hover:text-green-800 font-medium"
                                          >
                                            Stock
                                          </button>
                                          <button
                                            onClick={() => handleCancelBatch(batch.batch_id)}
                                            className="text-red-600 hover:text-red-800 font-medium"
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
                  Product Code: {selectedProduct.product_code} | Total Planned: {selectedProduct.totalPlannedQty} {selectedProduct.unit} | Total Produced: {selectedProduct.totalProducedQty} {selectedProduct.unit}
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
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Total Batches:</span>
                    <span className="ml-2 font-semibold text-gray-900">{selectedProduct.batches.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Planned Qty:</span>
                    <span className="ml-2 font-semibold text-gray-900">{selectedProduct.totalPlannedQty} {selectedProduct.unit}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Produced Qty:</span>
                    <span className="ml-2 font-semibold text-gray-900">{selectedProduct.totalProducedQty} {selectedProduct.unit}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Active Batches:</span>
                    <span className="ml-2 font-semibold text-gray-900">
                      {selectedProduct.batches.filter(b => b.status === 'PLANNED' || b.status === 'PRODUCED').length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Batch Code
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Planned Qty
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Produced Qty
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Production Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Expiry Date
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
                          {batch.batch_code}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(batch.status)}`}>
                            {batch.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-semibold">
                          {batch.planned_quantity} {batch.unit}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-semibold">
                          {batch.produced_quantity ? `${batch.produced_quantity} ${batch.unit}` : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {batch.production_date ? formatDate(batch.production_date) : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {batch.expired_date ? formatDate(batch.expired_date) : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm space-x-2">
                          {batch.status === 'PLANNED' && (
                            <>
                              <button
                                onClick={() => {
                                  setIsDetailModalOpen(false);
                                  handleOpenProduceModal(batch);
                                }}
                                className="text-blue-600 hover:text-blue-900 font-medium"
                              >
                                Produce
                              </button>
                              <button
                                onClick={() => {
                                  setIsDetailModalOpen(false);
                                  handleCancelBatch(batch.batch_id);
                                }}
                                className="text-red-600 hover:text-red-900 font-medium"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          {batch.status === 'PRODUCED' && (
                            <>
                              <button
                                onClick={() => {
                                  setIsDetailModalOpen(false);
                                  handleOpenStockModal(batch);
                                }}
                                className="text-green-600 hover:text-green-900 font-medium"
                              >
                                Stock
                              </button>
                              <button
                                onClick={() => {
                                  setIsDetailModalOpen(false);
                                  handleCancelBatch(batch.batch_id);
                                }}
                                className="text-red-600 hover:text-red-900 font-medium"
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

export default KitchenProductionPage;
