import { useState, useEffect } from 'react';
import { supplyOrderService } from '@/api/services/supplyOrderService';
import { productService } from '@/api/services/productService';
import { 
  SupplyOrder, 
  SupplyOrderCreateRequest, 
  Product,
  SupplyOrderDetailResponse
} from '@/api/types';
import { useAuth } from '@/contexts/AuthContext';
import { PlusIcon, TrashIcon, EyeIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface OrderItem {
  product_id: number;
  requested_quantity: number;
  product_name?: string;
  unit?: string;
}

const SupplyOrderStorePage = () => {
  const { isAdmin, isStoreStaff } = useAuth();
  const [orders, setOrders] = useState<SupplyOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SupplyOrderDetailResponse | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([{ product_id: 0, requested_quantity: 1 }]);
  const [confirmingReceived, setConfirmingReceived] = useState<number | null>(null);

  useEffect(() => {
    loadOrders();
    loadProducts();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await supplyOrderService.getAllSupplyOrders();
      setOrders(data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load supply orders');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await productService.getActiveProducts();
      console.log('Loaded products:', data); // Debug log
      setProducts(data);
    } catch (err: any) {
      console.error('Failed to load products:', err);
      setError('Failed to load products');
    }
  };

  const handleAddItem = () => {
    setOrderItems([...orderItems, { product_id: 0, requested_quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (orderItems.length > 1) {
      setOrderItems(orderItems.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: keyof OrderItem, value: number) => {
    const newItems = [...orderItems];
    (newItems[index][field] as number) = value;
    setOrderItems(newItems);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    const validItems = orderItems.filter(item => item.product_id > 0 && item.requested_quantity > 0);
    
    if (validItems.length === 0) {
      setError('Please add at least one valid item');
      return;
    }

    // Check for duplicate products
    const productIds = validItems.map(item => item.product_id);
    const uniqueProductIds = new Set(productIds);
    if (productIds.length !== uniqueProductIds.size) {
      setError('Cannot select the same product twice');
      return;
    }

    try {
      const requestData: SupplyOrderCreateRequest = {
        items: validItems.map(item => ({
          product_id: item.product_id,
          requested_quantity: item.requested_quantity
        }))
      };

      await supplyOrderService.createSupplyOrder(requestData);
      setShowCreateModal(false);
      setOrderItems([{ product_id: 0, requested_quantity: 1 }]);
      loadOrders();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create supply order');
    }
  };

  const handleViewDetails = async (orderId: number) => {
    try {
      const data = await supplyOrderService.getSupplyOrderById(orderId);
      setSelectedOrder(data);
      setShowDetailModal(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load order details');
    }
  };

  const handleConfirmReceived = async (orderId: number) => {
    if (!window.confirm('Confirm that you have received this order? Inventory will be updated.')) {
      return;
    }

    try {
      setConfirmingReceived(orderId);
      setError('');
      await supplyOrderService.confirmReceived(orderId);
      await loadOrders(); // Reload list
      alert('Order confirmed as received and inventory updated successfully!');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to confirm received');
      alert(err.response?.data?.message || 'Failed to confirm received');
    } finally {
      setConfirmingReceived(null);
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Supply Order - Store</h1>
            <p className="text-gray-600 mt-1">
              {isAdmin ? 'View all store supply orders (Read-only)' : 'Manage your store supply orders'}
            </p>
          </div>
          {isStoreStaff && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <PlusIcon className="w-5 h-5" />
              <span>Create Supply Order</span>
            </button>
          )}
        </div>
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
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  No supply orders found
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.supply_order_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{order.supply_order_id}
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
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewDetails(order.supply_order_id)}
                        className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                      >
                        <EyeIcon className="w-4 h-4" />
                        <span>View</span>
                      </button>
                      {isStoreStaff && order.status === 'DELIVERING' && (
                        <button
                          onClick={() => handleConfirmReceived(order.supply_order_id)}
                          disabled={confirmingReceived === order.supply_order_id}
                          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-xs font-semibold"
                        >
                          {confirmingReceived === order.supply_order_id ? 'Processing...' : 'Confirm Received'}
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

      {/* Create Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Create Supply Order</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setOrderItems([{ product_id: 0, requested_quantity: 1 }]);
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

            <form onSubmit={handleCreateOrder}>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">Available products: {products.length}</p>
                {orderItems.map((item, index) => (
                  <div key={index} className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Product
                      </label>
                      <select
                        value={item.product_id}
                        onChange={(e) => handleItemChange(index, 'product_id', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    <div className="w-32">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={item.requested_quantity}
                        onChange={(e) => handleItemChange(index, 'requested_quantity', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    {orderItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="mt-6 text-red-600 hover:text-red-800"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                className="mt-4 w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 flex items-center justify-center space-x-2"
              >
                <PlusIcon className="w-5 h-5" />
                <span>Add Another Item</span>
              </button>

              <div className="flex space-x-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Order
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setOrderItems([{ product_id: 0, requested_quantity: 1 }]);
                    setError('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
              <h3 className="text-lg font-bold text-gray-800 mb-4">Order Items</h3>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Product
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Unit
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
                  {selectedOrder.items.map((item) => (
                    <tr key={item.supply_order_item_id}>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {item.product_name || `Product ${item.product_id}`}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.unit || '-'}</td>
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
                  ))}
                </tbody>
              </table>
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

export default SupplyOrderStorePage;
