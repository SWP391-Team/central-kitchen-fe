import { useState, useEffect, useCallback } from 'react';
import { productionPlanService } from '@/api/services/productionPlanService';
import { productionBatchService } from '@/api/services/productionBatchService';
import { productService } from '@/api/services/productService';
import { ProductionPlanWithProduct, ProductionPlanCreateRequest, Product, ProductionBatchWithDetails } from '@/api/types';
import { useToast } from '@/contexts/ToastContext';
import { MagnifyingGlassIcon, PlusIcon, XCircleIcon, EyeIcon, XMarkIcon } from '@heroicons/react/24/outline';

const ProductionPlanPage = () => {
  const [plans, setPlans] = useState<ProductionPlanWithProduct[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'planned_date' | 'created_at' | 'plan_code'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<ProductionPlanCreateRequest>({
    product_id: 0,
    planned_qty: 0,
    planned_date: new Date().toISOString().split('T')[0], 
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedPlanForDetail, setSelectedPlanForDetail] = useState<ProductionPlanWithProduct | null>(null);
  const [planBatches, setPlanBatches] = useState<ProductionBatchWithDetails[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);

  const { showToast } = useToast();

  // Debounce search term
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      if (searchTerm !== debouncedSearchTerm) {
        setCurrentPage(1); // Reset to page 1 when search changes
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const loadProductionPlans = useCallback(async () => {
    try {
      setLoading(true);
      const result = await productionPlanService.getProductionPlans({
        search: debouncedSearchTerm || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        sortBy,
        sortOrder,
        page: currentPage,
        limit: pageSize,
      });
      setPlans(result.data);
      setTotal(result.pagination.total);
      setTotalPages(result.pagination.totalPages);
    } catch (error: any) {
      console.error('Error loading production plans:', error);
      showToast(error.response?.data?.message || 'Failed to load production plans', 'error');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchTerm, statusFilter, sortBy, sortOrder, currentPage]);

  const loadProducts = useCallback(async () => {
    try {
      const productsData = await productService.getActiveProducts();
      setProducts(productsData);
    } catch (error: any) {
      console.error('Error loading products:', error);
      showToast('Failed to load products', 'error');
    }
  }, []);

  useEffect(() => {
    loadProductionPlans();
  }, [loadProductionPlans]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const openCreateModal = () => {
    setFormData({
      product_id: 0,
      planned_qty: 0,
      planned_date: new Date().toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({
      product_id: 0,
      planned_qty: 0,
      planned_date: new Date().toISOString().split('T')[0],
    });
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.product_id || formData.product_id === 0) {
      showToast('Please select a product', 'error');
      return;
    }

    if (!formData.planned_qty || formData.planned_qty <= 0) {
      showToast('Planned quantity must be greater than 0', 'error');
      return;
    }

    if (!Number.isInteger(formData.planned_qty)) {
      showToast('Planned quantity must be an integer', 'error');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const plannedDate = new Date(formData.planned_date);
    
    if (plannedDate < today) {
      showToast('Planned date cannot be in the past', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      await productionPlanService.createProductionPlan(formData);
      showToast('Production plan created successfully', 'success');
      closeModal();
      loadProductionPlans();
    } catch (error: any) {
      console.error('Error creating production plan:', error);
      showToast(error.response?.data?.message || 'Failed to create production plan', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (planId: number, planCode: string) => {
    if (window.confirm(`Are you sure you want to cancel production plan ${planCode}?`)) {
      try {
        await productionPlanService.cancelProductionPlan(planId);
        showToast('Production plan cancelled successfully', 'success');
        loadProductionPlans();
      } catch (error: any) {
        console.error('Error cancelling production plan:', error);
        showToast(error.response?.data?.message || 'Failed to cancel production plan', 'error');
      }
    }
  };

  const handleClose = async (planId: number, planCode: string) => {
    if (window.confirm(`Are you sure you want to close production plan ${planCode}? This action cannot be undone.`)) {
      try {
        await productionPlanService.closeProductionPlan(planId);
        showToast('Production plan closed successfully', 'success');
        loadProductionPlans();
      } catch (error: any) {
        console.error('Error closing production plan:', error);
        showToast(error.response?.data?.message || 'Failed to close production plan', 'error');
      }
    }
  };

  const handleRelease = async (planId: number, planCode: string) => {
    if (window.confirm(`Are you sure you want to release production plan ${planCode}?`)) {
      try {
        await productionPlanService.releasePlan(planId);
        showToast('Production plan released successfully', 'success');
        loadProductionPlans();
      } catch (error: any) {
        console.error('Error releasing production plan:', error);
        showToast(error.response?.data?.message || 'Failed to release production plan', 'error');
      }
    }
  };

  const handleViewDetail = async (plan: ProductionPlanWithProduct) => {
    setSelectedPlanForDetail(plan);
    setIsDetailModalOpen(true);
    setLoadingBatches(true);
    try {
      const batches = await productionBatchService.getBatchesByPlanId(plan.plan_id);
      setPlanBatches(batches);
    } catch (error: any) {
      console.error('Error loading batches:', error);
      showToast('Failed to load batches', 'error');
      setPlanBatches([]);
    } finally {
      setLoadingBatches(false);
    }
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedPlanForDetail(null);
    setPlanBatches([]);
  };

  const getBatchStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      producing: { label: 'Producing', className: 'bg-orange-100 text-orange-700' },
      produced: { label: 'Produced', className: 'bg-green-100 text-green-700' },
    };

    const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800' };

    return (
      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700' },
      planned: { label: 'Planned', className: 'bg-blue-100 text-blue-800' },
      in_production: { label: 'In Production', className: 'bg-yellow-100 text-yellow-800' },
      completed: { label: 'Completed', className: 'bg-green-100 text-green-800' },
      closed: { label: 'Closed', className: 'bg-gray-100 text-gray-800' },
      cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-500' },
    };

    const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800' };

    return (
      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Production Plan</h1>
      </div>

      {/* Action Bar */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          Create Production Plan
        </button>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search plans..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Filters and Sort */}
      <div className="mb-6 flex flex-wrap gap-4">
        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All</option>
            <option value="draft">Draft</option>
            <option value="planned">Planned</option>
            <option value="in_production">In Production</option>
            <option value="completed">Completed</option>
            <option value="closed">Closed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Sort By */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'planned_date' | 'created_at' | 'plan_code')}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="created_at">Created At</option>
            <option value="planned_date">Planned Date</option>
            <option value="plan_code">Plan Code</option>
          </select>
        </div>

        {/* Sort Order */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading production plans...</p>
        </div>
      ) : plans.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <p>No production plans found</p>
        </div>
      ) : (
        <>
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plan Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Planned Qty
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actual Qty
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Variance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Planned Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {plans.map((plan) => (
                  <tr key={plan.plan_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {plan.plan_code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {plan.product_name} ({plan.product_code})
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {plan.planned_qty}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                      {plan.actual_qty || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <span className={`font-semibold ${
                        (plan.variance_qty || 0) < 0 ? 'text-red-600' : 
                        (plan.variance_qty || 0) > 0 ? 'text-green-600' : 
                        'text-gray-600'
                      }`}>
                        {plan.variance_qty || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(plan.planned_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getStatusBadge(plan.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(plan.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewDetail(plan)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="View Details"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                        {plan.status === 'draft' && (
                          <button
                            onClick={() => handleRelease(plan.plan_id, plan.plan_code)}
                            className="text-green-600 hover:text-green-800 flex items-center gap-1"
                            title="Release Plan"
                          >
                            <XCircleIcon className="h-5 w-5" />
                            Release Plan
                          </button>
                        )}
                        {plan.status === 'planned' && (
                          <button
                            onClick={() => handleCancel(plan.plan_id, plan.plan_code)}
                            className="text-red-600 hover:text-red-800 flex items-center gap-1"
                            title="Cancel"
                          >
                            <XCircleIcon className="h-5 w-5" />
                            Cancel
                          </button>
                        )}
                        {plan.status === 'in_production' && (
                          <button
                            onClick={() => handleClose(plan.plan_id, plan.plan_code)}
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            title="Close"
                          >
                            <XCircleIcon className="h-5 w-5" />
                            Close
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {(currentPage - 1) * pageSize + 1} to{' '}
                {Math.min(currentPage * pageSize, total)} of {total} results
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <div className="flex items-center gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => {
                      return (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      );
                    })
                    .map((page, index, array) => {
                      if (index > 0 && array[index - 1] !== page - 1) {
                        return (
                          <span key={`ellipsis-${page}`} className="px-2">
                            ...
                          </span>
                        );
                      }
                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`px-4 py-2 border rounded-lg ${
                            currentPage === page
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                </div>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Create Production Plan</h2>
            </div>
            <form onSubmit={handleCreateSubmit}>
              <div className="px-6 py-4 space-y-4">
                {/* Product Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.product_id}
                    onChange={(e) =>
                      setFormData({ ...formData, product_id: parseInt(e.target.value) })
                    }
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value={0}>Select a product</option>
                    {products.map((product) => (
                      <option key={product.product_id} value={product.product_id}>
                        {product.product_name} ({product.product_code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Planned Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Planned Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.planned_qty || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, planned_qty: parseInt(e.target.value) || 0 })
                    }
                    min="1"
                    step="1"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Planned Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Planned Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.planned_date}
                    onChange={(e) => setFormData({ ...formData, planned_date: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {isDetailModalOpen && selectedPlanForDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Production Plan Details</h2>
              <button
                onClick={closeDetailModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              <div className="px-6 py-4">
                {/* Plan Information */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Plan Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Plan Code</p>
                      <p className="text-base font-semibold text-gray-900">{selectedPlanForDetail.plan_code}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <div className="mt-1">{getStatusBadge(selectedPlanForDetail.status)}</div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Product</p>
                      <p className="text-base font-semibold text-gray-900">
                        {selectedPlanForDetail.product_name}
                      </p>
                      <p className="text-sm text-gray-500">{selectedPlanForDetail.product_code}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Planned Date</p>
                      <p className="text-base font-semibold text-gray-900">
                        {formatDate(selectedPlanForDetail.planned_date)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Planned Quantity</p>
                      <p className="text-base font-semibold text-gray-900">
                        {selectedPlanForDetail.planned_qty}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Actual Quantity</p>
                      <p className="text-base font-semibold text-gray-900">
                        {selectedPlanForDetail.actual_qty || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Variance</p>
                      <p className={`text-base font-semibold ${
                        (selectedPlanForDetail.variance_qty || 0) < 0 ? 'text-red-600' : 
                        (selectedPlanForDetail.variance_qty || 0) > 0 ? 'text-green-600' : 
                        'text-gray-600'
                      }`}>
                        {selectedPlanForDetail.variance_qty || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Created At</p>
                      <p className="text-base font-semibold text-gray-900">
                        {formatDate(selectedPlanForDetail.created_at)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Batches List */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Production Batches</h3>
                  {loadingBatches ? (
                    <div className="text-center py-8">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <p className="mt-2 text-gray-600">Loading batches...</p>
                    </div>
                  ) : planBatches.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <p className="text-gray-500">No batches created yet</p>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Batch Code</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Produced Qty</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Production Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Expired Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Status</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {planBatches.map((batch) => (
                            <tr key={batch.batch_id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-semibold text-purple-700">
                                {batch.batch_code}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {batch.produced_qty || '-'}
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
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={closeDetailModal}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
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

export default ProductionPlanPage;
