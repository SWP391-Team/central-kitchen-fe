import { useState, useEffect } from 'react';
import { productService } from '@/api/services/productService';
import { unitService } from '@/api/services/unitService';
import { Product, ProductCreateRequest, ProductUpdateRequest, Unit } from '@/api/types';
import { useToast } from '@/contexts/ToastContext';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { PencilIcon, MagnifyingGlassIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

const ProductManagement = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [activeUnits, setActiveUnits] = useState<Unit[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductCreateRequest>({
    product_name: '',
    unit_id: 0,
    shelf_life_days: 0,
  });
  const { showToast } = useToast();
  const { confirm, confirmDialog } = useConfirmDialog();

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await productService.getAllProducts(statusFilter);
      setProducts(data);
    } catch (error: any) {
      showToast('Failed to load products', 'error');
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim()) {
        handleSearchExecute(searchTerm);
      } else {
        loadProducts();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    const loadActiveUnits = async () => {
      try {
        const units = await unitService.getActiveUnits();
        setActiveUnits(units);
      } catch (error) {
        console.error('Error loading active units:', error);
        showToast('Failed to load active units', 'error');
      }
    };

    loadActiveUnits();
  }, []);

  const unitOptions = editingProduct && editingProduct.unit_id
    ? activeUnits.some((item) => item.unit_id === editingProduct.unit_id)
      ? activeUnits
      : [
          ...activeUnits,
          {
            unit_id: editingProduct.unit_id,
            unit_code: '',
            unit_name: editingProduct.unit_name || 'Unknown Unit',
            is_active: false,
          } as Unit,
        ]
    : activeUnits;

  const handleSearchExecute = async (term: string) => {
    try {
      const data = await productService.searchProducts(term);
      setProducts(data);
    } catch (error) {
      showToast('Failed to search products', 'error');
    }
  };

  const openModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        product_name: product.product_name,
        unit_id: product.unit_id,
        shelf_life_days: product.shelf_life_days,
      });
    } else {
      setEditingProduct(null);
      setFormData({
        product_name: '',
        unit_id: 0,
        shelf_life_days: 0,
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setFormData({
      product_name: '',
      unit_id: 0,
      shelf_life_days: 0,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.product_name.trim() || !formData.unit_id) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    // Validate shelf_life_days
    if (!formData.shelf_life_days || formData.shelf_life_days <= 0) {
      showToast('Shelf life must be greater than 0', 'error');
      return;
    }

    if (!Number.isInteger(formData.shelf_life_days)) {
      showToast('Shelf life must be an integer', 'error');
      return;
    }

    try {
      if (editingProduct) {
        const updateData: ProductUpdateRequest = {
          product_name: formData.product_name,
          unit_id: formData.unit_id,
          shelf_life_days: formData.shelf_life_days,
        };
        await productService.updateProduct(editingProduct.product_id, updateData);
        showToast('Product updated successfully', 'success');
      } else {
        await productService.createProduct(formData);
        showToast('Product created successfully', 'success');
      }
      closeModal();
      loadProducts();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to save product';
      showToast(errorMessage, 'error');
    }
  };

  const handleToggleActive = async (product: Product) => {
    const action = product.is_active ? 'deactivate' : 'activate';
    const accepted = await confirm({
      title: `${action === 'deactivate' ? 'Deactivate' : 'Activate'} Product`,
      message: `Are you sure you want to ${action} "${product.product_name}"?`,
      confirmText: action === 'deactivate' ? 'Deactivate' : 'Activate',
      tone: action === 'deactivate' ? 'danger' : 'default',
    });
    if (!accepted) return;

    try {
      await productService.toggleProductActive(product.product_id);
      showToast(`Product ${action}d successfully`, 'success');
      loadProducts();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || `Failed to ${action} product`;
      showToast(errorMessage, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Product Management</h2>
        <button
          onClick={() => openModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Add Product
        </button>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search products by code, name or unit..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchTerm ? 'No products found matching your search.' : 'No products yet. Add your first product!'}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Shelf Life (days)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Updated By
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product.product_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.product_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-700">
                    {product.product_code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {product.product_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {product.unit_name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.shelf_life_days}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        product.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {product.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {product.created_at ? new Date(product.created_at).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {product.created_by_username || product.created_by || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {product.updated_at ? new Date(product.updated_at).toLocaleString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {product.updated_by_username || product.updated_by || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => openModal(product)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                      title="Edit"
                    >
                      <PencilIcon className="h-5 w-5 inline" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(product)}
                      className={product.is_active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}
                      title={product.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {product.is_active ? (
                        <XCircleIcon className="h-5 w-5 inline" />
                      ) : (
                        <CheckCircleIcon className="h-5 w-5 inline" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal for Create/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={formData.product_name}
                  onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Cơm Tấm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit *
                </label>
                <select
                  value={formData.unit_id || ''}
                  onChange={(e) => setFormData({ ...formData, unit_id: Number(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select unit</option>
                  {unitOptions.map((unit) => (
                    <option key={unit.unit_id} value={unit.unit_id}>
                      {unit.unit_name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Only active units can be selected for new products</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shelf Life (days) *
                </label>
                <input
                  type="number"
                  value={formData.shelf_life_days || ''}
                  onChange={(e) => setFormData({ ...formData, shelf_life_days: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 7"
                  min="1"
                  step="1"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Number of days before the product expires</p>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingProduct ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDialog}
    </div>
  );
};

export default ProductManagement;
