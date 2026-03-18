import { useEffect, useMemo, useState } from 'react';
import { auditLogService } from '@/api/services/auditLogService';
import { userService } from '@/api/services/userService';
import { AuditAction, AuditLog, AuditLogStats, User } from '@/api/types';

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

const AuditLogPage = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<AuditLogStats>({ total: 0, today: 0, this_week: 0, critical: 0 });
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');
  const [action, setAction] = useState<AuditAction | 'all'>('all');
  const [userId, setUserId] = useState<number | ''>('');
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
  }, [searchDebounce, action, userId, fromDate, toDate]);

  useEffect(() => {
    void loadUsers();
    void loadStats();
  }, []);

  useEffect(() => {
    void loadLogs();
  }, [page, limit, searchDebounce, action, userId, fromDate, toDate]);

  const loadUsers = async () => {
    try {
      const data = await userService.getAllUsers();
      setUsers(data);
    } catch {
      setUsers([]);
    }
  };

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
        userId: userId === '' ? undefined : userId,
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

  const escapeCsv = (value: any): string => {
    const text = String(value ?? '');
    if (text.includes('"') || text.includes(',') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const exportLogs = async () => {
    try {
      setExporting(true);
      const result = await auditLogService.getAuditLogs({
        search: searchDebounce || undefined,
        action,
        userId: userId === '' ? undefined : userId,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        page: 1,
        limit: 1000,
      });

      const headers = [
        'Timestamp',
        'User',
        'Action',
        'Entity',
        'Entity ID',
        'Method',
        'Path',
        'Status',
        'IP',
        'Description',
      ];

      const rows = result.data.map((log) => [
        formatDateTime(log.created_at),
        log.username || 'System',
        actionLabelMap[log.action] || log.action,
        log.entity_type,
        log.entity_id || '',
        log.request_method,
        log.request_path,
        log.status_code,
        log.ip_address || '',
        log.description || '',
      ]);

      const csv = [headers, ...rows]
        .map((row) => row.map(escapeCsv).join(','))
        .join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h1 className="text-3xl font-bold text-gray-900">Audit Log</h1>
        <button
          onClick={exportLogs}
          disabled={exporting}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {exporting ? 'Exporting...' : 'Export Logs'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-500">Total Logs</p>
          <p className="text-2xl font-semibold text-gray-900 mt-2">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-500">Today</p>
          <p className="text-2xl font-semibold text-blue-600 mt-2">{stats.today}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-500">This Week</p>
          <p className="text-2xl font-semibold text-green-600 mt-2">{stats.this_week}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-500">Critical</p>
          <p className="text-2xl font-semibold text-red-600 mt-2">{stats.critical}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by user, description, path..."
            className="md:col-span-2 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={action}
            onChange={(e) => setAction(e.target.value as AuditAction | 'all')}
            className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {ACTION_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value ? Number(e.target.value) : '')}
            className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Users</option>
            {users.map((u) => (
              <option key={u.user_id} value={u.user_id}>
                {u.username}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading audit logs...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No audit logs found</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.audit_log_id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="px-6 py-4 text-sm text-gray-700">{formatDateTime(log.created_at)}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{log.username || 'System'}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                        {actionLabelMap[log.action] || log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <div className="font-medium">{log.entity_type}</div>
                      <div className="text-xs text-gray-500">ID: {log.entity_id || '-'}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <div className="line-clamp-1">{log.description || `${log.request_method} ${log.request_path}`}</div>
                      <div className="mt-1 text-xs text-gray-500">{log.request_method} {log.request_path}</div>
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusClass(log.status_code)}`}>
                          HTTP {log.status_code}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{log.ip_address || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><span className="text-gray-500">Timestamp:</span> <span className="font-medium">{formatDateTime(selectedLog.created_at)}</span></div>
                <div><span className="text-gray-500">User:</span> <span className="font-medium">{selectedLog.username || 'System'}</span></div>
                <div><span className="text-gray-500">Action:</span> <span className="font-medium">{actionLabelMap[selectedLog.action] || selectedLog.action}</span></div>
                <div><span className="text-gray-500">Entity:</span> <span className="font-medium">{selectedLog.entity_type} ({selectedLog.entity_id || '-'})</span></div>
                <div><span className="text-gray-500">Method:</span> <span className="font-medium">{selectedLog.request_method}</span></div>
                <div><span className="text-gray-500">Status Code:</span> <span className="font-medium">{selectedLog.status_code}</span></div>
                <div className="md:col-span-2"><span className="text-gray-500">Path:</span> <span className="font-medium">{selectedLog.request_path}</span></div>
                <div className="md:col-span-2"><span className="text-gray-500">Description:</span> <span className="font-medium">{selectedLog.description || '-'}</span></div>
              </div>

              <div>
                <p className="text-gray-600 font-semibold mb-2">Metadata</p>
                <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-auto text-xs">
                  {formatJson(selectedLog.metadata)}
                </pre>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600 font-semibold mb-2">Old Values</p>
                  <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-auto text-xs">
                    {formatJson(selectedLog.old_values)}
                  </pre>
                </div>
                <div>
                  <p className="text-gray-600 font-semibold mb-2">New Values</p>
                  <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-auto text-xs">
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
