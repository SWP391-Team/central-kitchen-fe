import { useEffect, useState } from 'react';
import { EyeIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { batchTransferService } from '@/api/services/batchTransferService';
import { inventoryService } from '@/api/services/inventoryService';
import { productionBatchService } from '@/api/services/productionBatchService';
import { warehouseReceiveService } from '@/api/services/warehouseReceiveService';
import {
  BatchInventory,
  BatchTransferWithDetails,
  InventoryTransaction,
  ProductionBatchWithDetails,
  WarehouseReceiveWithDetails,
} from '@/api/types';
import { useToast } from '@/contexts/ToastContext';
import PaginationControls from '@/components/PaginationControls';

type BatchSortBy = 'updated_at' | 'qty_available' | 'qty_on_hand' | 'location_name';
type AvailabilityFilter = 'all' | 'available' | 'out_of_stock' | 'reserved';
type TransactionSortBy = 'created_at' | 'qty' | 'reference_type' | 'transaction_type';
type TransactionReferenceFilter =
  | 'all'
  | 'production_batch'
  | 'batch_transfer'
  | 'warehouse_receive'
  | 'inventory_adjustment';

const InventoryPage = () => {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'inventory-batches' | 'inventory-transactions'>('inventory-batches');

  const [batchInventory, setBatchInventory] = useState<BatchInventory[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [batchSearch, setBatchSearch] = useState('');
  const [batchLocationFilter, setBatchLocationFilter] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>('all');
  const [batchSortBy, setBatchSortBy] = useState<BatchSortBy>('updated_at');
  const [batchSortOrder, setBatchSortOrder] = useState<'asc' | 'desc'>('desc');
  const [batchesCurrentPage, setBatchesCurrentPage] = useState(1);

  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [transactionSearch, setTransactionSearch] = useState('');
  const [transactionLocationFilter, setTransactionLocationFilter] = useState('all');
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<'all' | 'IN' | 'OUT' | 'ADJUSTMENT'>('all');
  const [referenceTypeFilter, setReferenceTypeFilter] =
    useState<TransactionReferenceFilter>('all');
  const [transactionSortBy, setTransactionSortBy] = useState<TransactionSortBy>('created_at');
  const [transactionSortOrder, setTransactionSortOrder] = useState<'asc' | 'desc'>('desc');
  const [transactionsCurrentPage, setTransactionsCurrentPage] = useState(1);
  const pageSize = 10;

  const [batchTransfers, setBatchTransfers] = useState<BatchTransferWithDetails[]>([]);
  const [productionBatches, setProductionBatches] = useState<ProductionBatchWithDetails[]>([]);
  const [warehouseReceives, setWarehouseReceives] = useState<WarehouseReceiveWithDetails[]>([]);

  const [showTransactionDetailModal, setShowTransactionDetailModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<InventoryTransaction | null>(null);

  useEffect(() => {
    if (activeTab === 'inventory-batches') {
      loadBatchInventory();
      return;
    }

    loadTransactions();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'inventory-batches') {
      setBatchesCurrentPage(1);
    } else {
      setTransactionsCurrentPage(1);
    }
  }, [activeTab]);

  useEffect(() => {
    setBatchesCurrentPage(1);
  }, [batchSearch, batchLocationFilter, availabilityFilter, batchSortBy, batchSortOrder]);

  useEffect(() => {
    setTransactionsCurrentPage(1);
  }, [
    transactionSearch,
    transactionLocationFilter,
    transactionTypeFilter,
    referenceTypeFilter,
    transactionSortBy,
    transactionSortOrder,
  ]);

  const loadBatchInventory = async () => {
    try {
      setLoadingBatches(true);
      const data = await inventoryService.getBatchInventory();
      setBatchInventory(data);
    } catch {
      showToast('Failed to load inventory', 'error');
    } finally {
      setLoadingBatches(false);
    }
  };

  const loadTransactions = async () => {
    try {
      setLoadingTransactions(true);

      const [transactionsResult, transfersResult, productionBatchesResult, warehouseReceivesResult] =
        await Promise.allSettled([
          inventoryService.getTransactions(),
          batchTransferService.getAll(),
          productionBatchService.getAllBatches(),
          warehouseReceiveService.getAll(),
        ]);

      if (transactionsResult.status !== 'fulfilled') {
        throw new Error('Failed to load inventory transactions');
      }

      setTransactions(transactionsResult.value);
      setBatchTransfers(transfersResult.status === 'fulfilled' ? transfersResult.value : []);
      setProductionBatches(
        productionBatchesResult.status === 'fulfilled' ? productionBatchesResult.value : []
      );
      setWarehouseReceives(
        warehouseReceivesResult.status === 'fulfilled' ? warehouseReceivesResult.value : []
      );
    } catch {
      showToast('Failed to load inventory transactions', 'error');
    } finally {
      setLoadingTransactions(false);
    }
  };

  const getTransactionTypeBadge = (type: string) => {
    const cfg: Record<string, string> = {
      IN: 'bg-green-100 text-green-700',
      OUT: 'bg-red-100 text-red-700',
      ADJUSTMENT: 'bg-yellow-100 text-yellow-700',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${cfg[type] || 'bg-gray-100 text-gray-700'}`}>
        {type}
      </span>
    );
  };

  const getReferenceTypeBadge = (type: string) => {
    const cfg: Record<string, string> = {
      production_batch: 'bg-blue-100 text-blue-700',
      batch_transfer: 'bg-indigo-100 text-indigo-700',
      warehouse_receive: 'bg-teal-100 text-teal-700',
      inventory_adjustment: 'bg-amber-100 text-amber-700',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${cfg[type] || 'bg-gray-100 text-gray-700'}`}>
        {type}
      </span>
    );
  };

  const getQtyDisplay = (qty: number, transactionType?: string) => {
    const signedQty = transactionType === 'OUT' ? -Math.abs(qty) : Math.abs(qty);

    return (
      <span className={`font-semibold ${signedQty > 0 ? 'text-green-700' : signedQty < 0 ? 'text-red-600' : 'text-gray-500'}`}>
        {signedQty > 0 ? `+${signedQty}` : signedQty}
      </span>
    );
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) return '-';
    return new Date(value).toLocaleString();
  };

  const batchTransferMap = new Map(batchTransfers.map((item) => [item.batch_transfer_id, item]));
  const productionBatchMap = new Map(productionBatches.map((item) => [item.batch_id, item]));
  const warehouseReceiveMap = new Map(
    warehouseReceives.map((item) => [item.warehouse_receive_id, item])
  );

  const batchLocationOptions = Array.from(
    new Map(
      batchInventory.map((item) => [item.location_id, item.location_name || `Location #${item.location_id}`])
    ).entries()
  );

  const transactionLocationOptions = Array.from(
    new Map(
      transactions.map((item) => [item.location_id, item.location_name || `Location #${item.location_id}`])
    ).entries()
  );

  const filteredBatchInventory = [...batchInventory]
    .filter((item) => {
      const keyword = batchSearch.trim().toLowerCase();
      if (keyword) {
        const matched =
          (item.location_name || '').toLowerCase().includes(keyword) ||
          (item.product_name || '').toLowerCase().includes(keyword) ||
          (item.product_code || '').toLowerCase().includes(keyword) ||
          (item.batch_code || '').toLowerCase().includes(keyword) ||
          String(item.location_id).includes(keyword) ||
          String(item.batch_id).includes(keyword);

        if (!matched) return false;
      }

      if (batchLocationFilter !== 'all' && String(item.location_id) !== batchLocationFilter) {
        return false;
      }

      if (availabilityFilter === 'available' && item.qty_available <= 0) {
        return false;
      }

      if (availabilityFilter === 'out_of_stock' && item.qty_on_hand > 0) {
        return false;
      }

      if (availabilityFilter === 'reserved' && item.qty_reserved <= 0) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (batchSortBy === 'qty_available') {
        return batchSortOrder === 'asc'
          ? a.qty_available - b.qty_available
          : b.qty_available - a.qty_available;
      }

      if (batchSortBy === 'qty_on_hand') {
        return batchSortOrder === 'asc'
          ? a.qty_on_hand - b.qty_on_hand
          : b.qty_on_hand - a.qty_on_hand;
      }

      if (batchSortBy === 'location_name') {
        const aValue = a.location_name || String(a.location_id);
        const bValue = b.location_name || String(b.location_id);
        return batchSortOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      const aTime = new Date(a.updated_at).getTime();
      const bTime = new Date(b.updated_at).getTime();
      return batchSortOrder === 'asc' ? aTime - bTime : bTime - aTime;
    });

  const filteredTransactions = [...transactions]
    .filter((tx) => {
      const relatedBatchTransfer =
        tx.reference_type === 'batch_transfer' ? batchTransferMap.get(tx.reference_id) : undefined;
      const relatedWarehouseReceive =
        tx.reference_type === 'warehouse_receive'
          ? warehouseReceiveMap.get(tx.reference_id)
          : undefined;

      const keyword = transactionSearch.trim().toLowerCase();
      if (keyword) {
        const matched =
          String(tx.inventory_transaction_id).includes(keyword) ||
          (tx.location_name || '').toLowerCase().includes(keyword) ||
          (tx.product_name || '').toLowerCase().includes(keyword) ||
          (tx.product_code || '').toLowerCase().includes(keyword) ||
          (tx.batch_code || '').toLowerCase().includes(keyword) ||
          tx.reference_type.toLowerCase().includes(keyword) ||
          String(tx.reference_id).includes(keyword) ||
          (relatedBatchTransfer?.batch_transfer_code || '').toLowerCase().includes(keyword) ||
          (relatedWarehouseReceive?.warehouse_receive_code || '').toLowerCase().includes(keyword);

        if (!matched) return false;
      }

      if (
        transactionLocationFilter !== 'all' &&
        String(tx.location_id) !== transactionLocationFilter
      ) {
        return false;
      }

      if (transactionTypeFilter !== 'all' && tx.transaction_type !== transactionTypeFilter) {
        return false;
      }

      if (referenceTypeFilter !== 'all' && tx.reference_type !== referenceTypeFilter) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (transactionSortBy === 'qty') {
        return transactionSortOrder === 'asc' ? a.qty - b.qty : b.qty - a.qty;
      }

      if (transactionSortBy === 'reference_type') {
        return transactionSortOrder === 'asc'
          ? a.reference_type.localeCompare(b.reference_type)
          : b.reference_type.localeCompare(a.reference_type);
      }

      if (transactionSortBy === 'transaction_type') {
        return transactionSortOrder === 'asc'
          ? a.transaction_type.localeCompare(b.transaction_type)
          : b.transaction_type.localeCompare(a.transaction_type);
      }

      const aTime = new Date(a.created_at).getTime();
      const bTime = new Date(b.created_at).getTime();
      return transactionSortOrder === 'asc' ? aTime - bTime : bTime - aTime;
    });

  const totalBatchPages = Math.max(1, Math.ceil(filteredBatchInventory.length / pageSize));
  const safeBatchesCurrentPage = Math.min(batchesCurrentPage, totalBatchPages);
  const paginatedBatchInventory = filteredBatchInventory.slice(
    (safeBatchesCurrentPage - 1) * pageSize,
    safeBatchesCurrentPage * pageSize
  );

  const totalTransactionPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const safeTransactionsCurrentPage = Math.min(transactionsCurrentPage, totalTransactionPages);
  const paginatedTransactions = filteredTransactions.slice(
    (safeTransactionsCurrentPage - 1) * pageSize,
    safeTransactionsCurrentPage * pageSize
  );

  const selectedBatchTransfer =
    selectedTransaction?.reference_type === 'batch_transfer'
      ? batchTransferMap.get(selectedTransaction.reference_id) || null
      : null;
  const selectedProductionBatch =
    selectedTransaction?.reference_type === 'production_batch'
      ? productionBatchMap.get(selectedTransaction.reference_id) || null
      : null;
  const selectedWarehouseReceive =
    selectedTransaction?.reference_type === 'warehouse_receive'
      ? warehouseReceiveMap.get(selectedTransaction.reference_id) || null
      : null;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Inventory</h1>
        <p className="text-gray-600 mt-2">View current inventory levels and transaction history</p>
      </div>

      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('inventory-batches')}
              className={`${
                activeTab === 'inventory-batches'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              Inventory Batches
            </button>
            <button
              onClick={() => setActiveTab('inventory-transactions')}
              className={`${
                activeTab === 'inventory-transactions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              Inventory Transactions
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'inventory-batches' && (
        <>
          <div className="mb-4 flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Search by location, product, product code, batch code..."
              value={batchSearch}
              onChange={(e) => setBatchSearch(e.target.value)}
              className="flex-1 min-w-[280px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />

            <select
              value={batchLocationFilter}
              onChange={(e) => setBatchLocationFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Locations</option>
              {batchLocationOptions.map(([locationId, locationName]) => (
                <option key={locationId} value={String(locationId)}>
                  {locationName}
                </option>
              ))}
            </select>

            <select
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value as AvailabilityFilter)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Availability</option>
              <option value="available">Available &gt; 0</option>
              <option value="out_of_stock">Out of Stock</option>
              <option value="reserved">Has Reserved Qty</option>
            </select>

            <select
              value={batchSortBy}
              onChange={(e) => setBatchSortBy(e.target.value as BatchSortBy)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="updated_at">Updated At</option>
              <option value="qty_available">Qty Available</option>
              <option value="qty_on_hand">Qty On Hand</option>
              <option value="location_name">Location</option>
            </select>

            <select
              value={batchSortOrder}
              onChange={(e) => setBatchSortOrder(e.target.value as 'asc' | 'desc')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>

          {loadingBatches ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : filteredBatchInventory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No inventory records found</div>
          ) : (
            <>
              <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty On Hand</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty Reserved</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty Available</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Updated At</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedBatchInventory.map((bi) => (
                    <tr key={bi.batch_inventory_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-blue-700">
                        {bi.location_name || bi.location_id}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div>{bi.product_name}</div>
                        <div className="text-xs text-gray-500">{bi.product_code}</div>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-purple-700">
                        {bi.batch_code || bi.batch_id}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold">{bi.qty_on_hand}</td>
                      <td className="px-4 py-3 text-sm text-right text-yellow-600 font-semibold">{bi.qty_reserved}</td>
                      <td className={`px-4 py-3 text-sm text-right font-semibold ${bi.qty_available > 0 ? 'text-green-700' : 'text-red-600'}`}>
                        {bi.qty_available}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDateTime(bi.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>

              <PaginationControls
                currentPage={safeBatchesCurrentPage}
                totalPages={totalBatchPages}
                totalItems={filteredBatchInventory.length}
                pageSize={pageSize}
                onPageChange={setBatchesCurrentPage}
              />
            </>
          )}
        </>
      )}

      {activeTab === 'inventory-transactions' && (
        <>
          <div className="mb-4 flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Search by transaction ID, location, product, batch, reference, code..."
              value={transactionSearch}
              onChange={(e) => setTransactionSearch(e.target.value)}
              className="flex-1 min-w-[280px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />

            <select
              value={transactionLocationFilter}
              onChange={(e) => setTransactionLocationFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Locations</option>
              {transactionLocationOptions.map(([locationId, locationName]) => (
                <option key={locationId} value={String(locationId)}>
                  {locationName}
                </option>
              ))}
            </select>

            <select
              value={transactionTypeFilter}
              onChange={(e) =>
                setTransactionTypeFilter(e.target.value as 'all' | 'IN' | 'OUT' | 'ADJUSTMENT')
              }
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              <option value="IN">IN</option>
              <option value="OUT">OUT</option>
              <option value="ADJUSTMENT">ADJUSTMENT</option>
            </select>

            <select
              value={referenceTypeFilter}
              onChange={(e) => setReferenceTypeFilter(e.target.value as TransactionReferenceFilter)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All References</option>
              <option value="production_batch">production_batch</option>
              <option value="batch_transfer">batch_transfer</option>
              <option value="warehouse_receive">warehouse_receive</option>
              <option value="inventory_adjustment">inventory_adjustment</option>
            </select>

            <select
              value={transactionSortBy}
              onChange={(e) => setTransactionSortBy(e.target.value as TransactionSortBy)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="created_at">Created At</option>
              <option value="qty">Qty</option>
              <option value="reference_type">Reference Type</option>
              <option value="transaction_type">Transaction Type</option>
            </select>

            <select
              value={transactionSortOrder}
              onChange={(e) => setTransactionSortOrder(e.target.value as 'asc' | 'desc')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>

          {loadingTransactions ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No transaction records found</div>
          ) : (
            <>
              <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created At</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedTransactions.map((tx) => {
                    const relatedTransfer =
                      tx.reference_type === 'batch_transfer'
                        ? batchTransferMap.get(tx.reference_id)
                        : null;
                    const relatedReceive =
                      tx.reference_type === 'warehouse_receive'
                        ? warehouseReceiveMap.get(tx.reference_id)
                        : null;

                    return (
                      <tr key={tx.inventory_transaction_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-blue-700">
                          {tx.location_name || tx.location_id}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <div>{tx.product_name}</div>
                          <div className="text-xs text-gray-500">{tx.product_code}</div>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-purple-700">
                          {tx.batch_code || tx.batch_id}
                        </td>
                        <td className="px-4 py-3 text-sm">{getTransactionTypeBadge(tx.transaction_type)}</td>
                        <td className="px-4 py-3 text-sm text-right">
                          {getQtyDisplay(tx.qty, tx.transaction_type)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <div className="mb-1">{getReferenceTypeBadge(tx.reference_type)}</div>
                          <div className="text-xs text-gray-400">#{tx.reference_id}</div>
                          {relatedTransfer?.batch_transfer_code && (
                            <div className="text-xs font-mono text-indigo-600">
                              {relatedTransfer.batch_transfer_code}
                            </div>
                          )}
                          {relatedReceive?.warehouse_receive_code && (
                            <div className="text-xs font-mono text-teal-600">
                              {relatedReceive.warehouse_receive_code}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{formatDateTime(tx.created_at)}</td>
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={() => {
                              setSelectedTransaction(tx);
                              setShowTransactionDetailModal(true);
                            }}
                            className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                            title="View Details"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                </table>
              </div>

              <PaginationControls
                currentPage={safeTransactionsCurrentPage}
                totalPages={totalTransactionPages}
                totalItems={filteredTransactions.length}
                pageSize={pageSize}
                onPageChange={setTransactionsCurrentPage}
              />
            </>
          )}
        </>
      )}

      {showTransactionDetailModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Inventory Transaction Detail</h2>
              <button
                onClick={() => {
                  setShowTransactionDetailModal(false);
                  setSelectedTransaction(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">
                  Transaction Information
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Transaction ID</span>
                    <p className="font-semibold">#{selectedTransaction.inventory_transaction_id}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Location</span>
                    <p className="font-semibold text-blue-700">
                      {selectedTransaction.location_name || selectedTransaction.location_id}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Product</span>
                    <p className="font-semibold">{selectedTransaction.product_name || '-'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Product Code</span>
                    <p className="font-semibold">{selectedTransaction.product_code || '-'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Batch</span>
                    <p className="font-semibold text-purple-700">
                      {selectedTransaction.batch_code || selectedTransaction.batch_id}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Transaction Type</span>
                    <p>{getTransactionTypeBadge(selectedTransaction.transaction_type)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Qty</span>
                    <p>{getQtyDisplay(selectedTransaction.qty, selectedTransaction.transaction_type)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Reference Type</span>
                    <p>{getReferenceTypeBadge(selectedTransaction.reference_type)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Reference ID</span>
                    <p className="font-semibold">#{selectedTransaction.reference_id}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Created At</span>
                    <p className="font-semibold">{formatDateTime(selectedTransaction.created_at)}</p>
                  </div>
                </div>
              </div>

              {selectedBatchTransfer && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">
                    Related Batch Transfer
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Transfer Code</span>
                      <p className="font-mono font-semibold text-indigo-700">
                        {selectedBatchTransfer.batch_transfer_code || '-'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Transfer ID</span>
                      <p className="font-semibold">#{selectedBatchTransfer.batch_transfer_id}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Status</span>
                      <p className="font-semibold">{selectedBatchTransfer.status}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Batch</span>
                      <p className="font-semibold text-purple-700">
                        {selectedBatchTransfer.batch_code || selectedBatchTransfer.batch_id}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Product</span>
                      <p className="font-semibold">{selectedBatchTransfer.product_name || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Product Code</span>
                      <p className="font-semibold">{selectedBatchTransfer.product_code || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">From Location</span>
                      <p className="font-semibold">
                        {selectedBatchTransfer.from_location_name || selectedBatchTransfer.from_location_id}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">To Location</span>
                      <p className="font-semibold">
                        {selectedBatchTransfer.to_location_name || selectedBatchTransfer.to_location_id}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Transfer Qty</span>
                      <p className="font-semibold">{selectedBatchTransfer.transfer_qty}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Lost Qty</span>
                      <p className="font-semibold text-red-600">{selectedBatchTransfer.lost_qty ?? 0}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Transfer Date</span>
                      <p className="font-semibold">{formatDateTime(selectedBatchTransfer.transfer_date)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Created At</span>
                      <p className="font-semibold">{formatDateTime(selectedBatchTransfer.created_at)}</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedProductionBatch && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">
                    Related Production Batch
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Batch Code</span>
                      <p className="font-semibold text-purple-700">{selectedProductionBatch.batch_code}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Batch ID</span>
                      <p className="font-semibold">#{selectedProductionBatch.batch_id}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Status</span>
                      <p className="font-semibold">{selectedProductionBatch.status}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Plan Code</span>
                      <p className="font-semibold">{selectedProductionBatch.plan_code || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Product</span>
                      <p className="font-semibold">{selectedProductionBatch.product_name || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Product Code</span>
                      <p className="font-semibold">{selectedProductionBatch.product_code || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Produced Qty</span>
                      <p className="font-semibold">{selectedProductionBatch.produced_qty ?? '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Good Qty</span>
                      <p className="font-semibold text-green-700">{selectedProductionBatch.good_qty ?? '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Defect Qty</span>
                      <p className="font-semibold text-red-600">{selectedProductionBatch.defect_qty ?? '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Production Date</span>
                      <p className="font-semibold">{formatDateTime(selectedProductionBatch.production_date)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Expired Date</span>
                      <p className="font-semibold">{formatDateTime(selectedProductionBatch.expired_date)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Created At</span>
                      <p className="font-semibold">{formatDateTime(selectedProductionBatch.created_at)}</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedWarehouseReceive && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">
                    Related Warehouse Receive
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Receive Code</span>
                      <p className="font-mono font-semibold text-teal-700">
                        {selectedWarehouseReceive.warehouse_receive_code || '-'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Receive ID</span>
                      <p className="font-semibold">#{selectedWarehouseReceive.warehouse_receive_id}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Status</span>
                      <p className="font-semibold">{selectedWarehouseReceive.status}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Batch Transfer ID</span>
                      <p className="font-semibold">#{selectedWarehouseReceive.batch_transfer_id}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Batch</span>
                      <p className="font-semibold text-purple-700">
                        {selectedWarehouseReceive.batch_code || selectedWarehouseReceive.batch_id}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Product</span>
                      <p className="font-semibold">{selectedWarehouseReceive.product_name || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Product Code</span>
                      <p className="font-semibold">{selectedWarehouseReceive.product_code || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Location</span>
                      <p className="font-semibold">
                        {selectedWarehouseReceive.location_name || selectedWarehouseReceive.location_id}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Received Qty</span>
                      <p className="font-semibold text-green-700">{selectedWarehouseReceive.received_qty}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Received Date</span>
                      <p className="font-semibold">{formatDateTime(selectedWarehouseReceive.received_date)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Created At</span>
                      <p className="font-semibold">{formatDateTime(selectedWarehouseReceive.created_at)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Received By</span>
                      <p className="font-semibold">
                        {selectedWarehouseReceive.received_by_username || selectedWarehouseReceive.received_by}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {selectedTransaction.reference_type === 'inventory_adjustment' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">
                    Related Reference
                  </h3>
                  <div className="text-sm text-gray-500">
                    This transaction references an inventory adjustment. No linked detail view is available in the current frontend API.
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => {
                  setShowTransactionDetailModal(false);
                  setSelectedTransaction(null);
                }}
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

export default InventoryPage;
