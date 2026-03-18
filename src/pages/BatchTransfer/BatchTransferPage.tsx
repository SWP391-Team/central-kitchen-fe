import { useState, useEffect } from 'react';
import { batchTransferService } from '@/api/services/batchTransferService';
import { warehouseReceiveService } from '@/api/services/warehouseReceiveService';
import {
  BatchTransferWithDetails,
  WarehouseReceiveWithDetails,
} from '@/api/types';
import { useToast } from '@/contexts/ToastContext';
import {
  XMarkIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';

const BatchTransferPage = () => {
  const { showToast } = useToast();
  const [batchTransfers, setBatchTransfers] = useState<BatchTransferWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');
  const [transferStatusFilter, setTransferStatusFilter] = useState<string>('all');
  const [transferSortBy, setTransferSortBy] = useState<'created_at' | 'transfer_date' | 'transfer_qty'>('created_at');
  const [transferSortOrder, setTransferSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const [showTransferDetailModal, setShowTransferDetailModal] = useState(false);
  const [selectedTransferForDetail, setSelectedTransferForDetail] = useState<BatchTransferWithDetails | null>(null);
  const [transferReceiveDetails, setTransferReceiveDetails] = useState<WarehouseReceiveWithDetails[]>([]);
  const [loadingTransferDetail, setLoadingTransferDetail] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounce(search);
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    loadBatchTransfers();
  }, [searchDebounce, transferStatusFilter, transferSortBy, transferSortOrder]);

  const loadBatchTransfers = async () => {
    try {
      setLoading(true);
      const data = await batchTransferService.getAll();
      setBatchTransfers(data);
    } catch (err: any) {
      showToast('Failed to load batch transfers', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTransferDetailModal = async (transfer: BatchTransferWithDetails) => {
    setSelectedTransferForDetail(transfer);
    setShowTransferDetailModal(true);
    setLoadingTransferDetail(true);
    try {
      const data = await warehouseReceiveService.getByTransferId(transfer.batch_transfer_id);
      setTransferReceiveDetails(data);
    } catch {
      showToast('Failed to load warehouse receives for this transfer', 'error');
      setTransferReceiveDetails([]);
    } finally {
      setLoadingTransferDetail(false);
    }
  };

  const handleCloseTransferDetailModal = () => {
    setShowTransferDetailModal(false);
    setSelectedTransferForDetail(null);
    setTransferReceiveDetails([]);
  };

  const filteredBatchTransfers = batchTransfers
    .filter((transfer) => {
      if (searchDebounce) {
        const searchLower = searchDebounce.toLowerCase();
        const matched =
          (transfer.batch_transfer_code || '').toLowerCase().includes(searchLower) ||
          (transfer.batch_code || '').toLowerCase().includes(searchLower) ||
          (transfer.product_name || '').toLowerCase().includes(searchLower) ||
          (transfer.product_code || '').toLowerCase().includes(searchLower) ||
          (transfer.from_location_name || '').toLowerCase().includes(searchLower) ||
          (transfer.to_location_name || '').toLowerCase().includes(searchLower) ||
          String(transfer.batch_transfer_id).includes(searchLower);
        if (!matched) return false;
      }

      if (transferStatusFilter !== 'all' && transfer.status !== transferStatusFilter) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      let aValue = 0;
      let bValue = 0;

      if (transferSortBy === 'transfer_qty') {
        aValue = a.transfer_qty;
        bValue = b.transfer_qty;
      } else if (transferSortBy === 'transfer_date') {
        aValue = new Date(a.transfer_date).getTime();
        bValue = new Date(b.transfer_date).getTime();
      } else {
        aValue = new Date(a.created_at).getTime();
        bValue = new Date(b.created_at).getTime();
      }

      return transferSortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Batch Transfer</h1>
        <p className="text-gray-600 mt-2">View and manage batch transfers</p>
      </div>

      {/* Search and Filter */}
      <div className="mb-4 flex gap-4">
        <input
          type="text"
          placeholder="Search by code, batch, product, location..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        
        <select
          value={transferStatusFilter}
          onChange={(e) => setTransferStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Status</option>
          <option value="Delivering">Delivering</option>
          <option value="Received">Received</option>
        </select>

        <select
          value={transferSortBy}
          onChange={(e) => setTransferSortBy(e.target.value as 'created_at' | 'transfer_date' | 'transfer_qty')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="created_at">Created Time</option>
          <option value="transfer_date">Transfer Date</option>
          <option value="transfer_qty">Transfer Qty</option>
        </select>

        <select
          value={transferSortOrder}
          onChange={(e) => setTransferSortOrder(e.target.value as 'asc' | 'desc')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </div>

      {/* Batch Transfer Table */}
      <>
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : filteredBatchTransfers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No batch transfers found</div>
        ) : (
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transfer Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">From Location</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">To Location</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Transfer Qty</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Lost Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transfer Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created By</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created At</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBatchTransfers.map((bt) => (
                  <tr key={bt.batch_transfer_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono font-semibold text-blue-700">{bt.batch_transfer_code || '-'}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-purple-700">{bt.batch_code || bt.batch_id}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div>{bt.product_name}</div>
                      <div className="text-xs text-gray-500">{bt.product_code}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{bt.from_location_name || bt.from_location_id}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{bt.to_location_name || bt.to_location_id}</td>
                    <td className="px-4 py-3 text-sm text-right font-semibold">{bt.transfer_qty}</td>
                    <td className="px-4 py-3 text-sm text-right text-red-600 font-semibold">{bt.lost_qty}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {new Date(bt.transfer_date).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        bt.status === 'Received'
                          ? 'bg-teal-100 text-teal-700'
                          : 'bg-indigo-100 text-indigo-700'
                      }`}>
                        {bt.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{bt.created_by_username || bt.created_by}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{new Date(bt.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => handleOpenTransferDetailModal(bt)}
                        className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                        title="View Transfer Detail"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </>

      {/* Batch Transfer Detail Modal */}
      {showTransferDetailModal && selectedTransferForDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Batch Transfer Detail</h2>
              <button onClick={handleCloseTransferDetailModal} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">Transfer Information</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Transfer Code</span>
                    <p className="font-mono font-semibold text-blue-700">{selectedTransferForDetail.batch_transfer_code || '-'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Transfer ID</span>
                    <p className="font-semibold">#{selectedTransferForDetail.batch_transfer_id}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Batch</span>
                    <p className="font-semibold text-purple-700">{selectedTransferForDetail.batch_code || selectedTransferForDetail.batch_id}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Status</span>
                    <p>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        selectedTransferForDetail.status === 'Received'
                          ? 'bg-teal-100 text-teal-700'
                          : 'bg-indigo-100 text-indigo-700'
                      }`}>
                        {selectedTransferForDetail.status}
                      </span>
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Product</span>
                    <p className="font-semibold">{selectedTransferForDetail.product_name || '-'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Product Code</span>
                    <p className="font-semibold">{selectedTransferForDetail.product_code || '-'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Transfer Qty</span>
                    <p className="font-semibold">{selectedTransferForDetail.transfer_qty}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Lost Qty</span>
                    <p className="font-semibold text-red-600">{selectedTransferForDetail.lost_qty ?? 0}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Already Received</span>
                    <p className="font-semibold text-green-700">{selectedTransferForDetail.already_received_qty ?? 0}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Remaining</span>
                    <p className="font-semibold text-orange-600">
                      {selectedTransferForDetail.transfer_qty - (selectedTransferForDetail.already_received_qty ?? 0)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">From Location</span>
                    <p className="font-semibold">{selectedTransferForDetail.from_location_name || selectedTransferForDetail.from_location_id}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">To Location</span>
                    <p className="font-semibold">{selectedTransferForDetail.to_location_name || selectedTransferForDetail.to_location_id}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Transfer Date</span>
                    <p className="font-semibold">{new Date(selectedTransferForDetail.transfer_date).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Created By</span>
                    <p className="font-semibold">{selectedTransferForDetail.created_by_username || selectedTransferForDetail.created_by}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Created At</span>
                    <p className="font-semibold">{new Date(selectedTransferForDetail.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">Warehouse Receive Records</h3>
                {loadingTransferDetail ? (
                  <div className="text-center py-6 text-gray-500">Loading warehouse receive records...</div>
                ) : transferReceiveDetails.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">No warehouse receive records for this transfer</div>
                ) : (
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Receive Code</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Receive ID</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Received Qty</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Received Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Received By</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created At</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {transferReceiveDetails.map((wr) => (
                          <tr key={wr.warehouse_receive_id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-mono font-semibold text-blue-700">{wr.warehouse_receive_code || '-'}</td>
                            <td className="px-4 py-3 text-sm font-semibold">#{wr.warehouse_receive_id}</td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-green-700">{wr.received_qty}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{new Date(wr.received_date).toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{wr.location_name || wr.location_id}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{wr.received_by_username || wr.received_by}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{new Date(wr.created_at).toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-700">
                                {wr.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={handleCloseTransferDetailModal}
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

export default BatchTransferPage;
