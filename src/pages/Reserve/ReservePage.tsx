import { useEffect, useMemo, useState } from 'react';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { reserveService } from '@/api/services/reserveService';
import { supplyOrderService } from '@/api/services/supplyOrderService';
import PaginationControls from '@/components/PaginationControls';
import {
  CkInventoryRow,
  ReserveBatchRecord,
  ReserveHistoryRecord,
  ReserveProductRecord,
} from '@/api/types';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatProductWithUnit } from '@/utils/productDisplay';

type ReserveTab = 'product' | 'batch' | 'history';

const PRODUCT_STATUSES = ['all', 'OPEN', 'PARTIAL', 'FULFILLED', 'RELEASED', 'CLOSED'] as const;
const BATCH_STATUSES = ['all', 'PARTIAL', 'FULFILLED', 'RELEASED'] as const;
const ALLOCATION_LEVELS = ['all', 'NONE', 'PARTIAL', 'FULL'] as const;
const HISTORY_EVENTS = [
  'all',
  'APPROVE_CREATE',
  'APPROVE_UPDATE',
  'BATCH_ALLOCATE',
  'BATCH_CONSUME',
  'PRODUCT_CONSUME',
  'BATCH_RELEASE',
  'PRODUCT_RELEASE',
  'AUTO_CLOSE',
] as const;

type ProductSort = 'updated_desc' | 'updated_asc' | 'remaining_desc' | 'remaining_asc' | 'approved_desc' | 'approved_asc';
type BatchSort = 'updated_desc' | 'updated_asc' | 'allocated_desc' | 'allocated_asc' | 'consumed_desc' | 'consumed_asc';
type HistorySort = 'time_desc' | 'time_asc' | 'qty_desc' | 'qty_asc';

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  return new Date(value).toLocaleString();
};

const getStatusBadge = (status: string) => {
  const map: Record<string, string> = {
    OPEN: 'bg-amber-100 text-amber-700',
    PARTIAL: 'bg-blue-100 text-blue-700',
    FULFILLED: 'bg-emerald-100 text-emerald-700',
    RELEASED: 'bg-slate-200 text-slate-700',
    CLOSED: 'bg-gray-200 text-gray-700',
  };
  return map[status] || 'bg-gray-100 text-gray-700';
};

const getAllocationLevelBadge = (level?: string) => {
  const map: Record<string, string> = {
    NONE: 'bg-gray-100 text-gray-700',
    PARTIAL: 'bg-blue-100 text-blue-700',
    FULL: 'bg-emerald-100 text-emerald-700',
  };

  return map[level || 'NONE'] || 'bg-gray-100 text-gray-700';
};

const ReservePage = () => {
  const { showToast } = useToast();
  const { isCentralStaff } = useAuth();

  const [activeTab, setActiveTab] = useState<ReserveTab>('product');

  const [productRows, setProductRows] = useState<ReserveProductRecord[]>([]);
  const [batchRows, setBatchRows] = useState<ReserveBatchRecord[]>([]);
  const [historyRows, setHistoryRows] = useState<ReserveHistoryRecord[]>([]);

  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [productStatusFilter, setProductStatusFilter] = useState<(typeof PRODUCT_STATUSES)[number]>('all');
  const [batchStatusFilter, setBatchStatusFilter] = useState<(typeof BATCH_STATUSES)[number]>('all');
  const [productAllocationFilter, setProductAllocationFilter] = useState<(typeof ALLOCATION_LEVELS)[number]>('all');
  const [historyEventFilter, setHistoryEventFilter] = useState<(typeof HISTORY_EVENTS)[number]>('all');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [productSort, setProductSort] = useState<ProductSort>('updated_desc');
  const [batchSort, setBatchSort] = useState<BatchSort>('updated_desc');
  const [historySort, setHistorySort] = useState<HistorySort>('time_desc');
  const [productCurrentPage, setProductCurrentPage] = useState(1);
  const [batchCurrentPage, setBatchCurrentPage] = useState(1);
  const [historyCurrentPage, setHistoryCurrentPage] = useState(1);
  const pageSize = 10;

  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  const [allocating, setAllocating] = useState(false);
  const [selectedReserve, setSelectedReserve] = useState<ReserveProductRecord | null>(null);
  const [inventoryRows, setInventoryRows] = useState<CkInventoryRow[]>([]);
  const [allocateMap, setAllocateMap] = useState<Record<string, number>>({});

  const canAllocate = isCentralStaff;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (activeTab === 'product') {
      void loadProductReserves();
      return;
    }

    if (activeTab === 'batch') {
      void loadBatchReserves();
      return;
    }

    void loadReserveHistory();
  }, [activeTab, productStatusFilter, batchStatusFilter, debouncedSearch]);

  useEffect(() => {
    setProductCurrentPage(1);
  }, [debouncedSearch, productStatusFilter, productAllocationFilter, productSort]);

  useEffect(() => {
    setBatchCurrentPage(1);
  }, [debouncedSearch, batchStatusFilter, batchSort]);

  useEffect(() => {
    setHistoryCurrentPage(1);
  }, [debouncedSearch, historyEventFilter, historySort]);

  const loadProductReserves = async () => {
    try {
      setLoadingProducts(true);
      const data = await reserveService.getReserveProducts({
        status: productStatusFilter,
        supply_order_code: debouncedSearch || undefined,
      });
      setProductRows(data);
    } catch {
      showToast('Failed to load reserve product records', 'error');
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadBatchReserves = async () => {
    try {
      setLoadingBatches(true);
      const data = await reserveService.getReserveBatches({
        status: batchStatusFilter,
        supply_order_code: debouncedSearch || undefined,
      });
      setBatchRows(data);
    } catch {
      showToast('Failed to load reserve batch records', 'error');
    } finally {
      setLoadingBatches(false);
    }
  };

  const loadReserveHistory = async () => {
    try {
      setLoadingHistory(true);
      const data = await reserveService.getReserveHistory();
      setHistoryRows(data);
    } catch {
      showToast('Failed to load reserve history', 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  const openAllocateModal = async (reserve: ReserveProductRecord) => {
    try {
      setSelectedReserve(reserve);
      setAllocateMap({});
      const rows = await supplyOrderService.getCkInventory();
      const matched = rows.filter(
        (item) => item.product_id === reserve.product_id && item.qty_available > 0
      );
      setInventoryRows(matched);
      setIsAllocateModalOpen(true);
    } catch {
      showToast('Failed to load CK inventory for allocation', 'error');
    }
  };

  const closeAllocateModal = () => {
    setIsAllocateModalOpen(false);
    setSelectedReserve(null);
    setInventoryRows([]);
    setAllocateMap({});
  };

  const allocationCandidates = useMemo(() => {
    return inventoryRows.map((row) => {
      const key = `${row.location_id}-${row.batch_id}`;
      return {
        key,
        ...row,
        allocate_qty: allocateMap[key] || 0,
      };
    });
  }, [inventoryRows, allocateMap]);

  const totalAllocateQty = useMemo(() => {
    return allocationCandidates.reduce((sum, row) => sum + row.allocate_qty, 0);
  }, [allocationCandidates]);

  const totalAllocatableQty = useMemo(() => {
    return allocationCandidates.reduce((sum, row) => sum + row.qty_available, 0);
  }, [allocationCandidates]);

  const filteredSortedProductRows = useMemo(() => {
    const keyword = debouncedSearch.toLowerCase();
    const filtered = productRows.filter((row) => {
      const passAllocation =
        productAllocationFilter === 'all' ||
        (row.allocation_level || 'NONE') === productAllocationFilter;

      if (!passAllocation) return false;
      if (!keyword) return true;

      return [
        row.reserve_code,
        row.supply_order_code,
        row.product_code,
        row.product_name,
        row.location_name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (productSort) {
        case 'updated_asc':
          return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
        case 'remaining_desc':
          return (b.remaining_qty || 0) - (a.remaining_qty || 0);
        case 'remaining_asc':
          return (a.remaining_qty || 0) - (b.remaining_qty || 0);
        case 'approved_desc':
          return (b.approved_qty || 0) - (a.approved_qty || 0);
        case 'approved_asc':
          return (a.approved_qty || 0) - (b.approved_qty || 0);
        case 'updated_desc':
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });
    return sorted;
  }, [productRows, debouncedSearch, productAllocationFilter, productSort]);

  const filteredSortedBatchRows = useMemo(() => {
    const keyword = debouncedSearch.toLowerCase();
    const filtered = batchRows.filter((row) => {
      if (!keyword) return true;
      return [
        row.reserve_batch_code,
        row.reserve_code,
        row.supply_order_code,
        row.product_code,
        row.product_name,
        row.batch_code,
        row.location_name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (batchSort) {
        case 'updated_asc':
          return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
        case 'allocated_desc':
          return (b.allocated_qty || 0) - (a.allocated_qty || 0);
        case 'allocated_asc':
          return (a.allocated_qty || 0) - (b.allocated_qty || 0);
        case 'consumed_desc':
          return (b.consumed_qty || 0) - (a.consumed_qty || 0);
        case 'consumed_asc':
          return (a.consumed_qty || 0) - (b.consumed_qty || 0);
        case 'updated_desc':
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });
    return sorted;
  }, [batchRows, debouncedSearch, batchSort]);

  const filteredSortedHistoryRows = useMemo(() => {
    const keyword = debouncedSearch.toLowerCase();
    const filtered = historyRows.filter((row) => {
      const passEvent = historyEventFilter === 'all' || row.event_type === historyEventFilter;
      if (!passEvent) return false;
      if (!keyword) return true;

      return [
        row.reserve_batch_code,
        row.reserve_code,
        row.supply_order_code,
        row.product_code,
        row.product_name,
        row.batch_code,
        row.event_type,
        row.ref_type,
        row.note,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (historySort) {
        case 'time_asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'qty_desc':
          return (b.qty_change || 0) - (a.qty_change || 0);
        case 'qty_asc':
          return (a.qty_change || 0) - (b.qty_change || 0);
        case 'time_desc':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return sorted;
  }, [historyRows, debouncedSearch, historyEventFilter, historySort]);

  const productTotalPages = Math.max(1, Math.ceil(filteredSortedProductRows.length / pageSize));
  const safeProductCurrentPage = Math.min(productCurrentPage, productTotalPages);
  const paginatedProductRows = filteredSortedProductRows.slice(
    (safeProductCurrentPage - 1) * pageSize,
    safeProductCurrentPage * pageSize
  );

  const batchTotalPages = Math.max(1, Math.ceil(filteredSortedBatchRows.length / pageSize));
  const safeBatchCurrentPage = Math.min(batchCurrentPage, batchTotalPages);
  const paginatedBatchRows = filteredSortedBatchRows.slice(
    (safeBatchCurrentPage - 1) * pageSize,
    safeBatchCurrentPage * pageSize
  );

  const historyTotalPages = Math.max(1, Math.ceil(filteredSortedHistoryRows.length / pageSize));
  const safeHistoryCurrentPage = Math.min(historyCurrentPage, historyTotalPages);
  const paginatedHistoryRows = filteredSortedHistoryRows.slice(
    (safeHistoryCurrentPage - 1) * pageSize,
    safeHistoryCurrentPage * pageSize
  );

  const handleSubmitAllocate = async () => {
    if (!selectedReserve) return;

    const allocations = allocationCandidates
      .filter((row) => row.allocate_qty > 0)
      .map((row) => ({
        batch_id: row.batch_id,
        location_id: row.location_id,
        allocate_qty: row.allocate_qty,
      }));

    if (allocations.length === 0) {
      showToast('Please input allocate quantity for at least one batch', 'error');
      return;
    }

    const exceeded = allocationCandidates.find((row) => row.allocate_qty > row.qty_available);
    if (exceeded) {
      showToast(
        `Allocate qty exceeds available qty for batch ${exceeded.batch_code || exceeded.batch_id}`,
        'error'
      );
      return;
    }

    if (totalAllocateQty > selectedReserve.remaining_qty) {
      showToast(
        `Total allocate qty (${totalAllocateQty}) exceeds reserve product remaining (${selectedReserve.remaining_qty})`,
        'error'
      );
      return;
    }

    try {
      setAllocating(true);
      await reserveService.allocateReserveBatches(selectedReserve.reserve_id, { allocations });
      showToast('Reserve batch allocation created successfully', 'success');
      closeAllocateModal();
      await Promise.all([loadProductReserves(), loadBatchReserves(), loadReserveHistory()]);
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to allocate reserve batch', 'error');
    } finally {
      setAllocating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Supply Chain</p>
          <h1 className="mt-1 text-3xl font-bold text-gray-900">Reserve Management</h1>
          <p className="mt-2 text-sm text-gray-600">
            Monitor Reserve Product, allocate Reserve Batch, and track Reserve History.
          </p>
        </div>

        <div className="flex gap-3">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search code, product, batch, note..."
            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          {activeTab === 'product' ? (
            <select
              value={productStatusFilter}
              onChange={(e) => setProductStatusFilter(e.target.value as (typeof PRODUCT_STATUSES)[number])}
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              {PRODUCT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          ) : null}

          {activeTab === 'batch' ? (
            <select
              value={batchStatusFilter}
              onChange={(e) => setBatchStatusFilter(e.target.value as (typeof BATCH_STATUSES)[number])}
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              {BATCH_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          ) : null}

          {activeTab === 'product' ? (
            <>
              <select
                value={productAllocationFilter}
                onChange={(e) => setProductAllocationFilter(e.target.value as (typeof ALLOCATION_LEVELS)[number])}
                className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                {ALLOCATION_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    Allocation: {level === 'all' ? 'All' : level}
                  </option>
                ))}
              </select>

              <select
                value={productSort}
                onChange={(e) => setProductSort(e.target.value as ProductSort)}
                className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="updated_desc">Sort: Updated (Newest)</option>
                <option value="updated_asc">Sort: Updated (Oldest)</option>
                <option value="remaining_desc">Sort: Unallocated Remaining (High-Low)</option>
                <option value="remaining_asc">Sort: Unallocated Remaining (Low-High)</option>
                <option value="approved_desc">Sort: Approved (High-Low)</option>
                <option value="approved_asc">Sort: Approved (Low-High)</option>
              </select>
            </>
          ) : null}

          {activeTab === 'batch' ? (
            <select
              value={batchSort}
              onChange={(e) => setBatchSort(e.target.value as BatchSort)}
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value="updated_desc">Sort: Updated (Newest)</option>
              <option value="updated_asc">Sort: Updated (Oldest)</option>
              <option value="allocated_desc">Sort: Allocated (High-Low)</option>
              <option value="allocated_asc">Sort: Allocated (Low-High)</option>
              <option value="consumed_desc">Sort: Consumed (High-Low)</option>
              <option value="consumed_asc">Sort: Consumed (Low-High)</option>
            </select>
          ) : null}

          {activeTab === 'history' ? (
            <>
              <select
                value={historyEventFilter}
                onChange={(e) => setHistoryEventFilter(e.target.value as (typeof HISTORY_EVENTS)[number])}
                className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                {HISTORY_EVENTS.map((event) => (
                  <option key={event} value={event}>
                    Event: {event === 'all' ? 'All' : event}
                  </option>
                ))}
              </select>

              <select
                value={historySort}
                onChange={(e) => setHistorySort(e.target.value as HistorySort)}
                className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="time_desc">Sort: Time (Newest)</option>
                <option value="time_asc">Sort: Time (Oldest)</option>
                <option value="qty_desc">Sort: Qty Change (High-Low)</option>
                <option value="qty_asc">Sort: Qty Change (Low-High)</option>
              </select>
            </>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setActiveTab('product')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              activeTab === 'product' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            Reserve Product
          </button>
          <button
            onClick={() => setActiveTab('batch')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              activeTab === 'batch' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            Reserve Batch
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              activeTab === 'history' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            Reserve History
          </button>
        </div>
      </div>

      {activeTab === 'product' ? (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {loadingProducts ? (
            <div className="p-8 text-center text-gray-500">Loading reserve products...</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Reserve Code</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">SO Code</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Product</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Location</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Allocation Level</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Approved</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Allocated Remaining (Batch)</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Unallocated Remaining</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Consumed</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Released</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredSortedProductRows.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="px-4 py-8 text-center text-sm text-gray-500">
                          No reserve product records
                        </td>
                      </tr>
                    ) : (
                      paginatedProductRows.map((row) => (
                        <tr key={row.reserve_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-xs font-mono font-semibold text-purple-700">{row.reserve_code || '-'}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-800">{row.supply_order_code || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            <div className="font-medium text-gray-900">{formatProductWithUnit(row.product_name || '-', row.unit_name || null)}</div>
                            <div className="text-xs text-gray-500">{row.product_code || '-'}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">{row.location_name || row.location_id}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getAllocationLevelBadge(row.allocation_level)}`}>
                              {row.allocation_level || 'NONE'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusBadge(row.status)}`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-700">{row.approved_qty}</td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-indigo-700">{row.allocated_remaining_qty || 0}</td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-blue-700">{row.remaining_qty}</td>
                          <td className="px-4 py-3 text-right text-sm text-gray-700">{row.consumed_qty}</td>
                          <td className="px-4 py-3 text-right text-sm text-gray-700">{row.released_qty}</td>
                          <td className="px-4 py-3 text-right">
                            {canAllocate && row.remaining_qty > 0 ? (
                              <button
                                onClick={() => openAllocateModal(row)}
                                className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                              >
                                <PlusIcon className="h-4 w-4" />
                                Allocate
                              </button>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="px-4 pb-4">
                <PaginationControls
                  currentPage={safeProductCurrentPage}
                  totalPages={productTotalPages}
                  totalItems={filteredSortedProductRows.length}
                  pageSize={pageSize}
                  onPageChange={setProductCurrentPage}
                />
              </div>
            </>
          )}
        </div>
      ) : null}

      {activeTab === 'batch' ? (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {loadingBatches ? (
            <div className="p-8 text-center text-gray-500">Loading reserve batches...</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Reserve Batch Code</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Reserve Code</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">SO Code</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Product</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Batch</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Location</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Allocated</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Consumed</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Released</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredSortedBatchRows.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-500">
                          No reserve batch records
                        </td>
                      </tr>
                    ) : (
                      paginatedBatchRows.map((row) => (
                        <tr key={row.reserve_batch_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-xs font-mono font-semibold text-purple-700">{row.reserve_batch_code || '-'}</td>
                          <td className="px-4 py-3 text-xs font-mono font-semibold text-indigo-700">{row.reserve_code || '-'}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-800">{row.supply_order_code || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            <div className="font-medium text-gray-900">{formatProductWithUnit(row.product_name || '-', row.unit_name || null)}</div>
                            <div className="text-xs text-gray-500">{row.product_code || '-'}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">{row.batch_code || row.batch_id}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{row.location_name || row.location_id}</td>
                          <td className="px-4 py-3 text-right text-sm text-gray-700">{row.allocated_qty}</td>
                          <td className="px-4 py-3 text-right text-sm text-gray-700">{row.consumed_qty}</td>
                          <td className="px-4 py-3 text-right text-sm text-gray-700">{row.released_qty}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusBadge(row.status)}`}>
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="px-4 pb-4">
                <PaginationControls
                  currentPage={safeBatchCurrentPage}
                  totalPages={batchTotalPages}
                  totalItems={filteredSortedBatchRows.length}
                  pageSize={pageSize}
                  onPageChange={setBatchCurrentPage}
                />
              </div>
            </>
          )}
        </div>
      ) : null}

      {activeTab === 'history' ? (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {loadingHistory ? (
            <div className="p-8 text-center text-gray-500">Loading reserve history...</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Reserve Batch Code</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Reserve Code</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Time</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">SO Code</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Product</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Batch</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Event</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Qty Change</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Ref</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredSortedHistoryRows.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-500">
                          No reserve history records
                        </td>
                      </tr>
                    ) : (
                      paginatedHistoryRows.map((row) => (
                        <tr key={row.reserve_history_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-xs font-mono font-semibold text-purple-700">{row.reserve_batch_code || row.reserve_code || '-'}</td>
                          <td className="px-4 py-3 text-xs font-mono font-semibold text-indigo-700">{row.reserve_code || '-'}</td>
                          <td className="px-4 py-3 text-xs text-gray-600">{formatDateTime(row.created_at)}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-800">{row.supply_order_code || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{row.product_code || row.product_name || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{row.batch_code || '-'}</td>
                          <td className="px-4 py-3 text-xs font-semibold text-gray-700">{row.event_type}</td>
                          <td
                            className={`px-4 py-3 text-right text-sm font-semibold ${
                              row.qty_change >= 0 ? 'text-emerald-700' : 'text-red-600'
                            }`}
                          >
                            {row.qty_change >= 0 ? `+${row.qty_change}` : row.qty_change}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">
                            {row.ref_type ? `${row.ref_type}:${row.ref_id || '-'}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">{row.note || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="px-4 pb-4">
                <PaginationControls
                  currentPage={safeHistoryCurrentPage}
                  totalPages={historyTotalPages}
                  totalItems={filteredSortedHistoryRows.length}
                  pageSize={pageSize}
                  onPageChange={setHistoryCurrentPage}
                />
              </div>
            </>
          )}
        </div>
      ) : null}

      {isAllocateModalOpen && selectedReserve ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-5xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-start justify-between border-b border-gray-200 p-5">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Allocate Reserve Batch</h3>
                <p className="mt-1 text-sm text-gray-600">
                  {selectedReserve.supply_order_code} - {selectedReserve.product_code} {selectedReserve.product_name}
                </p>
                <p className="text-sm font-semibold text-blue-700">
                  Reserve Product Remaining: {selectedReserve.remaining_qty}
                </p>
                <p className="text-sm text-indigo-700">
                  Allocated (batch-level): {selectedReserve.allocated_remaining_qty || 0}
                </p>
              </div>
              <button onClick={closeAllocateModal} className="rounded-md p-1 text-gray-500 hover:bg-gray-100">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-5">
              {allocationCandidates.length === 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                  No CK inventory batch available for this product.
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Batch</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Location</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">On Hand</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Available</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Allocate Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {allocationCandidates.map((row) => (
                      <tr key={row.key}>
                        <td className="px-3 py-2 text-sm text-gray-800">{row.batch_code || row.batch_id}</td>
                        <td className="px-3 py-2 text-sm text-gray-700">{row.location_name}</td>
                        <td className="px-3 py-2 text-right text-sm text-gray-700">{row.qty_on_hand}</td>
                        <td className="px-3 py-2 text-right text-sm font-semibold text-emerald-700">{row.qty_available}</td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            min={0}
                            max={row.qty_available}
                            value={row.allocate_qty}
                            onChange={(e) => {
                              const parsed = Number(e.target.value);
                              const value = Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
                              setAllocateMap((prev) => ({ ...prev, [row.key]: value }));
                            }}
                            className="w-28 rounded-lg border border-gray-300 px-2 py-1 text-right text-sm"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-gray-200 px-5 py-4">
              <div className="text-sm text-gray-600 space-y-1">
                <p>
                  Selected Allocate Qty: <span className="font-semibold text-blue-700">{totalAllocateQty}</span>
                </p>
                <p>
                  Total Inventory Available: <span className="font-semibold text-emerald-700">{totalAllocatableQty}</span>
                </p>
                {selectedReserve.remaining_qty > totalAllocatableQty ? (
                  <p className="text-xs text-amber-700">
                    Inventory available is lower than reserve remaining. Allocate partially now and continue later.
                  </p>
                ) : null}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={closeAllocateModal}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  disabled={allocating || allocationCandidates.length === 0}
                  onClick={handleSubmitAllocate}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {allocating ? 'Allocating...' : 'Submit Allocation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ReservePage;
