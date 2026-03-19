import { useEffect, useMemo, useState } from 'react';
import { auditLogService } from '@/api/services/auditLogService';
import { AuditAction, AuditLog, AuditLogStats } from '@/api/types';

const ACTION_OPTIONS: Array<{ value: AuditAction | 'all'; label: string }> = [
  { value: 'all', label: 'All Actions' },
  { value: 'LOGIN', label: 'Login' },
  { value: 'CREATE', label: 'Create' },
  { value: 'UPDATE', label: 'Update' },
  { value: 'DELETE', label: 'Delete' },
  { value: 'APPROVE', label: 'Approve' },
  { value: 'REJECT', label: 'Reject' },
  { value: 'CLOSE', label: 'Close' },
  { value: 'CANCEL', label: 'Cancel' },
  { value: 'SEND_TO_QC', label: 'Send To QC' },
  { value: 'UNDO_SEND_TO_QC', label: 'Undo Send To QC' },
  { value: 'START_INSPECTION', label: 'Start Inspection' },
  { value: 'FINISH_INSPECTION', label: 'Finish Inspection' },
  { value: 'REINSPECTION', label: 'Reinspection' },
  { value: 'REQUEST_REWORK', label: 'Request Rework' },
  { value: 'START_REWORK', label: 'Start Rework' },
  { value: 'FINISH_REWORK', label: 'Finish Rework' },
  { value: 'SEND_TO_WAREHOUSE', label: 'Send To Warehouse' },
  { value: 'RECEIVE', label: 'Receive' },
  { value: 'OTHER', label: 'Other' },
];

const STATUS_BADGE_STYLES: Record<string, string> = {
  error: 'bg-red-100 text-red-700',
  warning: 'bg-yellow-100 text-yellow-700',
  success: 'bg-green-100 text-green-700',
};

const ACTION_BUSINESS_LABEL: Record<AuditAction, string> = {
  LOGIN: 'User signed in',
  LOGOUT: 'User signed out',
  CREATE: 'Created data',
  UPDATE: 'Updated data',
  DELETE: 'Deleted data',
  APPROVE: 'Approved workflow',
  REJECT: 'Rejected workflow',
  CLOSE: 'Closed workflow',
  CANCEL: 'Cancelled workflow',
  SEND_TO_QC: 'Sent to quality control',
  UNDO_SEND_TO_QC: 'Undid QC handoff',
  START_INSPECTION: 'Started inspection',
  FINISH_INSPECTION: 'Finished inspection',
  REINSPECTION: 'Started reinspection',
  REQUEST_REWORK: 'Requested rework',
  START_REWORK: 'Started rework',
  FINISH_REWORK: 'Finished rework',
  SEND_TO_WAREHOUSE: 'Sent to warehouse',
  RECEIVE: 'Received goods',
  OTHER: 'Other operation',
};

const ENTITY_BUSINESS_LABEL: Record<string, string> = {
  SUPPLY_ORDER: 'Supply Order',
  SUPPLY_ORDER_ITEM: 'Supply Order Item',
  PRODUCTION_PLAN: 'Production Plan',
  PRODUCTION_BATCH: 'Production Batch',
  QUALITY_INSPECTION: 'Quality Inspection',
  REWORK_RECORD: 'Rework Record',
  BATCH_TRANSFER: 'Batch Transfer',
  WAREHOUSE_RECEIVE: 'Warehouse Receive',
  INVENTORY: 'Inventory',
  PRODUCT: 'Product',
  UNIT: 'Unit',
  LOCATION: 'Location',
  USER: 'User',
  AUTH: 'Authentication',
};

const AuditLogPage = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditLogStats>({ total: 0, today: 0, this_week: 0, critical: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');
  const [action, setAction] = useState<AuditAction | 'all'>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounce(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [searchDebounce, action, fromDate, toDate]);

  useEffect(() => {
    void loadStats();
  }, []);

  useEffect(() => {
    void loadLogs();
  }, [page, limit, searchDebounce, action, fromDate, toDate]);

  const loadStats = async () => {
    try {
      const data = await auditLogService.getAuditStats();
      setStats(data);
    } catch {
      setStats({ total: 0, today: 0, this_week: 0, critical: 0 });
    }
  };

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError('');

      const result = await auditLogService.getAuditLogs({
        search: searchDebounce || undefined,
        action,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        page,
        limit,
      });

      setLogs(result.data);
      setTotalPages(Math.max(1, result.pagination.totalPages || 1));
      setTotal(result.pagination.total || 0);
    } catch (err: any) {
      setLogs([]);
      setError(err.response?.data?.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const actionLabelMap = useMemo(() => {
    return ACTION_OPTIONS.reduce<Record<string, string>>((acc, item) => {
      acc[item.value] = item.label;
      return acc;
    }, {});
  }, []);

  const getStatusClass = (statusCode: number): string => {
    if (statusCode >= 500) return STATUS_BADGE_STYLES.error;
    if (statusCode >= 400) return STATUS_BADGE_STYLES.warning;
    return STATUS_BADGE_STYLES.success;
  };

  const formatDateTime = (value: string): string => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleString();
  };

  const formatJson = (value: any): string => {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value ?? '');
    }
  };

  const getOutcomeLabel = (statusCode: number): string => {
    if (statusCode >= 500) return 'System Error';
    if (statusCode >= 400) return 'Business Rule Blocked';
    return 'Success';
  };

  const getEntityLabel = (entityType: string): string => {
    return ENTITY_BUSINESS_LABEL[entityType] || entityType.replace(/_/g, ' ');
  };

  const getBusinessTitle = (log: AuditLog): string => {
    const actionLabel = ACTION_BUSINESS_LABEL[log.action] || actionLabelMap[log.action] || log.action;
    const entityLabel = getEntityLabel(log.entity_type);
    return `${actionLabel} on ${entityLabel}`;
  };

  const topActionPulse = useMemo(() => {
    const map = new Map<string, number>();
    for (const log of logs) {
      const key = actionLabelMap[log.action] || log.action;
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [logs, actionLabelMap]);

  const healthSummary = useMemo(() => {
    if (logs.length === 0) {
      return { successRate: 0, blockedCount: 0, systemErrorCount: 0 };
    }
    const successCount = logs.filter((l) => l.status_code < 400).length;
    const blockedCount = logs.filter((l) => l.status_code >= 400 && l.status_code < 500).length;
    const systemErrorCount = logs.filter((l) => l.status_code >= 500).length;
    return {
      successRate: Math.round((successCount / logs.length) * 100),
      blockedCount,
      systemErrorCount,
    };
  }, [logs]);

  const clearFilters = () => {
    setSearch('');
    setAction('all');
    setFromDate('');
    setToDate('');
  };

  return (
    <div className="space-y-6 p-1">
      <div className="rounded-2xl bg-gradient-to-r from-slate-50 via-blue-50 to-slate-100 border border-slate-200 text-slate-900 p-6 md:p-8 shadow-sm">
        <h1 className="text-3xl font-bold">Audit Log</h1>
        <p className="mt-2 text-slate-600 max-w-3xl">
          Business activity timeline for admins. Main screen focuses on what happened and impact.
          Technical request details and raw JSON are available only in Audit Detail.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-medium text-gray-500">Total Activities</p>
          <p className="text-3xl font-semibold text-gray-900 mt-2">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-medium text-gray-500">Today</p>
          <p className="text-3xl font-semibold text-blue-600 mt-2">{stats.today}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-medium text-gray-500">This Week</p>
          <p className="text-3xl font-semibold text-emerald-600 mt-2">{stats.this_week}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-medium text-gray-500">Need Attention</p>
          <p className="text-3xl font-semibold text-red-600 mt-2">{stats.critical}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by business description, entity, action..."
            className="lg:col-span-2 border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={action}
            onChange={(e) => setAction(e.target.value as AuditAction | 'all')}
            className="border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {ACTION_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={clearFilters}
            className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-gray-50"
          >
            Reset Filters
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
            <p className="text-xs text-slate-500">Current Page Success Rate</p>
            <p className="text-xl font-semibold text-slate-900">{healthSummary.successRate}%</p>
          </div>
          <div className="rounded-lg bg-amber-50 border border-amber-100 p-3">
            <p className="text-xs text-amber-700">Business Rule Blocked</p>
            <p className="text-xl font-semibold text-amber-900">{healthSummary.blockedCount}</p>
          </div>
          <div className="rounded-lg bg-red-50 border border-red-100 p-3">
            <p className="text-xs text-red-700">System Error</p>
            <p className="text-xl font-semibold text-red-900">{healthSummary.systemErrorCount}</p>
          </div>
        </div>

        {topActionPulse.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {topActionPulse.map(([label, count]) => (
              <span
                key={label}
                className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1 text-xs font-semibold"
              >
                {label}
                <span className="text-blue-900">{count}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Business Activity Feed</h2>
          <p className="text-sm text-gray-500">{total} activities</p>
        </div>

        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="px-6 py-8 text-center text-gray-500">Loading audit logs...</div>
          ) : logs.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">No audit logs found</div>
          ) : (
            logs.map((log) => (
              <button
                key={log.audit_log_id}
                onClick={() => setSelectedLog(log)}
                className="w-full text-left px-5 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900">{getBusinessTitle(log)}</p>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {log.description || 'Business operation recorded in audit trail.'}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500">{formatDateTime(log.created_at)}</span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                    {actionLabelMap[log.action] || log.action}
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                    {getEntityLabel(log.entity_type)} {log.entity_id ? `#${log.entity_id}` : ''}
                  </span>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${getStatusClass(log.status_code)}`}>
                    {getOutcomeLabel(log.status_code)}
                  </span>
                  <span className="text-xs text-gray-500">Actor: {log.username || 'System'}</span>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <p className="text-sm text-gray-600">
            Showing page {page} / {totalPages} ({total} logs)
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1 || loading}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages || loading}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 p-4 flex items-center justify-center">
          <div className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Audit Detail</h2>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>
            <div className="p-6 space-y-5 text-sm">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Business Context</p>
                <p className="mt-1 text-base font-semibold text-slate-900">{getBusinessTitle(selectedLog)}</p>
                <p className="mt-1 text-sm text-slate-700">
                  {selectedLog.description || 'No business description provided.'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><span className="text-gray-500">Timestamp:</span> <span className="font-medium">{formatDateTime(selectedLog.created_at)}</span></div>
                <div><span className="text-gray-500">Actor:</span> <span className="font-medium">{selectedLog.username || 'System'}</span></div>
                <div><span className="text-gray-500">Action:</span> <span className="font-medium">{actionLabelMap[selectedLog.action] || selectedLog.action}</span></div>
                <div><span className="text-gray-500">Outcome:</span> <span className="font-medium">{getOutcomeLabel(selectedLog.status_code)}</span></div>
                <div><span className="text-gray-500">Entity:</span> <span className="font-medium">{selectedLog.entity_type}</span></div>
                <div><span className="text-gray-500">Entity ID:</span> <span className="font-medium">{selectedLog.entity_id || '-'}</span></div>
              </div>

              <div>
                <p className="text-gray-700 font-semibold mb-2">Technical Request Envelope (Raw JSON)</p>
                <pre className="bg-slate-50 text-slate-700 border border-slate-200 rounded-lg p-3 overflow-auto text-xs">
                  {formatJson({
                    request_method: selectedLog.request_method,
                    request_path: selectedLog.request_path,
                    status_code: selectedLog.status_code,
                    ip_address: selectedLog.ip_address,
                    user_agent: selectedLog.user_agent,
                  })}
                </pre>
              </div>

              <div>
                <p className="text-gray-700 font-semibold mb-2">Metadata (Raw JSON)</p>
                <pre className="bg-slate-50 text-slate-700 border border-slate-200 rounded-lg p-3 overflow-auto text-xs">
                  {formatJson(selectedLog.metadata)}
                </pre>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-700 font-semibold mb-2">Old Values (Raw JSON)</p>
                  <pre className="bg-slate-50 text-slate-700 border border-slate-200 rounded-lg p-3 overflow-auto text-xs">
                    {formatJson(selectedLog.old_values)}
                  </pre>
                </div>
                <div>
                  <p className="text-gray-700 font-semibold mb-2">New Values (Raw JSON)</p>
                  <pre className="bg-slate-50 text-slate-700 border border-slate-200 rounded-lg p-3 overflow-auto text-xs">
                    {formatJson(selectedLog.new_values)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogPage;
