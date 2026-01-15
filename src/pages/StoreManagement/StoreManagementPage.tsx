import { useState, useEffect } from 'react';
import { storeService } from '@/api/services/storeService';
import { Store, StoreCreateRequest, StoreUpdateRequest } from '@/api/types';

const StoreManagementPage = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  
  const [formData, setFormData] = useState<StoreCreateRequest>({
    store_name: '',
    store_address: '',
    is_active: true,
  });

  // Fetch stores
  const fetchStores = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (filterStatus !== 'all') params.is_active = filterStatus === 'active';
      
      const response = await storeService.getStores(params);
      if (response.success) {
        setStores(response.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch stores');
      console.error('Error fetching stores:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, [searchTerm, filterStatus]);

  // Handle form input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Open modal for creating new store
  const handleCreateNew = () => {
    setEditingStore(null);
    setFormData({
      store_name: '',
      store_address: '',
      is_active: true,
    });
    setShowModal(true);
  };

  // Open modal for editing store
  const handleEdit = (store: Store) => {
    setEditingStore(store);
    setFormData({
      store_name: store.store_name,
      store_address: store.store_address,
      is_active: store.is_active,
    });
    setShowModal(true);
  };

  // Submit form (create or update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (editingStore) {
        // Update existing store
        const updateData: StoreUpdateRequest = {
          store_name: formData.store_name,
          store_address: formData.store_address,
        };
        const response = await storeService.updateStore(editingStore.store_id, updateData);
        if (response.success) {
          setShowModal(false);
          fetchStores();
          alert('Store updated successfully!');
        }
      } else {
        // Create new store
        const response = await storeService.createStore(formData);
        if (response.success) {
          setShowModal(false);
          fetchStores();
          alert('Store created successfully!');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save store');
      console.error('Error saving store:', err);
    }
  };

  // Toggle store status (activate/deactivate)
  const handleToggleStatus = async (store: Store) => {
    const action = store.is_active ? 'deactivate' : 'activate';
    const confirmMessage = store.is_active
      ? `Are you sure you want to deactivate "${store.store_name}"? Users assigned to this store will be blocked from login.`
      : `Are you sure you want to activate "${store.store_name}"?`;

    if (window.confirm(confirmMessage)) {
      try {
        const response = await storeService.toggleStoreStatus(store.store_id, !store.is_active);
        if (response.success) {
          fetchStores();
          alert(`Store ${action}d successfully!`);
        }
      } catch (err: any) {
        alert(err.response?.data?.message || `Failed to ${action} store`);
        console.error(`Error ${action}ing store:`, err);
      }
    }
  };

  // Filter stores based on search and filter
  const filteredStores = stores;

  // Get statistics
  const totalStores = stores.length;
  const activeStores = stores.filter(s => s.is_active).length;
  const inactiveStores = stores.filter(s => !s.is_active).length;

  if (loading && stores.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading stores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Store Management</h1>
        <button
          onClick={handleCreateNew}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Add New Store
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Store Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-500">Total Stores</p>
          <p className="text-2xl font-semibold text-gray-900 mt-2">{totalStores}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-500">Active Stores</p>
          <p className="text-2xl font-semibold text-green-600 mt-2">{activeStores}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-500">Inactive Stores</p>
          <p className="text-2xl font-semibold text-red-600 mt-2">{inactiveStores}</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Search by store name or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
            className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Stores Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Store ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Store Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Address
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredStores.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  No stores found
                </td>
              </tr>
            ) : (
              filteredStores.map((store) => (
                <tr key={store.store_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {store.store_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {store.store_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {store.store_address}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        store.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {store.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEdit(store)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleStatus(store)}
                      className={`${
                        store.is_active
                          ? 'text-red-600 hover:text-red-900'
                          : 'text-green-600 hover:text-green-900'
                      }`}
                    >
                      {store.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal for Create/Edit Store */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {editingStore ? 'Edit Store' : 'Create New Store'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Store Name *
                </label>
                <input
                  type="text"
                  name="store_name"
                  value={formData.store_name}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter store name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Store Address *
                </label>
                <textarea
                  name="store_address"
                  value={formData.store_address}
                  onChange={handleInputChange}
                  required
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter store address"
                />
              </div>

              {error && (
                <div className="text-red-600 text-sm">{error}</div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {editingStore ? 'Update Store' : 'Create Store'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreManagementPage;
