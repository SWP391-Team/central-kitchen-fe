import { useState, useEffect } from 'react';
import { productionPlanService } from '@/api/services/productionPlanService';
import { productionBatchService } from '@/api/services/productionBatchService';
import { productService } from '@/api/services/productService';
import { batchTransferService } from '@/api/services/batchTransferService';
import {
  BatchStatusHistory,
  Product,
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
  const [products, setProducts] = useState<Product[]>([]);
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

  const [showFinishModal, setShowFinishModal] = useState(false);
  const [selectedBatchForFinish, setSelectedBatchForFinish] = useState<ProductionBatchWithDetails | null>(null);
  const [finishProducedQty, setFinishProducedQty] = useState<number>(0);
  const [finishProductionDate, setFinishProductionDate] = useState<string>('');
  const [finishExpiredDate, setFinishExpiredDate] = useState<string>('');
  const [isFinishExpiredDateManual, setIsFinishExpiredDateManual] = useState(false);
  const [finishSubmitting, setFinishSubmitting] = useState(false);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedBatchForDetail, setSelectedBatchForDetail] = useState<ProductionBatchWithDetails | null>(null);
  const [selectedPlanForDetail, setSelectedPlanForDetail] = useState<ProductionPlanWithProduct | null>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'history'>('info');
  const [batchHistory, setBatchHistory] = useState<BatchStatusHistory[]>([]);
  const [batchHistoryLoading, setBatchHistoryLoading] = useState(false);

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
      const data = await productService.getActiveProducts();
      setProducts(data);
    } catch (err: any) {
      console.error('Failed to load products:', err);
    }
  };

  const calculateExpiredDate = (productionDate: string, shelfLifeDays: number): string => {
    if (!productionDate || !shelfLifeDays || shelfLifeDays <= 0) return '';
    const date = new Date(`${productionDate}T00:00:00`);
    date.setDate(date.getDate() + shelfLifeDays);
    return date.toISOString().slice(0, 10);
  };

  const getShelfLifeDaysByBatch = (batch: ProductionBatchWithDetails): number => {
    const product = products.find((item) => item.product_id === batch.product_id);
    return product?.shelf_life_days || 0;
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

  const handleOpenFinishModal = (batch: ProductionBatchWithDetails) => {
    const today = new Date().toISOString().slice(0, 10);
    const shelfLifeDays = getShelfLifeDaysByBatch(batch);
    setSelectedBatchForFinish(batch);
    setFinishProducedQty(batch.produced_qty || 0);
    setFinishProductionDate(today);
    setFinishExpiredDate(calculateExpiredDate(today, shelfLifeDays));
    setIsFinishExpiredDateManual(false);
    setShowFinishModal(true);
  };

  const handleChangeFinishProductionDate = (value: string) => {
    setFinishProductionDate(value);

    if (!selectedBatchForFinish) {
      setFinishExpiredDate('');
      return;
    }

    if (!isFinishExpiredDateManual) {
      const shelfLifeDays = getShelfLifeDaysByBatch(selectedBatchForFinish);
      setFinishExpiredDate(calculateExpiredDate(value, shelfLifeDays));
    }
  };

  const handleChangeFinishExpiredDate = (value: string) => {
    setIsFinishExpiredDateManual(true);
    setFinishExpiredDate(value);
  };

  const handleResetAutoExpiredDate = () => {
    if (!selectedBatchForFinish) return;
    const shelfLifeDays = getShelfLifeDaysByBatch(selectedBatchForFinish);
    setIsFinishExpiredDateManual(false);
    setFinishExpiredDate(calculateExpiredDate(finishProductionDate, shelfLifeDays));
  };

  const handleFinishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchForFinish) return;

    if (!finishProducedQty || finishProducedQty <= 0) {
      showToast('Produced quantity must be greater than 0', 'error');
      return;
    }

    if (!finishProductionDate || !finishExpiredDate) {
      showToast('Production date and expired date are required', 'error');
      return;
    }

    try {
      setFinishSubmitting(true);
      await productionBatchService.finishProduction(selectedBatchForFinish.batch_id, {
        produced_qty: finishProducedQty,
        production_date: finishProductionDate,
        expired_date: finishExpiredDate,
      });

      showToast('Finish production successfully!', 'success');
      setShowFinishModal(false);
      setSelectedBatchForFinish(null);
      await loadPlans();
      if (activeTab === 'batches') {
        await loadAllBatches();
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to finish production';
      showToast(errorMessage, 'error');
      setError(errorMessage);
    } finally {
      setFinishSubmitting(false);
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

  const loadBatchHistory = async (batchId: number) => {
    try {
      setBatchHistoryLoading(true);
      const data = await productionBatchService.getBatchStatusHistory(batchId);
      setBatchHistory(data);
    } catch {
      setBatchHistory([]);
      showToast('Failed to load batch history', 'error');
    } finally {
      setBatchHistoryLoading(false);
    }
  };

  const handleOpenDetailModal = (batch: ProductionBatchWithDetails) => {
    setSelectedBatchForDetail(batch);
    setSelectedPlanForDetail(getPlanByIdFromBatch(batch.plan_id) || null);
    setDetailTab('info');
    void loadBatchHistory(batch.batch_id);
    setShowDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedBatchForDetail(null);
    setSelectedPlanForDetail(null);
    setBatchHistory([]);
    setDetailTab('info');
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

  const getHistoryTransitionNote = (oldStatus: string | null, newStatus: string): string => {
    const transition = `${oldStatus ?? 'null'}->${newStatus}`;
    const transitionNotes: Record<string, string> = {
      'null->producing': 'Batch created',
      'producing->produced': 'Production finished',
      'producing->cancelled': 'Batch cancelled',
      'produced->cancelled': 'Batch cancelled',
      'produced->waiting_qc': 'Sent to QC',
      'waiting_qc->produced': 'Undo send to QC',
      'waiting_qc->under_qc': 'Inspection started',
      'under_qc->rework_required': 'Rework requested',
      'qc_failed->under_qc': 'Reinspection started',
      'qc_passed->under_qc': 'Inspection undone',
      'rework_required->under_qc': 'Inspection undone',
      'rework_failed->under_qc': 'Inspection undone',
      'under_qc->qc_passed': 'Inspection passed',
      'under_qc->qc_failed': 'Inspection failed',
      'qc_failed->rework_required': 'Rework requested',
      'rework_required->reworking': 'Rework started',
      'reworking->reworked': 'Rework completed',
      'reworking->rework_failed': 'Rework failed',
      'reworked->waiting_qc': 'Sent to QC after rework',
      'waiting_qc->reworked': 'Undo rework from QC',
      'reworked->reworking': 'Undo rework completion',
      'rework_failed->reworking': 'Undo rework completion',
      'produced->delivering': 'Delivery started',
      'delivering->delivered': 'Delivery completed',
      'delivering->received': 'All transfers received',
      'delivered->received': 'All transfers received',
      'qc_failed->rejected': 'Batch rejected',
    };

    return transitionNotes[transition] || `Status changed: ${oldStatus ?? '-'} -> ${newStatus}`;
  };

  const getHistoryNote = (entry: BatchStatusHistory): string => {
    const trimmedNote = typeof entry.note === 'string' ? entry.note.trim() : '';
    if (trimmedNote) {
      return trimmedNote;
    }

    return getHistoryTransitionNote(entry.old_status ?? null, entry.new_status);
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
                                      onClick={() => handleOpenFinishModal(batch)}
                                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-semibold"
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

      {showFinishModal && selectedBatchForFinish && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Finish Production</h2>
              <button
                onClick={() => {
                  setShowFinishModal(false);
                  setSelectedBatchForFinish(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4 text-sm space-y-1">
              <p><span className="text-gray-500">Batch:</span> <span className="font-semibold text-purple-700">{selectedBatchForFinish.batch_code}</span></p>
              <p><span className="text-gray-500">Product:</span> <span className="font-semibold">{selectedBatchForFinish.product_name || '-'}</span></p>
              <p><span className="text-gray-500">Shelf Life:</span> <span className="font-semibold text-indigo-700">{getShelfLifeDaysByBatch(selectedBatchForFinish) || '-'} days</span></p>
            </div>

            <form onSubmit={handleFinishSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Produced Quantity</label>
                <input
                  type="number"
                  min={1}
                  value={finishProducedQty || ''}
                  onChange={(e) => setFinishProducedQty(parseInt(e.target.value || '0', 10))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Production Date</label>
                <input
                  type="date"
                  value={finishProductionDate}
                  onChange={(e) => handleChangeFinishProductionDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expired Date</label>
                <input
                  type="date"
                  value={finishExpiredDate}
                  onChange={(e) => handleChangeFinishExpiredDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="text-xs text-gray-500">
                    {isFinishExpiredDateManual
                      ? 'Manual override enabled. Click Reset Auto to recalculate from shelf life.'
                      : 'Auto-calculated from Production Date + Shelf Life (days).'}
                  </p>
                  {isFinishExpiredDateManual && (
                    <button
                      type="button"
                      onClick={handleResetAutoExpiredDate}
                      className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
                    >
                      Reset Auto
                    </button>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowFinishModal(false);
                    setSelectedBatchForFinish(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={finishSubmitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {finishSubmitting ? 'Processing...' : 'Finish Production'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-hidden flex flex-col border border-slate-200">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-slate-50 to-blue-50">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Production Batch Details</h2>
                <p className="text-sm text-gray-600 mt-1">{selectedBatchForDetail.batch_code}</p>
              </div>
              <button onClick={handleCloseDetailModal} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="px-6 pt-4">
              <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200">
                <button
                  onClick={() => setDetailTab('info')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    detailTab === 'info'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  Info
                </button>
                <button
                  onClick={() => setDetailTab('history')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    detailTab === 'history'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  History
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4">
              {detailTab === 'info' && (
                <>
                  <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Batch Information</h3>
                    <div className="grid md:grid-cols-2 gap-4">
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
                    <div className="rounded-xl border border-gray-200 bg-white p-5">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Production Plan Information</h3>
                      <div className="grid md:grid-cols-2 gap-4">
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
                </>
              )}

              {detailTab === 'history' && (
                <div className="rounded-xl border border-gray-200 bg-white p-5">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Batch Status Timeline</h3>

                  {batchHistoryLoading ? (
                    <div className="text-sm text-gray-500 py-8 text-center">Loading history...</div>
                  ) : batchHistory.length === 0 ? (
                    <div className="text-sm text-gray-500 py-8 text-center">
                      No status history found for this batch.
                    </div>
                  ) : (
                    <ol className="relative border-s border-slate-200 ms-3 space-y-6">
                      {batchHistory.map((entry) => (
                        <li key={entry.batch_status_history_id} className="ms-6">
                          <span className="absolute -start-2.5 mt-1.5 h-4 w-4 rounded-full bg-blue-500 ring-4 ring-white" />

                          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="text-sm font-semibold text-slate-900">
                                {entry.old_status ? (
                                  <>
                                    <span className="text-slate-600">{entry.old_status}</span>
                                    <span className="mx-2 text-slate-400">→</span>
                                  </>
                                ) : (
                                  <span className="text-slate-500 me-2">Initial</span>
                                )}
                                <span className="text-blue-700">{entry.new_status}</span>
                              </div>
                              <span className="text-xs text-slate-500">
                                {new Date(entry.changed_at).toLocaleString()}
                              </span>
                            </div>

                            <div className="mt-2 text-sm text-slate-600">
                              Changed by: <span className="font-medium text-slate-800">{entry.changed_by_username || entry.changed_by || '-'}</span>
                            </div>

                            <div className="mt-2 text-sm text-slate-700 bg-white border border-slate-200 rounded p-2">
                              <span className="font-medium text-slate-800">Note: </span>
                              {getHistoryNote(entry)}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
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
