import { useState, useEffect } from 'react';
import { userService } from '@/api/services/userService';
import { User, UserCreateRequest, UserUpdateRequest } from '@/api/types';
import Navbar from '@/components/Navbar';

const UserManagementPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserCreateRequest | UserUpdateRequest>({
    username: '',
    password: '',
    role_id: 2,
    store_id: null,
    is_active: true,
  });

  useEffect(() => {
    loadUsers();
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

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        password: '',
        role_id: user.role_id,
        store_id: user.store_id,
        is_active: user.is_active,
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: '',
        password: '',
        role_id: 2,
        store_id: null,
        is_active: true,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      role_id: 2,
      store_id: null,
      is_active: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (editingUser) {
        // Update existing user
        const updateData: UserUpdateRequest = { ...formData };
        if (!updateData.password) {
          delete updateData.password; // Don't send empty password
        }
        await userService.updateUser(editingUser.user_id, updateData);
      } else {
        // Create new user
        await userService.createUser(formData as UserCreateRequest);
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

  const getRoleName = (roleId: number) => {
    const roles: Record<number, string> = {
      1: 'Admin',
      2: 'Manager',
      3: 'Staff',
      4: 'Store Manager',
    };
    return roles[roleId] || 'Unknown';
  };

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
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
              <p className="text-gray-500 text-sm font-medium">Managers</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{users.filter(u => u.role_id === 2 || u.role_id === 4).length}</p>
            </div>
            <div className="text-4xl">💼</div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
        {/* Search and Filter Bar */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="🔍 Search users..."
                className="w-full px-4 py-2 rounded-lg border-2 border-transparent focus:border-white focus:ring-2 focus:ring-white/50 transition-all"
              />
            </div>
            <select className="px-4 py-2 rounded-lg border-2 border-transparent focus:border-white focus:ring-2 focus:ring-white/50 transition-all">
              <option>All Roles</option>
              <option>Admin</option>
              <option>Manager</option>
              <option>Staff</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">ID</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Username</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Role</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Store ID</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Created</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.user_id} className="hover:bg-indigo-50 transition-colors duration-150">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="font-semibold text-gray-800">#{user.user_id}</span>
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
                    user.role_id === 4 ? 'bg-purple-100 text-purple-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {user.role_id === 1 ? '👑' : user.role_id === 2 ? '💼' : user.role_id === 4 ? '🏪' : '👤'} {getRoleName(user.role_id)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-gray-700">{user.store_id ? `Store #${user.store_id}` : '-'}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-3 py-1 inline-flex text-sm leading-5 font-bold rounded-full ${
                    user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {user.is_active ? '✓ Active' : '✗ Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                  {new Date(user.created_at).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleOpenModal(user)}
                    className="text-indigo-600 hover:text-indigo-900 mr-4 font-semibold hover:underline"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDelete(user.user_id)}
                    className="text-red-600 hover:text-red-900 font-semibold hover:underline"
                  >
                    🗑️ Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
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
                  <span className="text-xl mr-2">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2 flex items-center">
                    <span className="mr-2">👤</span>
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
                    <span className="mr-2">🔒</span>
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
                    <span className="mr-2">💼</span>
                    Role
                  </label>
                  <select
                    value={formData.role_id}
                    onChange={(e) => setFormData({ ...formData, role_id: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all"
                    required
                  >
                    <option value={1}>👑 Admin</option>
                    <option value={2}>💼 Manager</option>
                    <option value={3}>👤 Staff</option>
                    <option value={4}>🏪 Store Manager</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2 flex items-center">
                    <span className="mr-2">🏪</span>
                    Store ID <span className="text-sm text-gray-500 ml-2">(optional)</span>
                  </label>
                  <input
                    type="number"
                    value={formData.store_id || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      store_id: e.target.value ? parseInt(e.target.value) : null 
                    })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all"
                    placeholder="Enter store ID"
                  />
                </div>

                <div className="bg-gray-50 p-4 rounded-xl">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <span className="ml-3 text-gray-700 font-semibold flex items-center">
                      <span className="mr-2">✅</span>
                      Active User
                    </span>
                  </label>
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
                    {editingUser ? '💾 Update' : '➕ Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default UserManagementPage;
