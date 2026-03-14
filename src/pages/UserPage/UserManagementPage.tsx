import { useState, useEffect } from 'react';
import { userService } from '@/api/services/userService';
import { storeService } from '@/api/services/storeService';
import { User, UserCreateRequest, UserUpdateRequest, Store } from '@/api/types';

const UserManagementPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<number | 'all'>('all');
  const [filterStore, setFilterStore] = useState<number | 'all'>('all');
  const [sortBy, setSortBy] = useState<'user_id' | 'username' | 'role_id' | 'location_id'>('user_id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [formData, setFormData] = useState<UserCreateRequest | UserUpdateRequest>({
    user_code: '',
    username: '',
    password: '',
    role_id: 2,
    location_id: null,
    location_ids: [],
    is_active: true,
  });

  const getUserLocationIds = (user: User): number[] => {
    if (Array.isArray(user.location_ids) && user.location_ids.length > 0) {
      return user.location_ids;
    }

    return user.location_id ? [user.location_id] : [];
  };

  useEffect(() => {
    loadUsers();
    loadStores();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await userService.getAllUsers();
      setUsers(data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadStores = async () => {
    try {
      const response = await storeService.getStores({ is_active: true });
      if (response.success) {
        setStores(response.data);
      }
    } catch (err: any) {
      console.error('Failed to load stores:', err);
    }
  };

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        user_code: user.user_code,
        username: user.username,
        password: '',
        role_id: user.role_id,
        location_id: user.location_id,
        location_ids: getUserLocationIds(user),
        is_active: user.is_active,
      });
    } else {
      setEditingUser(null);
      setFormData({
        user_code: '',
        username: '',
        password: '',
        role_id: 2,
        location_id: null,
        location_ids: [],
        is_active: true,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({
      user_code: '',
      username: '',
      password: '',
      role_id: 2,
      location_id: null,
      location_ids: [],
      is_active: true,
    });
  };

  const getSelectedLocationIdsFromForm = (): number[] => {
    if (Array.isArray(formData.location_ids) && formData.location_ids.length > 0) {
      return formData.location_ids;
    }

    return formData.location_id ? [formData.location_id] : [];
  };

  const handleToggleLocation = (locationId: number) => {
    const selectedLocationIds = getSelectedLocationIdsFromForm();
    const nextLocationIds = selectedLocationIds.includes(locationId)
      ? selectedLocationIds.filter((id) => id !== locationId)
      : [...selectedLocationIds, locationId];

    setFormData({
      ...formData,
      location_ids: nextLocationIds,
      location_id: nextLocationIds[0] ?? null,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const selectedLocationIds = Array.from(new Set(getSelectedLocationIdsFromForm()));

      if (editingUser) {
        const updateData: UserUpdateRequest = {
          ...formData,
          location_ids: selectedLocationIds,
          location_id: selectedLocationIds[0] ?? null,
        };
        if (!updateData.password) {
          delete updateData.password; 
        }
        delete (updateData as any).user_code;
        await userService.updateUser(editingUser.user_id, updateData);
      } else {
        const createData = {
          ...formData,
          location_ids: selectedLocationIds,
          location_id: selectedLocationIds[0] ?? null,
        } as UserCreateRequest;
        
        const userCodePattern = /^USR-\d{4}$/;
        if (!createData.user_code || !userCodePattern.test(createData.user_code.toUpperCase())) {
          setError('User code must be in format USR-XXXX (e.g., USR-0001)');
          return;
        }
        
        createData.user_code = createData.user_code.toUpperCase();
        
        await userService.createUser(createData);
      }
      
      handleCloseModal();
      loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save user');
    }
  };

  const handleDelete = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      await userService.deleteUser(userId);
      loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleToggleStatus = async (user: User) => {
    const action = user.is_active ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} user "${user.username}"?`)) return;

    try {
      await userService.updateUser(user.user_id, { is_active: !user.is_active });
      loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to ${action} user`);
    }
  };

  const getRoleName = (roleId: number) => {
    const roles: Record<number, string> = {
      1: 'Admin',
      2: 'Central Staff',
      3: 'Store Staff',
    };
    return roles[roleId] || 'Unknown';
  };

  const getStoreName = (locationId: number | null) => {
    if (!locationId) return '-';
    const location = stores.find(s => s.location_id === locationId);
    return location ? location.location_name : `Location #${locationId}`;
  };

  const getStoreNames = (locationIds: number[] | undefined) => {
    if (!locationIds || locationIds.length === 0) return '-';

    return locationIds
      .map((locationId) => getStoreName(locationId))
      .join(', ');
  };

  const getStoreAddress = (locationId: number | null) => {
    if (!locationId) return '-';
    const location = stores.find(s => s.location_id === locationId);
    return location ? location.location_address : '-';
  };

  const filteredAndSortedUsers = users
    .filter(user => {
      const matchesSearch = searchTerm === '' || 
        user.user_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getRoleName(user.role_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
        getStoreNames(getUserLocationIds(user)).toLowerCase().includes(searchTerm.toLowerCase()) ||
        getStoreAddress(user.location_id).toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = filterRole === 'all' || user.role_id === filterRole;
      const matchesStore = filterStore === 'all' || getUserLocationIds(user).includes(filterStore);
      
      return matchesSearch && matchesRole && matchesStore;
    })
    .sort((a, b) => {
      let compareValue = 0;
      
      switch (sortBy) {
        case 'user_id':
          compareValue = a.user_id - b.user_id;
          break;
        case 'username':
          compareValue = a.username.localeCompare(b.username);
          break;
        case 'role_id':
          compareValue = a.role_id - b.role_id;
          break;
        case 'location_id':
          const storeNameA = getStoreNames(getUserLocationIds(a));
          const storeNameB = getStoreNames(getUserLocationIds(b));
          compareValue = storeNameA.localeCompare(storeNameB);
          break;
      }
      
      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600 mb-4"></div>
          <div className="text-xl font-semibold text-gray-700">Loading users...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 flex items-center">
              <span className="mr-3">👥</span>
              User Management
            </h1>
            <p className="text-gray-600 mt-2">Manage system users and permissions</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center"
          >
            <span className="text-xl mr-2">+</span>
            Create New User
          </button>
        </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-6 py-4 rounded-lg mb-6 flex items-center shadow-md animate-shake">
          <span className="text-2xl mr-3">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500 transform hover:-translate-y-1 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Total Users</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{users.length}</p>
            </div>
            <div className="text-4xl">👤</div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500 transform hover:-translate-y-1 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Active Users</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{users.filter(u => u.is_active).length}</p>
            </div>
            <div className="text-4xl">✅</div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500 transform hover:-translate-y-1 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Admins</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{users.filter(u => u.role_id === 1).length}</p>
            </div>
            <div className="text-4xl">👑</div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500 transform hover:-translate-y-1 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Staff Members</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{users.filter(u => u.role_id === 2 || u.role_id === 3).length}</p>
            </div>
            <div className="text-4xl">💼</div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
        {/* Search and Filter Bar */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <input
                type="text"
                placeholder="🔍 Search by user code, username, role, store name, address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border-2 border-transparent focus:border-white focus:ring-2 focus:ring-white/50 transition-all"
              />
            </div>
            <select 
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="px-4 py-2 rounded-lg border-2 border-transparent focus:border-white focus:ring-2 focus:ring-white/50 transition-all"
            >
              <option value="all">All Roles</option>
              <option value={1}>Admin</option>
              <option value={2}>Central Staff</option>
              <option value={3}>Store Staff</option>
            </select>
            <select
              value={filterStore}
              onChange={(e) => setFilterStore(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="px-4 py-2 rounded-lg border-2 border-transparent focus:border-white focus:ring-2 focus:ring-white/50 transition-all"
            >
              <option value="all">All Stores</option>
              {stores.map(store => (
                <option key={store.location_id} value={store.location_id}>
                  {store.location_name}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'user_id' | 'username' | 'role_id' | 'location_id')}
                className="px-4 py-2 rounded-lg border-2 border-transparent focus:border-white focus:ring-2 focus:ring-white/50 transition-all flex-1"
              >
                <option value="user_id">Sort by ID</option>
                <option value="username">Sort by Username</option>
                <option value="role_id">Sort by Role</option>
                <option value="location_id">Sort by Location</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 bg-white rounded-lg hover:bg-gray-100 transition-all font-bold"
                title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">ID</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">User Code</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Username</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Store Name</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Store Address</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndSortedUsers.map((user) => (
              <tr key={user.user_id} className="hover:bg-indigo-50 transition-colors duration-150">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="font-semibold text-gray-800">#{user.user_id}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="font-bold text-indigo-700 text-lg">{user.user_code}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold mr-3">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-800">{user.username}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${
                    user.role_id === 1 ? 'bg-red-100 text-red-800' :
                    user.role_id === 2 ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {user.role_id === 1 ? '' : user.role_id === 2 ? '' : ''} {getRoleName(user.role_id)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-gray-700 font-medium">{getStoreNames(getUserLocationIds(user))}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-gray-600 text-sm">{getStoreAddress(user.location_id)}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleToggleStatus(user)}
                    className={`px-3 py-1 inline-flex text-sm leading-5 font-bold rounded-full cursor-pointer transition-all ${
                      user.is_active ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-red-100 text-red-800 hover:bg-red-200'
                    }`}
                  >
                    {user.is_active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleOpenModal(user)}
                    className="text-indigo-600 hover:text-indigo-900 mr-4 font-semibold hover:underline"
                  >
                    ✏️ 
                  </button>
                  <button
                    onClick={() => handleDelete(user.user_id)}
                    className="text-red-600 hover:text-red-900 font-semibold hover:underline"
                  >
                    🗑️ 
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredAndSortedUsers.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-gray-500 text-lg">No users found</p>
          </div>
        )}
      </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all animate-slide-up">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-t-2xl">
              <h2 className="text-2xl font-bold flex items-center">
                <span className="mr-2">{editingUser ? '✏️' : '➕'}</span>
                {editingUser ? 'Edit User' : 'Create New User'}
              </h2>
            </div>

            <div className="p-6">
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center">
                  <span className="text-xl mr-2"></span>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2 flex items-center">
                    <span className="mr-2"></span>
                    User Code
                  </label>
                  <input
                    type="text"
                    value={formData.user_code}
                    onChange={(e) => setFormData({ ...formData, user_code: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all uppercase"
                    placeholder="USR-0001"
                    pattern="USR-\d{4}"
                    title="Format: USR-XXXX (e.g., USR-0001)"
                    required
                    disabled={!!editingUser}
                    readOnly={!!editingUser}
                    style={editingUser ? { backgroundColor: '#f3f4f6', cursor: 'not-allowed' } : {}}
                  />
                  {editingUser && (
                    <p className="text-sm text-gray-500 mt-1">User code cannot be modified after creation</p>
                  )}
                  {!editingUser && (
                    <p className="text-sm text-gray-500 mt-1">Format: USR-XXXX (e.g., USR-0001, USR-0002)</p>
                  )}
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2 flex items-center">
                    <span className="mr-2"></span>
                    Username
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all"
                    placeholder="Enter username"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2 flex items-center">
                    <span className="mr-2"></span>
                    Password {editingUser && <span className="text-sm text-gray-500 ml-2">(leave blank to keep current)</span>}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all"
                    placeholder="Enter password"
                    required={!editingUser}
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2 flex items-center">
                    <span className="mr-2"></span>
                    Role
                  </label>
                  <select
                    value={formData.role_id}
                    onChange={(e) => setFormData({ ...formData, role_id: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all"
                    required
                  >
                    <option value={1}>Admin</option>
                    <option value={2}>Central Staff</option>
                    <option value={3}>Store Staff</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2 flex items-center">
                    <span className="mr-2"></span>
                    Stores <span className="text-sm text-gray-500 ml-2">(optional, multi-select)</span>
                  </label>
                  <div className="w-full border-2 border-gray-200 rounded-xl p-3 max-h-48 overflow-y-auto space-y-2 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-100 transition-all">
                    {stores.length === 0 && (
                      <p className="text-sm text-gray-500">No active stores found.</p>
                    )}

                    {stores.map((store) => {
                      const checked = getSelectedLocationIdsFromForm().includes(store.location_id);

                      return (
                        <label
                          key={store.location_id}
                          className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleToggleLocation(store.location_id)}
                            className="mt-1 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                          />
                          <div className="text-sm">
                            <p className="font-medium text-gray-800">{store.location_name}</p>
                            <p className="text-gray-500">{store.location_address}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  <p className="text-sm text-gray-500 mt-1">
                    Selected: {getSelectedLocationIdsFromForm().length === 0 ? 'None' : getStoreNames(getSelectedLocationIdsFromForm())}
                  </p>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 font-semibold text-gray-700 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
                  >
                    {editingUser ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;
