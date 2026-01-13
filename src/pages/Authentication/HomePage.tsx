import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';

const HomePage = () => {
  const { user } = useAuth();

  const stats = [
    { label: 'Total Orders', value: '1,234', icon: '📦', color: 'from-blue-500 to-blue-600' },
    { label: 'Active Users', value: '89', icon: '👥', color: 'from-green-500 to-green-600' },
    { label: 'Revenue', value: '$45.2K', icon: '💰', color: 'from-purple-500 to-purple-600' },
    { label: 'Stores', value: '12', icon: '🏪', color: 'from-orange-500 to-orange-600' },
  ];

  const quickActions = [
    { title: 'Inventory Management', description: 'Track and manage your inventory', icon: '📊', color: 'bg-blue-50 hover:bg-blue-100 border-blue-200' },
    { title: 'Order Processing', description: 'Process and fulfill orders', icon: '🛒', color: 'bg-green-50 hover:bg-green-100 border-green-200' },
    { title: 'Reports & Analytics', description: 'View business insights', icon: '📈', color: 'bg-purple-50 hover:bg-purple-100 border-purple-200' },
    { title: 'Staff Management', description: 'Manage your team', icon: '👨‍💼', color: 'bg-orange-50 hover:bg-orange-100 border-orange-200' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8 animate-fade-in">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-2xl p-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold mb-2">
                  Welcome back, {user?.username}! 👋
                </h1>
                <p className="text-indigo-100 text-lg">
                  Here's what's happening with your kitchen today
                </p>
              </div>
              <div className="hidden md:block">
                <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center text-6xl">
                  🍳
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300"
            >
              <div className={`h-2 bg-gradient-to-r ${stat.color} rounded-t-xl`}></div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-4xl">{stat.icon}</div>
                  <div className={`w-12 h-12 bg-gradient-to-r ${stat.color} rounded-full flex items-center justify-center text-white font-bold text-sm`}>
                    +12%
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-800 mb-1">{stat.value}</div>
                <div className="text-gray-500 text-sm font-medium">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
            <span className="mr-2">⚡</span>
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => (
              <div
                key={index}
                className={`${action.color} border-2 rounded-xl p-6 cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-lg`}
              >
                <div className="text-5xl mb-4">{action.icon}</div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">{action.title}</h3>
                <p className="text-sm text-gray-600">{action.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
            <span className="mr-2">📋</span>
            Recent Activity
          </h2>
          <div className="space-y-4">
            {[
              { action: 'New order received', time: '5 minutes ago', icon: '🆕', color: 'bg-green-100 text-green-600' },
              { action: 'Inventory updated', time: '1 hour ago', icon: '📦', color: 'bg-blue-100 text-blue-600' },
              { action: 'Report generated', time: '2 hours ago', icon: '📊', color: 'bg-purple-100 text-purple-600' },
              { action: 'Staff member added', time: '3 hours ago', icon: '👤', color: 'bg-orange-100 text-orange-600' },
            ].map((activity, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors duration-200"
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 ${activity.color} rounded-full flex items-center justify-center text-2xl`}>
                    {activity.icon}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">{activity.action}</div>
                    <div className="text-sm text-gray-500">{activity.time}</div>
                  </div>
                </div>
                <button className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                  View →
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
