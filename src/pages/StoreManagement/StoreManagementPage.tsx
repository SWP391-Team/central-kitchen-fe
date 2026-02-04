import { useState, useEffect } from 'react';
import { storeService } from '@/api/services/storeService';
import { Store, StoreCreateRequest, StoreUpdateRequest } from '@/api/types';
import { useToast } from '@/contexts/ToastContext';

const StoreManagementPage = () => {
  const { showToast } = useToast();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'store_id' | 'store_name' | 'status'>('store_id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  const [formData, setFormData] = useState<StoreCreateRequest>({
    store_code: '',
    store_name: '',
    store_address: '',
    is_active: true,
  });

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateNew = () => {
    setEditingStore(null);
    setFormData({
      store_code: '',
      store_name: '',
      store_address: '',
      is_active: true,
    });
    setShowModal(true);
  };

  const handleEdit = (store: Store) => {
    setEditingStore(store);
    setFormData({
      store_code: store.store_code,
      store_name: store.store_name,
      store_address: store.store_address,
      is_active: store.is_active,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (editingStore) {
        const updateData: StoreUpdateRequest = {
          store_name: formData.store_name,
          store_address: formData.store_address,
        };
        delete (updateData as any).store_code;
        const response = await storeService.updateStore(editingStore.store_id, updateData);
        if (response.success) {
          setShowModal(false);
          fetchStores();
          showToast('Store updated successfully!', 'success');
        }
      } else {
        const createData = { ...formData } as StoreCreateRequest;
        
        const storeCodePattern = /^ST-[A-Z0-9]{3}-[A-Z0-9]{4}$/;
        if (!createData.store_code || !storeCodePattern.test(createData.store_code.toUpperCase())) {
          setError('Store code must be in format ST-XXX-XXXX (e.g., ST-HCM-0001)');
          return;
        }
        
        createData.store_code = createData.store_code.toUpperCase();
        
        const response = await storeService.createStore(createData);
        if (response.success) {
          setShowModal(false);
          fetchStores();
          showToast('Store created successfully!', 'success');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save store');
      console.error('Error saving store:', err);
    }
  };

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
          showToast(`Store ${action}d successfully!`, 'success');
        }
      } catch (err: any) {
        showToast(err.response?.data?.message || `Failed to ${action} store`, 'error');
        console.error(`Error ${action}ing store:`, err);
      }
    }
  };

  const filteredStores = [...stores].sort((a, b) => {
    let compareValue = 0;
    
    switch (sortBy) {
      case 'store_id':
        compareValue = a.store_id - b.store_id;
        break;
      case 'store_name':
        compareValue = a.store_name.localeCompare(b.store_name);
        break;
      case 'status':
        compareValue = (a.is_active === b.is_active) ? 0 : a.is_active ? -1 : 1;
        break;
    }
    
    return sortOrder === 'asc' ? compareValue : -compareValue;
  });

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
        <div className="flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="Search by store code, name or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 min-w-[300px]"
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
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'store_id' | 'store_name' | 'status')}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1"
            >
              <option value="store_id">Sort by ID</option>
              <option value="store_name">Sort by Name</option>
              <option value="status">Sort by Status</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
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
                Store Code
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
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  No stores found
                </td>
              </tr>
            ) : (
              filteredStores.map((store) => (
                <tr key={store.store_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {store.store_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-700">
                    {store.store_code}
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
                      className="text-blue-600 hover:text-blue-900 p-1"
                      title="Edit"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleToggleStatus(store)}
                      className={`p-1 ${
                        store.is_active
                          ? 'text-red-600 hover:text-red-900'
                          : 'text-green-600 hover:text-green-900'
                      }`}
                      title={store.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {store.is_active ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
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
        <div 
          className="fixed inset-0 flex items-center justify-center z-[9999]"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md border border-gray-200 relative"
            onClick={(e) => e.stopPropagation()}
            style={{ boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.3)' }}
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {editingStore ? 'Edit Store' : 'Create New Store'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Store Code *
                </label>
                <input
                  type="text"
                  name="store_code"
                  value={formData.store_code}
                  onChange={(e) => setFormData({ ...formData, store_code: e.target.value.toUpperCase() })}
                  required
                  disabled={!!editingStore}
                  readOnly={!!editingStore}
                  pattern="ST-[A-Z0-9]{3}-[A-Z0-9]{4}"
                  title="Format: ST-XXX-XXXX (e.g., ST-HCM-0001)"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                  style={editingStore ? { backgroundColor: '#f3f4f6', cursor: 'not-allowed' } : {}}
                  placeholder="ST-HCM-0001"
                />
                {editingStore && (
                  <p className="text-xs text-gray-500 mt-1">⚠️ Store code cannot be modified after creation</p>
                )}
                {!editingStore && (
                  <p className="text-xs text-gray-500 mt-1">Format: ST-XXX-XXXX (e.g., ST-HCM-0001, ST-HNI-0001)</p>
                )}
              </div>

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
