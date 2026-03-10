import React, { useState, useEffect } from 'react';
import { userService } from '@/api/services/userService';
import { storeService } from '@/api/services/storeService';
import { User, UserCreateRequest, UserUpdateRequest, Store } from '@/api/types';
import { FiEdit2, FiTrash2, FiPlus, FiSearch, FiChevronDown, FiTriangle, FiHexagon, FiAlertCircle } from 'react-icons/fi';

const MeteorBackground: React.FC = () => {
  const meteors = Array.from({ length: 40 }, (_, i) => i);
  return (
    <div className="meteor-background-container">
      <div className="stars"></div>
      <div className="shooting-stars">
        {meteors.map((i) => (
          <span key={i} style={{ '--i': i } as React.CSSProperties}></span>
        ))}
      </div>
      <div className="bg-glow"></div>
    </div>
  );
};

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info';
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  type = 'info',
}) => {
  if (!isOpen) return null;

  const getConfig = () => {
    switch (type) {
      case 'danger': return {
        bg: 'bg-rose-500 hover:bg-rose-600',
        glow: 'shadow-rose-200',
        iconBg: 'bg-rose-50',
        iconColor: 'text-rose-500',
        icon: <FiAlertCircle size={32} />,
        accent: 'bg-rose-500'
      };
      case 'warning': return {
        bg: 'bg-amber-400 hover:bg-amber-500',
        glow: 'shadow-amber-200',
        iconBg: 'bg-amber-50',
        iconColor: 'text-amber-500',
        icon: <FiTriangle size={30} />,
        accent: 'bg-amber-400'
      };
      default: return {
        bg: 'bg-indigo-600 hover:bg-indigo-700',
        glow: 'shadow-indigo-200',
        iconBg: 'bg-indigo-50',
        iconColor: 'text-indigo-500',
        icon: <FiHexagon size={32} />,
        accent: 'bg-indigo-500'
      };
    }
  };

  const config = getConfig();

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 animate-fade-in overflow-hidden">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onCancel}></div>
      <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-[380px] overflow-hidden transform transition-all animate-slide-up">
        <div className={`h-1.5 w-full ${config.accent}`}></div>
        <div className="px-8 pt-10 pb-8">
          <div className="flex flex-col items-center text-center">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-sm ${config.iconBg} ${config.iconColor}`}>
              {config.icon}
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">{title}</h3>
            <p className="text-slate-500 text-sm font-bold leading-relaxed opacity-80">{message}</p>
          </div>
          <div className="flex flex-col gap-3 mt-8">
            <button
              onClick={onConfirm}
              className={`w-full py-3.5 rounded-2xl text-xs font-black tracking-widest text-white shadow-xl transition-all active:scale-[0.97] transform ${config.bg} ${config.glow}`}
            >
              Confirm
            </button>
            <button
              onClick={onCancel}
              className="w-full py-3 rounded-2xl text-[11px] font-black tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const UserManagementPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<number | 'all'>('all');
  const [filterStore, setFilterStore] = useState<number | 'all'>('all');
  const [sortBy, setSortBy] = useState<'user_id' | 'username' | 'role_id' | 'store_id'>('user_id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [formData, setFormData] = useState<UserCreateRequest | UserUpdateRequest>({
    user_code: '',
    username: '',
    password: '',
    role_id: 2,
    store_id: null,
    is_active: true,
  });

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    loadUsers();
    loadStores();
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
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
        store_id: user.store_id,
        is_active: user.is_active,
      });
    } else {
      setEditingUser(null);
      setFormData({
        user_code: '',
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
      user_code: '',
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
        const updateData: UserUpdateRequest = { ...formData };
        if (!updateData.password) {
          delete updateData.password;
        }
        delete (updateData as any).user_code;
        await userService.updateUser(editingUser.user_id, updateData);
      } else {
        const createData = { ...formData } as UserCreateRequest;

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

  const handleDelete = async (userId: number, username: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete User',
      message: `Are you sure you want to permanently remove "${username}"? This action cannot be undone.`,
      type: 'danger',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          await userService.deleteUser(userId);
          loadUsers();
        } catch (err: any) {
          setError(err.response?.data?.message || 'Failed to delete user');
        }
      },
    });
  };

  const handleToggleStatus = async (user: User) => {
    const action = user.is_active ? 'deactivate' : 'activate';
    setConfirmDialog({
      isOpen: true,
      title: `${user.is_active ? 'Deactivate' : 'Activate'} User`,
      message: `Are you sure you want to ${action} user "${user.username}"?`,
      type: user.is_active ? 'warning' : 'info',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          await userService.updateUser(user.user_id, { is_active: !user.is_active });
          loadUsers();
        } catch (err: any) {
          setError(err.response?.data?.message || `Failed to ${action} user`);
        }
      },
    });
  };

  const getRoleName = (roleId: number) => {
    const roles: Record<number, string> = { 1: 'Admin', 2: 'Central Staff', 3: 'Store Staff' };
    return roles[roleId] || 'Unknown';
  };

  const getStoreName = (storeId: number | null) => {
    if (!storeId) return '-';
    return stores.find(s => s.store_id === storeId)?.store_name || `Store #${storeId}`;
  };

  const getStoreAddress = (storeId: number | null) => {
    if (!storeId) return '-';
    return stores.find(s => s.store_id === storeId)?.store_address || '-';
  };

  const filteredAndSortedUsers = users
    .filter(user => {
      const matchesSearch = searchTerm === '' ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.user_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getRoleName(user.role_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
        getStoreName(user.store_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
        getStoreAddress(user.store_id).toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch && (filterRole === 'all' || user.role_id === filterRole) && (filterStore === 'all' || user.store_id === filterStore);
    })
    .sort((a, b) => {
      let val = 0;
      switch (sortBy) {
        case 'user_id': val = a.user_id - b.user_id; break;
        case 'username': val = a.username.localeCompare(b.username); break;
        case 'role_id': val = a.role_id - b.role_id; break;
        case 'store_id': val = getStoreName(a.store_id).localeCompare(getStoreName(b.store_id)); break;
      }
      return sortOrder === 'asc' ? val : -val;
    });

  const meteorVariables = {
    '--meteor-bg': '#fcfbff',
    '--meteor-head': '#1e1b4b',
    '--meteor-tail-start': 'rgba(49, 46, 129, 1)',
    '--meteor-tail-mid': 'rgba(79, 70, 229, 0.5)',
    '--meteor-tail-end': 'rgba(255, 255, 255, 0)',
    '--star-color': 'rgba(49, 46, 129, 0.1)',
    '--head-size': '22px',
    '--thickness': '10px',
    '--tail': '1500px',
  } as React.CSSProperties;

  if (loading) return null;

  return (
    <div className="h-screen max-h-screen relative bg-transparent flex flex-col p-8 font-sans overflow-hidden text-indigo-950 border-none">
      <div className="absolute inset-0 z-0 bg-transparent" style={meteorVariables}><MeteorBackground /></div>

      {error && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[200]">
          <div className="bg-white/95 border-2 border-rose-300 text-rose-700 px-8 py-3 rounded-full shadow-2xl flex items-center gap-4 animate-in slide-in-from-top duration-500">
            <span className="text-xl">⚠️</span>
            <p className="font-bold text-xs tracking-widest">{error}</p>
            <button onClick={() => setError('')} className="ml-4 text-rose-400 hover:text-rose-700 font-black">×</button>
          </div>
        </div>
      )}

      <div className="relative z-10 space-y-6 max-w-[1800px] mx-auto w-full h-full flex flex-col">
        <header className="flex justify-between items-center shrink-0">
          <div>
            <h1 className="text-5xl font-black text-indigo-950 tracking-tighter italic">
              User Management
            </h1>
            <p className="text-indigo-800 font-bold mt-2 opacity-70">Manage system users and permissions</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="group relative px-10 py-5 rounded-[1.5rem] overflow-hidden shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-300"
          >
            <div className="absolute inset-0 bg-indigo-700 group-hover:bg-indigo-800 transition-colors" />
            <div className="relative flex items-center text-white font-bold text-xs tracking-widest">
              <FiPlus className="text-xl mr-2" />
              Create New User
            </div>
          </button>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-6 shrink-0">
          {[
            { label: 'Total Users', value: users.length, icon: '👤', color: 'text-indigo-900' },
            { label: 'Active Users', value: users.filter(u => u.is_active).length, icon: '✅', color: 'text-emerald-800' },
            { label: 'Admins', value: users.filter(u => u.role_id === 1).length, icon: '👑', color: 'text-amber-800' },
            { label: 'Staff Members', value: users.filter(u => u.role_id === 2 || u.role_id === 3).length, icon: '💼', color: 'text-sky-800' }
          ].map((stat, i) => (
            <div key={i} className="bg-transparent border-2 border-white/50 rounded-[2.5rem] p-8 transition-all duration-300 hover:border-indigo-200 group/stat shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-indigo-700 font-bold text-xs tracking-widest mb-1 opacity-70">{stat.label}</p>
                  <p className={`text-4xl font-black ${stat.color} tracking-tighter`}>{stat.value}</p>
                </div>
                <div className="text-4xl opacity-10 group-hover/stat:opacity-80 transition-all transform">{stat.icon}</div>
              </div>
            </div>
          ))}
        </section>

        <main className="bg-transparent rounded-[3.5rem] border-2 border-white/50 flex-1 flex flex-col min-h-0 shadow-sm overflow-hidden">
          <div className="p-8 border-b-2 border-white/30 shrink-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 items-center">
              <div className="lg:col-span-2 relative group">
                <FiSearch className="absolute left-6 top-1/2 -translate-y-1/2 text-indigo-700" size={20} />
                <input
                  type="text"
                  placeholder="🔍 Search by user code, username, role, store name, address..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-16 pr-8 py-5 rounded-[2rem] border-2 border-white/40 bg-white/20 text-indigo-950 font-bold text-sm placeholder-indigo-300 focus:border-indigo-600 focus:bg-white transition-all outline-none shadow-sm"
                />
              </div>
              <div className="relative">
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                  className="w-full bg-white/20 border-2 border-white/40 pl-6 pr-10 py-5 rounded-[2rem] text-indigo-900 font-bold text-base cursor-pointer appearance-none tracking-wider outline-none hover:bg-white transition-all shadow-sm"
                >
                  <option value="all">All Roles</option>
                  <option value={1}>Admin</option>
                  <option value={2}>Central Staff</option>
                  <option value={3}>Store Staff</option>
                </select>
                <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-700 pointer-events-none" />
              </div>
              <div className="relative">
                <select
                  value={filterStore}
                  onChange={(e) => setFilterStore(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                  className="w-full bg-white/20 border-2 border-white/40 pl-6 pr-10 py-5 rounded-[2rem] text-indigo-900 font-bold text-base cursor-pointer appearance-none tracking-wider outline-none hover:bg-white transition-all shadow-sm"
                >
                  <option value="all">All Stores</option>
                  {stores.map(s => <option key={s.store_id} value={s.store_id}>{s.store_name} ({s.store_address})</option>)}
                </select>
                <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-700 pointer-events-none" />
              </div>
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full bg-white/20 border-2 border-white/40 pl-6 pr-10 py-5 rounded-[2rem] text-indigo-900 font-bold text-base cursor-pointer appearance-none tracking-wider outline-none hover:bg-white transition-all shadow-sm"
                  >
                    <option value="user_id">Sort by ID</option>
                    <option value="username">Sort by Username</option>
                    <option value="role_id">Sort by Role</option>
                    <option value="store_id">Sort by Store</option>
                  </select>
                  <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-700 pointer-events-none" />
                </div>
                <button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} className="w-16 h-16 bg-indigo-700 text-white rounded-[2rem] flex items-center justify-center font-black text-xl shadow-lg hover:bg-indigo-800 transition-all active:scale-95">
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar p-8">
            <table className="min-w-full border-separate border-spacing-0 text-indigo-950">
              <thead>
                <tr className="text-xs font-black tracking-widest">
                  <th className="px-6 py-6 text-left border-b-2 border-white/30">ID</th>
                  <th className="px-6 py-6 text-left border-b-2 border-white/30">User Code</th>
                  <th className="px-6 py-6 text-left border-b-2 border-white/30">Username</th>
                  <th className="px-6 py-6 text-left border-b-2 border-white/30">Role</th>
                  <th className="px-6 py-6 text-left border-b-2 border-white/30">Store Name</th>
                  <th className="px-6 py-6 text-left border-b-2 border-white/30">Store Address</th>
                  <th className="px-6 py-6 text-center border-b-2 border-white/30">Status</th>
                  <th className="px-6 py-6 text-center border-b-2 border-white/30">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-white/10">
                {filteredAndSortedUsers.map((user) => (
                  <tr key={user.user_id} className="group/row transition-all duration-300 hover:bg-white/10">
                    <td className="px-6 py-8 text-indigo-600 font-bold text-sm font-mono opacity-70">#{user.user_id}</td>
                    <td className="px-6 py-8 font-bold text-indigo-800 text-lg tracking-wide font-mono italic">{user.user_code}</td>
                    <td className="px-6 py-8">
                      <div className="flex items-center gap-6">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-800 font-black text-sm shadow-lg border border-indigo-50 group-hover/row:scale-110 transition-transform">
                          {user.username.charAt(0)}
                        </div>
                        <span className="font-black text-indigo-950 text-xl tracking-tight">{user.username}</span>
                      </div>
                    </td>
                    <td className="px-6 py-8 text-sm font-black text-indigo-800 tracking-wider font-bold">{getRoleName(user.role_id)}</td>
                    <td className="px-6 py-8 text-indigo-950 font-bold text-[15px]">{getStoreName(user.store_id)}</td>
                    <td className="px-6 py-8 text-indigo-900 text-xs font-medium leading-relaxed whitespace-normal opacity-80">
                      {getStoreAddress(user.store_id)}
                    </td>
                    <td className="px-6 py-8 text-center">
                      <button
                        onClick={() => handleToggleStatus(user)}
                        className={`px-6 py-2 rounded-full text-xs font-black tracking-widest border-2 shadow-sm transition-all hover:scale-105 active:scale-95 ${user.is_active ? 'bg-emerald-50 border-emerald-400 text-emerald-800 hover:bg-emerald-100' : 'bg-rose-50 border-rose-400 text-rose-800 hover:bg-rose-100'}`}
                        title={user.is_active ? 'Click to deactivate' : 'Click to activate'}
                      >
                        {user.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-8">
                      <div className="flex items-center justify-center gap-6">
                        <button onClick={() => handleOpenModal(user)} className="text-indigo-400 hover:text-indigo-800 transition-colors"><FiEdit2 size={24} /></button>
                        <button onClick={() => handleDelete(user.user_id, user.username)} className="text-rose-300 hover:text-rose-600 transition-colors"><FiTrash2 size={24} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-indigo-950/20 backdrop-blur-3xl flex items-center justify-center z-[100] p-8 animate-in fade-in duration-500">
          <div className="bg-white border-4 border-white rounded-[3rem] shadow-2xl max-w-xl w-full relative animate-in zoom-in-95 duration-500 overflow-hidden">
            <div className="bg-gradient-to-br from-indigo-700 to-indigo-900 text-white p-12">
              <h2 className="text-3xl font-black tracking-tighter italic">{editingUser ? 'Edit User' : 'Create New User'}</h2>
            </div>
            <div className="p-10">
              <form onSubmit={handleSubmit} className="space-y-8 font-bold text-sm tracking-widest">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <label className="block text-indigo-950 mb-3 ml-1">User Code</label>
                    <input
                      type="text"
                      value={formData.user_code}
                      onChange={(e) => setFormData({ ...formData, user_code: e.target.value.toUpperCase() })}
                      className={`w-full px-8 py-4 bg-indigo-50/30 border-2 border-indigo-100 rounded-[1.5rem] focus:outline-none focus:border-indigo-700 text-indigo-950 font-bold text-base transition-all ${editingUser ? 'opacity-50 cursor-not-allowed' : ''}`}
                      placeholder="USR-0001"
                      disabled={!!editingUser}
                      required
                    />
                    {!editingUser && <p className="text-[10px] text-indigo-400 mt-2 lowercase normal-case italic">Format: USR-XXXX (e.g., USR-0001)</p>}
                  </div>
                  <div>
                    <label className="block text-indigo-950 mb-3 ml-1">Username</label>
                    <input type="text" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className="w-full px-8 py-4 bg-indigo-50/30 border-2 border-indigo-100 rounded-[1.5rem] focus:outline-none focus:border-indigo-700 text-indigo-950 font-bold text-base transition-all" placeholder="Enter username" required />
                  </div>
                </div>

                <div>
                  <label className="block text-indigo-950 mb-3 ml-1">Password {editingUser && <span className="text-sm text-gray-500 ml-2">(leave blank to keep current)</span>}</label>
                  <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full px-8 py-4 bg-indigo-50/30 border-2 border-indigo-100 rounded-[1.5rem] focus:outline-none focus:border-indigo-700 text-indigo-950 font-mono text-base transition-all" placeholder="Enter password" required={!editingUser} />
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <label className="block text-indigo-950 mb-3 ml-1">Role</label>
                    <div className="relative">
                      <select value={formData.role_id} onChange={(e) => setFormData({ ...formData, role_id: parseInt(e.target.value) })} className="w-full px-8 py-4 bg-indigo-50/30 border-2 border-indigo-100 rounded-[1.5rem] focus:outline-none focus:border-indigo-700 text-indigo-950 font-bold appearance-none">
                        <option value={1}>Admin</option>
                        <option value={2}>Central Staff</option>
                        <option value={3}>Store Staff</option>
                      </select>
                      <FiChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-indigo-800" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-indigo-950 mb-3 ml-1">Store</label>
                    <div className="relative">
                      <select value={formData.store_id || ''} onChange={(e) => setFormData({ ...formData, store_id: e.target.value ? parseInt(e.target.value) : null })} className="w-full px-8 py-4 bg-indigo-50/30 border-2 border-indigo-100 rounded-[1.5rem] focus:outline-none focus:border-indigo-700 text-indigo-950 font-bold appearance-none">
                        <option value="">No Store</option>
                        {stores.map(s => <option key={s.store_id} value={s.store_id}>{s.store_name} ({s.store_address})</option>)}
                      </select>
                      <FiChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-indigo-800" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-6 pt-6">
                  <button type="button" onClick={handleCloseModal} className="px-10 py-4 text-indigo-600 font-bold tracking-widest hover:text-indigo-900 transition-all">Cancel</button>
                  <button type="submit" className="px-14 py-4 bg-indigo-700 text-white rounded-[1.5rem] font-bold tracking-widest hover:bg-indigo-900 shadow-xl transition-all">
                    {editingUser ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />

      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(49, 46, 129, 0.3); border-radius: 20px; }

        .meteor-background-container {
            position: absolute;
            inset: 0;
            background: var(--meteor-bg, #020617);
            overflow: hidden;
            z-index: 0;
            pointer-events: none;
            --meteor-head: #fff;
            --meteor-tail-start: rgba(255, 255, 255, 1);
            --meteor-tail-mid: rgba(56, 189, 248, 0.8);
            --meteor-tail-end: rgba(168, 85, 247, 0.4);
            --star-color: rgba(255, 255, 255, 0.3);
        }

        .stars {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image:
                radial-gradient(1px 1px at 20px 30px, var(--star-color), rgba(0, 0, 0, 0)),
                radial-gradient(1px 1px at 40px 70px, var(--star-color), rgba(0, 0, 0, 0)),
                radial-gradient(1.5px 1.5px at 150px 100px, var(--star-color), rgba(0, 0, 0, 0)),
                radial-gradient(2px 2px at 280px 45px, var(--star-color), rgba(0, 0, 0, 0)),
                radial-gradient(1.5px 1.5px at 310px 150px, var(--star-color), rgba(0, 0, 0, 0)),
                radial-gradient(1px 1px at 420px 200px, var(--star-color), rgba(0, 0, 0, 0));
            background-repeat: repeat;
            background-size: 400px 400px;
            opacity: 0.5;
            z-index: 0;
        }

        .shooting-stars {
            position: absolute;
            inset: -40%;
            width: 180%;
            height: 180%;
            transform: rotateZ(-40deg);
            z-index: 0;
            pointer-events: none;
            overflow: hidden;
            perspective: 1000px;
        }

        .shooting-stars span {
            position: absolute;
            top: 50%;
            left: 50%;
            height: 2px;
            background: transparent;
            transform: translateX(0) translateZ(0);
            opacity: 0;
            animation: meteorQuantumFlight var(--duration) linear infinite;
            animation-delay: var(--delay);
            will-change: transform, opacity;
        }

        .shooting-stars span::before {
            content: '';
            position: absolute;
            top: 50%;
            right: 0;
            transform: translateY(-50%);
            width: var(--tail, 400px);
            height: var(--thickness, 1px);
            background: linear-gradient(to left,
                    transparent 0%,
                    var(--meteor-tail-end) 40%,
                    var(--meteor-tail-mid) 70%,
                    var(--meteor-tail-start) 100%);
            border-radius: 200% 0 0 200%;
            filter: drop-shadow(0 0 5px var(--meteor-tail-mid));
        }

        .shooting-stars span::after {
            content: '';
            position: absolute;
            right: 0;
            top: 50%;
            transform: translateY(-50%);
            width: var(--head-size, 3px);
            height: var(--head-size, 3px);
            background: var(--meteor-head);
            border-radius: 50%;
            box-shadow:
                0 0 2px 1px var(--meteor-head),
                0 0 8px 2px var(--meteor-tail-mid),
                0 0 20px 4px var(--meteor-tail-end);
            z-index: 10;
        }

        @keyframes meteorQuantumFlight {
            0% { opacity: 0; transform: translateX(400px) scale(0.1); }
            5% { opacity: 1; transform: translateX(0) scale(1); }
            70% { opacity: 1; transform: translateX(-1000px) scale(1); }
            85% { opacity: 0; transform: translateX(-1300px) scale(0.9); }
            100% { opacity: 0; transform: translateX(-2000px) scale(0.1); }
        }

        .shooting-stars span:nth-child(1) { top: -10%; left: 30%; --duration: 4s; --delay: 2s; --tail: 700px; --head-size: 4px; --thickness: 2px; }
        .shooting-stars span:nth-child(2) { top: 30%; left: 60%; --duration: 3.5s; --delay: 7s; --tail: 600px; --head-size: 3px; --thickness: 2px; }
        .shooting-stars span:nth-child(3) { top: 60%; left: 90%; --duration: 4.2s; --delay: 0.5s; --tail: 800px; --head-size: 5px; --thickness: 3px; }
        .shooting-stars span:nth-child(4) { top: 10%; left: 80%; --duration: 3.8s; --delay: 12s; --tail: 650px; --head-size: 4px; --thickness: 2px; }
        .shooting-stars span:nth-child(5) { top: 50%; left: -20%; --duration: 4.5s; --delay: 5s; --tail: 550px; --head-size: 3px; --thickness: 2px; }
        .shooting-stars span:nth-child(6) { top: 0%; left: 10%; --duration: 6s; --delay: 1s; --tail: 400px; --head-size: 2px; --thickness: 1px; }
        .shooting-stars span:nth-child(7) { top: 20%; left: 40%; --duration: 7s; --delay: 2.5s; --tail: 350px; --head-size: 2px; --thickness: 1px; }
        .shooting-stars span:nth-child(8) { top: 40%; left: 70%; --duration: 5.5s; --delay: 4.8s; --tail: 450px; --head-size: 2px; --thickness: 1px; }
        .shooting-stars span:nth-child(9) { top: 60%; left: 100%; --duration: 6.8s; --delay: 6s; --tail: 300px; --head-size: 2px; --thickness: 1px; }
        .shooting-stars span:nth-child(10) { top: 80%; left: 30%; --duration: 6.2s; --delay: 0.2s; --tail: 380px; --head-size: 2px; --thickness: 1px; }
        .shooting-stars span:nth-child(11) { top: 10%; left: 50%; --duration: 5.8s; --delay: 3s; --tail: 420px; --head-size: 2px; --thickness: 1px; }
        .shooting-stars span:nth-child(12) { top: 30%; left: 80%; --duration: 7.2s; --delay: 8s; --tail: 360px; --head-size: 2px; --thickness: 1px; }
        .shooting-stars span:nth-child(13) { top: 50%; left: 10%; --duration: 6.5s; --delay: 1.5s; --tail: 400px; --head-size: 2px; --thickness: 1px; }
        .shooting-stars span:nth-child(14) { top: 70%; left: 40%; --duration: 5.9s; --delay: 5.5s; --tail: 330px; --head-size: 2px; --thickness: 1px; }
        .shooting-stars span:nth-child(15) { top: 90%; left: 70%; --duration: 6.9s; --delay: 7.2s; --tail: 390px; --head-size: 2px; --thickness: 1px; }
        .shooting-stars span:nth-child(16) { top: 5%; left: 95%; --duration: 6.1s; --delay: 2.2s; --tail: 370px; --head-size: 2px; --thickness: 1px; }
        .shooting-stars span:nth-child(17) { top: 25%; left: 25%; --duration: 7.5s; --delay: 4.1s; --tail: 340px; --head-size: 2px; --thickness: 1px; }
        .shooting-stars span:nth-child(18) { top: 45%; left: 55%; --duration: 5.7s; --delay: 0.8s; --tail: 410px; --head-size: 2px; --thickness: 1px; }
        .shooting-stars span:nth-child(19) { top: 65%; left: 85%; --duration: 6.4s; --delay: 9s; --tail: 350px; --head-size: 2px; --thickness: 1px; }
        .shooting-stars span:nth-child(20) { top: 85%; left: 15%; --duration: 7.1s; --delay: 3.5s; --tail: 380px; --head-size: 2px; --thickness: 1px; }
        .shooting-stars span:nth-child(21) { top: 15%; left: 5%; --duration: 6.3s; --delay: 6.5s; --tail: 430px; --head-size: 2px; --thickness: 1px; }
        .shooting-stars span:nth-child(22) { top: 35%; left: 35%; --duration: 5.6s; --delay: 1.8s; --tail: 360px; --head-size: 2px; --thickness: 1px; }
        .shooting-stars span:nth-child(23) { top: 55%; left: 65%; --duration: 7.8s; --delay: 4.5s; --tail: 320px; --head-size: 2px; --thickness: 1px; }
        .shooting-stars span:nth-child(24) { top: 75%; left: 95%; --duration: 6.7s; --delay: 2.8s; --tail: 390px; --head-size: 2px; --thickness: 1px; }
        .shooting-stars span:nth-child(25) { top: 95%; left: 25%; --duration: 5.4s; --delay: 7.8s; --tail: 440px; --head-size: 2px; --thickness: 1px; }
        .shooting-stars span:nth-child(26) { top: 0%; left: 20%; --duration: 12s; --delay: 0s; --tail: 200px; --head-size: 1px; --thickness: 0.5px; opacity: 0.4; }
        .shooting-stars span:nth-child(27) { top: 20%; left: 50%; --duration: 11s; --delay: 3s; --tail: 250px; --head-size: 1px; --thickness: 0.5px; opacity: 0.4; }
        .shooting-stars span:nth-child(28) { top: 40%; left: 80%; --duration: 13s; --delay: 6s; --tail: 220px; --head-size: 1px; --thickness: 0.5px; opacity: 0.4; }
        .shooting-stars span:nth-child(29) { top: 60%; left: 10%; --duration: 10s; --delay: 2s; --tail: 180px; --head-size: 1px; --thickness: 0.5px; opacity: 0.4; }
        .shooting-stars span:nth-child(30) { top: 80%; left: 40%; --duration: 14s; --delay: 8s; --tail: 240px; --head-size: 1px; --thickness: 0.5px; opacity: 0.4; }
        .shooting-stars span:nth-child(31) { top: 10%; left: 70%; --duration: 12.5s; --delay: 1s; --tail: 210px; --head-size: 1px; --thickness: 0.5px; opacity: 0.4; }
        .shooting-stars span:nth-child(32) { top: 30%; left: 100%; --duration: 11.5s; --delay: 5s; --tail: 260px; --head-size: 1px; --thickness: 0.5px; opacity: 0.4; }
        .shooting-stars span:nth-child(33) { top: 50%; left: 30%; --duration: 13.5s; --delay: 9s; --tail: 190px; --head-size: 1px; --thickness: 0.5px; opacity: 0.4; }
        .shooting-stars span:nth-child(34) { top: 70%; left: 60%; --duration: 10.5s; --delay: 4s; --tail: 230px; --head-size: 1px; --thickness: 0.5px; opacity: 0.4; }
        .shooting-stars span:nth-child(35) { top: 90%; left: 90%; --duration: 14.5s; --delay: 7s; --tail: 200px; --head-size: 1px; --thickness: 0.5px; opacity: 0.4; }
        .shooting-stars span:nth-child(36) { top: 5%; left: 15%; --duration: 11.2s; --delay: 2.5s; --tail: 250px; --head-size: 1px; --thickness: 0.5px; opacity: 0.4; }
        .shooting-stars span:nth-child(37) { top: 25%; left: 45%; --duration: 12.8s; --delay: 6.5s; --tail: 220px; --head-size: 1px; --thickness: 0.5px; opacity: 0.4; }
        .shooting-stars span:nth-child(38) { top: 45%; left: 75%; --duration: 10.8s; --delay: 1.5s; --tail: 180px; --head-size: 1px; --thickness: 0.5px; opacity: 0.4; }
        .shooting-stars span:nth-child(39) { top: 65%; left: 5%; --duration: 13.8s; --delay: 5.5s; --tail: 240px; --head-size: 1px; --thickness: 0.5px; opacity: 0.4; }
        .shooting-stars span:nth-child(40) { top: 85%; left: 35%; --duration: 11.8s; --delay: 8.5s; --tail: 210px; --head-size: 1px; --thickness: 0.5px; opacity: 0.4; }

        .bg-glow {
            position: absolute;
            inset: 0;
            background: radial-gradient(circle at 50% 50%, rgba(14, 165, 233, 0.1), transparent 80%);
        }

      `}} />
    </div>
  );
};

export default UserManagementPage;
