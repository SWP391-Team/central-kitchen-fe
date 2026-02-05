import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { storeService } from '@/api/services/storeService';
import { Store } from '@/api/types';
import {
  HomeIcon,
  CubeIcon,
  TruckIcon,
  UsersIcon,
  BuildingStorefrontIcon,
  DocumentTextIcon,
  ArrowLeftOnRectangleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ArchiveBoxIcon,
  FireIcon,
} from '@heroicons/react/24/outline';

interface SubMenuItem {
  name: string;
  path: string;
  roles?: number[];
  storeIds?: number[];
}

interface MenuItem {
  name: string;
  path: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  roles: number[]; 
  subItems?: SubMenuItem[];
}

const menuItems: MenuItem[] = [
  {
    name: 'Dashboard',
    path: '/',
    icon: HomeIcon,
    roles: [1, 2, 3],
  },
  {
    name: 'Supply Order',
    path: '/supply-order',
    icon: TruckIcon,
    roles: [1, 2, 3],
    subItems: [
      {
        name: 'Supply Order Central Kitchen',
        path: '/supply-order/central-kitchen',
        roles: [1, 2], 
      },
      {
        name: 'Supply Order Store',
        path: '/supply-order/store',
        roles: [1, 3], 
      },
    ],
  },
  {
    name: 'Kitchen Production',
    path: '/kitchen-production',
    icon: FireIcon,
    roles: [1, 2],
  },
  {
    name: 'Inventory',
    path: '/inventory',
    icon: CubeIcon,
    roles: [1, 2, 3], 
    subItems: [
      {
        name: 'Central Kitchen Inventory',
        path: '/inventory/store/1',
        roles: [1, 2], 
      },
      {
        name: 'My Store Inventory',
        path: '/inventory/store/:storeId', 
        roles: [3], 
      },
    ],
  },
  {
    name: 'Product Management',
    path: '/products',
    icon: ArchiveBoxIcon,
    roles: [1, 2], 
  },
  {
    name: 'Store Management',
    path: '/stores',
    icon: BuildingStorefrontIcon,
    roles: [1], 
  },
  {
    name: 'User Management',
    path: '/users',
    icon: UsersIcon,
    roles: [1], 
  },
  {
    name: 'Audit Log',
    path: '/audit-log',
    icon: DocumentTextIcon,
    roles: [1], 
  },
];

const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [stores, setStores] = useState<Store[]>([]);

  useEffect(() => {
    if (user?.role_id === 1) {
      loadStores();
    }
  }, [user]);

  const loadStores = async () => {
    try {
      const response = await storeService.getStores({ is_active: true });
      setStores(response.data || []);
    } catch (error) {
      console.error('Failed to load stores:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  const filteredMenuItems = menuItems.filter((item) =>
    item.roles.includes(user.role_id)
  );

  const filterSubItems = (subItems?: SubMenuItem[]) => {
    if (!subItems) return [];
    
    const filtered = subItems.map((subItem) => {
      let path = subItem.path;
      if (path.includes(':storeId') && user.store_id) {
        path = path.replace(':storeId', user.store_id.toString());
      }
      
      return {
        ...subItem,
        path
      };
    }).filter((subItem) => {
      const hasRoleAccess = !subItem.roles || subItem.roles.includes(user.role_id);
      return hasRoleAccess;
    });

    if (user.role_id === 1 && openDropdown === 'Inventory') {
      const filteredWithoutMyStore = filtered.filter(item => !item.path.includes('/inventory/store/'));
      
      const storeItems: SubMenuItem[] = stores
        .sort((a, b) => a.store_id - b.store_id)
        .map(store => ({
          name: store.store_name,
          path: `/inventory/store/${store.store_id}`,
          roles: [1], 
        }));

      return [...filteredWithoutMyStore, ...storeItems];
    }

    return filtered;
  };

  const toggleDropdown = (itemName: string) => {
    setOpenDropdown(openDropdown === itemName ? null : itemName);
  };

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
            const filteredSubItems = filterSubItems(item.subItems);
            const hasSubItems = filteredSubItems.length > 0;
            const isDropdownOpen = openDropdown === item.name;
            
            const isSubItemActive = hasSubItems && 
              location.pathname.startsWith(item.path) &&
              filteredSubItems.some((subItem) => location.pathname === subItem.path);

            return (
              <li key={item.path}>
                {hasSubItems ? (
                  <>
                    <button
                      onClick={() => toggleDropdown(item.name)}
                      className={`flex items-center justify-between w-full px-4 py-3 rounded-lg transition-colors ${
                        isSubItemActive
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="w-5 h-5" />
                        <span className="text-sm font-medium">{item.name}</span>
                      </div>
                      {isDropdownOpen ? (
                        <ChevronDownIcon className="w-4 h-4" />
                      ) : (
                        <ChevronRightIcon className="w-4 h-4" />
                      )}
                    </button>
                    {isDropdownOpen && (
                      <ul className="mt-1 ml-4 space-y-1 max-h-32 overflow-y-auto pr-2 
                        [&::-webkit-scrollbar]:w-2
                        [&::-webkit-scrollbar-track]:bg-gray-700
                        [&::-webkit-scrollbar-track]:rounded-full
                        [&::-webkit-scrollbar-thumb]:bg-gray-600
                        [&::-webkit-scrollbar-thumb]:rounded-full
                        [&::-webkit-scrollbar-thumb]:hover:bg-gray-500">
                        {filteredSubItems.map((subItem) => {
                          const isSubActive = location.pathname === subItem.path;
                          return (
                            <li key={subItem.path}>
                              <Link
                                to={subItem.path}
                                className={`flex items-center px-4 py-2 rounded-lg transition-colors text-sm ${
                                  isSubActive
                                    ? 'bg-blue-500 text-white'
                                    : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                                }`}
                              >
                                {subItem.name}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </>
                ) : (
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
                )}
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
