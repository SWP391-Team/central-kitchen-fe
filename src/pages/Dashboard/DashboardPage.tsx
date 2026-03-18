import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowPathIcon,
  ArrowTrendingUpIcon,
  BeakerIcon,
  BuildingStorefrontIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ShoppingBagIcon,
  Squares2X2Icon,
  TruckIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { productService } from '@/api/services/productService';
import { productionPlanService } from '@/api/services/productionPlanService';
import { productionBatchService } from '@/api/services/productionBatchService';
import { qualityInspectionService } from '@/api/services/qualityInspectionService';
import { reworkRecordService } from '@/api/services/reworkRecordService';
import { batchTransferService } from '@/api/services/batchTransferService';
import { warehouseReceiveService } from '@/api/services/warehouseReceiveService';
import { inventoryService } from '@/api/services/inventoryService';
import { supplyOrderService } from '@/api/services/supplyOrderService';
import {
  BatchInventory,
  BatchTransferWithDetails,
  Product,
  ProductionBatchWithDetails,
  ProductionPlanWithProduct,
  QualityInspectionWithDetails,
  ReworkRecordWithDetails,
  SupplyOrder,
  WarehouseReceiveWithDetails,
} from '@/api/types';

type ActivityItem = {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  timestamp: number;
  tone: 'blue' | 'green' | 'amber' | 'rose';
};

const formatDateTime = (value?: string | null): string => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString();
};

const getRoleLabel = (roleId?: number): string => {
  if (roleId === 1) return 'Admin';
  if (roleId === 2) return 'Central Staff';
  if (roleId === 3) return 'Store Staff';
  return 'User';
};

const DashboardPage = () => {
  const { user, isAdmin, isCentralStaff, isStoreStaff } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [products, setProducts] = useState<Product[]>([]);
  const [plans, setPlans] = useState<ProductionPlanWithProduct[]>([]);
  const [batches, setBatches] = useState<ProductionBatchWithDetails[]>([]);
  const [inspections, setInspections] = useState<QualityInspectionWithDetails[]>([]);
  const [reworks, setReworks] = useState<ReworkRecordWithDetails[]>([]);
  const [transfers, setTransfers] = useState<BatchTransferWithDetails[]>([]);
  const [receives, setReceives] = useState<WarehouseReceiveWithDetails[]>([]);
  const [inventoryRows, setInventoryRows] = useState<BatchInventory[]>([]);
  const [supplyOrders, setSupplyOrders] = useState<SupplyOrder[]>([]);

  const loadDashboard = async (isManual = false) => {
    try {
      if (isManual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setLoadError('');

      if (isStoreStaff) {
        const results = await Promise.allSettled([
          batchTransferService.getAll(),
          warehouseReceiveService.getAll(),
          supplyOrderService.getList({ page: 1, limit: 200 }),
        ] as const);

        const [transferRes, receiveRes, supplyOrderRes] = results;

        setProducts([]);
        setPlans([]);
        setBatches([]);
        setInspections([]);
        setReworks([]);
        setInventoryRows([]);
        setTransfers(transferRes.status === 'fulfilled' ? transferRes.value : []);
        setReceives(receiveRes.status === 'fulfilled' ? receiveRes.value : []);
        setSupplyOrders(supplyOrderRes.status === 'fulfilled' ? supplyOrderRes.value.data : []);

        const hasAnyData = results.some((item) => item.status === 'fulfilled');
        if (!hasAnyData) {
          setLoadError('Unable to load dashboard data. Please check API connectivity and permissions.');
        }
      } else {
        const results = await Promise.allSettled([
          productService.getAllProducts('all'),
          productionPlanService.getProductionPlans({ page: 1, limit: 200 }),
          productionBatchService.getAllBatches(),
          qualityInspectionService.getQualityInspections({ page: 1, limit: 200, sortBy: 'created_at', sortOrder: 'desc' }),
          reworkRecordService.getAllReworkRecords(),
          batchTransferService.getAll(),
          warehouseReceiveService.getAll(),
          inventoryService.getBatchInventory(),
          supplyOrderService.getList({ page: 1, limit: 200 }),
        ] as const);

        const [
          productRes,
          planRes,
          batchRes,
          inspectionRes,
          reworkRes,
          transferRes,
          receiveRes,
          inventoryRes,
          supplyOrderRes,
        ] = results;

        setProducts(productRes.status === 'fulfilled' ? productRes.value : []);
        setPlans(planRes.status === 'fulfilled' ? planRes.value.data : []);
        setBatches(batchRes.status === 'fulfilled' ? batchRes.value : []);
        setInspections(inspectionRes.status === 'fulfilled' ? inspectionRes.value.data : []);
        setReworks(reworkRes.status === 'fulfilled' ? reworkRes.value : []);
        setTransfers(transferRes.status === 'fulfilled' ? transferRes.value : []);
        setReceives(receiveRes.status === 'fulfilled' ? receiveRes.value : []);
        setInventoryRows(inventoryRes.status === 'fulfilled' ? inventoryRes.value : []);
        setSupplyOrders(supplyOrderRes.status === 'fulfilled' ? supplyOrderRes.value.data : []);

        const hasAnyData = results.some((item) => item.status === 'fulfilled');
        if (!hasAnyData) {
          setLoadError('Unable to load dashboard data. Please check API connectivity and permissions.');
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, [isStoreStaff]);

  const metrics = useMemo(() => {
    const activeProducts = products.filter((p) => p.is_active).length;
    const plansOpen = plans.filter((p) => ['planned', 'in_production'].includes(p.status)).length;
    const qcQueue = batches.filter((b) => ['waiting_qc', 'under_qc'].includes(b.status)).length;
    const reworkQueue = batches.filter((b) => ['rework_required', 'reworking'].includes(b.status)).length;
    const delivering = transfers.filter((t) => t.status === 'Delivering').length;
    const awaitingReceive = Math.max(delivering - receives.length, 0);
    const pendingSupplyOrders = supplyOrders.filter((s) => ['Pending', 'Approved', 'Partly Delivered'].includes(s.status)).length;

    const totalOnHandQty = inventoryRows.reduce((sum, row) => sum + Number(row.qty_on_hand || 0), 0);
    const availableByBatchId = new Map<number, number>();
    for (const row of inventoryRows) {
      const current = availableByBatchId.get(row.batch_id) || 0;
      availableByBatchId.set(row.batch_id, current + Number(row.qty_available || 0));
    }

    const nearExpiry = batches.filter((batch) => {
      if (!batch.expired_date) return false;
      const qtyAvailable = availableByBatchId.get(batch.batch_id) || 0;
      if (qtyAvailable <= 0) return false;

      const exp = new Date(batch.expired_date);
      const now = new Date();
      const diffDays = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays <= 7;
    }).length;

    return {
      activeProducts,
      plansOpen,
      qcQueue,
      reworkQueue,
      delivering,
      awaitingReceive,
      pendingSupplyOrders,
      totalOnHandQty,
      nearExpiry,
    };
  }, [products, plans, batches, transfers, receives, supplyOrders, inventoryRows]);

  const recentActivities = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];

    const latestSupply = [...supplyOrders].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
    if (latestSupply) {
      items.push({
        id: `so-${latestSupply.supply_order_id}`,
        title: `Supply Order ${latestSupply.supply_order_code}`,
        subtitle: `Status: ${latestSupply.status}`,
        time: formatDateTime(latestSupply.created_at),
        timestamp: new Date(latestSupply.created_at).getTime(),
        tone: latestSupply.status === 'Pending' ? 'amber' : 'blue',
      });
    }

    const latestBatch = [...batches].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
    if (latestBatch) {
      items.push({
        id: `batch-${latestBatch.batch_id}`,
        title: `Batch ${latestBatch.batch_code}`,
        subtitle: `Current status: ${latestBatch.status}`,
        time: formatDateTime(latestBatch.created_at),
        timestamp: new Date(latestBatch.created_at).getTime(),
        tone: ['qc_failed', 'rework_required', 'rework_failed'].includes(latestBatch.status) ? 'rose' : 'green',
      });
    }

    const latestInspection = [...inspections].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
    if (latestInspection) {
      items.push({
        id: `insp-${latestInspection.quality_inspection_id}`,
        title: `Inspection ${latestInspection.quality_inspection_code}`,
        subtitle: `Result status: ${latestInspection.status}`,
        time: formatDateTime(latestInspection.inspected_at || latestInspection.created_at),
        timestamp: new Date(latestInspection.inspected_at || latestInspection.created_at).getTime(),
        tone: latestInspection.status === 'Failed' ? 'rose' : 'blue',
      });
    }

    const latestRework = [...reworks].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
    if (latestRework) {
      items.push({
        id: `rework-${latestRework.rework_id}`,
        title: `Rework ${latestRework.rework_code}`,
        subtitle: `Status: ${latestRework.status}`,
        time: formatDateTime(latestRework.created_at),
        timestamp: new Date(latestRework.created_at).getTime(),
        tone: latestRework.status === 'Rework Failed' ? 'rose' : 'amber',
      });
    }

    return items
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 6);
  }, [supplyOrders, batches, inspections, reworks]);

  const quickLinks = useMemo(() => {
    if (isStoreStaff) {
      return [
        { to: '/inventory', label: 'Inventory', icon: Squares2X2Icon },
        { to: '/supply-order', label: 'Supply Orders', icon: ClipboardDocumentListIcon },
        { to: '/warehouse-receive', label: 'Warehouse Receive', icon: CheckCircleIcon },
      ];
    }

    const links = [
      { to: '/inventory', label: 'Inventory', icon: Squares2X2Icon },
      { to: '/supply-order', label: 'Supply Orders', icon: ClipboardDocumentListIcon },
    ];

    if (isAdmin || isCentralStaff) {
      links.unshift(
        { to: '/production-plan', label: 'Production Plans', icon: BuildingStorefrontIcon },
        { to: '/production-batch', label: 'Production Batches', icon: ShoppingBagIcon },
        { to: '/quality-inspection', label: 'QC Inspection', icon: BeakerIcon },
        { to: '/batch-transfer', label: 'Batch Transfer', icon: TruckIcon }
      );
    }

    if (isAdmin || isStoreStaff || isCentralStaff) {
      links.push({ to: '/warehouse-receive', label: 'Warehouse Receive', icon: CheckCircleIcon });
    }

    if (isAdmin) {
      links.push({ to: '/audit-log', label: 'Audit Log', icon: ClockIcon });
    }

    return links;
  }, [isAdmin, isCentralStaff, isStoreStaff]);

  const storeMetrics = useMemo(() => {
    const draftOrders = supplyOrders.filter((s) => s.status === 'Draft').length;
    const pendingApproval = supplyOrders.filter((s) => s.status === 'Pending').length;
    const inDelivery = supplyOrders.filter((s) => ['Approved', 'Partly Delivered'].includes(s.status)).length;
    const closedDone = supplyOrders.filter((s) => ['Delivered', 'Closed'].includes(s.status)).length;
    const deliveringTransfers = transfers.filter((t) => t.status === 'Delivering').length;
    const overDeliveryReceives = receives.filter((r) => r.is_over_delivery).length;

    return {
      draftOrders,
      pendingApproval,
      inDelivery,
      closedDone,
      deliveringTransfers,
      overDeliveryReceives,
      totalReceives: receives.length,
    };
  }, [supplyOrders, transfers, receives]);

  const storeActivities = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];

    const latestOrders = [...supplyOrders]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 4);

    for (const order of latestOrders) {
      items.push({
        id: `store-so-${order.supply_order_id}`,
        title: `Supply Order ${order.supply_order_code}`,
        subtitle: `Status: ${order.status}`,
        time: formatDateTime(order.created_at),
        timestamp: new Date(order.created_at).getTime(),
        tone: order.status === 'Pending' ? 'amber' : order.status === 'Delivered' ? 'green' : 'blue',
      });
    }

    const latestReceives = [...receives]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 4);

    for (const receive of latestReceives) {
      items.push({
        id: `store-recv-${receive.warehouse_receive_id}`,
        title: `Receive ${receive.warehouse_receive_code || `#${receive.warehouse_receive_id}`}`,
        subtitle: `${receive.product_code || receive.product_name || 'Batch receive'} | Qty ${receive.received_qty}`,
        time: formatDateTime(receive.created_at),
        timestamp: new Date(receive.created_at).getTime(),
        tone: receive.is_over_delivery ? 'rose' : 'green',
      });
    }

    return items
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 8);
  }, [supplyOrders, receives]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-100 bg-gradient-to-r from-amber-50 via-rose-50 to-sky-50 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-amber-700">Central Kitchen Overview</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-800">Welcome, {user?.username || 'User'}</h1>
            <p className="mt-2 text-sm text-slate-600">
              Role: <span className="font-semibold text-slate-700">{getRoleLabel(user?.role_id)}</span>
              <span className="mx-2 text-slate-300">|</span>
              {isStoreStaff
                ? 'Monitor your supply orders and warehouse receiving tasks.'
                : 'Snapshot of production, QC, logistics, inventory, and supply operations.'}
            </p>
          </div>
          <button
            onClick={() => void loadDashboard(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>
      </div>

      {loadError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {loadError}
        </div>
      )}

      {isStoreStaff ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">Draft Orders</p>
                <ClipboardDocumentListIcon className="h-5 w-5 text-sky-500" />
              </div>
              <p className="mt-3 text-3xl font-bold text-slate-800">{loading ? '-' : storeMetrics.draftOrders}</p>
              <p className="mt-1 text-xs text-slate-500">Need to send to CK</p>
            </div>

            <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">Pending Approval</p>
                <ClockIcon className="h-5 w-5 text-amber-500" />
              </div>
              <p className="mt-3 text-3xl font-bold text-slate-800">{loading ? '-' : storeMetrics.pendingApproval}</p>
              <p className="mt-1 text-xs text-slate-500">Orders waiting for CK</p>
            </div>

            <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">In Delivery</p>
                <TruckIcon className="h-5 w-5 text-indigo-500" />
              </div>
              <p className="mt-3 text-3xl font-bold text-slate-800">{loading ? '-' : storeMetrics.inDelivery}</p>
              <p className="mt-1 text-xs text-slate-500">Approved/partly delivered orders</p>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">Received / Closed</p>
                <CheckCircleIcon className="h-5 w-5 text-emerald-500" />
              </div>
              <p className="mt-3 text-3xl font-bold text-slate-800">{loading ? '-' : storeMetrics.closedDone}</p>
              <p className="mt-1 text-xs text-slate-500">Delivered or closed orders</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-4">
                <h2 className="text-lg font-semibold text-slate-800">Store Operations Snapshot</h2>
                <p className="text-sm text-slate-500 mt-1">Focus on order handling and receiving</p>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-slate-600">Orders pending approval</span>
                    <span className="font-semibold text-slate-800">{storeMetrics.pendingApproval}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-amber-400" style={{ width: `${Math.min(storeMetrics.pendingApproval * 16, 100)}%` }} />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-slate-600">Transfers delivering</span>
                    <span className="font-semibold text-slate-800">{storeMetrics.deliveringTransfers}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-indigo-400" style={{ width: `${Math.min(storeMetrics.deliveringTransfers * 18, 100)}%` }} />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-slate-600">Total receive records</span>
                    <span className="font-semibold text-slate-800">{storeMetrics.totalReceives}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${Math.min(storeMetrics.totalReceives * 10, 100)}%` }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-4">
                <h2 className="text-lg font-semibold text-slate-800">Need Attention</h2>
              </div>
              <div className="p-6 space-y-3 text-sm">
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="font-semibold text-amber-800">Pending Approval</p>
                  <p className="text-amber-700 mt-1">{storeMetrics.pendingApproval} order(s) waiting CK approval.</p>
                </div>
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
                  <p className="font-semibold text-indigo-800">Incoming Delivery</p>
                  <p className="text-indigo-700 mt-1">{storeMetrics.deliveringTransfers} transfer(s) in delivering status.</p>
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                  <p className="font-semibold text-rose-800">Over-delivery Watch</p>
                  <p className="text-rose-700 mt-1">{storeMetrics.overDeliveryReceives} receive record(s) flagged as over delivery.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-4">
                <h2 className="text-lg font-semibold text-slate-800">Recent Store Activities</h2>
              </div>
              <div className="p-6">
                {storeActivities.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-500">No recent supply order/receive activities found.</p>
                ) : (
                  <div className="space-y-3">
                    {storeActivities.map((item) => {
                      const toneClass =
                        item.tone === 'green'
                          ? 'border-emerald-100 bg-emerald-50'
                          : item.tone === 'amber'
                            ? 'border-amber-100 bg-amber-50'
                            : item.tone === 'rose'
                              ? 'border-rose-100 bg-rose-50'
                              : 'border-sky-100 bg-sky-50';

                      return (
                        <div key={item.id} className={`rounded-xl border p-4 ${toneClass}`}>
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-semibold text-slate-800">{item.title}</p>
                              <p className="text-sm text-slate-600 mt-1">{item.subtitle}</p>
                            </div>
                            <span className="text-xs text-slate-500 whitespace-nowrap">{item.time}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-4">
                <h2 className="text-lg font-semibold text-slate-800">Quick Access</h2>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 gap-2">
                  {quickLinks.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      className="group flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-3 hover:border-slate-300 hover:bg-slate-50"
                    >
                      <item.icon className="h-5 w-5 text-slate-500 group-hover:text-slate-700" />
                      <span className="text-sm font-semibold text-slate-700">{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
      <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Active Products</p>
            <ShoppingBagIcon className="h-5 w-5 text-sky-500" />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-800">{loading ? '-' : metrics.activeProducts}</p>
          <p className="mt-1 text-xs text-slate-500">Total inventory on hand: {loading ? '-' : metrics.totalOnHandQty}</p>
        </div>

        <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Production In Progress</p>
            <ArrowTrendingUpIcon className="h-5 w-5 text-indigo-500" />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-800">{loading ? '-' : metrics.plansOpen}</p>
          <p className="mt-1 text-xs text-slate-500">Plans in planned/in_production</p>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">QC + Rework Queue</p>
            <BeakerIcon className="h-5 w-5 text-amber-500" />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-800">{loading ? '-' : metrics.qcQueue + metrics.reworkQueue}</p>
          <p className="mt-1 text-xs text-slate-500">QC: {metrics.qcQueue} | Rework: {metrics.reworkQueue}</p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Pending Supply Orders</p>
            <ClipboardDocumentListIcon className="h-5 w-5 text-emerald-500" />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-800">{loading ? '-' : metrics.pendingSupplyOrders}</p>
          <p className="mt-1 text-xs text-slate-500">Awaiting approval/delivery completion</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-800">Operations Pipeline</h2>
            <p className="text-sm text-slate-500 mt-1">Current workload by process stage</p>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-slate-600">Batches waiting/under QC</span>
                <span className="font-semibold text-slate-800">{metrics.qcQueue}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-sky-400"
                  style={{ width: `${Math.min(metrics.qcQueue * 12, 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-slate-600">Batches in rework flow</span>
                <span className="font-semibold text-slate-800">{metrics.reworkQueue}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-amber-400"
                  style={{ width: `${Math.min(metrics.reworkQueue * 14, 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-slate-600">Transfers delivering</span>
                <span className="font-semibold text-slate-800">{metrics.delivering}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-indigo-400"
                  style={{ width: `${Math.min(metrics.delivering * 15, 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-slate-600">Potential near-expiry batches (7 days)</span>
                <span className="font-semibold text-slate-800">{metrics.nearExpiry}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-rose-400"
                  style={{ width: `${Math.min(metrics.nearExpiry * 18, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-800">Need Attention</h2>
          </div>
          <div className="p-6 space-y-3 text-sm">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="font-semibold text-amber-800">QC Queue</p>
              <p className="text-amber-700 mt-1">{metrics.qcQueue} batches are waiting or under QC.</p>
            </div>
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
              <p className="font-semibold text-indigo-800">Warehouse Follow-up</p>
              <p className="text-indigo-700 mt-1">{metrics.awaitingReceive} transfers may still be awaiting receive records.</p>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
              <p className="font-semibold text-rose-800">Expiry Risk</p>
              <p className="text-rose-700 mt-1">{metrics.nearExpiry} inventory rows are near expiry in the next 7 days.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-800">Recent Activities</h2>
          </div>
          <div className="p-6">
            {recentActivities.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">No recent activities available for your current permission scope.</p>
            ) : (
              <div className="space-y-3">
                {recentActivities.map((item) => {
                  const toneClass =
                    item.tone === 'green'
                      ? 'border-emerald-100 bg-emerald-50'
                      : item.tone === 'amber'
                        ? 'border-amber-100 bg-amber-50'
                        : item.tone === 'rose'
                          ? 'border-rose-100 bg-rose-50'
                          : 'border-sky-100 bg-sky-50';

                  return (
                    <div key={item.id} className={`rounded-xl border p-4 ${toneClass}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-slate-800">{item.title}</p>
                          <p className="text-sm text-slate-600 mt-1">{item.subtitle}</p>
                        </div>
                        <span className="text-xs text-slate-500 whitespace-nowrap">{item.time}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-800">Quick Access</h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 gap-2">
              {quickLinks.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="group flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-3 hover:border-slate-300 hover:bg-slate-50"
                >
                  <item.icon className="h-5 w-5 text-slate-500 group-hover:text-slate-700" />
                  <span className="text-sm font-semibold text-slate-700">{item.label}</span>
                </Link>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              Data updates when you click <span className="font-semibold">Refresh Data</span>. Some cards may show partial data depending on your role permissions.
            </div>
          </div>
        </div>
      </div>

      {!loading && metrics.reworkQueue > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Operational Alert</p>
              <p className="text-sm text-amber-700 mt-1">
                There are {metrics.reworkQueue} batch(es) in rework process. Prioritize rework completion and reinspection to avoid downstream delivery delays.
              </p>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
};

export default DashboardPage;
