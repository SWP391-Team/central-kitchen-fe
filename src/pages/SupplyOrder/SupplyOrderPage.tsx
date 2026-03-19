import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircleIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  PlusIcon,
  TruckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {
  CkInventoryRow,
  CreateSupplyOrderRequest,
  Location,
  Product,
  RequesterSuggestion,
  SupplyOrder,
  SupplyOrderDetailResponse,
  SupplyOrderItem,
  SupplyOrderStatus,
} from '@/api/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { supplyOrderService } from '@/api/services/supplyOrderService';
import { productService } from '@/api/services/productService';
import { locationService } from '@/api/services/locationService';
import { formatProductWithUnit } from '@/utils/productDisplay';

const ORDER_STATUSES: Array<'all' | SupplyOrderStatus> = [
  'all',
  'Draft',
  'Pending',
  'Approved',
  'Rejected',
  'Partly Delivered',
  'Delivered',
  'Closed',
];

const CLOSE_REASONS = ['Out of stock', 'Production issue', 'No longer needed', 'Other'] as const;

type CreateItemRow = {
  product_id: number | null;
  requested_qty: number;
};

type DeliveryDraft = {
  orderId: number;
  item: SupplyOrderItem;
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString();
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  return new Date(value).toLocaleString();
};

const formatDateOnly = (value?: string | null) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString();
};

const getStatusBadgeClass = (status: string) => {
  const map: Record<string, string> = {
    Draft: 'bg-gray-100 text-gray-700',
    Pending: 'bg-yellow-100 text-yellow-700',
    Approved: 'bg-blue-100 text-blue-700',
    Rejected: 'bg-red-100 text-red-700',
    'Partly Delivered': 'bg-indigo-100 text-indigo-700',
    Delivered: 'bg-green-100 text-green-700',
    Closed: 'bg-slate-200 text-slate-800',
    ApprovedItem: 'bg-emerald-100 text-emerald-700',
  };

  return map[status] || 'bg-gray-100 text-gray-700';
};

const SupplyOrderPage = () => {
  const { user, isAdmin, isCentralStaff, isStoreStaff } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'ck-inventory' | 'supply-order'>('ck-inventory');

  const [orders, setOrders] = useState<SupplyOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [totalOrders, setTotalOrders] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const [search, setSearch] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SupplyOrderStatus>('all');
  const [locationFilter, setLocationFilter] = useState<number | 'all'>('all');

  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<SupplyOrderDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [locations, setLocations] = useState<Location[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [ckInventoryRows, setCkInventoryRows] = useState<CkInventoryRow[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [requestedByInput, setRequestedByInput] = useState('');
  const [selectedRequesterUserId, setSelectedRequesterUserId] = useState<number | null>(null);
  const [requesterSuggestions, setRequesterSuggestions] = useState<RequesterSuggestion[]>([]);
  const [showRequesterSuggestions, setShowRequesterSuggestions] = useState(false);
  const [requesterKeywordDebounce, setRequesterKeywordDebounce] = useState('');
  const [createNote, setCreateNote] = useState('');
  const [createItems, setCreateItems] = useState<CreateItemRow[]>([{ product_id: null, requested_qty: 1 }]);
  const [creating, setCreating] = useState(false);

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveOrder, setApproveOrder] = useState<SupplyOrderDetailResponse | null>(null);
  const [approveQtyMap, setApproveQtyMap] = useState<Record<number, number>>({});
  const [approveNote, setApproveNote] = useState('');
  const [approving, setApproving] = useState(false);

  const [deliveryDraft, setDeliveryDraft] = useState<DeliveryDraft | null>(null);
  const [deliveryBatchId, setDeliveryBatchId] = useState<number | ''>('');
  const [deliveryQty, setDeliveryQty] = useState<number>(0);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [delivering, setDelivering] = useState(false);

  const [sendToCkSubmitting, setSendToCkSubmitting] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeReason, setCloseReason] = useState<(typeof CLOSE_REASONS)[number]>('Out of stock');
  const [closeNote, setCloseNote] = useState('');
  const [closing, setClosing] = useState(false);

  const userStoreLocationId = user?.location_id ?? null;

  const locationNameMap = useMemo(() => {
    const map = new Map<number, string>();
    locations.forEach((item) => map.set(item.location_id, item.location_name));
    return map;
  }, [locations]);

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounce(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setRequesterKeywordDebounce(requestedByInput.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [requestedByInput]);

  useEffect(() => {
    if (!isStoreStaff && !isAdmin && !isCentralStaff) {
      return;
    }

    void loadInitialData();
  }, [isStoreStaff, isAdmin, isCentralStaff]);

  useEffect(() => {
    if (!isStoreStaff && !isAdmin && !isCentralStaff) {
      return;
    }

    if (isStoreStaff && activeTab === 'ck-inventory') {
      void loadCkInventory();
    }

    if (activeTab === 'supply-order' || !isStoreStaff) {
      void loadOrders();
    }
  }, [activeTab, searchDebounce, statusFilter, locationFilter, page, limit]);

  useEffect(() => {
    if (!showCreateModal || !requesterKeywordDebounce) {
      setRequesterSuggestions([]);
      return;
    }

    void loadRequesterSuggestions(requesterKeywordDebounce);
  }, [showCreateModal, requesterKeywordDebounce]);

  const loadInitialData = async () => {
    try {
      const requests: Promise<any>[] = [productService.getActiveProducts()];
      if (isAdmin || isCentralStaff) {
        requests.push(
          locationService.getLocations({
            location_type: 'STORE',
            is_active: true,
            page: 1,
            limit: 200,
          })
        );
      }

      const results = await Promise.allSettled(requests);
      const productsResult = results[0];
      const locationsResult = results[1];

      if (productsResult.status === 'fulfilled') {
        setProducts(productsResult.value);
      }

      if (locationsResult && locationsResult.status === 'fulfilled') {
        setLocations(locationsResult.value.data || []);
      }

      await loadCkInventory();
    } catch {
      showToast('Failed to load initial data', 'error');
    }
  };

  const loadCkInventory = async () => {
    try {
      setInventoryLoading(true);
      const rows = await supplyOrderService.getCkInventory();
      setCkInventoryRows(rows);
    } catch {
      showToast('Failed to load CK inventory', 'error');
    } finally {
      setInventoryLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      setOrdersLoading(true);
      const result = await supplyOrderService.getList({
        search: searchDebounce || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        location_id: locationFilter === 'all' ? undefined : locationFilter,
        page,
        limit,
      });

      setOrders(result.data);
      setTotalOrders(result.total);

      const currentSelectedStillExists = result.data.some(
        (order) => order.supply_order_id === selectedOrderId
      );

      if (!currentSelectedStillExists) {
        const nextOrderId = result.data[0]?.supply_order_id ?? null;
        setSelectedOrderId(nextOrderId);
        if (nextOrderId) {
          void loadDetail(nextOrderId);
        } else {
          setSelectedOrderDetail(null);
        }
      }
    } catch {
      showToast('Failed to load supply orders', 'error');
    } finally {
      setOrdersLoading(false);
    }
  };

  const loadDetail = async (orderId: number) => {
    try {
      setDetailLoading(true);
      const data = await supplyOrderService.getDetail(orderId);
      setSelectedOrderDetail(data);
    } catch {
      showToast('Failed to load supply order detail', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const loadRequesterSuggestions = async (keyword: string) => {
    try {
      const data = await supplyOrderService.searchRequesters(keyword);
      setRequesterSuggestions(data);
    } catch {
      setRequesterSuggestions([]);
    }
  };

  const handleSelectOrder = (orderId: number) => {
    setSelectedOrderId(orderId);
    void loadDetail(orderId);
  };

  const openCreateModal = () => {
    setRequestedByInput('');
    setSelectedRequesterUserId(null);
    setRequesterSuggestions([]);
    setShowRequesterSuggestions(false);
    setCreateNote('');
    setCreateItems([{ product_id: null, requested_qty: 1 }]);
    setShowCreateModal(true);
  };

  const addCreateItem = () => {
    setCreateItems((prev) => [...prev, { product_id: null, requested_qty: 1 }]);
  };

  const removeCreateItem = (index: number) => {
    setCreateItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateCreateItem = (index: number, patch: Partial<CreateItemRow>) => {
    setCreateItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item))
    );
  };

  const handleSubmitCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRequesterUserId) {
      showToast('Please select requester from suggestion list', 'error');
      return;
    }

    if (createItems.length === 0) {
      showToast('Please add at least one item', 'error');
      return;
    }

    const productIds = createItems.map((item) => item.product_id).filter(Boolean) as number[];
    if (productIds.length !== createItems.length) {
      showToast('Please select product for all items', 'error');
      return;
    }

    const duplicateCheck = new Set<number>();
    for (const productId of productIds) {
      if (duplicateCheck.has(productId)) {
        showToast('A supply order cannot contain duplicate products', 'error');
        return;
      }
      duplicateCheck.add(productId);
    }

    for (const item of createItems) {
      if (!item.requested_qty || item.requested_qty <= 0) {
        showToast('Requested qty must be greater than 0', 'error');
        return;
      }
    }

    const payload: CreateSupplyOrderRequest = {
      requested_by_user_id: selectedRequesterUserId,
      note: createNote.trim() || undefined,
      items: createItems.map((item) => ({
        product_id: item.product_id as number,
        requested_qty: item.requested_qty,
      })),
    };

    try {
      setCreating(true);
      const created = await supplyOrderService.create(payload);
      showToast('Supply order created successfully', 'success');
      setShowCreateModal(false);

      if (activeTab !== 'supply-order') {
        setActiveTab('supply-order');
      }

      await loadOrders();
      setSelectedOrderId(created.order.supply_order_id);
      setSelectedOrderDetail(created);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to create supply order', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleSendToCk = async () => {
    if (!selectedOrderDetail) return;

    try {
      setSendToCkSubmitting(true);
      await supplyOrderService.sendToCk(selectedOrderDetail.order.supply_order_id);
      showToast('Supply order sent to CK successfully', 'success');
      await loadOrders();
      await loadDetail(selectedOrderDetail.order.supply_order_id);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to send to CK', 'error');
    } finally {
      setSendToCkSubmitting(false);
    }
  };

  const openApproveModal = async () => {
    if (!selectedOrderId) return;

    try {
      const detail = await supplyOrderService.getDetail(selectedOrderId);
      setApproveOrder(detail);
      const map: Record<number, number> = {};
      detail.items.forEach((item) => {
        map[item.supply_order_item_id] = item.requested_qty;
      });
      setApproveQtyMap(map);
      setApproveNote(detail.order.note || '');
      setShowApproveModal(true);
    } catch {
      showToast('Failed to load order for approval', 'error');
    }
  };

  const handleApproveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approveOrder) return;

    for (const item of approveOrder.items) {
      const qty = approveQtyMap[item.supply_order_item_id] ?? 0;
      if (qty < 0 || qty > item.requested_qty) {
        showToast(`Approved qty for ${item.product_name} must be between 0 and ${item.requested_qty}`, 'error');
        return;
      }
    }

    try {
      setApproving(true);
      const result = await supplyOrderService.approve(approveOrder.order.supply_order_id, {
        note: approveNote.trim() || undefined,
        items: approveOrder.items.map((item) => ({
          supply_order_item_id: item.supply_order_item_id,
          approved_qty: approveQtyMap[item.supply_order_item_id] ?? 0,
        })),
      });
      showToast('Supply order approved successfully', 'success');
      setShowApproveModal(false);
      await loadOrders();
      setSelectedOrderDetail(result);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to approve supply order', 'error');
    } finally {
      setApproving(false);
    }
  };

  const openDeliveryDrawer = (item: SupplyOrderItem) => {
    if (!selectedOrderDetail) return;

    const now = new Date();
    const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);

    setDeliveryDraft({
      orderId: selectedOrderDetail.order.supply_order_id,
      item,
    });
    setDeliveryDate(localISO);
    setDeliveryQty(Math.max(item.remaining_qty || 0, 0));
    setDeliveryBatchId('');
  };

  const handleSubmitDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryDraft) return;
    if (!deliveryBatchId) {
      showToast('Please choose a batch', 'error');
      return;
    }

    const remainingQty = deliveryDraft.item.remaining_qty || 0;
    if (deliveryQty <= 0 || deliveryQty > remainingQty) {
      showToast(`Transfer qty must be between 1 and ${remainingQty}`, 'error');
      return;
    }

    try {
      setDelivering(true);
      const result = await supplyOrderService.deliverItem(
        deliveryDraft.orderId,
        deliveryDraft.item.supply_order_item_id,
        {
          batch_id: deliveryBatchId,
          transfer_qty: deliveryQty,
          transfer_date: new Date(deliveryDate).toISOString(),
        }
      );

      showToast('Delivery transfer created successfully', 'success');
      setDeliveryDraft(null);
      await loadOrders();
      setSelectedOrderDetail(result);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to create delivery transfer', 'error');
    } finally {
      setDelivering(false);
    }
  };

  const canCreateOrder = isStoreStaff && !!userStoreLocationId;

  const visibleOrders = orders;

  const selectedOrder = selectedOrderDetail?.order;
  const selectedItems = selectedOrderDetail?.items || [];

  const isStoreDraft = isStoreStaff && selectedOrder?.status === 'Draft';
  const canApprove =
    (isAdmin || isCentralStaff) &&
    selectedOrder?.status === 'Pending';
  const canCloseOrder = !!selectedOrder && selectedOrder.status !== 'Closed';

  const totalPages = Math.max(Math.ceil(totalOrders / limit), 1);

  const deliveryBatchOptions = useMemo(() => {
    if (!deliveryDraft) return [];

    return ckInventoryRows.filter(
      (row) =>
        row.product_id === deliveryDraft.item.product_id &&
        row.qty_available > 0
    );
  }, [ckInventoryRows, deliveryDraft]);

  const openCloseModal = () => {
    setCloseReason('Out of stock');
    setCloseNote(selectedOrder?.close_note || '');
    setShowCloseModal(true);
  };

  const handleCloseOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    try {
      setClosing(true);
      const result = await supplyOrderService.closeOrder(selectedOrder.supply_order_id, {
        close_reason: closeReason,
        close_note: closeNote.trim() || undefined,
      });

      showToast('Supply order closed successfully', 'success');
      setShowCloseModal(false);
      await loadOrders();
      setSelectedOrderDetail(result);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to close supply order', 'error');
    } finally {
      setClosing(false);
    }
  };

  if (!user) return null;

  if (isStoreStaff && !userStoreLocationId) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Supply Order</h1>
        <div className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg">
          Your account is not assigned to a store location. Please contact Admin.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Supply Order</h1>
        <p className="text-gray-600 mt-2">
          {isStoreStaff
            ? 'Create and track supply orders for your store'
            : 'Review pending supply orders from stores and coordinate delivery'}
        </p>
      </div>

      {isStoreStaff && (
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('ck-inventory')}
              className={`${
                activeTab === 'ck-inventory'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              CK Inventory
            </button>
            <button
              onClick={() => setActiveTab('supply-order')}
              className={`${
                activeTab === 'supply-order'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              Supply Order
            </button>
          </nav>
        </div>
      )}

      {isStoreStaff && activeTab === 'ck-inventory' && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">CK Warehouse Inventory</h2>
            <span className="text-sm text-gray-500">{ckInventoryRows.length} rows</span>
          </div>
          {inventoryLoading ? (
            <div className="p-6 text-center text-gray-500">Loading CK inventory...</div>
          ) : ckInventoryRows.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No available inventory in CK Warehouse.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">On Hand</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Available</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Updated</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {ckInventoryRows.map((row) => (
                    <tr key={`${row.location_id}-${row.batch_id}-${row.product_id}`}>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div className="font-semibold">{formatProductWithUnit(row.product_name, row.unit)}</div>
                        <div className="text-xs text-gray-500">{row.product_code}</div>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-blue-700">{row.batch_code || row.batch_id}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">{row.qty_on_hand}</td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-green-700">{row.qty_available}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{row.location_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDateTime(row.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {(!isStoreStaff || activeTab === 'supply-order') && (
        <>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[240px]">
              <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
                placeholder="Search by code, location, requester..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setPage(1);
                setStatusFilter(e.target.value as 'all' | SupplyOrderStatus);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status === 'all' ? 'All Status' : status}
                </option>
              ))}
            </select>

            {(isAdmin || isCentralStaff) && (
              <select
                value={locationFilter}
                onChange={(e) => {
                  setPage(1);
                  const value = e.target.value;
                  setLocationFilter(value === 'all' ? 'all' : parseInt(value, 10));
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Stores</option>
                {locations.map((loc) => (
                  <option key={loc.location_id} value={loc.location_id}>
                    {loc.location_name}
                  </option>
                ))}
              </select>
            )}

            <select
              value={limit}
              onChange={(e) => {
                setPage(1);
                setLimit(parseInt(e.target.value, 10));
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={8}>8 / page</option>
              <option value={12}>12 / page</option>
              <option value={20}>20 / page</option>
            </select>

            {canCreateOrder && (
              <button
                onClick={openCreateModal}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <PlusIcon className="w-4 h-4" />
                Create Supply Order
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-10 gap-4 min-h-[520px]">
            <div className="xl:col-span-3 bg-white rounded-lg shadow-md border border-gray-100 flex flex-col">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Supply Orders</h2>
                <span className="text-xs text-gray-500">Total: {totalOrders}</span>
              </div>

              <div className="flex-1 overflow-y-auto">
                {ordersLoading ? (
                  <div className="p-4 text-center text-gray-500">Loading orders...</div>
                ) : visibleOrders.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">No supply orders found.</div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {visibleOrders.map((order) => {
                      const active = order.supply_order_id === selectedOrderId;
                      return (
                        <li
                          key={order.supply_order_id}
                          onClick={() => handleSelectOrder(order.supply_order_id)}
                          className={`px-4 py-3 cursor-pointer transition-colors ${
                            active ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-gray-900">{order.supply_order_code}</p>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(order.status)}`}>
                              {order.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {order.location_name || locationNameMap.get(order.location_id) || `Location #${order.location_id}`}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Requested by: {order.requested_by_username || order.requested_by_user_code || order.requested_by}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">Created: {formatDate(order.created_at)}</p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="px-3 py-2 border-t border-gray-200 flex items-center justify-between text-sm">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
                >
                  Prev
                </button>
                <span>
                  Page {page} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                  className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>

            <div className="xl:col-span-7 bg-white rounded-lg shadow-md border border-gray-100 p-4">
              {detailLoading ? (
                <div className="h-full flex items-center justify-center text-gray-500">Loading detail...</div>
              ) : !selectedOrder ? (
                <div className="h-full flex items-center justify-center text-gray-400">
                  Select a Supply Order
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 pb-3">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">
                        Supply Order: {selectedOrder.supply_order_code}
                      </h3>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(selectedOrder.status)}`}>
                          {selectedOrder.status}
                        </span>
                        <span>Store: {selectedOrder.location_name || locationNameMap.get(selectedOrder.location_id) || '-'}</span>
                        <span>
                          Requested by: {selectedOrder.requested_by_username || selectedOrder.requested_by_user_code || selectedOrder.requested_by}
                        </span>
                        <span>Created: {formatDateTime(selectedOrder.created_at)}</span>
                      </div>
                      <div className="mt-2 text-sm text-gray-600 space-y-1">
                        <p>Approved by: {selectedOrder.approved_by_username || '-'}</p>
                        <p>Approved date: {formatDateTime(selectedOrder.approved_date)}</p>
                        <p>Note: {selectedOrder.note || '-'}</p>
                        {selectedOrder.status === 'Closed' && (
                          <>
                            <p>Closed reason: {selectedOrder.close_reason || '-'}</p>
                            <p>Closed at: {formatDateTime(selectedOrder.closed_at)}</p>
                            <p>Closed note: {selectedOrder.close_note || '-'}</p>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {canCloseOrder && (
                        <button
                          onClick={openCloseModal}
                          className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 flex items-center gap-2"
                        >
                          <LockClosedIcon className="w-4 h-4" />
                          Close Supply Order
                        </button>
                      )}

                      {isStoreDraft && (
                        <button
                          onClick={handleSendToCk}
                          disabled={sendToCkSubmitting}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                        >
                          <PaperAirplaneIcon className="w-4 h-4" />
                          {sendToCkSubmitting ? 'Sending...' : 'Send to CK'}
                        </button>
                      )}

                      {canApprove && (
                        <button
                          onClick={openApproveModal}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                        >
                          <CheckCircleIcon className="w-4 h-4" />
                          Approve
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Requested</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Approved</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Delivered</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Remaining</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedItems.map((item) => {
                          const canDeliver =
                            (isAdmin || isCentralStaff) &&
                            (selectedOrder.status === 'Approved' || selectedOrder.status === 'Partly Delivered') &&
                            item.approved_qty > 0 &&
                            (item.remaining_qty || 0) > 0;

                          return (
                            <tr key={item.supply_order_item_id}>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                <div className="font-semibold">{formatProductWithUnit(item.product_name, item.unit)}</div>
                                <div className="text-xs text-gray-500">{item.product_code || '-'}</div>
                              </td>
                              <td className="px-4 py-3 text-sm text-right">{item.requested_qty}</td>
                              <td className="px-4 py-3 text-sm text-right">{item.approved_qty}</td>
                              <td className="px-4 py-3 text-sm text-right text-indigo-700 font-semibold">{item.delivered_qty}</td>
                              <td className="px-4 py-3 text-sm text-right font-semibold">
                                {Math.max(item.remaining_qty || 0, 0)}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                    item.status === 'Approved'
                                      ? getStatusBadgeClass('ApprovedItem')
                                      : getStatusBadgeClass('Rejected')
                                  }`}
                                >
                                  {item.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {canDeliver ? (
                                  <button
                                    onClick={() => openDeliveryDrawer(item)}
                                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-semibold flex items-center gap-1"
                                  >
                                    <TruckIcon className="w-3 h-3" />
                                    Deliver
                                  </button>
                                ) : (
                                  <span className="text-gray-400 text-xs">
                                    {(item.remaining_qty || 0) <= 0 ? 'Done' : '-'}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Create Supply Order</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmitCreateOrder} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Requested By <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    value={requestedByInput}
                    onChange={(e) => {
                      setRequestedByInput(e.target.value);
                      setSelectedRequesterUserId(null);
                      setShowRequesterSuggestions(true);
                    }}
                    onFocus={() => setShowRequesterSuggestions(true)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Type requester name..."
                    required
                  />
                  {showRequesterSuggestions && requesterSuggestions.length > 0 && (
                    <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow max-h-48 overflow-y-auto">
                      {requesterSuggestions.map((suggestion) => (
                        <li
                          key={suggestion.user_id}
                          className="px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
                          onClick={() => {
                            setRequestedByInput(`${suggestion.username} (${suggestion.user_code})`);
                            setSelectedRequesterUserId(suggestion.user_id);
                            setShowRequesterSuggestions(false);
                          }}
                        >
                          {suggestion.username} ({suggestion.user_code})
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                <textarea
                  value={createNote}
                  onChange={(e) => setCreateNote(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Supply Order Items</h3>
                  <button
                    type="button"
                    onClick={addCreateItem}
                    className="px-3 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 text-sm"
                  >
                    + Add Item
                  </button>
                </div>

                {createItems.map((row, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end bg-gray-50 p-3 rounded-lg">
                    <div className="col-span-7">
                      <label className="block text-xs text-gray-600 mb-1">Product</label>
                      <select
                        value={row.product_id ?? ''}
                        onChange={(e) =>
                          updateCreateItem(index, {
                            product_id: e.target.value ? parseInt(e.target.value, 10) : null,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        required
                      >
                        <option value="">Select product</option>
                        {products.map((product) => (
                          <option key={product.product_id} value={product.product_id}>
                            {formatProductWithUnit(product.product_name, product.unit_name)} ({product.product_code})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <label className="block text-xs text-gray-600 mb-1">Requested Qty</label>
                      <input
                        type="number"
                        min={1}
                        value={row.requested_qty}
                        onChange={(e) =>
                          updateCreateItem(index, {
                            requested_qty: Math.max(parseInt(e.target.value || '0', 10), 0),
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <button
                        type="button"
                        onClick={() => removeCreateItem(index)}
                        disabled={createItems.length === 1}
                        className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm text-red-600 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showApproveModal && approveOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                Approve Supply Order: {approveOrder.order.supply_order_code}
              </h2>
              <button onClick={() => setShowApproveModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleApproveSubmit} className="p-6 space-y-4">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Requested</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Approve Qty</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {approveOrder.items.map((item) => (
                      <tr key={item.supply_order_item_id}>
                        <td className="px-4 py-2 text-sm">
                          <div className="font-semibold">{formatProductWithUnit(item.product_name, item.unit)}</div>
                          <div className="text-xs text-gray-500">{item.product_code}</div>
                        </td>
                        <td className="px-4 py-2 text-sm text-right">{item.requested_qty}</td>
                        <td className="px-4 py-2 text-sm text-right">
                          <input
                            type="number"
                            min={0}
                            max={item.requested_qty}
                            value={approveQtyMap[item.supply_order_item_id] ?? 0}
                            onChange={(e) => {
                              const value = Math.max(parseInt(e.target.value || '0', 10), 0);
                              setApproveQtyMap((prev) => ({
                                ...prev,
                                [item.supply_order_item_id]: value,
                              }));
                            }}
                            className="w-32 px-2 py-1 border border-gray-300 rounded text-right"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                <textarea
                  value={approveNote}
                  onChange={(e) => setApproveNote(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowApproveModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={approving}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {approving ? 'Approving...' : 'Approve'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deliveryDraft && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Deliver Product</h2>
              <button onClick={() => setDeliveryDraft(null)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmitDelivery} className="p-5 space-y-4 overflow-y-auto">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm">
                <p><span className="text-gray-500">Product:</span> <span className="font-semibold">{formatProductWithUnit(deliveryDraft.item.product_name, deliveryDraft.item.unit)}</span></p>
                <p><span className="text-gray-500">Requested:</span> {deliveryDraft.item.requested_qty}</p>
                <p><span className="text-gray-500">Approved:</span> {deliveryDraft.item.approved_qty}</p>
                <p><span className="text-gray-500">Delivered:</span> {deliveryDraft.item.delivered_qty}</p>
                <p><span className="text-gray-500">Remaining:</span> <span className="font-semibold text-indigo-700">{deliveryDraft.item.remaining_qty || 0}</span></p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Batch</label>
                <select
                  value={deliveryBatchId}
                  onChange={(e) => setDeliveryBatchId(e.target.value ? parseInt(e.target.value, 10) : '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="">Select batch from CK Warehouse</option>
                  {deliveryBatchOptions.map((row) => (
                    <option key={`${row.location_id}-${row.batch_id}`} value={row.batch_id}>
                      {row.batch_code || row.batch_id} | EXP: {formatDateOnly(row.expired_date)} | {row.location_name} | Avail: {row.qty_available}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transfer Qty</label>
                <input
                  type="number"
                  min={1}
                  max={Math.max(deliveryDraft.item.remaining_qty || 0, 1)}
                  value={deliveryQty}
                  onChange={(e) => setDeliveryQty(parseInt(e.target.value || '0', 10))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transfer Date & Time</label>
                <input
                  type="datetime-local"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeliveryDraft(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={delivering}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {delivering ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCloseModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Close Supply Order</h2>
              <button onClick={() => setShowCloseModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCloseOrderSubmit} className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                You are closing <span className="font-semibold">{selectedOrder.supply_order_code}</span>. This blocks further send, approve, and deliver actions.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Close Reason <span className="text-red-500">*</span>
                </label>
                <select
                  value={closeReason}
                  onChange={(e) => setCloseReason(e.target.value as (typeof CLOSE_REASONS)[number])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  {CLOSE_REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                <textarea
                  value={closeNote}
                  onChange={(e) => setCloseNote(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Enter close note..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={closing}
                  className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
                >
                  {closing ? 'Closing...' : 'Close Supply Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplyOrderPage;
