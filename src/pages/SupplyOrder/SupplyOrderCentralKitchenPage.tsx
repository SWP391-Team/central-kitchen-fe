import { useState, useEffect } from 'react';
import { supplyOrderService } from '@/api/services/supplyOrderService';
import { 
  SupplyOrder, 
  SupplyOrderDetailResponse,
  ReviewItemRequest
} from '@/api/types';
import { useAuth } from '@/contexts/AuthContext';
import { EyeIcon, XMarkIcon, TruckIcon } from '@heroicons/react/24/outline';

interface ReviewState {
  [key: number]: {
    action: 'APPROVE' | 'PARTLY_APPROVE' | 'REJECT' | '';
    approved_quantity?: number;
  };
}

const SupplyOrderCentralKitchenPage = () => {
  const { isAdmin, isCentralStaff } = useAuth();
  const [orders, setOrders] = useState<SupplyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SupplyOrderDetailResponse | null>(null);
  const [reviewState, setReviewState] = useState<ReviewState>({});
  const [approveAll, setApproveAll] = useState(false);
  const [rejectAll, setRejectAll] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await supplyOrderService.getAllSupplyOrdersCentral();
      setOrders(data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load supply orders');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewOrder = async (orderId: number) => {
    try {
      const data = await supplyOrderService.getSupplyOrderByIdCentral(orderId);
      setSelectedOrder(data);
      
      const initialState: ReviewState = {};
      data.items.forEach(item => {
        initialState[item.supply_order_item_id] = { action: '' };
      });
      setReviewState(initialState);
      setApproveAll(false);
      setRejectAll(false);
      setShowReviewModal(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load order details');
    }
  };

  const handleViewDetails = async (orderId: number) => {
    try {
      const data = await supplyOrderService.getSupplyOrderByIdCentral(orderId);
      setSelectedOrder(data);
      setShowDetailModal(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load order details');
    }
  };

  const handleApproveAll = () => {
    if (!selectedOrder) return;
    
    const newState: ReviewState = {};
    selectedOrder.items.forEach(item => {
      newState[item.supply_order_item_id] = { 
        action: 'APPROVE',
        approved_quantity: item.requested_quantity
      };
    });
    setReviewState(newState);
    setApproveAll(true);
    setRejectAll(false);
  };

  const handleRejectAll = () => {
    if (!selectedOrder) return;
    
    const newState: ReviewState = {};
    selectedOrder.items.forEach(item => {
      newState[item.supply_order_item_id] = { action: 'REJECT' };
    });
    setReviewState(newState);
    setRejectAll(true);
    setApproveAll(false);
  };

  const handleItemActionChange = (itemId: number, action: 'APPROVE' | 'PARTLY_APPROVE' | 'REJECT') => {
    setReviewState(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], action }
    }));
    setApproveAll(false);
    setRejectAll(false);
  };

  const handleApprovedQuantityChange = (itemId: number, quantity: number) => {
    setReviewState(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], approved_quantity: quantity }
    }));
  };

  const handleSubmitReview = async () => {
    if (!selectedOrder) return;

    try {
      const items: ReviewItemRequest[] = [];
      
      const productQuantityMap = new Map<number, { total: number; name: string; unit: string }>();

      for (const item of selectedOrder.items) {
        const state = reviewState[item.supply_order_item_id];
        if (!state || !state.action) {
          setError('Please select an action for all items');
          return;
        }

        if (state.action === 'PARTLY_APPROVE') {
          if (!state.approved_quantity || state.approved_quantity <= 0 || state.approved_quantity >= item.requested_quantity) {
            setError(`Approved quantity must be greater than 0 and less than requested quantity (${item.requested_quantity}) for item ${item.product_name}`);
            return;
          }
        }

        if (state.action === 'APPROVE' || state.action === 'PARTLY_APPROVE') {
          const approvedQty = state.action === 'APPROVE' ? item.requested_quantity : (state.approved_quantity || 0);
          const current = productQuantityMap.get(item.product_id) || { total: 0, name: item.product_name || '', unit: item.unit || '' };
          productQuantityMap.set(item.product_id, {
            total: current.total + approvedQty,
            name: item.product_name || '',
            unit: item.unit || ''
          });
        }

        items.push({
          supply_order_item_id: item.supply_order_item_id,
          action: state.action,
          approved_quantity: state.action === 'PARTLY_APPROVE' ? state.approved_quantity : undefined
        });
      }

      await supplyOrderService.reviewSupplyOrder(selectedOrder.supply_order_id, { items });
      setShowReviewModal(false);
      setSelectedOrder(null);
      setReviewState({});
      setError('');
      loadOrders();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to review supply order');
    }
  };

  const handleStartDelivery = async (orderId: number) => {
    if (!confirm('Are you sure you want to start delivery for this order?')) {
      return;
    }

    try {
      await supplyOrderService.startDelivery(orderId);
      setError('');
      loadOrders();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to start delivery');
    }
  };

  const getStatusBadgeClass = (status: string) => {
    const baseClass = 'px-3 py-1 rounded-full text-xs font-semibold';
    switch (status) {
      case 'SUBMITTED':
        return `${baseClass} bg-blue-100 text-blue-800`;
      case 'APPROVED':
        return `${baseClass} bg-green-100 text-green-800`;
      case 'PARTLY_APPROVED':
        return `${baseClass} bg-yellow-100 text-yellow-800`;
      case 'REJECTED':
        return `${baseClass} bg-red-100 text-red-800`;
      case 'DELIVERING':
        return `${baseClass} bg-purple-100 text-purple-800`;
      case 'DELIVERED':
        return `${baseClass} bg-gray-100 text-gray-800`;
      default:
        return `${baseClass} bg-gray-100 text-gray-800`;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'SUBMITTED': return 'Submitted';
      case 'APPROVED': return 'Approved';
      case 'PARTLY_APPROVED': return 'Partly Approved';
      case 'REJECTED': return 'Rejected';
      case 'DELIVERING': return 'Delivering';
      case 'DELIVERED': return 'Delivered';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Supply Order - Central Kitchen</h1>
        <p className="text-gray-600 mt-1">
          {isAdmin ? 'View all supply orders (Read-only)' : 'Review and manage supply orders from all stores'}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Order ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Supply Order Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Store
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created By
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created At
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
            {orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  No supply orders found
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.supply_order_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{order.supply_order_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-700">
                    {order.supply_order_code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.store_name || `Store ${order.store_id}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.created_by_username || `User ${order.created_by}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(order.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={getStatusBadgeClass(order.status)}>
                      {getStatusText(order.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleViewDetails(order.supply_order_id)}
                        className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                      >
                        <EyeIcon className="w-4 h-4" />
                        <span>View</span>
                      </button>
                      {isCentralStaff && order.status === 'SUBMITTED' && (
                        <button
                          onClick={() => handleReviewOrder(order.supply_order_id)}
                          className="text-green-600 hover:text-green-900 flex items-center space-x-1"
                        >
                          <EyeIcon className="w-4 h-4" />
                          <span>Review Order</span>
                        </button>
                      )}
                      {isCentralStaff && (order.status === 'APPROVED' || order.status === 'PARTLY_APPROVED') && (
                        <button
                          onClick={() => handleStartDelivery(order.supply_order_id)}
                          className="text-purple-600 hover:text-purple-900 flex items-center space-x-1"
                        >
                          <TruckIcon className="w-4 h-4" />
                          <span>Start Delivery</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Review Order Modal */}
      {showReviewModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Review Order #{selectedOrder.supply_order_id}</h2>
                <p className="text-sm text-gray-600">
                  <span className="font-semibold text-indigo-700">{selectedOrder.supply_order_code}</span> - Store: {selectedOrder.store_name || `Store ${selectedOrder.store_id}`}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setSelectedOrder(null);
                  setReviewState({});
                  setError('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
                {error}
              </div>
            )}

            {/* Approve All / Reject All */}
            <div className="mb-4 flex space-x-3">
              <button
                onClick={handleApproveAll}
                className={`px-4 py-2 rounded-lg border-2 ${approveAll ? 'bg-green-50 border-green-500 text-green-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                ✓ Approve All
              </button>
              <button
                onClick={handleRejectAll}
                className={`px-4 py-2 rounded-lg border-2 ${rejectAll ? 'bg-red-50 border-red-500 text-red-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                ✗ Reject All
              </button>
            </div>

            {/* Items Table */}
            <div className="border rounded-lg overflow-hidden mb-6">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product Code</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Requested Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Available Qty</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Approve</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Partly Approve</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Reject</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Approved Qty</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedOrder.items.map((item) => {
                    const state = reviewState[item.supply_order_item_id] || { action: '' };
                    return (
                      <tr key={item.supply_order_item_id}>
                        <td className="px-4 py-3 text-sm font-bold text-blue-700">{item.product_code || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.product_name}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.unit}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.requested_quantity}</td>
                        <td className="px-4 py-3 text-sm text-right">
                          <span className={`font-semibold ${
                            (item.available_quantity || 0) >= item.requested_quantity 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }`}>
                            {item.available_quantity || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="radio"
                            name={`action_${item.supply_order_item_id}`}
                            checked={state.action === 'APPROVE'}
                            onChange={() => handleItemActionChange(item.supply_order_item_id, 'APPROVE')}
                            className="w-4 h-4 text-green-600"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="radio"
                            name={`action_${item.supply_order_item_id}`}
                            checked={state.action === 'PARTLY_APPROVE'}
                            onChange={() => handleItemActionChange(item.supply_order_item_id, 'PARTLY_APPROVE')}
                            className="w-4 h-4 text-yellow-600"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="radio"
                            name={`action_${item.supply_order_item_id}`}
                            checked={state.action === 'REJECT'}
                            onChange={() => handleItemActionChange(item.supply_order_item_id, 'REJECT')}
                            className="w-4 h-4 text-red-600"
                          />
                        </td>
                        <td className="px-4 py-3">
                          {state.action === 'PARTLY_APPROVE' && (
                            <input
                              type="number"
                              min="1"
                              max={item.requested_quantity - 1}
                              value={state.approved_quantity || ''}
                              onChange={(e) => handleApprovedQuantityChange(item.supply_order_item_id, parseInt(e.target.value))}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                              placeholder="Qty"
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="flex space-x-3">
              <button
                onClick={handleSubmitReview}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Submit Review
              </button>
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setSelectedOrder(null);
                  setReviewState({});
                  setError('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Supply Order Details</h2>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedOrder(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-600">Order ID</p>
                <p className="text-lg font-semibold">#{selectedOrder.supply_order_id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Supply Order Code</p>
                <p className="text-lg font-bold text-indigo-700">{selectedOrder.supply_order_code}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <span className={getStatusBadgeClass(selectedOrder.status)}>
                  {getStatusText(selectedOrder.status)}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Store</p>
                <p className="text-lg font-semibold">
                  {selectedOrder.store_name || `Store ${selectedOrder.store_id}`}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Created By</p>
                <p className="text-lg font-semibold">
                  {selectedOrder.created_by_username || `User ${selectedOrder.created_by}`}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Created At</p>
                <p className="text-lg font-semibold">{formatDate(selectedOrder.created_at)}</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Order Items & Batch Allocations</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Product Code
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Product
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Unit
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Batch Code
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Requested Qty
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Approved Qty
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedOrder.items.map((item) => {
                      const hasBatches = item.batches && item.batches.length > 0;
                      
                      if (!hasBatches) {
                        return (
                          <tr key={item.supply_order_item_id}>
                            <td className="px-4 py-3 text-sm font-bold text-blue-700">
                              {item.product_code || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {item.product_name || `Product ${item.product_id}`}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.unit || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-500 italic">-</td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">
                              {item.requested_quantity}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">
                              {item.approved_quantity ?? '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {item.status || 'Pending'}
                            </td>
                          </tr>
                        );
                      }
                      
                      // Show one row per batch
                      return item.batches!.map((batch, batchIndex) => (
                        <tr key={`${item.supply_order_item_id}-${batch.item_batch_id}`} className={batchIndex > 0 ? 'bg-gray-50' : ''}>
                          {batchIndex === 0 ? (
                            <>
                              <td rowSpan={item.batches!.length} className="px-4 py-3 text-sm font-bold text-blue-700 border-r border-gray-200">
                                {item.product_code || '-'}
                              </td>
                              <td rowSpan={item.batches!.length} className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200">
                                {item.product_name || `Product ${item.product_id}`}
                              </td>
                              <td rowSpan={item.batches!.length} className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200">
                                {item.unit || '-'}
                              </td>
                            </>
                          ) : null}
                          <td className="px-4 py-3 text-sm font-semibold text-purple-700">
                            {batch.batch_code || `Batch ${batch.batch_id}`}
                          </td>
                          {batchIndex === 0 ? (
                            <td rowSpan={item.batches!.length} className="px-4 py-3 text-sm text-gray-900 text-right border-l border-gray-200">
                              {item.requested_quantity}
                            </td>
                          ) : null}
                          <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                            {batch.quantity}
                          </td>
                          {batchIndex === 0 ? (
                            <td rowSpan={item.batches!.length} className="px-4 py-3 text-sm text-gray-500 border-l border-gray-200">
                              {item.status || 'Pending'}
                            </td>
                          ) : null}
                        </tr>
                      ));
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedOrder(null);
                }}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
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

export default SupplyOrderCentralKitchenPage;
