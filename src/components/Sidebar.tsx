import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  HomeIcon,
  CubeIcon,
  TruckIcon,
  ShoppingCartIcon,
  UsersIcon,
  BuildingStorefrontIcon,
  DocumentTextIcon,
  ArrowLeftOnRectangleIcon,
} from '@heroicons/react/24/outline';

interface MenuItem {
  name: string;
  path: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  roles: number[]; // role_ids that can access this menu item
}

const menuItems: MenuItem[] = [
  {
    name: 'Dashboard',
    path: '/',
    icon: HomeIcon,
    roles: [1, 2, 3], // Admin, Central_Staff, Store_Staff
  },
  {
    name: 'Inventory',
    path: '/inventory',
    icon: CubeIcon,
    roles: [1, 2, 3], // Admin, Central_Staff, Store_Staff
  },
  {
    name: 'Supply Order',
    path: '/supply-order',
    icon: TruckIcon,
    roles: [1, 2, 3], // Admin, Central_Staff, Store_Staff
  },
  {
    name: 'Customer Order',
    path: '/customer-order',
    icon: ShoppingCartIcon,
    roles: [1, 3], // Admin, Store_Staff
  },
  {
    name: 'User Management',
    path: '/users',
    icon: UsersIcon,
    roles: [1], // Admin only
  },
  {
    name: 'Store Management',
    path: '/stores',
    icon: BuildingStorefrontIcon,
    roles: [1], // Admin only
  },
  {
    name: 'Audit Log',
    path: '/audit-log',
    icon: DocumentTextIcon,
    roles: [1], // Admin only
  },
];

const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  // Filter menu items based on user role
  const filteredMenuItems = menuItems.filter((item) =>
    item.roles.includes(user.role_id)
  );

  const getRoleName = (roleId: number) => {
    switch (roleId) {
      case 1:
        return 'Admin';
      case 2:
        return 'Central Staff';
      case 3:
        return 'Store Staff';
      default:
        return 'User';
    }
  };

  return (
    <div className="flex flex-col h-screen w-64 bg-gray-800 text-white">
      {/* Header */}
      <div className="flex items-center justify-center h-16 bg-gray-900">
        <h1 className="text-xl font-bold">CK Management</h1>
      </div>

      {/* User Info */}
      <div className="px-4 py-4 bg-gray-900 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
              <span className="text-lg font-semibold">
                {user.username.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.username}</p>
            <p className="text-xs text-gray-400 truncate">
              {getRoleName(user.role_id)}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {filteredMenuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="flex items-center space-x-3 w-full px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
        >
          <ArrowLeftOnRectangleIcon className="w-5 h-5" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
