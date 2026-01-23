import { useState } from 'react';
import ProductManagement from '@/pages/Inventory/ProductManagement';
import InventoryManagement from '@/pages/Inventory/InventoryManagement';

type TabType = 'inventory' | 'product';

const CentralKitchenInventoryPage = () => {
  const [activeTab, setActiveTab] = useState<TabType>('inventory');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Central Kitchen Inventory</h1>
        <p className="text-gray-600 mt-2">Manage central kitchen inventory and products</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm
              ${
                activeTab === 'inventory'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Inventory Management
          </button>
          <button
            onClick={() => setActiveTab('product')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm
              ${
                activeTab === 'product'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Product Management
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'inventory' && <InventoryManagement />}
        {activeTab === 'product' && <ProductManagement />}
      </div>
    </div>
  );
};

export default CentralKitchenInventoryPage;
