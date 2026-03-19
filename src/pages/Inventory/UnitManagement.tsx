import { useEffect, useState } from 'react';
import { unitService } from '@/api/services/unitService';
import { Unit, UnitCreateRequest, UnitUpdateRequest } from '@/api/types';
import { useToast } from '@/contexts/ToastContext';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { CheckCircleIcon, MagnifyingGlassIcon, PencilIcon, XCircleIcon } from '@heroicons/react/24/outline';

const UnitManagement = () => {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [formData, setFormData] = useState<UnitCreateRequest>({
    unit_name: '',
  });

  const { showToast } = useToast();
  const { confirm, confirmDialog } = useConfirmDialog();

  const loadUnits = async (search = searchTerm, status = statusFilter) => {
    try {
      setLoading(true);
      const data = await unitService.getAllUnits(status, search);
      setUnits(data);
    } catch (error) {
      console.error('Error loading units:', error);
      showToast('Failed to load units', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadUnits(searchTerm, statusFilter);
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, statusFilter]);

  const openModal = (unit?: Unit) => {
    if (unit) {
      setEditingUnit(unit);
      setFormData({ unit_name: unit.unit_name });
    } else {
      setEditingUnit(null);
      setFormData({ unit_name: '' });
    }

    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUnit(null);
    setFormData({ unit_name: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.unit_name.trim()) {
      showToast('Unit name is required', 'error');
      return;
    }

    try {
      if (editingUnit) {
        const updateData: UnitUpdateRequest = {
          unit_name: formData.unit_name,
        };
        await unitService.updateUnit(editingUnit.unit_id, updateData);
        showToast('Unit updated successfully', 'success');
      } else {
        await unitService.createUnit(formData);
        showToast('Unit created successfully', 'success');
      }

      closeModal();
      await loadUnits();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to save unit';
      showToast(message, 'error');
    }
  };

  const handleToggleActive = async (unit: Unit) => {
    const action = unit.is_active ? 'deactivate' : 'activate';
    const accepted = await confirm({
      title: `${action === 'deactivate' ? 'Deactivate' : 'Activate'} Unit`,
      message: `Are you sure you want to ${action} "${unit.unit_name}"?`,
      confirmText: action === 'deactivate' ? 'Deactivate' : 'Activate',
      tone: action === 'deactivate' ? 'danger' : 'default',
    });

    if (!accepted) {
      return;
    }

    try {
      await unitService.toggleUnitActive(unit.unit_id);
      showToast(`Unit ${action}d successfully`, 'success');
      await loadUnits();
    } catch (error: any) {
      const message = error.response?.data?.message || `Failed to ${action} unit`;
      showToast(message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Unit Management</h2>
        <button
          onClick={() => openModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Add Unit
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search units by code or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading units...</p>
          </div>
        ) : units.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchTerm ? 'No units found matching your search.' : 'No units yet. Add your first unit!'}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated By</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {units.map((unit) => (
                <tr key={unit.unit_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{unit.unit_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-700">{unit.unit_code}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{unit.unit_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        unit.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {unit.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {unit.created_at ? new Date(unit.created_at).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {unit.created_by_username || unit.created_by || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {unit.updated_at ? new Date(unit.updated_at).toLocaleString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {unit.updated_by_username || unit.updated_by || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => openModal(unit)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                      title="Edit"
                    >
                      <PencilIcon className="h-5 w-5 inline" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(unit)}
                      className={unit.is_active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}
                      title={unit.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {unit.is_active ? (
                        <XCircleIcon className="h-5 w-5 inline" />
                      ) : (
                        <CheckCircleIcon className="h-5 w-5 inline" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">{editingUnit ? 'Edit Unit' : 'Add Unit'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Name *</label>
                <input
                  type="text"
                  value={formData.unit_name}
                  onChange={(e) => setFormData({ unit_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., KG"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  {editingUnit ? 'Update' : 'Create'}
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

export default UnitManagement;
