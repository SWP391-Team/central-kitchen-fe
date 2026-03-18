import { useState, useEffect } from 'react';
import { productionPlanService } from '@/api/services/productionPlanService';
import { productionBatchService } from '@/api/services/productionBatchService';
import { productService } from '@/api/services/productService';
import { batchTransferService } from '@/api/services/batchTransferService';
import {
  ProductionPlanWithProduct,
  ProductionBatchWithDetails,
} from '@/api/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import {
  PlusIcon,
  EyeIcon,
  XMarkIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';

const ProductionBatchPage = () => {
  const { isAdmin, isCentralStaff } = useAuth();
  const { showToast } = useToast();
  const [plans, setPlans] = useState<ProductionPlanWithProduct[]>([]);
  const [allBatches, setAllBatches] = useState<ProductionBatchWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [activeTab, setActiveTab] = useState<'plans' | 'batches'>('plans');
  
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [selectedBatchForDelivery, setSelectedBatchForDelivery] = useState<ProductionBatchWithDetails | null>(null);
  const [deliveryTransferQty, setDeliveryTransferQty] = useState<number>(0);
  const [deliveryTransferDate, setDeliveryTransferDate] = useState<string>('');
  const [deliveryMaxQty, setDeliveryMaxQty] = useState<number>(0);
  const [deliverySubmitting, setDeliverySubmitting] = useState(false);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedBatchForDetail, setSelectedBatchForDetail] = useState<ProductionBatchWithDetails | null>(null);
  const [selectedPlanForDetail, setSelectedPlanForDetail] = useState<ProductionPlanWithProduct | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchDebounce, setSearchDebounce] = useState('');
  
  const [batchStatusFilter, setBatchStatusFilter] = useState<string>('all');
  const [batchSortBy, setBatchSortBy] = useState<'created_at' | 'production_date'>('created_at');
  const [batchSortOrder, setBatchSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounce(search);
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    loadProducts();
    loadPlans(); 
  }, []);

  useEffect(() => {
    if (activeTab === 'plans') {
      loadPlans();
    } else if (activeTab === 'batches') {
      loadAllBatches();
    }
  }, [searchDebounce, statusFilter, activeTab]);


  const loadPlans = async () => {
    try {
      setLoading(true);
      const params: any = {
        search: searchDebounce,
        page: 1,
        limit: 100,
      };

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const result = await productionPlanService.getProductionPlans(params);
      
      const filteredPlans = result.data.filter(plan => 
        ['planned', 'in_production'].includes(plan.status)
      );
      
      setPlans(filteredPlans);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load production plans');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      await productService.getActiveProducts();
    } catch (err: any) {
      console.error('Failed to load products:', err);
    }
  };

  const loadAllBatches = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: 1,
        limit: 1000,
      };
      const result = await productionPlanService.getProductionPlans(params);
      const allPlans = result.data; 
      
      setPlans(allPlans);

      const batches = await productionBatchService.getAllBatches();
      setAllBatches(batches);
    } catch (err: any) {
      console.error('Failed to load all batches:', err);
      showToast('Failed to load batches', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDeliveryModal = async (batch: ProductionBatchWithDetails) => {
    setSelectedBatchForDelivery(batch);
    setDeliveryTransferQty(0);
    const now = new Date();
    const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setDeliveryTransferDate(localISO);
    try {
      const existing = await batchTransferService.getByBatchId(batch.batch_id);
      const alreadyTransferred = existing.reduce((sum, t) => sum + t.transfer_qty, 0);
      setDeliveryMaxQty((batch.good_qty ?? 0) - alreadyTransferred);
    } catch {
      setDeliveryMaxQty(batch.good_qty ?? 0);
    }
    setShowDeliveryModal(true);
  };

  const handleDeliverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchForDelivery) return;
    if (deliveryTransferQty <= 0 || deliveryTransferQty > deliveryMaxQty) {
      showToast(`Transfer qty must be between 1 and ${deliveryMaxQty}`, 'error');
      return;
    }
    try {
      setDeliverySubmitting(true);
      await batchTransferService.create({
        batch_id: selectedBatchForDelivery.batch_id,
        transfer_qty: deliveryTransferQty,
        transfer_date: new Date(deliveryTransferDate).toISOString(),
      });
      showToast('Batch transfer created successfully!', 'success');
      setShowDeliveryModal(false);
      setSelectedBatchForDelivery(null);
      await loadAllBatches();
    } catch (err: any) {
      showToast(
        err.response?.data?.message || 'Failed to create batch transfer',
        'error'
      );
    } finally {
      setDeliverySubmitting(false);
    }
  };

  const handleCreateBatchDirectly = async (plan: ProductionPlanWithProduct) => {
    try {
      setError('');
      await productionBatchService.createBatch({
        plan_id: plan.plan_id,
        product_id: plan.product_id,
      });
      
      await loadPlans();
      
      if (activeTab === 'batches') {
        await loadAllBatches();
      }
      
      showToast('Batch created successfully!', 'success');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to create batch';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: { [key: string]: { color: string; label: string } } = {
      planned: { color: 'bg-blue-100 text-blue-700', label: 'Planned' },
      in_production: { color: 'bg-yellow-100 text-yellow-700', label: 'In Production' },
      completed: { color: 'bg-green-100 text-green-700', label: 'Completed' },
      closed: { color: 'bg-gray-100 text-gray-700', label: 'Closed' },
      cancelled: { color: 'bg-red-100 text-red-700', label: 'Cancelled' },
    };

    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-700', label: status };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getBatchStatusBadge = (status: string) => {
    const statusConfig: { [key: string]: { color: string; label: string } } = {
      producing: { color: 'bg-orange-100 text-orange-700', label: 'Producing' },
      produced: { color: 'bg-green-100 text-green-700', label: 'Produced' },
      waiting_qc: { color: 'bg-blue-100 text-blue-700', label: 'Waiting QC' },
      under_qc: { color: 'bg-yellow-100 text-yellow-700', label: 'Under QC' },
      qc_passed: { color: 'bg-emerald-100 text-emerald-700', label: 'QC Passed' },
      qc_failed: { color: 'bg-red-100 text-red-700', label: 'QC Failed' },
      rejected: { color: 'bg-gray-100 text-gray-700', label: 'Rejected' },
      cancelled: { color: 'bg-red-100 text-red-700', label: 'Cancelled' },
      delivering: { color: 'bg-indigo-100 text-indigo-700', label: 'Delivering' },
      delivered: { color: 'bg-cyan-100 text-cyan-700', label: 'Delivered' },
      received: { color: 'bg-teal-100 text-teal-700', label: 'Received' },
    };

    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-700', label: status };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const handleCancelBatch = async (batch: ProductionBatchWithDetails) => {
    if (window.confirm(`Are you sure you want to cancel batch ${batch.batch_code}? This action cannot be undone.`)) {
      try {
        await productionBatchService.cancelBatch(batch.batch_id);
        
        await loadPlans();
        
        if (activeTab === 'batches') {
          await loadAllBatches();
        }
        
        showToast('Batch cancelled successfully!', 'success');
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || 'Failed to cancel batch';
        setError(errorMessage);
        showToast(errorMessage, 'error');
      }
    }
  };

  const handleSendToQC = async (batch: ProductionBatchWithDetails) => {
    if (window.confirm(`Send batch ${batch.batch_code} to Quality Control?`)) {
      try {
        await productionBatchService.sendToQC(batch.batch_id);
        
        await loadPlans();
        
        if (activeTab === 'batches') {
          await loadAllBatches();
        }
        
        showToast('Batch sent to QC successfully!', 'success');
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || 'Failed to send batch to QC';
        setError(errorMessage);
        showToast(errorMessage, 'error');
      }
    }
  };

  const handleUndoSendToQC = async (batch: ProductionBatchWithDetails) => {
    if (window.confirm(`Undo send to QC for batch ${batch.batch_code}? This will revert the status back to Produced.`)) {
      try {
        await productionBatchService.undoSendToQC(batch.batch_id);
        
        await loadPlans();
        
        if (activeTab === 'batches') {
          await loadAllBatches();
        }
        
        showToast('Undo send to QC successfully! Batch status reverted to Produced.', 'success');
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || 'Failed to undo send to QC';
        setError(errorMessage);
        showToast(errorMessage, 'error');
      }
    }
  };

  const getPlanByIdFromBatch = (planId: number) => {
    return plans.find(p => p.plan_id === planId);
  };

  const handleOpenDetailModal = (batch: ProductionBatchWithDetails) => {
    setSelectedBatchForDetail(batch);
    setSelectedPlanForDetail(getPlanByIdFromBatch(batch.plan_id) || null);
    setShowDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedBatchForDetail(null);
    setSelectedPlanForDetail(null);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Production Batch</h1>
        <p className="text-gray-600 mt-2">Create and manage production batches</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('plans')}
              className={`${
                activeTab === 'plans'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              Production Plans
            </button>
            <button
              onClick={() => setActiveTab('batches')}
              className={`${
                activeTab === 'batches'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              Production Batches
            </button>
          </nav>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="mb-4 flex gap-4">
        <input
          type="text"
          placeholder={activeTab === 'plans' ? "Search by plan code or product..." : "Search by code, batch, product..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        
        {activeTab === 'plans' ? (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="planned">Planned</option>
            <option value="in_production">In Production</option>
          </select>
        ) : (
          <>
            <select
              value={batchStatusFilter}
              onChange={(e) => setBatchStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="producing">Producing</option>
              <option value="produced">Produced</option>
              <option value="cancelled">Cancelled</option>
            </select>
            
            <select
              value={batchSortBy}
              onChange={(e) => setBatchSortBy(e.target.value as 'created_at' | 'production_date')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="created_at">Created Time</option>
              <option value="production_date">Production Date</option>
            </select>
            
            <select
              value={batchSortOrder}
              onChange={(e) => setBatchSortOrder(e.target.value as 'asc' | 'desc')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </>
        )}
      </div>

      {/* Plans Tab Content */}
      {activeTab === 'plans' && (
        <>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : plans.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No production plans found</div>
          ) : (
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan Code</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Planned Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actual Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Variance</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {plans.map((plan) => (
                    <tr key={plan.plan_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-semibold text-blue-700">
                        {plan.plan_code}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div>{plan.product_name}</div>
                        <div className="text-xs text-gray-500">{plan.product_code}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        {plan.planned_qty}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right font-semibold">
                        {plan.actual_qty || 0}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <span className={`font-semibold ${
                          (plan.variance_qty || 0) < 0 ? 'text-red-600' : 
                          (plan.variance_qty || 0) > 0 ? 'text-green-600' : 
                          'text-gray-600'
                        }`}>
                          {plan.variance_qty || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {getStatusBadge(plan.status)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {(isCentralStaff || isAdmin) && (plan.status === 'planned' || plan.status === 'in_production') && (
                          <button
                            onClick={() => handleCreateBatchDirectly(plan)}
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs font-semibold flex items-center gap-1"
                          >
                            <PlusIcon className="w-4 h-4" />
                            Produce
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Batches Tab Content */}
      {activeTab === 'batches' && (
        <>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : allBatches.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No production batches found</div>
          ) : (
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch Code</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan Code</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Produced Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Good Qty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Production Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expired Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allBatches
                    .filter(batch => {
                      // Filter by search
                      if (searchDebounce) {
                        const searchLower = searchDebounce.toLowerCase();
                        const planInfo = getPlanByIdFromBatch(batch.plan_id);
                        const matchesSearch = (
                          batch.batch_code.toLowerCase().includes(searchLower) ||
                          batch.product_name?.toLowerCase().includes(searchLower) ||
                          planInfo?.plan_code.toLowerCase().includes(searchLower)
                        );
                        if (!matchesSearch) return false;
                      }
                      
                      // Filter by status
                      if (batchStatusFilter !== 'all' && batch.status !== batchStatusFilter) {
                        return false;
                      }
                      
                      return true;
                    })
                    .sort((a, b) => {
                      // Sort by selected field
                      let aValue: any;
                      let bValue: any;
                      
                      if (batchSortBy === 'created_at') {
                        aValue = new Date(a.created_at).getTime();
                        bValue = new Date(b.created_at).getTime();
                      } else if (batchSortBy === 'production_date') {
                        aValue = a.production_date ? new Date(a.production_date).getTime() : 0;
                        bValue = b.production_date ? new Date(b.production_date).getTime() : 0;
                      }
                      
                      if (batchSortOrder === 'asc') {
                        return aValue - bValue;
                      } else {
                        return bValue - aValue;
                      }
                    })
                    .map((batch) => {
                      const planInfo = getPlanByIdFromBatch(batch.plan_id);
                      return (
                        <tr key={batch.batch_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-semibold text-purple-700">
                            {batch.batch_code}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-blue-600">
                            {planInfo?.plan_code || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            <div>{batch.product_name}</div>
                            <div className="text-xs text-gray-500">{batch.product_code}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right font-semibold">
                            {batch.produced_qty || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-green-700">
                            {batch.good_qty ?? '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {batch.production_date ? new Date(batch.production_date).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {batch.expired_date ? new Date(batch.expired_date).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {getBatchStatusBadge(batch.status)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleOpenDetailModal(batch)}
                                className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                                title="View details"
                              >
                                <EyeIcon className="h-5 w-5" />
                              </button>
                              {(isCentralStaff || isAdmin) && batch.status !== 'cancelled' && batch.status !== 'rejected' && (
                                <>
                                  {batch.status === 'producing' && (
                                    <button
                                      disabled
                                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-semibold opacity-50 cursor-not-allowed"
                                      title="Finish Production feature will be added soon"
                                    >
                                      Finish Production
                                    </button>
                                  )}
                                  {batch.status === 'produced' && (
                                    <button
                                      onClick={() => handleSendToQC(batch)}
                                      className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-xs font-semibold"
                                    >
                                      Send to QC
                                    </button>
                                  )}
                                  {batch.status === 'waiting_qc' && (
                                    <button
                                      onClick={() => handleUndoSendToQC(batch)}
                                      className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-xs font-semibold"
                                    >
                                      Undo
                                    </button>
                                  )}
                                  {(batch.status === 'producing' || batch.status === 'produced') && (
                                    <button
                                      onClick={() => handleCancelBatch(batch)}
                                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs font-semibold"
                                    >
                                      Cancel
                                    </button>
                                  )}
                                </>
                              )}
                              {/* Delivery button: show when good_qty > 0 */}
                              {(isCentralStaff || isAdmin) &&
                                (batch.good_qty ?? 0) > 0 &&
                                !['cancelled', 'rejected', 'received'].includes(batch.status) && (
                                  <button
                                    onClick={() => handleOpenDeliveryModal(batch)}
                                    className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-xs font-semibold flex items-center gap-1"
                                  >
                                    <TruckIcon className="w-3 h-3" />
                                    Delivery
                                  </button>
                                )}
                              {(batch.status === 'cancelled' || batch.status === 'rejected') && (
                                <span className="text-xs text-gray-400 italic">No actions available</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Delivery (Batch Transfer) Modal ── */}

      {/* ── Delivery (Batch Transfer) Modal ── */}
      {showDeliveryModal && selectedBatchForDelivery && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <TruckIcon className="w-6 h-6 text-indigo-600" />
                Batch Transfer
              </h2>
              <button
                onClick={() => {
                  setShowDeliveryModal(false);
                  setSelectedBatchForDelivery(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Read-only info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-5 space-y-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Batch ID</span>
                  <p className="font-semibold text-purple-700">{selectedBatchForDelivery.batch_code}</p>
                </div>
                <div>
                  <span className="text-gray-500">Product</span>
                  <p className="font-semibold">{selectedBatchForDelivery.product_name}</p>
                </div>
                <div>
                  <span className="text-gray-500">Good Quantity</span>
                  <p className="font-semibold text-green-700">{selectedBatchForDelivery.good_qty}</p>
                </div>
                <div>
                  <span className="text-gray-500">Max Transferable</span>
                  <p className={`font-semibold ${deliveryMaxQty <= 0 ? 'text-red-600' : 'text-indigo-700'}`}>
                    {deliveryMaxQty}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">From Location</span>
                  <p className="font-semibold text-gray-700">CK Production</p>
                </div>
                <div>
                  <span className="text-gray-500">To Location</span>
                  <p className="font-semibold text-gray-700">CK Warehouse</p>
                </div>
              </div>
            </div>

            {deliveryMaxQty <= 0 ? (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-700 text-sm">
                All good quantity has already been transferred for this batch.
              </div>
            ) : (
              <form onSubmit={handleDeliverySubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transfer Quantity <span className="text-red-500">*</span>
                    <span className="text-xs text-gray-400 ml-1">(max: {deliveryMaxQty})</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={deliveryMaxQty}
                    value={deliveryTransferQty || ''}
                    onChange={(e) =>
                      setDeliveryTransferQty(parseInt(e.target.value) || 0)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>

                <div className="mb-5">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transfer Date &amp; Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={deliveryTransferDate}
                    onChange={(e) => setDeliveryTransferDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeliveryModal(false);
                      setSelectedBatchForDelivery(null);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={deliverySubmitting}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {deliverySubmitting ? 'Processing...' : 'Submit Transfer'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {showDetailModal && selectedBatchForDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Production Batch Details</h2>
              <button onClick={handleCloseDetailModal} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">Batch Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Batch Code:</span>
                    <p className="font-semibold text-purple-700">{selectedBatchForDetail.batch_code}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Status:</span>
                    <p>{getBatchStatusBadge(selectedBatchForDetail.status)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Product Name:</span>
                    <p className="font-semibold">{selectedBatchForDetail.product_name || '-'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Product Code:</span>
                    <p className="font-semibold">{selectedBatchForDetail.product_code || '-'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Produced Qty:</span>
                    <p className="font-semibold">{selectedBatchForDetail.produced_qty || '-'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Good Qty:</span>
                    <p className="font-semibold text-green-600">{selectedBatchForDetail.good_qty || '-'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Defect Qty:</span>
                    <p className="font-semibold text-red-600">{selectedBatchForDetail.defect_qty || '-'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Production Date:</span>
                    <p className="font-semibold">{formatDate(selectedBatchForDetail.production_date)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Expired Date:</span>
                    <p className="font-semibold">{formatDate(selectedBatchForDetail.expired_date)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Created By:</span>
                    <p className="font-semibold">{selectedBatchForDetail.created_by_username || '-'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Created At:</span>
                    <p className="font-semibold">{formatDate(selectedBatchForDetail.created_at)}</p>
                  </div>
                </div>
              </div>

              {selectedPlanForDetail && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">Production Plan Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-600">Plan Code:</span>
                      <p className="font-semibold text-blue-700">{selectedPlanForDetail.plan_code}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Plan Status:</span>
                      <p>{getStatusBadge(selectedPlanForDetail.status)}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Planned Qty:</span>
                      <p className="font-semibold">{selectedPlanForDetail.planned_qty}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Actual Qty:</span>
                      <p className="font-semibold">{selectedPlanForDetail.actual_qty || 0}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Variance Qty:</span>
                      <p className={`font-semibold ${
                        (selectedPlanForDetail.variance_qty || 0) < 0
                          ? 'text-red-600'
                          : (selectedPlanForDetail.variance_qty || 0) > 0
                          ? 'text-green-600'
                          : 'text-gray-600'
                      }`}>
                        {selectedPlanForDetail.variance_qty || 0}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Planned Date:</span>
                      <p className="font-semibold">{formatDate(selectedPlanForDetail.planned_date)}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Created At:</span>
                      <p className="font-semibold">{formatDate(selectedPlanForDetail.created_at)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={handleCloseDetailModal}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
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

export default ProductionBatchPage;
