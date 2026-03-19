import { useEffect, useMemo, useState } from 'react';
import {
  EyeIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  PowerIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { userService } from '@/api/services/userService';
import { locationService } from '@/api/services/locationService';
import { Location, User, UserCreateRequest, UserUpdateRequest } from '@/api/types';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';

type StatusFilter = 'all' | 'active' | 'inactive';

type UserFormData = {
  username: string;
  password: string;
  role_id: number;
  location_id: number | null;
  location_ids: number[];
  is_active: boolean;
};

const INITIAL_FORM_DATA: UserFormData = {
  username: '',
  password: '',
  role_id: 2,
  location_id: null,
  location_ids: [],
  is_active: true,
};

const UserManagementPage = () => {
  const { confirm, confirmDialog } = useConfirmDialog();

  const [users, setUsers] = useState<User[]>([]);
  const [stores, setStores] = useState<Location[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [detailUser, setDetailUser] = useState<User | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [formData, setFormData] = useState<UserFormData>(INITIAL_FORM_DATA);

  const [searchInput, setSearchInput] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');
  const [filterRole, setFilterRole] = useState<number | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all');

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounce(searchInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    void loadUsers();
    void loadStores();
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
      const response = await locationService.getLocations({ is_active: true });
      if (response.success) {
        setStores(response.data);
      }
    } catch (err) {
      console.error('Failed to load stores:', err);
    }
  };

  const getRoleName = (roleId: number) => {
    const roleMap: Record<number, string> = {
      1: 'Admin',
      2: 'Central Staff',
      3: 'Store Staff',
    };
    return roleMap[roleId] || 'Unknown';
  };

  const getRoleClassName = (roleId: number) => {
    if (roleId === 1) return 'bg-rose-100 text-rose-700 border-rose-200';
    if (roleId === 2) return 'bg-blue-100 text-blue-700 border-blue-200';
    return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  };

  const getUserLocationIds = (user: User): number[] => {
    if (Array.isArray(user.location_ids) && user.location_ids.length > 0) {
      return user.location_ids;
    }
    return user.location_id ? [user.location_id] : [];
  };

  const getStoreById = (locationId: number) => stores.find((store) => store.location_id === locationId);

  const getStoreName = (locationId: number) => {
    return getStoreById(locationId)?.location_name || `Location #${locationId}`;
  };

  const getStoreAddress = (locationId: number) => {
    return getStoreById(locationId)?.location_address || '-';
  };

  const getStoreNames = (locationIds: number[]) => {
    if (locationIds.length === 0) return '-';
    return locationIds.map((locationId) => getStoreName(locationId)).join(', ');
  };

  const getSelectedLocationIdsFromForm = (): number[] => {
    if (formData.location_ids.length > 0) {
      return formData.location_ids;
    }
    return formData.location_id ? [formData.location_id] : [];
  };

  const handleToggleLocation = (locationId: number) => {
    const selectedLocationIds = getSelectedLocationIdsFromForm();
    const nextLocationIds = selectedLocationIds.includes(locationId)
      ? selectedLocationIds.filter((id) => id !== locationId)
      : [...selectedLocationIds, locationId];

    setFormData((prev) => ({
      ...prev,
      location_ids: nextLocationIds,
      location_id: nextLocationIds[0] ?? null,
    }));
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setError('');
    setFormData(INITIAL_FORM_DATA);
    setShowEditModal(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setError('');

    const locationIds = getUserLocationIds(user);
    setFormData({
      username: user.username,
      password: '',
      role_id: user.role_id,
      location_id: locationIds[0] ?? null,
      location_ids: locationIds,
      is_active: user.is_active,
    });

    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingUser(null);
    setFormData(INITIAL_FORM_DATA);
  };

  const openDetailModal = async (userId: number) => {
    setShowDetailModal(true);
    setDetailLoading(true);
    setError('');

    try {
      const detail = await userService.getUserById(userId);
      setDetailUser(detail);
    } catch (err: any) {
      setDetailUser(null);
      setError(err.response?.data?.message || 'Failed to load user detail');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setDetailUser(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const selectedLocationIds = Array.from(new Set(getSelectedLocationIdsFromForm()));

      if (editingUser) {
        const updateData: UserUpdateRequest = {
          username: formData.username,
          role_id: formData.role_id,
          is_active: formData.is_active,
          location_ids: selectedLocationIds,
          location_id: selectedLocationIds[0] ?? null,
        };

        if (formData.password.trim()) {
          updateData.password = formData.password;
        }

        await userService.updateUser(editingUser.user_id, updateData);
      } else {
        const createData: UserCreateRequest = {
          username: formData.username,
          password: formData.password,
          role_id: formData.role_id,
          is_active: formData.is_active,
          location_ids: selectedLocationIds,
          location_id: selectedLocationIds[0] ?? null,
        };

        await userService.createUser(createData);
      }

      closeEditModal();
      await loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save user');
    }
  };

  const handleToggleStatus = async (user: User) => {
    const action = user.is_active ? 'deactivate' : 'activate';
    const accepted = await confirm({
      title: action === 'deactivate' ? 'Deactivate User' : 'Activate User',
      message:
        action === 'deactivate'
          ? `Are you sure you want to deactivate user "${user.username}"? If this user is currently assigned to Produce, Inspection, or Rework tasks, the system will block this action.`
          : `Are you sure you want to activate user "${user.username}"?`,
      confirmText: action === 'deactivate' ? 'Deactivate' : 'Activate',
      tone: action === 'deactivate' ? 'danger' : 'default',
    });
    if (!accepted) return;

    try {
      await userService.updateUser(user.user_id, { is_active: !user.is_active });
      await loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to ${action} user`);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const userLocationIds = getUserLocationIds(user);
      const searchTargets = [
        user.user_code,
        user.username,
        getRoleName(user.role_id),
        getStoreNames(userLocationIds),
      ]
        .join(' ')
        .toLowerCase();

      const matchesSearch = searchDebounce === '' || searchTargets.includes(searchDebounce.toLowerCase());
      const matchesRole = filterRole === 'all' || user.role_id === filterRole;
      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'active' && user.is_active) ||
        (filterStatus === 'inactive' && !user.is_active);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchDebounce, filterRole, filterStatus]);

  const totalUsers = users.length;
  const activeUsers = users.filter((user) => user.is_active).length;
  const inactiveUsers = totalUsers - activeUsers;

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-cyan-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-cyan-600" />
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Loading users</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-50 via-cyan-50 to-emerald-50 p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Administration</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-800">User Management</h1>
            <p className="mt-2 text-sm text-slate-600">Manage accounts, roles, and assigned locations in a cleaner workflow.</p>
          </div>

          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <PlusIcon className="h-5 w-5" />
            Create User
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total Users</p>
            <p className="mt-2 text-2xl font-bold text-slate-800">{totalUsers}</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4">
            <p className="text-xs uppercase tracking-wide text-emerald-700">Active Users</p>
            <p className="mt-2 text-2xl font-bold text-emerald-800">{activeUsers}</p>
          </div>
          <div className="rounded-2xl border border-rose-100 bg-rose-50/80 p-4">
            <p className="text-xs uppercase tracking-wide text-rose-700">Inactive Users</p>
            <p className="mt-2 text-2xl font-bold text-rose-800">{inactiveUsers}</p>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="relative md:col-span-2">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by code, username, role, location..."
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              />
            </div>

            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            >
              <option value="all">All Roles</option>
              <option value={1}>Admin</option>
              <option value={2}>Central Staff</option>
              <option value={3}>Store Staff</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as StatusFilter)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <p className="mt-3 text-xs text-slate-500">Showing {filteredUsers.length} user(s)</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">User</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Role</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Locations</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredUsers.map((user) => {
                const userLocationIds = getUserLocationIds(user);
                const previewLocations = userLocationIds.slice(0, 2);
                const remainingLocationCount = Math.max(0, userLocationIds.length - previewLocations.length);

                return (
                  <tr key={user.user_id} className="transition hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">{user.username}</p>
                          <p className="truncate text-xs text-slate-500">{user.user_code}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getRoleClassName(user.role_id)}`}>
                        {getRoleName(user.role_id)}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      {previewLocations.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {previewLocations.map((locationId) => (
                            <span
                              key={`${user.user_id}-${locationId}`}
                              className="inline-flex max-w-[180px] truncate rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
                              title={getStoreName(locationId)}
                            >
                              {getStoreName(locationId)}
                            </span>
                          ))}
                          {remainingLocationCount > 0 && (
                            <span className="inline-flex rounded-md border border-cyan-200 bg-cyan-50 px-2 py-1 text-xs font-semibold text-cyan-700">
                              +{remainingLocationCount} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">No locations</span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          user.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => void openDetailModal(user.user_id)}
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-cyan-50 hover:text-cyan-700"
                          title="View detail"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>

                        <button
                          onClick={() => openEditModal(user)}
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-700"
                          title="Edit user"
                        >
                          <PencilSquareIcon className="h-5 w-5" />
                        </button>

                        <button
                          onClick={() => void handleToggleStatus(user)}
                          className={`rounded-lg p-2 transition ${
                            user.is_active
                              ? 'text-rose-600 hover:bg-rose-50 hover:text-rose-700'
                              : 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700'
                          }`}
                          title={user.is_active ? 'Deactivate user' : 'Activate user'}
                        >
                          <PowerIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-semibold text-slate-700">No users found</p>
              <p className="mt-1 text-xs text-slate-500">Try another keyword or filter option.</p>
            </div>
          )}
        </div>
      </section>

      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">{editingUser ? 'Edit User' : 'Create User'}</h2>
                <p className="text-xs text-slate-500">
                  {editingUser
                    ? 'Update profile, role, and assigned locations.'
                    : 'User code will be generated automatically by the system.'}
                </p>
              </div>
              <button
                onClick={closeEditModal}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              {!editingUser && (
                <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-700">
                  User code is auto-generated. You only need to provide account information.
                </div>
              )}

              {editingUser && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Current user code: <span className="font-semibold text-slate-800">{editingUser.user_code}</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700">Username</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                    placeholder="Enter username"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Password
                    {editingUser && <span className="ml-1 text-xs text-slate-500">(leave blank to keep current)</span>}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                    placeholder="Enter password"
                    required={!editingUser}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Role</label>
                  <select
                    value={formData.role_id}
                    onChange={(e) => setFormData((prev) => ({ ...prev, role_id: Number(e.target.value) }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                    required
                  >
                    <option value={1}>Admin</option>
                    <option value={2}>Central Staff</option>
                    <option value={3}>Store Staff</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
                  <select
                    value={formData.is_active ? 'active' : 'inactive'}
                    onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.value === 'active' }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Assigned Locations</label>
                <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-slate-300 p-3">
                  {stores.length === 0 && <p className="text-sm text-slate-500">No active locations available.</p>}

                  {stores.map((store) => {
                    const checked = getSelectedLocationIdsFromForm().includes(store.location_id);
                    return (
                      <label
                        key={store.location_id}
                        className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 transition hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleLocation(store.location_id)}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                        />
                        <div>
                          <p className="text-sm font-medium text-slate-800">{store.location_name}</p>
                          <p className="text-xs text-slate-500">{store.location_address}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Selected: {getSelectedLocationIdsFromForm().length === 0 ? 'None' : getStoreNames(getSelectedLocationIdsFromForm())}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  {editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-800">User Detail</h2>
              <button
                onClick={closeDetailModal}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {detailLoading ? (
              <div className="px-6 py-10 text-center">
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-cyan-600" />
                <p className="text-sm text-slate-500">Loading user detail...</p>
              </div>
            ) : detailUser ? (
              <div className="space-y-5 p-6">
                <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">User Code</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">{detailUser.user_code}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Username</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">{detailUser.username}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Role</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">{getRoleName(detailUser.role_id)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">{detailUser.is_active ? 'Active' : 'Inactive'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Created At</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">{new Date(detailUser.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Updated At</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {detailUser.updated_at ? new Date(detailUser.updated_at).toLocaleString() : '-'}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Assigned Locations</h3>
                  <div className="mt-2 space-y-2">
                    {getUserLocationIds(detailUser).length === 0 && (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">No locations assigned.</div>
                    )}

                    {getUserLocationIds(detailUser).map((locationId) => (
                      <div key={`detail-location-${locationId}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <p className="text-sm font-medium text-slate-800">{getStoreName(locationId)}</p>
                        <p className="text-xs text-slate-500">{getStoreAddress(locationId)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-6 py-10 text-center text-sm text-slate-500">User detail is not available.</div>
            )}
          </div>
        </div>
      )}

      {confirmDialog}
    </div>
  );
};

export default UserManagementPage;
