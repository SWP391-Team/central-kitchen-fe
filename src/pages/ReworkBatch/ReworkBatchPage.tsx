import { useState, useEffect } from 'react';
import { productionBatchService } from '@/api/services/productionBatchService';
import { reworkRecordService } from '@/api/services/reworkRecordService';
import { qualityInspectionService } from '@/api/services/qualityInspectionService';
import {
  ProductionBatchWithDetails,
  ReworkRecordWithDetails,
  QualityInspectionWithDetails,
} from '@/api/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { PlusIcon, XMarkIcon, MagnifyingGlassIcon, EyeIcon } from '@heroicons/react/24/outline';

const ReworkBatchPage = () => {
  const { isAdmin, isCentralStaff } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'batches' | 'reworks'>('batches');

  const [batches, setBatches] = useState<ProductionBatchWithDetails[]>([]);
  const [reworks, setReworks] = useState<ReworkRecordWithDetails[]>([]);
  const [loading, setLoading] = useState(false);

  const [showStartReworkModal, setShowStartReworkModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<ProductionBatchWithDetails | null>(null);
  const [failedInspection, setFailedInspection] = useState<QualityInspectionWithDetails | null>(null);
  const [starting, setStarting] = useState(false);

  const [showFinishReworkModal, setShowFinishReworkModal] = useState(false);
  const [selectedRework, setSelectedRework] = useState<ReworkRecordWithDetails | null>(null);
  const [reworkableQty, setReworkableQty] = useState<number>(0);
  const [nonReworkableQty, setNonReworkableQty] = useState<number>(0);
  const [note, setNote] = useState<string>('');
  const [finishing, setFinishing] = useState(false);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailRework, setDetailRework] = useState<ReworkRecordWithDetails | null>(null);

  const [search, setSearch] = useState('');

  useEffect(() => {
    if (activeTab === 'batches') {
      loadBatches();
    } else {
      loadReworks();
    }
  }, [activeTab]);

  const loadBatches = async () => {
    try {
      setLoading(true);
      const result = await productionBatchService.getAllBatches();
      
      const filteredBatches = result.filter((batch: ProductionBatchWithDetails) =>
        ['rework_required', 'reworking', 'reworked'].includes(batch.status)
      );

      setBatches(filteredBatches);
    } catch (error: any) {
      console.error('Error loading batches:', error);
      showToast(error.response?.data?.message || 'Failed to load batches', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadReworks = async () => {
    try {
      setLoading(true);
      const result = await reworkRecordService.getAllReworkRecords();
      setReworks(result);
    } catch (error: any) {
      console.error('Error loading reworks:', error);
      showToast(error.response?.data?.message || 'Failed to load rework records', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenStartReworkModal = async (batch: ProductionBatchWithDetails) => {
    try {
      const inspections = await qualityInspectionService.getInspectionsByBatchId(batch.batch_id);
      const failed = inspections.find(i => i.status === 'Failed');
      
      if (!failed) {
        showToast('No failed inspection found for this batch', 'error');
        return;
      }

      setSelectedBatch(batch);
      setFailedInspection(failed);
      setShowStartReworkModal(true);
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to load inspection data', 'error');
    }
  };

  const handleStartRework = async () => {
    if (!selectedBatch || !failedInspection) return;

    try {
      setStarting(true);
      await reworkRecordService.startRework({
        batch_id: selectedBatch.batch_id,
        quality_inspection_id: failedInspection.quality_inspection_id,
      });
      
      showToast('Rework started successfully!', 'success');
      setShowStartReworkModal(false);
      setSelectedBatch(null);
      setFailedInspection(null);
      loadBatches();
      setActiveTab('reworks');
      loadReworks();
    } catch (error: any) {
      console.error('Error starting rework:', error);
      showToast(error.response?.data?.message || 'Failed to start rework', 'error');
    } finally {
      setStarting(false);
    }
  };

  const handleOpenFinishReworkModal = (rework: ReworkRecordWithDetails) => {
    setSelectedRework(rework);
    setReworkableQty(0);
    setNonReworkableQty(0);
    setNote('');
    setShowFinishReworkModal(true);
  };

  const handleReworkableQtyChange = (qty: number) => {
    const reworkQty = selectedRework?.rework_qty || 0;
    const nonRework = reworkQty - qty;
    setReworkableQty(qty);
    setNonReworkableQty(nonRework >= 0 ? nonRework : 0);
  };

  const handleNonReworkableQtyChange = (qty: number) => {
    const reworkQty = selectedRework?.rework_qty || 0;
    const reworkable = reworkQty - qty;
    setNonReworkableQty(qty);
    setReworkableQty(reworkable >= 0 ? reworkable : 0);
  };

  const handleFinishRework = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedRework) return;

    if (reworkableQty < 0 || nonReworkableQty < 0) {
      showToast('Quantities cannot be negative', 'error');
      return;
    }

    if (reworkableQty > selectedRework.rework_qty || nonReworkableQty > selectedRework.rework_qty) {
      showToast('Quantities cannot exceed rework quantity', 'error');
      return;
    }

    if (reworkableQty + nonReworkableQty !== selectedRework.rework_qty) {
      showToast('Reworkable + Non-reworkable must equal Rework quantity', 'error');
      return;
    }

    try {
      setFinishing(true);
      await reworkRecordService.finishRework(selectedRework.rework_id, {
        reworkable_qty: reworkableQty,
        non_reworkable_qty: nonReworkableQty,
        note,
      });
      
      showToast('Rework finished successfully!', 'success');
      setShowFinishReworkModal(false);
      setSelectedRework(null);
      loadReworks();
      loadBatches();
    } catch (error: any) {
      console.error('Error finishing rework:', error);
      showToast(error.response?.data?.message || 'Failed to finish rework', 'error');
    } finally {
      setFinishing(false);
    }
  };

  const handleOpenDetailModal = (rework: ReworkRecordWithDetails) => {
    setDetailRework(rework);
    setShowDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setDetailRework(null);
  };

  const handleSendToQC = async (rework: ReworkRecordWithDetails) => {
    if (window.confirm(`Send batch ${rework.batch_code} to Quality Control?`)) {
      try {
        await reworkRecordService.sendToQC(rework.batch_id);
        showToast('Batch sent to QC successfully!', 'success');
        loadReworks();
        loadBatches();
      } catch (error: any) {
        console.error('Error sending to QC:', error);
        showToast(error.response?.data?.message || 'Failed to send to QC', 'error');
      }
    }
  };

  const getBatchStatusBadge = (status: string) => {
    const statusConfig: { [key: string]: { color: string; label: string } } = {
      rework_required: { color: 'bg-orange-100 text-orange-700', label: 'Rework Required' },
      reworking: { color: 'bg-yellow-100 text-yellow-700', label: 'Reworking' },
      reworked: { color: 'bg-green-100 text-green-700', label: 'Reworked' },
    };

    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-700', label: status };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getReworkStatusBadge = (status: string) => {
    const statusConfig: { [key: string]: { color: string; label: string } } = {
      Reworking: { color: 'bg-yellow-100 text-yellow-700', label: 'Reworking' },
      Reworked: { color: 'bg-green-100 text-green-700', label: 'Reworked' },
    };

    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-700', label: status };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const filteredBatches = batches.filter(batch => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      batch.batch_code?.toLowerCase().includes(searchLower) ||
      batch.product_name?.toLowerCase().includes(searchLower) ||
      batch.product_code?.toLowerCase().includes(searchLower)
    );
  });

  const filteredReworks = reworks.filter(rework => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      rework.rework_code?.toLowerCase().includes(searchLower) ||
      rework.batch_code?.toLowerCase().includes(searchLower) ||
      rework.product_name?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Rework Batch</h1>
        <p className="text-gray-600 mt-2">Manage rework processes for failed batches</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('batches')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'batches'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Batches
          </button>
          <button
            onClick={() => setActiveTab('reworks')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'reworks'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Rework Batch
          </button>
        </nav>
      </div>

      {/* Search */}
      <div className="mb-6 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={activeTab === 'batches' ? "Search batches..." : "Search rework records..."}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Batches Tab */}
      {activeTab === 'batches' && (
        <>
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading batches...</p>
            </div>
          ) : filteredBatches.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No batches found</p>
            </div>
          ) : (
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch Code</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Produced Qty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredBatches.map((batch) => (
                    <tr key={batch.batch_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-semibold text-purple-700">{batch.batch_code}</td>
                      <td className="px-4 py-3 text-sm">
                        {batch.product_name}
                        <br />
                        <span className="text-xs text-gray-500">{batch.product_code}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right">{batch.produced_qty || '-'}</td>
                      <td className="px-4 py-3 text-sm">{getBatchStatusBadge(batch.status)}</td>
                      <td className="px-4 py-3 text-sm">
                        {(isCentralStaff || isAdmin) && batch.status === 'rework_required' && (
                          <button
                            onClick={() => handleOpenStartReworkModal(batch)}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-semibold flex items-center gap-1"
                          >
                            <PlusIcon className="w-4 h-4" />
                            Start Rework
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

      {/* Rework Batch Tab */}
      {activeTab === 'reworks' && (
        <>
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading rework records...</p>
            </div>
          ) : filteredReworks.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No rework records found</p>
            </div>
          ) : (
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rework Code</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch Code</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Rework No</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rework Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Reworkable</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch Status After Rework</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Batch Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredReworks.map((rework) => (
                    <tr key={rework.rework_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-semibold text-blue-700">{rework.rework_code}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-purple-700">{rework.batch_code}</td>
                      <td className="px-4 py-3 text-sm">
                        {rework.product_name}
                        <br />
                        <span className="text-xs text-gray-500">{rework.product_code}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-center">{rework.rework_no}</td>
                      <td className="px-4 py-3 text-sm text-right">{rework.rework_qty}</td>
                      <td className="px-4 py-3 text-sm text-right">{rework.reworkable_qty || '-'}</td>
                      <td className="px-4 py-3 text-sm">{getReworkStatusBadge(rework.status)}</td>
                      <td className="px-4 py-3 text-sm">
                        {rework.batch_status_after_rework ? getBatchStatusBadge(rework.batch_status_after_rework) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {rework.batch_status ? getBatchStatusBadge(rework.batch_status) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenDetailModal(rework)}
                            className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                            title="View Details"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </button>
                          {(isCentralStaff || isAdmin) && (
                            <>
                              {rework.status === 'Reworking' && (
                                <button
                                  onClick={() => handleOpenFinishReworkModal(rework)}
                                  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs font-semibold"
                                >
                                  Finish Rework
                                </button>
                              )}
                              {rework.status === 'Reworked' && 
                               rework.rework_no === rework.max_rework_no && 
                               rework.batch_status === 'reworked' && (
                                <button
                                  onClick={() => handleSendToQC(rework)}
                                  className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-xs font-semibold"
                                >
                                  Send to QC
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Start Rework Modal */}
      {showStartReworkModal && selectedBatch && failedInspection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Start Rework</h2>
              <button onClick={() => setShowStartReworkModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="px-6 py-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">Batch Code:</span>
                    <span className="ml-2 font-semibold">{selectedBatch.batch_code}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Product:</span>
                    <span className="ml-2 font-semibold">{selectedBatch.product_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Failed Qty:</span>
                    <span className="ml-2 font-semibold text-red-600">{failedInspection.failed_qty}</span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                This will mark the batch as "Reworking" and create a rework record. Do you want to continue?
              </p>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowStartReworkModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                disabled={starting}
              >
                Cancel
              </button>
              <button
                onClick={handleStartRework}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={starting}
              >
                {starting ? 'Starting...' : 'Start Rework'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Finish Rework Modal */}
      {showFinishReworkModal && selectedRework && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Finish Rework</h2>
              <button onClick={() => setShowFinishReworkModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleFinishRework} className="overflow-y-auto flex-1">
              <div className="px-6 py-4 space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Rework Code:</span>
                      <span className="ml-2 font-semibold">{selectedRework.rework_code}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Batch Code:</span>
                      <span className="ml-2 font-semibold">{selectedRework.batch_code}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Product:</span>
                      <span className="ml-2 font-semibold">{selectedRework.product_name}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Rework No:</span>
                      <span className="ml-2 font-semibold">{selectedRework.rework_no}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rework Quantity <span className="text-gray-500">(Read-only)</span>
                  </label>
                  <input
                    type="number"
                    value={selectedRework.rework_qty}
                    readOnly
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reworkable Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={selectedRework.rework_qty}
                    value={reworkableQty ?? ''}
                    onChange={(e) => handleReworkableQtyChange(parseInt(e.target.value) || 0)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Non-Reworkable Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={selectedRework.rework_qty}
                    value={nonReworkableQty ?? ''}
                    onChange={(e) => handleNonReworkableQtyChange(parseInt(e.target.value) || 0)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {reworkableQty + nonReworkableQty !== selectedRework.rework_qty && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-700">
                      ⚠️ Reworkable ({reworkableQty}) + Non-reworkable ({nonReworkableQty}) must equal Rework Qty ({selectedRework.rework_qty})
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Note
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Optional notes..."
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowFinishReworkModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  disabled={finishing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={finishing}
                >
                  {finishing ? 'Finishing...' : 'Finish Rework'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rework Detail Modal */}
      {showDetailModal && detailRework && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Rework Record Details</h2>
              <button onClick={handleCloseDetailModal} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4">
              {/* Rework Information */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">Rework Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-600">Rework Code</label>
                    <p className="text-base font-semibold text-blue-700">{detailRework.rework_code}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Rework No</label>
                    <p className="text-base font-semibold">{detailRework.rework_no}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Status</label>
                    <p className="text-base">{getReworkStatusBadge(detailRework.status)}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Batch Status After Rework</label>
                    <p className="text-base">
                      {detailRework.batch_status_after_rework ? getBatchStatusBadge(detailRework.batch_status_after_rework) : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Max Rework No</label>
                    <p className="text-base font-semibold">{detailRework.max_rework_no || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Rework Quantity</label>
                    <p className="text-base font-semibold text-orange-700">{detailRework.rework_qty}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Reworkable Quantity</label>
                    <p className="text-base font-semibold text-green-700">{detailRework.reworkable_qty || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Non-Reworkable Quantity</label>
                    <p className="text-base font-semibold text-red-700">{detailRework.non_reworkable_qty || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Rework Date</label>
                    <p className="text-base">{detailRework.rework_date ? new Date(detailRework.rework_date).toLocaleString() : '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Reworked By</label>
                    <p className="text-base">{detailRework.rework_by_username || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Created By</label>
                    <p className="text-base">{detailRework.created_by_username || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm text-gray-600">Created At</label>
                    <p className="text-base">{new Date(detailRework.created_at).toLocaleString()}</p>
                  </div>
                  {detailRework.note && (
                    <div className="col-span-2">
                      <label className="text-sm text-gray-600">Note</label>
                      <p className="text-base bg-gray-50 p-3 rounded border border-gray-200">{detailRework.note}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Batch Information */}
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">Batch Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-600">Batch Code</label>
                    <p className="text-base font-semibold text-purple-700">{detailRework.batch_code}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Current Batch Status</label>
                    <p className="text-base">{detailRework.batch_status ? getBatchStatusBadge(detailRework.batch_status) : '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm text-gray-600">Product</label>
                    <p className="text-base font-semibold">{detailRework.product_name}</p>
                    <p className="text-sm text-gray-500">{detailRework.product_code}</p>
                  </div>
                </div>
              </div>
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

export default ReworkBatchPage;
