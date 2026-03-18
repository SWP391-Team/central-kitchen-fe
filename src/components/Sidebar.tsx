import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArchiveBoxIcon,
  ArrowLeftOnRectangleIcon,
  BuildingStorefrontIcon,
  CheckCircleIcon,
  CircleStackIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentIcon,
  ClipboardDocumentListIcon,
  CubeIcon,
  DocumentTextIcon,
  HomeIcon,
  Squares2X2Icon,
  TruckIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';

interface MenuItem {
  name: string;
  path: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  roles: number[];
  hidden?: (user: { role_id: number; location_id: number | null }) => boolean;
}

interface MenuSection {
  title?: string;
  items: MenuItem[];
}

const menuSections: MenuSection[] = [
  {
    items: [
      {
        name: 'Dashboard',
        path: '/',
        icon: HomeIcon,
        roles: [1, 2, 3],
      },
    ],
  },
  {
    title: 'Production',
    items: [
      {
        name: 'Production Plan',
        path: '/production-plan',
        icon: ClipboardDocumentListIcon,
        roles: [1, 2],
      },
      {
        name: 'Production Batch',
        path: '/production-batch',
        icon: CubeIcon,
        roles: [1, 2],
      },
      {
        name: 'Quality Inspection',
        path: '/quality-inspection',
        icon: ClipboardDocumentCheckIcon,
        roles: [1, 2],
      },
      {
        name: 'Rework Batch',
        path: '/rework-batch',
        icon: Squares2X2Icon,
        roles: [1, 2],
      },
    ],
  },
  {
    title: 'Supply Chain',
    items: [
      {
        name: 'Supply Order',
        path: '/supply-order',
        icon: ClipboardDocumentIcon,
        roles: [1, 2, 3],
        hidden: (user) => user.role_id === 3 && !user.location_id,
      },
      {
        name: 'Batch Transfer',
        path: '/batch-transfer',
        icon: TruckIcon,
        roles: [1, 2],
      },
      {
        name: 'Warehouse Receive',
        path: '/warehouse-receive',
        icon: CheckCircleIcon,
        roles: [1, 2, 3],
      },
    ],
  },
  {
    title: 'Inventory',
    items: [
      {
        name: 'Inventory',
        path: '/inventory',
        icon: CircleStackIcon,
        roles: [1, 2, 3],
      },
    ],
  },
  {
    title: 'Master Data',
    items: [
      {
        name: 'Product Management',
        path: '/products',
        icon: ArchiveBoxIcon,
        roles: [1, 2],
      },
      {
        name: 'Location Management',
        path: '/locations',
        icon: BuildingStorefrontIcon,
        roles: [1],
      },
    ],
  },
  {
    title: 'System',
    items: [
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
    ],
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

  const filteredSections = menuSections
    .map((section) => {
      const items = section.items.filter((item) => {
        if (!item.roles.includes(user.role_id)) {
          return false;
        }
        if (item.hidden && item.hidden({ role_id: user.role_id, location_id: user.location_id })) {
          return false;
        }
        return true;
      });

      return {
        ...section,
        items,
      };
    })
    .filter((section) => section.items.length > 0);

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
    <div className="flex h-screen w-72 flex-col border-r border-blue-200 bg-gradient-to-b from-blue-100 via-sky-50 to-blue-50 text-slate-700 shadow-sm">
      {/* Header */}
      <div className="h-16 border-b border-blue-200 px-5 flex items-center bg-blue-50/90 backdrop-blur-sm">
        <div>
          <h1 className="text-lg font-bold tracking-wide text-stone-900">CK Management</h1>
          <p className="text-[11px] text-blue-900/70">Central Kitchen System</p>
        </div>
      </div>

      {/* User Info */}
      <div className="mx-4 mt-4 rounded-xl border border-blue-200 bg-blue-50/80 px-4 py-4 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shadow-sm">
              <span className="text-lg font-semibold">
                {user.username.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate text-stone-900">{user.username}</p>
            <p className="text-xs text-blue-900/70 truncate">
              {getRoleName(user.role_id)}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav
        className="sidebar-scroll flex-1 overflow-y-auto px-3 py-4 space-y-5"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#4f84c4 transparent' }}
      >
        {filteredSections.map((section) => (
          <div key={section.title || 'root'}>
            {section.title && (
              <p className="px-3 mb-2 text-[11px] uppercase tracking-[0.14em] font-semibold text-blue-900/80">
                {section.title}
              </p>
            )}
            <ul className="space-y-1.5">
              {section.items.map((item) => {
                const isActive =
                  item.path === '/'
                    ? location.pathname === '/'
                    : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
                const Icon = item.icon;

                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all ${
                        isActive
                          ? 'bg-blue-200/80 text-blue-950 ring-1 ring-blue-300 shadow-sm'
                          : 'text-slate-700 hover:bg-blue-100/70 hover:text-slate-900'
                      }`}
                    >
                      <Icon
                        className={`h-5 w-5 shrink-0 ${
                          isActive ? 'text-blue-800' : 'text-slate-500 group-hover:text-blue-800'
                        }`}
                      />
                      <span className="text-sm font-medium">{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-blue-200 bg-blue-50/70">
        <button
          onClick={handleLogout}
          className="flex items-center space-x-3 w-full px-4 py-3 rounded-xl text-slate-700 hover:bg-blue-100/80 hover:text-blue-900 transition-colors"
        >
          <ArrowLeftOnRectangleIcon className="w-5 h-5" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>

      <style>{`
        .sidebar-scroll::-webkit-scrollbar {
          width: 10px;
        }

        .sidebar-scroll::-webkit-scrollbar-track {
          background: transparent;
          margin: 8px 0;
        }

        .sidebar-scroll::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #7fb3e6 0%, #4f84c4 100%);
          border-radius: 9999px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }

        .sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #5a9bd6 0%, #356fa8 100%);
          border: 2px solid transparent;
          background-clip: padding-box;
        }
      `}</style>
    </div>
  );
};

export default Sidebar;
