import { useState, useEffect } from 'react';
import { batchTransferService } from '@/api/services/batchTransferService';
import { warehouseReceiveService } from '@/api/services/warehouseReceiveService';
import { BatchTransferWithDetails, ReceivedBySuggestion, WarehouseReceiveWithDetails } from '@/api/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { XMarkIcon, InboxArrowDownIcon, EyeIcon } from '@heroicons/react/24/outline';
import PaginationControls from '@/components/PaginationControls';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { formatProductWithUnit } from '@/utils/productDisplay';

const WarehouseReceivePage = () => {
  const { isCentralStaff, isStoreStaff } = useAuth();
  const { showToast } = useToast();
  const { confirm, confirmDialog } = useConfirmDialog();

  const [activeTab, setActiveTab] = useState<'batch-transfer' | 'warehouse-receive'>('batch-transfer');

  const [deliveringTransfers, setDeliveringTransfers] = useState<BatchTransferWithDetails[]>([]);
  const [loadingTransfers, setLoadingTransfers] = useState(true);

  const [warehouseReceives, setWarehouseReceives] = useState<WarehouseReceiveWithDetails[]>([]);
  const [loadingReceives, setLoadingReceives] = useState(true);
  const [warehouseReceiveSearch, setWarehouseReceiveSearch] = useState('');
  const [warehouseReceiveSearchDebounce, setWarehouseReceiveSearchDebounce] = useState('');
  const [warehouseReceiveStatusFilter, setWarehouseReceiveStatusFilter] = useState<'all' | 'Received'>('all');
  const [warehouseReceiveSortBy, setWarehouseReceiveSortBy] = useState<'created_at' | 'received_date' | 'received_qty'>('created_at');
  const [warehouseReceiveSortOrder, setWarehouseReceiveSortOrder] = useState<'asc' | 'desc'>('desc');
  const [transfersCurrentPage, setTransfersCurrentPage] = useState(1);
  const [receivesCurrentPage, setReceivesCurrentPage] = useState(1);
  const pageSize = 10;

  const [showReceiveDetailModal, setShowReceiveDetailModal] = useState(false);
  const [selectedWarehouseReceive, setSelectedWarehouseReceive] = useState<WarehouseReceiveWithDetails | null>(null);
  const [relatedBatchTransfer, setRelatedBatchTransfer] = useState<BatchTransferWithDetails | null>(null);
  const [loadingReceiveDetail, setLoadingReceiveDetail] = useState(false);

  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<BatchTransferWithDetails | null>(null);
  const [receivedQty, setReceivedQty] = useState<number>(0);
  const [receivedDate, setReceivedDate] = useState<string>('');
  const [receiveMaxQty, setReceiveMaxQty] = useState<number>(0);
  const [receivedByQuery, setReceivedByQuery] = useState('');
  const [receivedBySuggestions, setReceivedBySuggestions] = useState<ReceivedBySuggestion[]>([]);
  const [selectedReceivedById, setSelectedReceivedById] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (activeTab === 'batch-transfer') {
      loadDeliveringTransfers();
    } else {
      loadWarehouseReceives();
    }
  }, [activeTab]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setWarehouseReceiveSearchDebounce(warehouseReceiveSearch);
    }, 400);

    return () => clearTimeout(timer);
  }, [warehouseReceiveSearch]);

  useEffect(() => {
    if (activeTab === 'batch-transfer') {
      setTransfersCurrentPage(1);
    } else {
      setReceivesCurrentPage(1);
    }
  }, [activeTab]);

  useEffect(() => {
    setReceivesCurrentPage(1);
  }, [warehouseReceiveSearchDebounce, warehouseReceiveStatusFilter, warehouseReceiveSortBy, warehouseReceiveSortOrder]);

  const loadDeliveringTransfers = async () => {
    try {
      setLoadingTransfers(true);
      const data = await batchTransferService.getDelivering();
      setDeliveringTransfers(data);
    } catch {
      showToast('Failed to load batch transfers', 'error');
    } finally {
      setLoadingTransfers(false);
    }
  };

  const loadWarehouseReceives = async () => {
    try {
      setLoadingReceives(true);
      const data = await warehouseReceiveService.getAll();
      setWarehouseReceives(data);
    } catch {
      showToast('Failed to load warehouse receives', 'error');
    } finally {
      setLoadingReceives(false);
    }
  };

  const handleSearchReceivedBy = async (transferId: number, keyword: string) => {
    try {
      const suggestions = await warehouseReceiveService.searchReceivedBySuggestions(transferId, keyword);
      setReceivedBySuggestions(suggestions);
    } catch {
      setReceivedBySuggestions([]);
    }
  };

  const handleCloseReceiveModal = () => {
    setShowReceiveModal(false);
    setSelectedTransfer(null);
    setReceivedByQuery('');
    setReceivedBySuggestions([]);
    setSelectedReceivedById(null);
  };

  const handleOpenReceiveModal = async (transfer: BatchTransferWithDetails) => {
    setSelectedTransfer(transfer);
    setReceivedQty(0);
    const now = new Date();
    const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setReceivedDate(localISO);
    const alreadyReceived = transfer.already_received_qty ?? 0;
    setReceiveMaxQty(transfer.transfer_qty - alreadyReceived);
    setReceivedByQuery('');
    setReceivedBySuggestions([]);
    setSelectedReceivedById(null);
    setShowReceiveModal(true);

    try {
      const suggestions = await warehouseReceiveService.searchReceivedBySuggestions(
        transfer.batch_transfer_id,
        ''
      );
      setReceivedBySuggestions(suggestions);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to load Received By suggestions', 'error');
    }
  };

  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransfer) return;
    if (receivedQty < 0 || receivedQty > receiveMaxQty) {
      showToast(`Received qty must be between 0 and ${receiveMaxQty}`, 'error');
      return;
    }

    if (!selectedReceivedById) {
      showToast('Please select Received By', 'error');
      return;
    }

    try {
      setSubmitting(true);
      await warehouseReceiveService.create({
        batch_transfer_id: selectedTransfer.batch_transfer_id,
        received_qty: receivedQty,
        received_date: new Date(receivedDate).toISOString(),
        received_by: selectedReceivedById,
      });
      showToast('Warehouse receive created successfully!', 'success');
      handleCloseReceiveModal();
      await loadDeliveringTransfers();
    } catch (err: any) {
      showToast(
        err.response?.data?.message || 'Failed to create warehouse receive',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteReceive = async (transfer: BatchTransferWithDetails) => {
    const accepted = await confirm({
      title: 'Complete Receive',
      message:
        `Complete Receive for batch ${transfer.batch_code}?\n` +
        `This will mark the transfer as Received.\n` +
        `Lost qty = ${transfer.transfer_qty - (transfer.already_received_qty ?? 0)}`,
      confirmText: 'Complete',
      tone: 'danger',
    });
    if (!accepted) return;

    try {
      await batchTransferService.completeReceive(transfer.batch_transfer_id);
      showToast('Batch transfer completed successfully!', 'success');
      await loadDeliveringTransfers();
    } catch (err: any) {
      showToast(
        err.response?.data?.message || 'Failed to complete receive',
        'error'
      );
    }
  };

  const handleOpenReceiveDetailModal = async (warehouseReceive: WarehouseReceiveWithDetails) => {
    setSelectedWarehouseReceive(warehouseReceive);
    setShowReceiveDetailModal(true);
    setLoadingReceiveDetail(true);
    setRelatedBatchTransfer(null);

    try {
      const transfer = await batchTransferService.getById(warehouseReceive.batch_transfer_id);
      setRelatedBatchTransfer(transfer || null);
    } catch {
      showToast('Failed to load related batch transfer details', 'error');
    } finally {
      setLoadingReceiveDetail(false);
    }
  };

  const handleCloseReceiveDetailModal = () => {
    setShowReceiveDetailModal(false);
    setSelectedWarehouseReceive(null);
    setRelatedBatchTransfer(null);
  };

  const getTransferStatusBadge = (status: string) => {
    const cfg: Record<string, string> = {
      Delivering: 'bg-indigo-100 text-indigo-700',
      Received: 'bg-teal-100 text-teal-700',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${cfg[status] || 'bg-gray-100 text-gray-700'}`}>
        {status}
      </span>
    );
  };

  const filteredWarehouseReceives = warehouseReceives
    .filter((wr) => {
      if (warehouseReceiveSearchDebounce) {
        const keyword = warehouseReceiveSearchDebounce.toLowerCase();
        const matched =
          (wr.warehouse_receive_code || '').toLowerCase().includes(keyword) ||
          (wr.batch_code || '').toLowerCase().includes(keyword) ||
          (wr.product_name || '').toLowerCase().includes(keyword) ||
          (wr.product_code || '').toLowerCase().includes(keyword) ||
          (wr.location_name || '').toLowerCase().includes(keyword) ||
          (wr.received_by_username || '').toLowerCase().includes(keyword) ||
          (wr.created_by_username || '').toLowerCase().includes(keyword) ||
          String(wr.warehouse_receive_id).includes(keyword) ||
          String(wr.batch_transfer_id).includes(keyword);
        if (!matched) return false;
      }

      if (
        warehouseReceiveStatusFilter !== 'all' &&
        wr.status !== warehouseReceiveStatusFilter
      ) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      let aValue = 0;
      let bValue = 0;

      if (warehouseReceiveSortBy === 'received_qty') {
        aValue = a.received_qty;
        bValue = b.received_qty;
      } else if (warehouseReceiveSortBy === 'received_date') {
        aValue = new Date(a.received_date).getTime();
        bValue = new Date(b.received_date).getTime();
      } else {
        aValue = new Date(a.created_at).getTime();
        bValue = new Date(b.created_at).getTime();
      }

      return warehouseReceiveSortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

  const totalTransferPages = Math.max(1, Math.ceil(deliveringTransfers.length / pageSize));
  const safeTransfersCurrentPage = Math.min(transfersCurrentPage, totalTransferPages);
  const paginatedTransfers = deliveringTransfers.slice(
    (safeTransfersCurrentPage - 1) * pageSize,
    safeTransfersCurrentPage * pageSize
  );

  const totalReceivePages = Math.max(1, Math.ceil(filteredWarehouseReceives.length / pageSize));
  const safeReceivesCurrentPage = Math.min(receivesCurrentPage, totalReceivePages);
  const paginatedWarehouseReceives = filteredWarehouseReceives.slice(
    (safeReceivesCurrentPage - 1) * pageSize,
    safeReceivesCurrentPage * pageSize
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Warehouse Receive</h1>
        <p className="text-gray-600 mt-2">Manage incoming batch deliveries</p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('batch-transfer')}
              className={`${
                activeTab === 'batch-transfer'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              Batch Transfer
            </button>
            <button
              onClick={() => setActiveTab('warehouse-receive')}
              className={`${
                activeTab === 'warehouse-receive'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              Warehouse Receive
            </button>
          </nav>
        </div>
      </div>

      {/* ── Tab 1: Batch Transfer (Delivering) ── */}
      {activeTab === 'batch-transfer' && (
        <>
          {loadingTransfers ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : deliveringTransfers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No delivering batch transfers found</div>
          ) : (
            <>
              <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transfer Code</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Transfer Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Received</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Remaining</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">From</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">To</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transfer Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedTransfers.map((bt) => {
                    const alreadyReceived = bt.already_received_qty ?? 0;
                    const remaining = bt.transfer_qty - alreadyReceived;
                    const canCompleteReceive =
                      bt.status === 'Delivering' && alreadyReceived < bt.transfer_qty;

                    return (
                      <tr key={bt.batch_transfer_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-mono font-semibold text-blue-700">
                          {bt.batch_transfer_code || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-purple-700">
                          {bt.batch_code || bt.batch_id}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <div>{formatProductWithUnit(bt.product_name, bt.unit_name)}</div>
                          <div className="text-xs text-gray-500">{bt.product_code}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold">{bt.transfer_qty}</td>
                        <td className="px-4 py-3 text-sm text-right text-green-700 font-semibold">{alreadyReceived}</td>
                        <td className={`px-4 py-3 text-sm text-right font-semibold ${remaining > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                          {remaining}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{bt.from_location_name || bt.from_location_id}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{bt.to_location_name || bt.to_location_id}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {new Date(bt.transfer_date).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm">{getTransferStatusBadge(bt.status)}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex gap-2">
                            {(isCentralStaff || isStoreStaff) && remaining > 0 && (
                              <button
                                onClick={() => handleOpenReceiveModal(bt)}
                                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs font-semibold flex items-center gap-1"
                              >
                                <InboxArrowDownIcon className="w-3 h-3" />
                                Receipt Batch
                              </button>
                            )}
                            {/* Rule 8: Complete Receive */}
                            {(isCentralStaff || isStoreStaff) && canCompleteReceive && alreadyReceived > 0 && (
                              <button
                                onClick={() => handleCompleteReceive(bt)}
                                className="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 text-xs font-semibold"
                              >
                                Complete Receive
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                </table>
              </div>

              <PaginationControls
                currentPage={safeTransfersCurrentPage}
                totalPages={totalTransferPages}
                totalItems={deliveringTransfers.length}
                pageSize={pageSize}
                onPageChange={setTransfersCurrentPage}
              />
            </>
          )}
        </>
      )}

      {/* ── Tab 2: Warehouse Receive (read-only) ── */}
      {activeTab === 'warehouse-receive' && (
        <>
          <div className="mb-4 flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Search by receive code, batch, product, location, user..."
              value={warehouseReceiveSearch}
              onChange={(e) => setWarehouseReceiveSearch(e.target.value)}
              className="flex-1 min-w-[280px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />

            <select
              value={warehouseReceiveStatusFilter}
              onChange={(e) =>
                setWarehouseReceiveStatusFilter(e.target.value as 'all' | 'Received')
              }
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="Received">Received</option>
            </select>

            <select
              value={warehouseReceiveSortBy}
              onChange={(e) =>
                setWarehouseReceiveSortBy(
                  e.target.value as 'created_at' | 'received_date' | 'received_qty'
                )
              }
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="created_at">Created Time</option>
              <option value="received_date">Received Date</option>
              <option value="received_qty">Received Qty</option>
            </select>

            <select
              value={warehouseReceiveSortOrder}
              onChange={(e) =>
                setWarehouseReceiveSortOrder(e.target.value as 'asc' | 'desc')
              }
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>

          {loadingReceives ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : filteredWarehouseReceives.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No warehouse receive records found</div>
          ) : (
            <>
              <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Received Qty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Received Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Received By</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created By</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created At</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedWarehouseReceives.map((wr) => (
                    <tr key={wr.warehouse_receive_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono font-semibold text-blue-700">{wr.warehouse_receive_code || '-'}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-purple-700">
                        {wr.batch_code || wr.batch_id}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div>{formatProductWithUnit(wr.product_name, wr.unit_name)}</div>
                        <div className="text-xs text-gray-500">{wr.product_code}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{wr.location_name || wr.location_id}</td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-green-700">{wr.received_qty}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{new Date(wr.received_date).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{wr.received_by_username || wr.received_by}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{wr.created_by_username || wr.created_by}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{new Date(wr.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-700">
                            {wr.status}
                          </span>
                          {wr.is_over_delivery && (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                              Over Delivery
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => handleOpenReceiveDetailModal(wr)}
                          className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                          title="View Details"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>

              <PaginationControls
                currentPage={safeReceivesCurrentPage}
                totalPages={totalReceivePages}
                totalItems={filteredWarehouseReceives.length}
                pageSize={pageSize}
                onPageChange={setReceivesCurrentPage}
              />
            </>
          )}
        </>
      )}

      {/* ── Warehouse Receive Detail Modal ── */}
      {showReceiveDetailModal && selectedWarehouseReceive && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Warehouse Receive Detail</h2>
              <button
                onClick={handleCloseReceiveDetailModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">
                  Warehouse Receive Information
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Receive Code</span>
                    <p className="font-mono font-semibold text-blue-700">{selectedWarehouseReceive.warehouse_receive_code || '-'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Warehouse Receive ID</span>
                    <p className="font-semibold">#{selectedWarehouseReceive.warehouse_receive_id}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Batch Transfer ID</span>
                    <p className="font-semibold">#{selectedWarehouseReceive.batch_transfer_id}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Status</span>
                    <p>
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-700">
                        {selectedWarehouseReceive.status}
                      </span>
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Batch</span>
                    <p className="font-semibold text-purple-700">
                      {selectedWarehouseReceive.batch_code || selectedWarehouseReceive.batch_id}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Product</span>
                    <p className="font-semibold">{formatProductWithUnit(selectedWarehouseReceive.product_name, selectedWarehouseReceive.unit_name)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Product Code</span>
                    <p className="font-semibold">{selectedWarehouseReceive.product_code || '-'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Location</span>
                    <p className="font-semibold">{selectedWarehouseReceive.location_name || selectedWarehouseReceive.location_id}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Received Qty</span>
                    <p className="font-semibold text-green-700">{selectedWarehouseReceive.received_qty}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Received Date</span>
                    <p className="font-semibold">{new Date(selectedWarehouseReceive.received_date).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Received By</span>
                    <p className="font-semibold">{selectedWarehouseReceive.received_by_username || selectedWarehouseReceive.received_by}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Created By</span>
                    <p className="font-semibold">{selectedWarehouseReceive.created_by_username || selectedWarehouseReceive.created_by}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Created At</span>
                    <p className="font-semibold">{new Date(selectedWarehouseReceive.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">
                  Related Batch Transfer Information
                </h3>
                {loadingReceiveDetail ? (
                  <div className="text-center py-5 text-gray-500">Loading related batch transfer...</div>
                ) : !relatedBatchTransfer ? (
                  <div className="text-center py-5 text-gray-500">No related batch transfer found</div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Transfer Code</span>
                      <p className="font-mono font-semibold text-blue-700">{relatedBatchTransfer.batch_transfer_code || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Batch Transfer ID</span>
                      <p className="font-semibold">#{relatedBatchTransfer.batch_transfer_id}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Status</span>
                      <p>{getTransferStatusBadge(relatedBatchTransfer.status)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Transfer Qty</span>
                      <p className="font-semibold">{relatedBatchTransfer.transfer_qty}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Lost Qty</span>
                      <p className="font-semibold text-red-600">{relatedBatchTransfer.lost_qty ?? 0}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Batch</span>
                      <p className="font-semibold text-purple-700">{relatedBatchTransfer.batch_code || relatedBatchTransfer.batch_id}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Product</span>
                      <p className="font-semibold">{formatProductWithUnit(relatedBatchTransfer.product_name, relatedBatchTransfer.unit_name)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Product Code</span>
                      <p className="font-semibold">{relatedBatchTransfer.product_code || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Already Received</span>
                      <p className="font-semibold text-green-700">{relatedBatchTransfer.already_received_qty ?? 0}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">From Location</span>
                      <p className="font-semibold">{relatedBatchTransfer.from_location_name || relatedBatchTransfer.from_location_id}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">To Location</span>
                      <p className="font-semibold">{relatedBatchTransfer.to_location_name || relatedBatchTransfer.to_location_id}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Transfer Date</span>
                      <p className="font-semibold">{new Date(relatedBatchTransfer.transfer_date).toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Created By</span>
                      <p className="font-semibold">{relatedBatchTransfer.created_by_username || relatedBatchTransfer.created_by}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Created At</span>
                      <p className="font-semibold">{new Date(relatedBatchTransfer.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={handleCloseReceiveDetailModal}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Warehouse Receive Modal ── */}
      {showReceiveModal && selectedTransfer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Warehouse Receive</h2>
              <button
                onClick={handleCloseReceiveModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Read-only info */}
            <div className="mb-5 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 font-medium">Batch:</span>
                <span className="font-semibold text-purple-700">{selectedTransfer.batch_code || selectedTransfer.batch_id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 font-medium">Product:</span>
                <span className="font-semibold">{formatProductWithUnit(selectedTransfer.product_name, selectedTransfer.unit_name)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 font-medium">Transfer Qty:</span>
                <span className="font-semibold">{selectedTransfer.transfer_qty}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 font-medium">Already Received:</span>
                <span className="font-semibold text-green-600">{selectedTransfer.already_received_qty ?? 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 font-medium">Max Receivable:</span>
                <span className="font-semibold text-orange-600">{receiveMaxQty}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 font-medium">From Location:</span>
                <span className="font-semibold">{selectedTransfer.from_location_name || selectedTransfer.from_location_id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 font-medium">To Location:</span>
                <span className="font-semibold">{selectedTransfer.to_location_name || selectedTransfer.to_location_id}</span>
              </div>
            </div>

            <form onSubmit={handleReceiveSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Received Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max={receiveMaxQty}
                  step="1"
                  value={receivedQty || ''}
                  onChange={(e) => setReceivedQty(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Max: {receiveMaxQty}
                </p>
              </div>

              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Received Date &amp; Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={receivedDate}
                  onChange={(e) => setReceivedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Received By <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={receivedByQuery}
                  onChange={(e) => {
                    const value = e.target.value;
                    setReceivedByQuery(value);
                    setSelectedReceivedById(null);
                    if (selectedTransfer) {
                      handleSearchReceivedBy(selectedTransfer.batch_transfer_id, value);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Type username or user code"
                  required
                />
                {receivedBySuggestions.length > 0 && (
                  <div className="mt-2 border border-gray-200 rounded-lg max-h-52 overflow-auto bg-white">
                    {receivedBySuggestions.map((item) => (
                      <button
                        key={item.user_id}
                        type="button"
                        onClick={() => {
                          setSelectedReceivedById(item.user_id);
                          setReceivedByQuery(`${item.user_code} - ${item.username}`);
                          setReceivedBySuggestions([]);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b last:border-b-0"
                      >
                        <span className="font-medium text-gray-900">{item.username}</span>
                        <span className="ml-2 text-xs text-gray-500">{item.user_code}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCloseReceiveModal}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Saving...' : 'Confirm Receive'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDialog}
    </div>
  );
};

export default WarehouseReceivePage;
