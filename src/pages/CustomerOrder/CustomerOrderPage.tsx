const CustomerOrderPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Customer Orders</h1>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
          New Order
        </button>
      </div>

      {/* Order Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-500">Today's Orders</p>
          <p className="text-2xl font-semibold text-gray-900 mt-2">0</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-500">Processing</p>
          <p className="text-2xl font-semibold text-blue-600 mt-2">0</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-500">Ready</p>
          <p className="text-2xl font-semibold text-green-600 mt-2">0</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-500">Completed</p>
          <p className="text-2xl font-semibold text-gray-600 mt-2">0</p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Search by order ID or customer..."
            className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 md:col-span-2"
          />
          <select className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>All Status</option>
            <option>Pending</option>
            <option>Processing</option>
            <option>Ready</option>
            <option>Completed</option>
            <option>Cancelled</option>
          </select>
          <input
            type="date"
            className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Order ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date & Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Items
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
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
            <tr>
              <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                No customer orders found
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CustomerOrderPage;
