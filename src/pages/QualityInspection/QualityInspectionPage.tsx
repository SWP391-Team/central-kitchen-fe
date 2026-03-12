import { useState, useEffect } from 'react';
import { productionBatchService } from '@/api/services/productionBatchService';
import { qualityInspectionService } from '@/api/services/qualityInspectionService';
import { reworkRecordService } from '@/api/services/reworkRecordService';
import {
  ProductionBatchWithDetails,
  QualityInspectionWithDetails,
  QualityInspectionFinishRequest,
  ReworkRecordWithDetails
} from '@/api/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { MagnifyingGlassIcon, XMarkIcon, EyeIcon } from '@heroicons/react/24/outline';

const QualityInspectionPage = () => {
  const { isAdmin, isCentralStaff } = useAuth();
  const { showToast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'batches' | 'inspections'>('batches');
  
  const [batches, setBatches] = useState<ProductionBatchWithDetails[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [batchSearch, setBatchSearch] = useState('');
  const [batchStatusFilter, setBatchStatusFilter] = useState('all');
  const [batchSortBy, setBatchSortBy] = useState<'created_at' | 'production_date'>('created_at');
  const [batchSortOrder, setBatchSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const [inspections, setInspections] = useState<QualityInspectionWithDetails[]>([]);
  const [inspectionsLoading, setInspectionsLoading] = useState(false);
  const [inspectionSearch, setInspectionSearch] = useState('');
  const [inspectionStatusFilter, setInspectionStatusFilter] = useState('all');
  const [inspectionSortBy, setInspectionSortBy] = useState<'created_at' | 'quality_inspection_code' | 'inspected_at'>('created_at');
  const [inspectionSortOrder, setInspectionSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;
  
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<QualityInspectionWithDetails | null>(null);
  const [finishData, setFinishData] = useState<QualityInspectionFinishRequest>({
    inspection_mode: 'sampling',
    inspected_qty: 0,
    passed_qty: 0,
    failed_qty: 0,
    inspection_result: 'Pass',
    note: ''
  });
  const [finishing, setFinishing] = useState(false);

  const [batchReworksMap, setBatchReworksMap] = useState<Record<number, ReworkRecordWithDetails[]>>({});

  useEffect(() => {
    if (activeTab === 'batches') {
      loadBatches();
    } else {
      loadInspections();
    }
  }, [activeTab, batchSearch, batchStatusFilter, batchSortBy, batchSortOrder, inspectionSearch, inspectionStatusFilter, inspectionSortBy, inspectionSortOrder, currentPage]);

  const loadBatches = async () => {
    try {
      setBatchesLoading(true);
      const result = await productionBatchService.getAllBatches();
      
      let filteredBatches = result.filter((batch: ProductionBatchWithDetails) =>
        ['waiting_qc', 'under_qc', 'qc_passed', 'qc_failed', 'rejected'].includes(batch.status)
      );

      if (batchSearch) {
        filteredBatches = filteredBatches.filter((batch: ProductionBatchWithDetails) =>
          batch.batch_code?.toLowerCase().includes(batchSearch.toLowerCase()) ||
          batch.product_name?.toLowerCase().includes(batchSearch.toLowerCase()) ||
          batch.product_code?.toLowerCase().includes(batchSearch.toLowerCase())
        );
      }

      if (batchStatusFilter !== 'all') {
        filteredBatches = filteredBatches.filter((batch: ProductionBatchWithDetails) =>
          batch.status === batchStatusFilter
        );
      }

      filteredBatches.sort((a: ProductionBatchWithDetails, b: ProductionBatchWithDetails) => {
        const aValue = a[batchSortBy];
        const bValue = b[batchSortBy];
        
        if (!aValue && !bValue) return 0;
        if (!aValue) return 1;
        if (!bValue) return -1;
        
        const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        return batchSortOrder === 'asc' ? comparison : -comparison;
      });

      setBatches(filteredBatches);
      
      await loadReworkDataForBatches(filteredBatches);
    } catch (error: any) {
      console.error('Error loading batches:', error);
      showToast(error.response?.data?.message || 'Failed to load batches', 'error');
    } finally {
      setBatchesLoading(false);
    }
  };

  const loadInspections = async () => {
    try {
      setInspectionsLoading(true);
      const result = await qualityInspectionService.getQualityInspections({
        search: inspectionSearch,
        status: inspectionStatusFilter !== 'all' ? inspectionStatusFilter : undefined,
        sortBy: inspectionSortBy,
        sortOrder: inspectionSortOrder,
        page: currentPage,
        limit: pageSize
      });

      setInspections(result.data);
      setTotal(result.pagination.total);
      setTotalPages(result.pagination.totalPages);
      
      await loadReworkDataForInspections(result.data);
    } catch (error: any) {
      console.error('Error loading inspections:', error);
      showToast(error.response?.data?.message || 'Failed to load inspections', 'error');
    } finally {
      setInspectionsLoading(false);
    }
  };

  const loadReworkDataForBatches = async (batchList: ProductionBatchWithDetails[]) => {
    try {
      const reworkMap: Record<number, ReworkRecordWithDetails[]> = {};
      
      for (const batch of batchList) {
        try {
          const reworks = await reworkRecordService.getReworksByBatchId(batch.batch_id);
          if (reworks && reworks.length > 0) {
            reworkMap[batch.batch_id] = reworks;
          }
        } catch (error) {
        }
      }
      
      setBatchReworksMap(reworkMap);
    } catch (error) {
      console.error('Error loading rework data:', error);
    }
  };

  const loadReworkDataForInspections = async (inspectionList: QualityInspectionWithDetails[]) => {
    try {
      const reworkMap: Record<number, ReworkRecordWithDetails[]> = {};
      
      for (const inspection of inspectionList) {
        try {
          const reworks = await reworkRecordService.getReworksByBatchId(inspection.batch_id);
          if (reworks && reworks.length > 0) {
            reworkMap[inspection.batch_id] = reworks;
          }
        } catch (error) {
        }
      }
      
      setBatchReworksMap(reworkMap);
    } catch (error) {
      console.error('Error loading rework data:', error);
    }
  };

  const getSourceFromBatch = (batchId: number): string => {
    const reworks = batchReworksMap[batchId];
    if (!reworks || reworks.length === 0) {
      return 'Production';
    }
    
    const latestRework = reworks.reduce((latest, current) =>
      current.rework_no > latest.rework_no ? current : latest
    );
    
    return `Rework #${latestRework.rework_no}`;
  };

  const getSourceQtyFromBatch = (batch: ProductionBatchWithDetails): number => {
    const reworks = batchReworksMap[batch.batch_id];
    if (!reworks || reworks.length === 0) {
      return batch.produced_qty || 0;
    }
    
    const latestRework = reworks.reduce((latest, current) =>
      current.rework_no > latest.rework_no ? current : latest
    );
    
    return latestRework.reworkable_qty || 0;
  };

  const getSourceFromInspection = (inspection: QualityInspectionWithDetails): string => {
    const reworks = batchReworksMap[inspection.batch_id];
    if (!reworks || reworks.length === 0) {
      return 'Production';
    }
    
    const inspectionDate = new Date(inspection.created_at);
    const priorReworks = reworks.filter(r => 
      r.rework_date && new Date(r.rework_date) < inspectionDate
    );
    
    if (priorReworks.length === 0) {
      return 'Production';
    }
    
    const latestRework = priorReworks.reduce((latest, current) =>
      current.rework_no > latest.rework_no ? current : latest
    );
    
    return `Rework #${latestRework.rework_no}`;
  };

  const getSourceQtyFromInspection = (inspection: QualityInspectionWithDetails): number => {
    const reworks = batchReworksMap[inspection.batch_id];
    if (!reworks || reworks.length === 0) {
      return inspection.produced_qty || 0;
    }
    
    const inspectionDate = new Date(inspection.created_at);
    const priorReworks = reworks.filter(r => 
      r.rework_date && new Date(r.rework_date) < inspectionDate
    );
    
    if (priorReworks.length === 0) {
      return inspection.produced_qty || 0;
    }
    
    const latestRework = priorReworks.reduce((latest, current) =>
      current.rework_no > latest.rework_no ? current : latest
    );
    
    return latestRework.reworkable_qty || 0;
  };

  const handleStartInspection = async (batch: ProductionBatchWithDetails) => {
    if (window.confirm(`Start quality inspection for batch ${batch.batch_code}?`)) {
      try {
        await qualityInspectionService.startInspection({ batch_id: batch.batch_id });
        showToast('Inspection started successfully!', 'success');
        loadBatches();
        setActiveTab('inspections');
        loadInspections();
      } catch (error: any) {
        console.error('Error starting inspection:', error);
        showToast(error.response?.data?.message || 'Failed to start inspection', 'error');
      }
    }
  };

  const handleReinspection = async (inspection: QualityInspectionWithDetails) => {
    if (window.confirm(`Start reinspection for batch ${inspection.batch_code}?`)) {
      try {
        await qualityInspectionService.reinspection({ batch_id: inspection.batch_id });
        showToast('Reinspection started successfully!', 'success');
        loadInspections();
        loadBatches();
      } catch (error: any) {
        console.error('Error starting reinspection:', error);
        showToast(error.response?.data?.message || 'Failed to start reinspection', 'error');
      }
    }
  };

  const handleRejectBatch = async (inspection: QualityInspectionWithDetails) => {
    if (window.confirm(`Reject batch ${inspection.batch_code}? This action cannot be undone.`)) {
      try {
        await qualityInspectionService.rejectBatch(inspection.batch_id);
        showToast('Batch rejected successfully!', 'success');
        loadInspections();
        loadBatches();
      } catch (error: any) {
        console.error('Error rejecting batch:', error);
        showToast(error.response?.data?.message || 'Failed to reject batch', 'error');
      }
    }
  };

  const handleSendReworkRequest = async (inspection: QualityInspectionWithDetails) => {
    if (window.confirm(`Send rework request for batch ${inspection.batch_code}?`)) {
      try {
        await qualityInspectionService.sendReworkRequest(inspection.quality_inspection_id);
        showToast('Rework request sent successfully!', 'success');
        loadInspections();
        loadBatches();
      } catch (error: any) {
        console.error('Error sending rework request:', error);
        showToast(error.response?.data?.message || 'Failed to send rework request', 'error');
      }
    }
  };

  const handleUndoInspection = async (inspection: QualityInspectionWithDetails) => {
    if (window.confirm(
      `Undo this inspection and create a new one?\n\n` +
      `Current status: ${inspection.status}\n` +
      `This will mark current inspection as "Incorrect Data" and create a new inspection record.`
    )) {
      try {
        const result = await qualityInspectionService.undoInspection(inspection.quality_inspection_id);
        showToast(
          `Inspection undone! New inspection ${result.newInspection.quality_inspection_code} created.`,
          'success'
        );
        loadInspections();
        loadBatches();
      } catch (error: any) {
        console.error('Error undoing inspection:', error);
        showToast(error.response?.data?.message || 'Failed to undo inspection', 'error');
      }
    }
  };

  const handleOpenFinishModal = (inspection: QualityInspectionWithDetails) => {
    setSelectedInspection(inspection);
    
    const source = getSourceFromInspection(inspection);
    const isRework = source.startsWith('Rework');
    
    const sourceQty = getSourceQtyFromInspection(inspection);
    
    setFinishData({
      inspection_mode: isRework ? 'full' : 'sampling',
      inspected_qty: isRework ? sourceQty : 0,
      passed_qty: 0,
      failed_qty: 0,
      inspection_result: 'Pass',
      note: ''
    });
    setShowFinishModal(true);
  };

  const handleCloseFinishModal = () => {
    setShowFinishModal(false);
    setSelectedInspection(null);
    setFinishData({
      inspection_mode: 'sampling',
      inspected_qty: 0,
      passed_qty: 0,
      failed_qty: 0,
      inspection_result: 'Pass',
      note: ''
    });
  };

  const handleOpenDetailModal = (inspection: QualityInspectionWithDetails) => {
    setSelectedInspection(inspection);
    setShowDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedInspection(null);
  };

  const handleInspectionModeChange = (mode: 'sampling' | 'full') => {
    if (mode === 'full' && selectedInspection) {
      const sourceQty = getSourceQtyFromInspection(selectedInspection);
      setFinishData({
        ...finishData,
        inspection_mode: mode,
        inspected_qty: sourceQty,
        passed_qty: 0,
        failed_qty: 0
      });
    } else {
      setFinishData({
        ...finishData,
        inspection_mode: mode,
        inspected_qty: 0,
        passed_qty: 0,
        failed_qty: 0
      });
    }
  };

  const handleInspectedQtyChange = (qty: number) => {
    setFinishData({
      ...finishData,
      inspected_qty: qty,
      passed_qty: 0,
      failed_qty: 0
    });
  };

  const handlePassedQtyChange = (qty: number) => {
    const failed = finishData.inspected_qty - qty;
    setFinishData({
      ...finishData,
      passed_qty: qty,
      failed_qty: failed >= 0 ? failed : 0
    });
  };

  const handleFailedQtyChange = (qty: number) => {
    const passed = finishData.inspected_qty - qty;
    setFinishData({
      ...finishData,
      failed_qty: qty,
      passed_qty: passed >= 0 ? passed : 0
    });
  };

  const handleFinishInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedInspection) return;

    if (!finishData.inspection_mode) {
      showToast('Please select inspection mode', 'error');
      return;
    }

    if (finishData.inspected_qty <= 0) {
      showToast('Inspected quantity must be greater than 0', 'error');
      return;
    }

    const sourceQty = getSourceQtyFromInspection(selectedInspection);
    if (finishData.inspected_qty > sourceQty) {
      showToast('Inspected quantity cannot exceed source quantity', 'error');
      return;
    }

    if (finishData.passed_qty + finishData.failed_qty !== finishData.inspected_qty) {
      showToast('Passed + Failed quantities must equal Inspected quantity', 'error');
      return;
    }

    if (finishData.inspection_mode === 'sampling' && finishData.failed_qty > 0 && finishData.inspection_result === 'Pass') {
      showToast('Cannot pass sampling inspection with failures', 'error');
      return;
    }

    try {
      setFinishing(true);
      await qualityInspectionService.finishInspection(selectedInspection.quality_inspection_id, finishData);
      showToast('Inspection finished successfully!', 'success');
      handleCloseFinishModal();
      loadInspections();
      loadBatches();
    } catch (error: any) {
      console.error('Error finishing inspection:', error);
      showToast(error.response?.data?.message || 'Failed to finish inspection', 'error');
    } finally {
      setFinishing(false);
    }
  };

  const getBatchStatusBadge = (status: string) => {
    const statusConfig: { [key: string]: { color: string; label: string } } = {
      waiting_qc: { color: 'bg-blue-100 text-blue-700', label: 'Waiting QC' },
      under_qc: { color: 'bg-yellow-100 text-yellow-700', label: 'Under QC' },
      qc_passed: { color: 'bg-emerald-100 text-emerald-700', label: 'QC Passed' },
      qc_failed: { color: 'bg-red-100 text-red-700', label: 'QC Failed' },
      rejected: { color: 'bg-gray-100 text-gray-700', label: 'Rejected' },
      rework_required: { color: 'bg-orange-100 text-orange-700', label: 'Rework Required' },
      reworking: { color: 'bg-purple-100 text-purple-700', label: 'Reworking' },
      reworked: { color: 'bg-indigo-100 text-indigo-700', label: 'Reworked' },
    };

    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-700', label: status };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getInspectionStatusBadge = (status: string) => {
    const statusConfig: { [key: string]: { color: string; label: string } } = {
      Inspecting: { color: 'bg-yellow-100 text-yellow-700', label: 'Inspecting' },
      Passed: { color: 'bg-green-100 text-green-700', label: 'Passed' },
      Failed: { color: 'bg-red-100 text-red-700', label: 'Failed' },
      'Incorrect Data': { color: 'bg-gray-100 text-gray-700', label: 'Incorrect Data' },
    };

    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-700', label: status };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Quality Inspection</h1>
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
            onClick={() => setActiveTab('inspections')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'inspections'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Quality Inspection
          </button>
        </nav>
      </div>

      {/* Batches Tab */}
      {activeTab === 'batches' && (
        <>
          {/* Filters */}
          <div className="mb-6 flex flex-wrap gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={batchSearch}
                onChange={(e) => setBatchSearch(e.target.value)}
                placeholder="Search batches..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={batchStatusFilter}
                onChange={(e) => setBatchStatusFilter(e.target.value)}
                className="block px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="waiting_qc">Waiting QC</option>
                <option value="under_qc">Under QC</option>
                <option value="qc_passed">QC Passed</option>
                <option value="qc_failed">QC Failed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <select
                value={batchSortBy}
                onChange={(e) => setBatchSortBy(e.target.value as 'created_at' | 'production_date')}
                className="block px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="created_at">Created At</option>
                <option value="production_date">Production Date</option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <select
                value={batchSortOrder}
                onChange={(e) => setBatchSortOrder(e.target.value as 'asc' | 'desc')}
                className="block px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>

          {/* Batches Table */}
          {batchesLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading batches...</p>
            </div>
          ) : batches.length === 0 ? (
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Source Qty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Production Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {batches.map((batch) => (
                    <tr key={batch.batch_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-semibold text-purple-700">{batch.batch_code}</td>
                      <td className="px-4 py-3 text-sm">
                        {batch.product_name}
                        <br />
                        <span className="text-xs text-gray-500">{batch.product_code}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right">{batch.produced_qty || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        {getSourceFromBatch(batch.batch_id)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        {getSourceQtyFromBatch(batch)}
                      </td>
                      <td className="px-4 py-3 text-sm">{formatDate(batch.production_date)}</td>
                      <td className="px-4 py-3 text-sm">{getBatchStatusBadge(batch.status)}</td>
                      <td className="px-4 py-3 text-sm">
                        {(isCentralStaff || isAdmin) && (
                          <div className="flex gap-2">
                            {batch.status === 'waiting_qc' && (
                              <button
                                onClick={() => handleStartInspection(batch)}
                                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-semibold"
                              >
                                Start Inspection
                              </button>
                            )}
                            {batch.status !== 'waiting_qc' && (
                              <span className="text-xs text-gray-400 italic">-</span>
                            )}
                          </div>
                        )}
                        {!(isCentralStaff || isAdmin) && (
                          <span className="text-xs text-gray-400 italic">-</span>
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

      {/* Quality Inspection Tab */}
      {activeTab === 'inspections' && (
        <>
          {/* Filters */}
          <div className="mb-6 flex flex-wrap gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={inspectionSearch}
                onChange={(e) => {
                  setInspectionSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search inspections..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={inspectionStatusFilter}
                onChange={(e) => {
                  setInspectionStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="block px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="Inspecting">Inspecting</option>
                <option value="Passed">Passed</option>
                <option value="Failed">Failed</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <select
                value={inspectionSortBy}
                onChange={(e) => setInspectionSortBy(e.target.value as any)}
                className="block px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="created_at">Created At</option>
                <option value="quality_inspection_code">QI Code</option>
                <option value="inspected_at">Inspected At</option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <select
                value={inspectionSortOrder}
                onChange={(e) => setInspectionSortOrder(e.target.value as 'asc' | 'desc')}
                className="block px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>

          {/* Inspections Table */}
          {inspectionsLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading inspections...</p>
            </div>
          ) : inspections.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No inspections found</p>
            </div>
          ) : (
            <>
              <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">QI Code</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch Code</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Inspection No</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Source Qty</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Produced Qty</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch Status At Inspection</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Batch Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created At</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {inspections.map((inspection) => (
                      <tr key={inspection.quality_inspection_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-semibold text-blue-700">{inspection.quality_inspection_code}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-purple-700">{inspection.batch_code}</td>
                        <td className="px-4 py-3 text-sm">
                          {inspection.product_name}
                          <br />
                          <span className="text-xs text-gray-500">{inspection.product_code}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center">{inspection.inspection_no}</td>
                        <td className="px-4 py-3 text-sm">
                          {getSourceFromInspection(inspection)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium">
                          {getSourceQtyFromInspection(inspection)}
                        </td>
                          <td className="px-4 py-3 text-sm text-right">{inspection.produced_qty || '-'}</td>
                          <td className="px-4 py-3 text-sm">{getInspectionStatusBadge(inspection.status)}</td>
                          <td className="px-4 py-3 text-sm">
                            {inspection.batch_status_at_inspection ? getBatchStatusBadge(inspection.batch_status_at_inspection) : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {inspection.batch_status ? getBatchStatusBadge(inspection.batch_status) : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm">{formatDate(inspection.created_at)}</td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleOpenDetailModal(inspection)}
                                className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                                title="View Details"
                              >
                                <EyeIcon className="h-5 w-5" />
                              </button>
                              {(isCentralStaff || isAdmin) && (
                                <>
                                  {inspection.status === 'Inspecting' && (
                                    <button
                                      onClick={() => handleOpenFinishModal(inspection)}
                                      className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs font-semibold"
                                    >
                                      Finish Inspection
                                    </button>
                                  )}
                                  {(inspection.status === 'Passed' || inspection.status === 'Failed') &&
                                   inspection.inspection_no === inspection.max_inspection_no &&
                                   (inspection.batch_status === 'qc_failed' || inspection.batch_status === 'qc_passed' || inspection.batch_status === 'rework_required') && (
                                    <button
                                      onClick={() => handleUndoInspection(inspection)}
                                      className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-xs font-semibold"
                                    >
                                      Undo Inspection
                                    </button>
                                  )}
                                  {inspection.batch_status === 'qc_failed' && 
                                   inspection.inspection_no === inspection.max_inspection_no && 
                                   inspection.inspection_mode === 'sampling' && (
                                    <button
                                      onClick={() => handleReinspection(inspection)}
                                      className="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 text-xs font-semibold"
                                    >
                                      Reinspection
                                    </button>
                                  )}
                                  {inspection.status === 'Failed' && 
                                   inspection.inspection_no === inspection.max_inspection_no && 
                                   inspection.batch_status === 'qc_failed' && (
                                    <>
                                      <button
                                        onClick={() => handleSendReworkRequest(inspection)}
                                        className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-xs font-semibold"
                                      >
                                        Send Rework Request
                                      </button>
                                      <button
                                        onClick={() => handleRejectBatch(inspection)}
                                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs font-semibold"
                                      >
                                        Reject
                                      </button>
                                    </>
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing {(currentPage - 1) * pageSize + 1} to{' '}
                    {Math.min(currentPage * pageSize, total)} of {total} results
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(currentPage - 1)}
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
                              onClick={() => setCurrentPage(page)}
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
                      onClick={() => setCurrentPage(currentPage + 1)}
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
        </>
      )}

      {/* Finish Inspection Modal */}
      {showFinishModal && selectedInspection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Finish Inspection</h2>
              <button onClick={handleCloseFinishModal} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleFinishInspection} className="overflow-y-auto flex-1">
              <div className="px-6 py-4 space-y-4">
                {/* Inspection Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Batch Code:</span>
                      <span className="ml-2 font-semibold">{selectedInspection.batch_code}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Product:</span>
                      <span className="ml-2 font-semibold">{selectedInspection.product_name}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Inspection No:</span>
                      <span className="ml-2 font-semibold">{selectedInspection.inspection_no}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Source:</span>
                      <span className="ml-2 font-semibold">{getSourceFromInspection(selectedInspection)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Source Qty:</span>
                      <span className="ml-2 font-semibold text-blue-700">{getSourceQtyFromInspection(selectedInspection)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Produced Qty:</span>
                      <span className="ml-2 font-semibold">{selectedInspection.produced_qty}</span>
                    </div>
                  </div>
                </div>

                {/* Inspection Mode */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Inspection Mode <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="inspection_mode"
                        value="sampling"
                        checked={finishData.inspection_mode === 'sampling'}
                        onChange={() => handleInspectionModeChange('sampling')}
                        disabled={selectedInspection && getSourceFromInspection(selectedInspection).startsWith('Rework')}
                        className="mr-2 disabled:cursor-not-allowed"
                      />
                      <span className={selectedInspection && getSourceFromInspection(selectedInspection).startsWith('Rework') ? 'text-gray-400' : ''}>
                        Sampling
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="inspection_mode"
                        value="full"
                        checked={finishData.inspection_mode === 'full'}
                        onChange={() => handleInspectionModeChange('full')}
                        className="mr-2"
                      />
                      Full Inspection
                    </label>
                  </div>
                  {selectedInspection && getSourceFromInspection(selectedInspection).startsWith('Rework') && (
                    <p className="text-xs text-orange-600 mt-1">Rework batches must use Full Inspection mode</p>
                  )}
                </div>

                {/* Inspected Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Inspected Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedInspection ? getSourceQtyFromInspection(selectedInspection) : 0}
                    value={finishData.inspected_qty ?? ''}
                    onChange={(e) => handleInspectedQtyChange(parseInt(e.target.value) || 0)}
                    disabled={finishData.inspection_mode === 'full'}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    required
                  />
                  {finishData.inspection_mode === 'full' && (
                    <p className="text-xs text-gray-500 mt-1">Auto-set to source quantity for full inspection</p>
                  )}
                </div>

                {/* Passed Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Passed Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={finishData.inspected_qty}
                    value={finishData.passed_qty ?? ''}
                    onChange={(e) => handlePassedQtyChange(parseInt(e.target.value) || 0)}
                    disabled={finishData.inspected_qty === 0}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    required
                  />
                </div>

                {/* Failed Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Failed Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={finishData.inspected_qty}
                    value={finishData.failed_qty ?? ''}
                    onChange={(e) => handleFailedQtyChange(parseInt(e.target.value) || 0)}
                    disabled={finishData.inspected_qty === 0}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    required
                  />
                </div>

                {/* Sum Check */}
                {finishData.inspected_qty > 0 && finishData.passed_qty + finishData.failed_qty !== finishData.inspected_qty && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-700">
                      ⚠️ Passed ({finishData.passed_qty}) + Failed ({finishData.failed_qty}) must equal Inspected ({finishData.inspected_qty})
                    </p>
                  </div>
                )}

                {/* Inspection Result */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Inspection Result <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="inspection_result"
                        value="Pass"
                        checked={finishData.inspection_result === 'Pass'}
                        onChange={() => setFinishData({ ...finishData, inspection_result: 'Pass' })}
                        disabled={finishData.inspection_mode === 'sampling' && finishData.failed_qty > 0}
                        className="mr-2"
                      />
                      Pass
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="inspection_result"
                        value="Fail"
                        checked={finishData.inspection_result === 'Fail'}
                        onChange={() => setFinishData({ ...finishData, inspection_result: 'Fail' })}
                        className="mr-2"
                      />
                      Fail
                    </label>
                  </div>
                  {finishData.inspection_mode === 'sampling' && finishData.failed_qty > 0 && (
                    <p className="text-xs text-orange-600 mt-1">Cannot pass sampling inspection with failures</p>
                  )}
                </div>

                {/* Note */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Note
                  </label>
                  <textarea
                    value={finishData.note || ''}
                    onChange={(e) => setFinishData({ ...finishData, note: e.target.value })}
                    rows={3}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Optional notes..."
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCloseFinishModal}
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
                  {finishing ? 'Finishing...' : 'Finish Inspection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Detail Modal */}
      {showDetailModal && selectedInspection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Quality Inspection Details</h2>
              <button onClick={handleCloseDetailModal} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4">
              {/* Quality Inspection Information */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">Inspection Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">QI Code:</span>
                    <p className="font-semibold text-blue-700">{selectedInspection.quality_inspection_code}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Inspection No:</span>
                    <p className="font-semibold">{selectedInspection.inspection_no}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Inspection Mode:</span>
                    <p className="font-semibold capitalize">{selectedInspection.inspection_mode || '-'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Inspection Status:</span>
                    <p>{getInspectionStatusBadge(selectedInspection.status)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Inspected Qty:</span>
                    <p className="font-semibold">{selectedInspection.inspected_qty || '-'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Passed Qty:</span>
                    <p className="font-semibold text-green-600">{selectedInspection.passed_qty || '-'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Failed Qty:</span>
                    <p className="font-semibold text-red-600">{selectedInspection.failed_qty || '-'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Inspected By:</span>
                    <p className="font-semibold">{selectedInspection.inspected_by_username || '-'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Inspected At:</span>
                    <p className="font-semibold">{selectedInspection.inspected_at ? formatDate(selectedInspection.inspected_at) : '-'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Created By:</span>
                    <p className="font-semibold">{selectedInspection.created_by_username || '-'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Created At:</span>
                    <p className="font-semibold">{formatDate(selectedInspection.created_at)}</p>
                  </div>
                  {selectedInspection.note && (
                    <div className="col-span-2">
                      <span className="text-sm text-gray-600">Note:</span>
                      <p className="font-semibold">{selectedInspection.note}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Batch Status Information */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">Batch Status Overview</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Batch Status at Inspection:</span>
                    <p>
                      {selectedInspection.batch_status_at_inspection 
                        ? getBatchStatusBadge(selectedInspection.batch_status_at_inspection) 
                        : <span className="text-gray-400">-</span>
                      }
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Current Batch Status:</span>
                    <p>{selectedInspection.batch_status ? getBatchStatusBadge(selectedInspection.batch_status) : '-'}</p>
                  </div>
                </div>
              </div>

              {/* Rework Record Information (if applicable) */}
              {(() => {
                const reworks = batchReworksMap[selectedInspection.batch_id];
                if (!reworks || reworks.length === 0) return null;
                
                // Find rework that was completed before this inspection
                const inspectionDate = new Date(selectedInspection.created_at);
                const priorReworks = reworks.filter(r => 
                  r.rework_date && new Date(r.rework_date) < inspectionDate
                );
                
                if (priorReworks.length === 0) return null;
                
                const latestRework = priorReworks.reduce((latest, current) =>
                  current.rework_no > latest.rework_no ? current : latest
                );
                
                return (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">
                      Rework Record Information (Rework #{latestRework.rework_no})
                    </h3>
                    <div className="grid grid-cols-2 gap-4 bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <div>
                        <span className="text-sm text-gray-600">Rework Code:</span>
                        <p className="font-semibold text-orange-700">{latestRework.rework_code}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Rework No:</span>
                        <p className="font-semibold">{latestRework.rework_no}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Rework Quantity:</span>
                        <p className="font-semibold text-orange-600">{latestRework.rework_qty}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Reworkable Quantity:</span>
                        <p className="font-semibold text-green-600">{latestRework.reworkable_qty || '-'}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Non-Reworkable Quantity:</span>
                        <p className="font-semibold text-red-600">{latestRework.non_reworkable_qty || '-'}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Rework Status:</span>
                        <p>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            latestRework.status === 'Reworked' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {latestRework.status}
                          </span>
                        </p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Reworked By:</span>
                        <p className="font-semibold">{latestRework.rework_by_username || '-'}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Rework Date:</span>
                        <p className="font-semibold">{latestRework.rework_date ? new Date(latestRework.rework_date).toLocaleString() : '-'}</p>
                      </div>
                      {latestRework.note && (
                        <div className="col-span-2">
                          <span className="text-sm text-gray-600">Rework Note:</span>
                          <p className="font-semibold bg-white p-2 rounded border border-orange-200">{latestRework.note}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Batch Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">Batch Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Batch Code:</span>
                    <p className="font-semibold text-purple-700">{selectedInspection.batch_code}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Product Name:</span>
                    <p className="font-semibold">{selectedInspection.product_name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Product Code:</span>
                    <p className="font-semibold">{selectedInspection.product_code}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Produced Qty:</span>
                    <p className="font-semibold">{selectedInspection.produced_qty || '-'}</p>
                  </div>
                  {selectedInspection.max_inspection_no && (
                    <div>
                      <span className="text-sm text-gray-600">Total Inspections:</span>
                      <p className="font-semibold">{selectedInspection.max_inspection_no}</p>
                    </div>
                  )}
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

export default QualityInspectionPage;
